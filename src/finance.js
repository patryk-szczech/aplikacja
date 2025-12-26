const moment = require('moment');

class FinanceManager {
  constructor(db) {
    this.db = db;
  }

  /**
   * Oblicza opłaty na podstawie obecności
   * @param {number} dzieckoId - ID dziecka
   * @param {string} dataOd - Data początkowa (YYYY-MM-DD)
   * @param {string} dataDo - Data końcowa (YYYY-MM-DD)
   * @returns {object} Obliczone opłaty
   */
  calculateRates(dzieckoId, dataOd, dataDo) {
    // Pobierz dziecko
    const dziecko = this.db.db.prepare('SELECT * FROM dzieci WHERE id = ?').get(dzieckoId);
    if (!dziecko) throw new Error('Dziecko nie znalezione');

    // Pobierz wszystkie dni w zakresie
    const dniWPeriodzie = this.getDaysBetween(dataOd, dataDo);
    
    // Pobierz dni wolne
    const dniWolne = this.db.getDniWolne(1, dataOd, dataDo); // placowkaId=1
    const dniWolneSet = new Set(dniWolne.map(d => this.getDateRange(d.data_start, d.data_end)).flat());

    // Pobierz obecności
    const obecnosci = this.db.getObecnosci(dzieckoId, dataOd, dataDo);
    const obecnosciMap = new Map();
    obecnosci.forEach(o => {
      const key = `${o.data}-${o.kategoria}`;
      obecnosciMap.set(key, o.obecna === 1);
    });

    // Pobierz stawki
    const stawki = this.db.getStawki(dziecko.grupa_id);
    
    // Oblicz
    const kategorie = ['sniardanie', 'drugie_sniadanie', 'obiad', 'podwieczorek'];
    const wynik = {
      dziecko_id: dzieckoId,
      okres_od: dataOd,
      okres_do: dataDo,
      kategorie: {},
      razem: 0,
      dni_pracy: 0,
      dni_wolne_w_okresie: dniWolneSet.size
    };

    dniWPeriodzie.forEach(data => {
      // Sprawdź czy to dzień wolny
      if (dniWolneSet.has(data)) return;
      
      wynik.dni_pracy++;

      kategorie.forEach(kategoria => {
        const key = `${data}-${kategoria}`;
        const obecna = obecnosciMap.get(key) !== false; // domyślnie obecny

        if (obecna) {
          const stawka = stawki.find(s => 
            s.kategoria === kategoria && 
            this.isDateInRange(data, s.data_od, s.data_do)
          );

          if (stawka) {
            if (!wynik.kategorie[kategoria]) {
              wynik.kategorie[kategoria] = { kwota: 0, dni: 0 };
            }
            wynik.kategorie[kategoria].kwota += stawka.kwota;
            wynik.kategorie[kategoria].dni++;
            wynik.razem += stawka.kwota;
          }
        }
      });
    });

    return wynik;
  }

  /**
   * Zwraca tablicę wszystkich dni między dwiema datami
   */
  getDaysBetween(dataOd, dataDo) {
    const days = [];
    const start = moment(dataOd);
    const end = moment(dataDo);

    while (start.isSameOrBefore(end)) {
      days.push(start.format('YYYY-MM-DD'));
      start.add(1, 'day');
    }

    return days;
  }

  /**
   * Zwraca tablicę dni z przedziału
   */
  getDateRange(dataStart, dataEnd) {
    const days = [];
    const start = moment(dataStart);
    const end = moment(dataEnd);

    while (start.isSameOrBefore(end)) {
      days.push(start.format('YYYY-MM-DD'));
      start.add(1, 'day');
    }

    return days;
  }

  /**
   * Sprawdza czy data mieści się w przedziale
   */
  isDateInRange(data, dataOd, dataDo) {
    if (!dataOd || !dataDo) return true;
    const m = moment(data);
    return m.isSameOrAfter(moment(dataOd)) && m.isSameOrBefore(moment(dataDo));
  }

  /**
   * Generuje przedział płatności na miesiąc
   */
  getMonthlyPeriod(year, month) {
    const dataOd = moment(`${year}-${String(month).padStart(2, '0')}-01`).format('YYYY-MM-DD');
    const dataDo = moment(dataOd).endOf('month').format('YYYY-MM-DD');
    return { dataOd, dataDo };
  }

  /**
   * Wylicza zaległości dla rodzica
   */
  calculateArrearsForParent(rodzicId, dataOd = null, dataDo = null) {
    const query = `
      SELECT 
        SUM(CASE WHEN p.status = 'zaległa' THEN p.kwota ELSE 0 END) as razem_zaleglosci,
        COUNT(CASE WHEN p.status = 'zaległa' THEN 1 END) as liczba_zaleglosci,
        MIN(p.data_od) as najstarsza_zaleglosc
      FROM platnosci p
      WHERE p.rodzic_id = ? AND p.status = 'zaległa'
    `;
    
    let params = [rodzicId];
    if (dataOd) {
      query += ' AND p.data_od >= ?';
      params.push(dataOd);
    }
    if (dataDo) {
      query += ' AND p.data_do <= ?';
      params.push(dataDo);
    }

    const stmt = this.db.db.prepare(query);
    return stmt.get(...params);
  }

  /**
   * Wylicza statystyki dla grupy
   */
  getGroupStatistics(grupaId) {
    const statystyki = this.db.getStatystyki(grupaId);
    
    return {
      liczba_rodzicow: statystyki.liczba_rodzicow || 0,
      liczba_dzieci: statystyki.liczba_dzieci || 0,
      razem_oplacone: statystyki.razem_oplacone || 0,
      razem_zaleglosci: statystyki.razem_zaleglosci || 0,
      razem_oczekujace: statystyki.razem_oczekujace || 0,
      oplacone_procent: statystyki.razem_oplacone ? 
        ((statystyki.razem_oplacone / (statystyki.razem_oplacone + statystyki.razem_zaleglosci)) * 100).toFixed(2) : 0
    };
  }

  /**
   * Prognozuje przychody na miesiąc
   */
  forecastMonthlyRevenue(grupaId, year, month) {
    const { dataOd, dataDo } = this.getMonthlyPeriod(year, month);
    
    // Pobierz wszystkie dzieci w grupie
    const dzieci = this.db.db.prepare(`
      SELECT id FROM dzieci WHERE grupa_id = ?
    `).all(grupaId);

    let razem = 0;
    dzieci.forEach(d => {
      const rates = this.calculateRates(d.id, dataOd, dataDo);
      razem += rates.razem;
    });

    return {
      grupa_id: grupaId,
      rok: year,
      miesiac: month,
      prognoza_przychodu: razem
    };
  }

  /**
   * Porównuje przychody między miesiącami
   */
  compareMonthlyRevenue(grupaId, year1, month1, year2, month2) {
    const revenue1 = this.forecastMonthlyRevenue(grupaId, year1, month1);
    const revenue2 = this.forecastMonthlyRevenue(grupaId, year2, month2);

    const roznica = revenue2.prognoza_przychodu - revenue1.prognoza_przychodu;
    const procent = revenue1.prognoza_przychodu ? (roznica / revenue1.prognoza_przychodu * 100).toFixed(2) : 0;

    return {
      miesiąc_1: `${month1}/${year1}`,
      miesiąc_2: `${month2}/${year2}`,
      przychód_1: revenue1.prognoza_przychodu,
      przychód_2: revenue2.prognoza_przychodu,
      różnica: roznica,
      zmiana_procent: procent
    };
  }
}

module.exports = FinanceManager;
