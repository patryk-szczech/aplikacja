const XLSX = require('xlsx');
const fs = require('fs');
const moment = require('moment');

class ImportManager {
  constructor(db) {
    this.db = db;
  }

  /**
   * Importuje dane z pliku CSV
   */
  async importCSV(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      
      if (lines.length < 2) {
        return { success: false, message: 'Plik CSV jest pusty' };
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const records = [];

      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        const values = lines[i].split(',').map(v => v.trim());
        const record = {};

        headers.forEach((header, idx) => {
          record[header] = values[idx];
        });

        records.push(record);
      }

      return await this.processImportRecords(records);
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Importuje dane z pliku XLSX/Excel
   */
  async importXLSX(filePath) {
    try {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      const records = XLSX.utils.sheet_to_json(worksheet);

      if (records.length === 0) {
        return { success: false, message: 'Plik Excel jest pusty' };
      }

      // Normalizuj klucze do lowercase
      const normalizedRecords = records.map(record => {
        const normalized = {};
        Object.keys(record).forEach(key => {
          normalized[key.toLowerCase()] = record[key];
        });
        return normalized;
      });

      return await this.processImportRecords(normalizedRecords);
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Importuje dane przelewów (płatności z banku)
   */
  async importBankTransfers(filePath) {
    try {
      let records;

      if (filePath.endsWith('.xlsx') || filePath.endsWith('.xls')) {
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        records = XLSX.utils.sheet_to_json(worksheet);
      } else {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        records = [];

        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          const values = lines[i].split(',').map(v => v.trim());
          const record = {};
          headers.forEach((header, idx) => {
            record[header] = values[idx];
          });
          records.push(record);
        }
      }

      // Przetwórz transfery bankowe
      const results = {
        imported: 0,
        skipped: 0,
        errors: [],
        details: []
      };

      records.forEach((record, idx) => {
        try {
          // Spodziewane kolumny: data, kwota, opis/referencja, numer_konta
          const data = record['data'] || record['date'] || new Date().toISOString().split('T')[0];
          const kwota = parseFloat(record['kwota'] || record['amount'] || 0);
          const opis = record['opis'] || record['description'] || record['referencja'] || '';
          const numer_konta = record['numer_konta'] || record['account'] || '';

          if (!kwota || kwota <= 0) {
            results.skipped++;
            return;
          }

          // Spróbuj dopasować rodzica po numerze referencji lub opisie
          const rodzic = this.findParentByReference(opis, numer_konta);

          if (rodzic) {
            // Dodaj płatność
            const platnoscData = {
              rodzic_id: rodzic.id,
              dziecko_id: rodzic.dziecko_id || null,
              kwota: kwota,
              data_platnosci: data,
              kategoria: 'całość',
              opis: opis,
              status: 'opłacona',
              numer_rachunku: numer_konta,
              metoda_platnosci: 'przelew'
            };

            this.db.addPlatnosc(platnoscData);
            this.db.addTransakcje({
              rodzic_id: rodzic.id,
              dziecko_id: rodzic.dziecko_id || null,
              typ: 'wpłata',
              kwota: kwota,
              opis: `Import z banku: ${opis}`,
              referencja: numer_konta
            });

            results.imported++;
            results.details.push({
              linia: idx + 2,
              rodzic: `${rodzic.imie} ${rodzic.nazwisko}`,
              kwota: kwota,
              status: 'zaimportowana'
            });
          } else {
            results.skipped++;
            results.details.push({
              linia: idx + 2,
              rodzic: 'Nie znaleziono',
              kwota: kwota,
              status: 'nie powiązana'
            });
          }
        } catch (error) {
          results.errors.push({
            linia: idx + 2,
            blad: error.message
          });
        }
      });

      return {
        success: true,
        message: `Zaimportowano ${results.imported} przelewów`,
        ...results
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Przetwórz rekordy importu (rodzice, dzieci, płatności)
   */
  async processImportRecords(records) {
    const results = {
      imported: 0,
      skipped: 0,
      errors: [],
      by_type: {
        rodzice: 0,
        dzieci: 0,
        platnosci: 0
      }
    };

    // Pobierz lub utwórz placówkę
    let placowka = this.db.getPlacowka();
    if (!placowka) {
      const placowkaResult = this.db.addPlacowka({
        nazwa: 'Domyślna placówka',
        adres: '',
        telefon: '',
        email: ''
      });
      placowka = { id: placowkaResult.lastInsertRowid };
    }

    records.forEach((record, idx) => {
      try {
        // Jeśli rekord zawiera "imie" i "nazwisko" - to rodzic
        if (record['imie'] && record['nazwisko'] && !record['dziecko_id'] && !record['rodzic_id']) {
          this.db.addRodzic({
            placowka_id: placowka.id,
            imie: record['imie'],
            nazwisko: record['nazwisko'],
            email: record['email'] || '',
            telefon: record['telefon'] || '',
            adres: record['adres'] || '',
            miasto: record['miasto'] || '',
            kod_pocztowy: record['kod_pocztowy'] || '',
            pesel: record['pesel'] || '',
            numer_konta: record['numer_konta'] || ''
          });
          results.imported++;
          results.by_type.rodzice++;
        }
        // Jeśli zawiera rodzic_id - to dziecko
        else if (record['rodzic_id']) {
          const grupaId = record['grupa_id'] || 1;
          this.db.addDziecko({
            grupa_id: grupaId,
            rodzic_id: parseInt(record['rodzic_id']),
            imie: record['imie'],
            nazwisko: record['nazwisko'],
            data_urodzenia: record['data_urodzenia'] || null,
            pesel: record['pesel'] || ''
          });
          results.imported++;
          results.by_type.dzieci++;
        }
        // Jeśli zawiera kwotę - to płatność
        else if (record['kwota']) {
          this.db.addPlatnosc({
            rodzic_id: parseInt(record['rodzic_id']),
            dziecko_id: parseInt(record['dziecko_id'] || 0) || null,
            kwota: parseFloat(record['kwota']),
            data_platnosci: record['data_platnosci'] || new Date().toISOString().split('T')[0],
            data_od: record['data_od'] || null,
            data_do: record['data_do'] || null,
            kategoria: record['kategoria'] || 'całość',
            opis: record['opis'] || '',
            status: record['status'] || 'opłacona',
            numer_rachunku: record['numer_rachunku'] || '',
            metoda_platnosci: record['metoda_platnosci'] || 'przelew'
          });
          results.imported++;
          results.by_type.platnosci++;
        }
      } catch (error) {
        results.skipped++;
        results.errors.push({
          linia: idx + 2,
          blad: error.message
        });
      }
    });

    return {
      success: results.imported > 0,
      message: `Zaimportowano ${results.imported} rekordów`,
      ...results
    };
  }

  /**
   * Szuka rodzica po referencji/opisie
   */
  findParentByReference(reference, accountNumber) {
    if (!reference && !accountNumber) return null;

    const rodzice = this.db.db.prepare(`
      SELECT r.*, d.id as dziecko_id
      FROM rodzice r
      LEFT JOIN dzieci d ON r.id = d.rodzic_id
    `).all();

    // Spróbuj dopasować po numerze konta
    if (accountNumber) {
      const match = rodzice.find(r => r.numer_konta === accountNumber);
      if (match) return match;
    }

    // Spróbuj dopasować po opisie (szukaj w PESEL lub imieniu/nazwisku)
    if (reference) {
      const lowerRef = reference.toLowerCase();
      const match = rodzice.find(r => 
        r.pesel?.toLowerCase().includes(lowerRef) ||
        `${r.imie} ${r.nazwisko}`.toLowerCase().includes(lowerRef)
      );
      if (match) return match;
    }

    return null;
  }

  /**
   * Eksportuje szablon CSV do importu
   */
  generateImportTemplate(type = 'rodzice') {
    let headers = [];
    let filename = '';

    switch (type) {
      case 'rodzice':
        headers = ['imie', 'nazwisko', 'email', 'telefon', 'adres', 'miasto', 'kod_pocztowy', 'pesel', 'numer_konta'];
        filename = 'szablon-rodzice.csv';
        break;
      case 'dzieci':
        headers = ['rodzic_id', 'grupa_id', 'imie', 'nazwisko', 'data_urodzenia', 'pesel'];
        filename = 'szablon-dzieci.csv';
        break;
      case 'platnosci':
        headers = ['rodzic_id', 'dziecko_id', 'kwota', 'data_platnosci', 'data_od', 'data_do', 'kategoria', 'opis', 'status', 'numer_rachunku'];
        filename = 'szablon-platnosci.csv';
        break;
    }

    const csv = headers.join(',') + '\n';
    return { filename, content: csv };
  }
}

module.exports = ImportManager;
