const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

class DatabaseManager {
  constructor() {
    // Ścieżka do bazy danych - w folderze userData aplikacji
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'kwitariusz.db');
    
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.initializeTables();
  }

  initializeTables() {
    // Tabela: Placówka (szkoła/przedszkole)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS placowka (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nazwa TEXT NOT NULL UNIQUE,
        adres TEXT,
        telefon TEXT,
        email TEXT,
        data_utworzenia DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela: Grupy (przedszkole, szkoła)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS grupy (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        placowka_id INTEGER NOT NULL,
        nazwa TEXT NOT NULL,
        opis TEXT,
        data_utworzenia DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (placowka_id) REFERENCES placowka(id)
      )
    `);

    // Tabela: Rodzice
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS rodzice (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        placowka_id INTEGER NOT NULL,
        imie TEXT NOT NULL,
        nazwisko TEXT NOT NULL,
        email TEXT,
        telefon TEXT,
        adres TEXT,
        miasto TEXT,
        kod_pocztowy TEXT,
        pesel TEXT,
        numer_konta TEXT,
        data_utworzenia DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (placowka_id) REFERENCES placowka(id)
      )
    `);

    // Tabela: Dzieci (uczniowie)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS dzieci (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        grupa_id INTEGER NOT NULL,
        rodzic_id INTEGER NOT NULL,
        imie TEXT NOT NULL,
        nazwisko TEXT NOT NULL,
        data_urodzenia DATE,
        pesel TEXT,
        data_rejestracji DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (grupa_id) REFERENCES grupy(id),
        FOREIGN KEY (rodzic_id) REFERENCES rodzice(id)
      )
    `);

    // Tabela: Stawki (opłaty za posiłki)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS stawki (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        grupa_id INTEGER NOT NULL,
        kategoria TEXT NOT NULL, -- 'sniardanie', 'drugie_sniadanie', 'obiad', 'podwieczorek', 'calkosc'
        kwota REAL NOT NULL,
        waluta TEXT DEFAULT 'PLN',
        data_od DATE,
        data_do DATE,
        data_utworzenia DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (grupa_id) REFERENCES grupy(id),
        UNIQUE(grupa_id, kategoria, data_od)
      )
    `);

    // Tabela: Obecności
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS obecnosci (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dziecko_id INTEGER NOT NULL,
        data DATE NOT NULL,
        obecna INTEGER DEFAULT 0, -- 0=nieobecne, 1=obecne
        kategoria TEXT, -- 'sniardanie', 'drugie_sniadanie', 'obiad', 'podwieczorek', 'calkosc'
        data_utworzenia DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (dziecko_id) REFERENCES dzieci(id),
        UNIQUE(dziecko_id, data, kategoria)
      )
    `);

    // Tabela: Płatności
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS platnosci (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rodzic_id INTEGER NOT NULL,
        dziecko_id INTEGER NOT NULL,
        kwota REAL NOT NULL,
        data_platnosci DATE NOT NULL,
        data_od DATE,
        data_do DATE,
        kategoria TEXT, -- 'sniardanie', 'drugie_sniadanie', 'obiad', 'podwieczorek', 'calkosc'
        opis TEXT,
        status TEXT DEFAULT 'opłacona', -- 'opłacona', 'oczekująca', 'zaległa'
        numer_rachunku TEXT,
        metoda_platnosci TEXT DEFAULT 'przelew', -- 'przelew', 'gotówka', 'karta'
        data_utworzenia DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (rodzic_id) REFERENCES rodzice(id),
        FOREIGN KEY (dziecko_id) REFERENCES dzieci(id)
      )
    `);

    // Tabela: Zaległości
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS zaleglości (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rodzic_id INTEGER NOT NULL,
        dziecko_id INTEGER NOT NULL,
        kwota REAL NOT NULL,
        okres_od DATE NOT NULL,
        okres_do DATE NOT NULL,
        kategoria TEXT,
        status TEXT DEFAULT 'aktywna', -- 'aktywna', 'spłacona'
        data_utworzenia DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (rodzic_id) REFERENCES rodzice(id),
        FOREIGN KEY (dziecko_id) REFERENCES dzieci(id)
      )
    `);

    // Tabela: Historia transakcji
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS historia_transakcji (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rodzic_id INTEGER NOT NULL,
        dziecko_id INTEGER NOT NULL,
        typ TEXT NOT NULL, -- 'wpłata', 'korekta', 'rabat'
        kwota REAL NOT NULL,
        opis TEXT,
        data_transakcji DATETIME DEFAULT CURRENT_TIMESTAMP,
        referencja TEXT, -- numer referencyjny z banku
        FOREIGN KEY (rodzic_id) REFERENCES rodzice(id),
        FOREIGN KEY (dziecko_id) REFERENCES dzieci(id)
      )
    `);

    // Tabela: Dni wolne/Święta
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS dni_wolne (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        placowka_id INTEGER NOT NULL,
        nazwa TEXT NOT NULL,
        data_start DATE NOT NULL,
        data_end DATE NOT NULL,
        typ TEXT DEFAULT 'swięto', -- 'swięto', 'niedziela', 'sabota', 'dzien_wolny'
        opis TEXT,
        FOREIGN KEY (placowka_id) REFERENCES placowka(id)
      )
    `);

    // Tabela: Logowanie
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS logi (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        akcja TEXT NOT NULL,
        tabela TEXT,
        rekord_id INTEGER,
        stara_wartosc TEXT,
        nowa_wartosc TEXT,
        data_akcji DATETIME DEFAULT CURRENT_TIMESTAMP,
        uzytkownik TEXT DEFAULT 'system'
      )
    `);

    // Tabela: Email Config
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS email_config (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        smtp_host TEXT NOT NULL,
        smtp_port INTEGER NOT NULL,
        smtp_user TEXT NOT NULL,
        smtp_password TEXT NOT NULL,
        email_od TEXT NOT NULL,
        email_imie TEXT,
        test_email TEXT,
        data_utworzenia DATETIME DEFAULT CURRENT_TIMESTAMP,
        data_aktualizacji DATETIME
      )
    `);

    // Tabela: Backupy
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS backupy (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sciezka TEXT NOT NULL,
        rozmiar INTEGER,
        typ TEXT DEFAULT 'ręczny', -- 'ręczny', 'automatyczny'
        data_backup DATETIME DEFAULT CURRENT_TIMESTAMP,
        opis TEXT
      )
    `);

    // Tabela: Ustawienia
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ustawienia (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        klucz TEXT NOT NULL UNIQUE,
        wartosc TEXT,
        typ TEXT DEFAULT 'text', -- 'text', 'number', 'boolean', 'json'
        data_aktualizacji DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  // ============ PLACÓWKA ============
  getPlacowka() {
    const stmt = this.db.prepare('SELECT * FROM placowka LIMIT 1');
    return stmt.get();
  }

  addPlacowka(data) {
    const stmt = this.db.prepare(`
      INSERT INTO placowka (nazwa, adres, telefon, email)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(data.nazwa, data.adres, data.telefon, data.email);
    this.addLog('INSERT', 'placowka', result.lastInsertRowid, null, JSON.stringify(data));
    return result;
  }

  updatePlacowka(id, data) {
    const stmt = this.db.prepare(`
      UPDATE placowka SET nazwa = ?, adres = ?, telefon = ?, email = ?
      WHERE id = ?
    `);
    const result = stmt.run(data.nazwa, data.adres, data.telefon, data.email, id);
    this.addLog('UPDATE', 'placowka', id, null, JSON.stringify(data));
    return result;
  }

  // ============ GRUPY ============
  getGrupy(placowkaId = null) {
    let query = 'SELECT * FROM grupy';
    let stmt;
    if (placowkaId) {
      query += ' WHERE placowka_id = ?';
      stmt = this.db.prepare(query);
      return stmt.all(placowkaId);
    }
    stmt = this.db.prepare(query);
    return stmt.all();
  }

  addGrupa(data) {
    const stmt = this.db.prepare(`
      INSERT INTO grupy (placowka_id, nazwa, opis)
      VALUES (?, ?, ?)
    `);
    const result = stmt.run(data.placowka_id, data.nazwa, data.opis);
    this.addLog('INSERT', 'grupy', result.lastInsertRowid, null, JSON.stringify(data));
    return result;
  }

  updateGrupa(id, data) {
    const stmt = this.db.prepare(`
      UPDATE grupy SET nazwa = ?, opis = ? WHERE id = ?
    `);
    const result = stmt.run(data.nazwa, data.opis, id);
    this.addLog('UPDATE', 'grupy', id, null, JSON.stringify(data));
    return result;
  }

  deleteGrupa(id) {
    const stmt = this.db.prepare('DELETE FROM grupy WHERE id = ?');
    const result = stmt.run(id);
    this.addLog('DELETE', 'grupy', id, null, null);
    return result;
  }

  // ============ RODZICE ============
  getRodzice(placowkaId = null) {
    let query = 'SELECT * FROM rodzice';
    let stmt;
    if (placowkaId) {
      query += ' WHERE placowka_id = ?';
      stmt = this.db.prepare(query);
      return stmt.all(placowkaId);
    }
    stmt = this.db.prepare(query);
    return stmt.all();
  }

  addRodzic(data) {
    const stmt = this.db.prepare(`
      INSERT INTO rodzice (placowka_id, imie, nazwisko, email, telefon, adres, miasto, kod_pocztowy, pesel, numer_konta)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      data.placowka_id, data.imie, data.nazwisko, data.email, data.telefon,
      data.adres, data.miasto, data.kod_pocztowy, data.pesel, data.numer_konta
    );
    this.addLog('INSERT', 'rodzice', result.lastInsertRowid, null, JSON.stringify(data));
    return result;
  }

  updateRodzic(id, data) {
    const stmt = this.db.prepare(`
      UPDATE rodzice SET imie = ?, nazwisko = ?, email = ?, telefon = ?, 
      adres = ?, miasto = ?, kod_pocztowy = ?, pesel = ?, numer_konta = ?
      WHERE id = ?
    `);
    const result = stmt.run(
      data.imie, data.nazwisko, data.email, data.telefon,
      data.adres, data.miasto, data.kod_pocztowy, data.pesel, data.numer_konta, id
    );
    this.addLog('UPDATE', 'rodzice', id, null, JSON.stringify(data));
    return result;
  }

  deleteRodzic(id) {
    const stmt = this.db.prepare('DELETE FROM rodzice WHERE id = ?');
    const result = stmt.run(id);
    this.addLog('DELETE', 'rodzice', id, null, null);
    return result;
  }

  // ============ DZIECI ============
  getDzieci(grupaId = null, rodzicId = null) {
    let query = `
      SELECT d.*, g.nazwa as grupa_nazwa, r.imie as rodzic_imie, r.nazwisko as rodzic_nazwisko
      FROM dzieci d
      LEFT JOIN grupy g ON d.grupa_id = g.id
      LEFT JOIN rodzice r ON d.rodzic_id = r.id
    `;
    let params = [];

    if (grupaId) {
      query += ' WHERE d.grupa_id = ?';
      params.push(grupaId);
    }
    if (rodzicId) {
      query += (params.length ? ' AND' : ' WHERE') + ' d.rodzic_id = ?';
      params.push(rodzicId);
    }

    const stmt = this.db.prepare(query);
    return stmt.all(...params);
  }

  addDziecko(data) {
    const stmt = this.db.prepare(`
      INSERT INTO dzieci (grupa_id, rodzic_id, imie, nazwisko, data_urodzenia, pesel)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(data.grupa_id, data.rodzic_id, data.imie, data.nazwisko, data.data_urodzenia, data.pesel);
    this.addLog('INSERT', 'dzieci', result.lastInsertRowid, null, JSON.stringify(data));
    return result;
  }

  updateDziecko(id, data) {
    const stmt = this.db.prepare(`
      UPDATE dzieci SET grupa_id = ?, rodzic_id = ?, imie = ?, nazwisko = ?, 
      data_urodzenia = ?, pesel = ?
      WHERE id = ?
    `);
    const result = stmt.run(data.grupa_id, data.rodzic_id, data.imie, data.nazwisko, data.data_urodzenia, data.pesel, id);
    this.addLog('UPDATE', 'dzieci', id, null, JSON.stringify(data));
    return result;
  }

  deleteDziecko(id) {
    const stmt = this.db.prepare('DELETE FROM dzieci WHERE id = ?');
    const result = stmt.run(id);
    this.addLog('DELETE', 'dzieci', id, null, null);
    return result;
  }

  // ============ STAWKI ============
  getStawki(grupaId = null) {
    let query = 'SELECT * FROM stawki';
    let stmt;
    if (grupaId) {
      query += ' WHERE grupa_id = ? ORDER BY data_od DESC';
      stmt = this.db.prepare(query);
      return stmt.all(grupaId);
    }
    stmt = this.db.prepare(query + ' ORDER BY data_od DESC');
    return stmt.all();
  }

  addStawka(data) {
    const stmt = this.db.prepare(`
      INSERT INTO stawki (grupa_id, kategoria, kwota, waluta, data_od, data_do)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(data.grupa_id, data.kategoria, data.kwota, data.waluta || 'PLN', data.data_od, data.data_do);
    this.addLog('INSERT', 'stawki', result.lastInsertRowid, null, JSON.stringify(data));
    return result;
  }

  updateStawka(id, data) {
    const stmt = this.db.prepare(`
      UPDATE stawki SET kategoria = ?, kwota = ?, waluta = ?, data_od = ?, data_do = ?
      WHERE id = ?
    `);
    const result = stmt.run(data.kategoria, data.kwota, data.waluta || 'PLN', data.data_od, data.data_do, id);
    this.addLog('UPDATE', 'stawki', id, null, JSON.stringify(data));
    return result;
  }

  deleteStawka(id) {
    const stmt = this.db.prepare('DELETE FROM stawki WHERE id = ?');
    const result = stmt.run(id);
    this.addLog('DELETE', 'stawki', id, null, null);
    return result;
  }

  // ============ OBECNOŚCI ============
  getObecnosci(dzieckoId = null, dataOd = null, dataDo = null) {
    let query = 'SELECT * FROM obecnosci WHERE 1=1';
    let params = [];

    if (dzieckoId) {
      query += ' AND dziecko_id = ?';
      params.push(dzieckoId);
    }
    if (dataOd) {
      query += ' AND data >= ?';
      params.push(dataOd);
    }
    if (dataDo) {
      query += ' AND data <= ?';
      params.push(dataDo);
    }

    query += ' ORDER BY data DESC';
    const stmt = this.db.prepare(query);
    return stmt.all(...params);
  }

  setObecnosc(dzieckoId, data, present, kategoria = 'calkosc') {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO obecnosci (dziecko_id, data, obecna, kategoria)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(dzieckoId, data, present ? 1 : 0, kategoria);
    this.addLog('INSERT/UPDATE', 'obecnosci', result.lastInsertRowid, null, JSON.stringify({dzieckoId, data, present, kategoria}));
    return result;
  }

  deleteObecnosc(id) {
    const stmt = this.db.prepare('DELETE FROM obecnosci WHERE id = ?');
    const result = stmt.run(id);
    this.addLog('DELETE', 'obecnosci', id, null, null);
    return result;
  }

  // ============ PŁATNOŚCI ============
  getPlatnosci(rodzicId = null, dzieckoId = null, statusFilter = null) {
    let query = `
      SELECT p.*, 
             r.imie as rodzic_imie, r.nazwisko as rodzic_nazwisko,
             d.imie as dziecko_imie, d.nazwisko as dziecko_nazwisko
      FROM platnosci p
      LEFT JOIN rodzice r ON p.rodzic_id = r.id
      LEFT JOIN dzieci d ON p.dziecko_id = d.id
      WHERE 1=1
    `;
    let params = [];

    if (rodzicId) {
      query += ' AND p.rodzic_id = ?';
      params.push(rodzicId);
    }
    if (dzieckoId) {
      query += ' AND p.dziecko_id = ?';
      params.push(dzieckoId);
    }
    if (statusFilter) {
      query += ' AND p.status = ?';
      params.push(statusFilter);
    }

    query += ' ORDER BY p.data_platnosci DESC';
    const stmt = this.db.prepare(query);
    return stmt.all(...params);
  }

  addPlatnosc(data) {
    const stmt = this.db.prepare(`
      INSERT INTO platnosci (rodzic_id, dziecko_id, kwota, data_platnosci, data_od, data_do, 
                             kategoria, opis, status, numer_rachunku, metoda_platnosci)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      data.rodzic_id, data.dziecko_id, data.kwota, data.data_platnosci, data.data_od, data.data_do,
      data.kategoria, data.opis, data.status || 'opłacona', data.numer_rachunku, data.metoda_platnosci || 'przelew'
    );
    this.addLog('INSERT', 'platnosci', result.lastInsertRowid, null, JSON.stringify(data));
    return result;
  }

  updatePlatnosc(id, data) {
    const stmt = this.db.prepare(`
      UPDATE platnosci SET kwota = ?, data_platnosci = ?, data_od = ?, data_do = ?,
                          kategoria = ?, opis = ?, status = ?, numer_rachunku = ?, metoda_platnosci = ?
      WHERE id = ?
    `);
    const result = stmt.run(
      data.kwota, data.data_platnosci, data.data_od, data.data_do,
      data.kategoria, data.opis, data.status, data.numer_rachunku, data.metoda_platnosci, id
    );
    this.addLog('UPDATE', 'platnosci', id, null, JSON.stringify(data));
    return result;
  }

  deletePlatnosc(id) {
    const stmt = this.db.prepare('DELETE FROM platnosci WHERE id = ?');
    const result = stmt.run(id);
    this.addLog('DELETE', 'platnosci', id, null, null);
    return result;
  }

  // ============ HISTORIA TRANSAKCJI ============
  getHistoriaTransakcji(rodzicId = null, dzieckoId = null) {
    let query = 'SELECT * FROM historia_transakcji WHERE 1=1';
    let params = [];

    if (rodzicId) {
      query += ' AND rodzic_id = ?';
      params.push(rodzicId);
    }
    if (dzieckoId) {
      query += ' AND dziecko_id = ?';
      params.push(dzieckoId);
    }

    query += ' ORDER BY data_transakcji DESC';
    const stmt = this.db.prepare(query);
    return stmt.all(...params);
  }

  addTransakcje(data) {
    const stmt = this.db.prepare(`
      INSERT INTO historia_transakcji (rodzic_id, dziecko_id, typ, kwota, opis, referencja)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(data.rodzic_id, data.dziecko_id, data.typ, data.kwota, data.opis, data.referencja);
    this.addLog('INSERT', 'historia_transakcji', result.lastInsertRowid, null, JSON.stringify(data));
    return result;
  }

  // ============ DNI WOLNE ============
  getDniWolne(placowkaId = null, dataOd = null, dataDo = null) {
    let query = 'SELECT * FROM dni_wolne WHERE 1=1';
    let params = [];

    if (placowkaId) {
      query += ' AND placowka_id = ?';
      params.push(placowkaId);
    }
    if (dataOd) {
      query += ' AND data_start >= ?';
      params.push(dataOd);
    }
    if (dataDo) {
      query += ' AND data_end <= ?';
      params.push(dataDo);
    }

    query += ' ORDER BY data_start';
    const stmt = this.db.prepare(query);
    return stmt.all(...params);
  }

  addDzienWolny(data) {
    const stmt = this.db.prepare(`
      INSERT INTO dni_wolne (placowka_id, nazwa, data_start, data_end, typ, opis)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(data.placowka_id, data.nazwa, data.data_start, data.data_end, data.typ || 'swięto', data.opis);
    this.addLog('INSERT', 'dni_wolne', result.lastInsertRowid, null, JSON.stringify(data));
    return result;
  }

  updateDzienWolny(id, data) {
    const stmt = this.db.prepare(`
      UPDATE dni_wolne SET nazwa = ?, data_start = ?, data_end = ?, typ = ?, opis = ?
      WHERE id = ?
    `);
    const result = stmt.run(data.nazwa, data.data_start, data.data_end, data.typ, data.opis, id);
    this.addLog('UPDATE', 'dni_wolne', id, null, JSON.stringify(data));
    return result;
  }

  deleteDzienWolny(id) {
    const stmt = this.db.prepare('DELETE FROM dni_wolne WHERE id = ?');
    const result = stmt.run(id);
    this.addLog('DELETE', 'dni_wolne', id, null, null);
    return result;
  }

  // ============ EMAIL CONFIG ============
  getEmailConfig() {
    const stmt = this.db.prepare('SELECT * FROM email_config LIMIT 1');
    return stmt.get();
  }

  addEmailConfig(data) {
    const stmt = this.db.prepare(`
      INSERT INTO email_config (smtp_host, smtp_port, smtp_user, smtp_password, email_od, email_imie, test_email)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(data.smtp_host, data.smtp_port, data.smtp_user, data.smtp_password, 
                           data.email_od, data.email_imie, data.test_email);
    this.addLog('INSERT', 'email_config', result.lastInsertRowid, null, 'Email config added');
    return result;
  }

  updateEmailConfig(id, data) {
    const stmt = this.db.prepare(`
      UPDATE email_config SET smtp_host = ?, smtp_port = ?, smtp_user = ?, smtp_password = ?, 
                             email_od = ?, email_imie = ?, test_email = ?, data_aktualizacji = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    const result = stmt.run(data.smtp_host, data.smtp_port, data.smtp_user, data.smtp_password,
                           data.email_od, data.email_imie, data.test_email, id);
    this.addLog('UPDATE', 'email_config', id, null, 'Email config updated');
    return result;
  }

  // ============ BACKUPY ============
  getBackupy() {
    const stmt = this.db.prepare('SELECT * FROM backupy ORDER BY data_backup DESC');
    return stmt.all();
  }

  addBackup(sciezka, rozmiar, opis = '', typ = 'ręczny') {
    const stmt = this.db.prepare(`
      INSERT INTO backupy (sciezka, rozmiar, typ, opis)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(sciezka, rozmiar, typ, opis);
    this.addLog('INSERT', 'backupy', result.lastInsertRowid, null, `Backup: ${sciezka}`);
    return result;
  }

  deleteBackup(id) {
    const stmt = this.db.prepare('DELETE FROM backupy WHERE id = ?');
    const result = stmt.run(id);
    this.addLog('DELETE', 'backupy', id, null, null);
    return result;
  }

  // ============ USTAWIENIA ============
  getUstawienie(klucz) {
    const stmt = this.db.prepare('SELECT wartosc FROM ustawienia WHERE klucz = ?');
    const result = stmt.get(klucz);
    return result ? result.wartosc : null;
  }

  saveUstawienie(klucz, wartosc, typ = 'text') {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO ustawienia (klucz, wartosc, typ, data_aktualizacji)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `);
    return stmt.run(klucz, wartosc, typ);
  }

  // ============ LOGI ============
  addLog(akcja, tabela = null, rekord_id = null, stara_wartosc = null, nowa_wartosc = null) {
    const stmt = this.db.prepare(`
      INSERT INTO logi (akcja, tabela, rekord_id, stara_wartosc, nowa_wartosc)
      VALUES (?, ?, ?, ?, ?)
    `);
    return stmt.run(akcja, tabela, rekord_id, stara_wartosc, nowa_wartosc);
  }

  getLogi(limit = 100) {
    const stmt = this.db.prepare('SELECT * FROM logi ORDER BY data_akcji DESC LIMIT ?');
    return stmt.all(limit);
  }

  // ============ ZAPYTANIA ANALITYCZNE ============
  getZaleglosci(grupaId = null) {
    let query = `
      SELECT 
        r.id, r.imie, r.nazwisko, r.email, r.telefon,
        d.imie as dziecko_imie, d.nazwisko as dziecko_nazwisko,
        SUM(CASE WHEN p.status = 'zaległa' THEN p.kwota ELSE 0 END) as razem_zaleglosci,
        COUNT(CASE WHEN p.status = 'zaległa' THEN 1 END) as liczba_zaleglosci
      FROM rodzice r
      LEFT JOIN dzieci d ON r.id = d.rodzic_id
      LEFT JOIN platnosci p ON r.id = p.rodzic_id
      WHERE 1=1
    `;
    let params = [];

    if (grupaId) {
      query += ' AND d.grupa_id = ?';
      params.push(grupaId);
    }

    query += ' GROUP BY r.id, d.id HAVING razem_zaleglosci > 0 ORDER BY razem_zaleglosci DESC';
    const stmt = this.db.prepare(query);
    return stmt.all(...params);
  }

  getStatystyki(grupaId = null) {
    let query = `
      SELECT 
        COUNT(DISTINCT r.id) as liczba_rodzicow,
        COUNT(DISTINCT d.id) as liczba_dzieci,
        SUM(CASE WHEN p.status = 'opłacona' THEN p.kwota ELSE 0 END) as razem_oplacone,
        SUM(CASE WHEN p.status = 'zaległa' THEN p.kwota ELSE 0 END) as razem_zaleglosci,
        SUM(CASE WHEN p.status = 'oczekująca' THEN p.kwota ELSE 0 END) as razem_oczekujace
      FROM rodzice r
      LEFT JOIN dzieci d ON r.id = d.rodzic_id
      LEFT JOIN grupy g ON d.grupa_id = g.id
      LEFT JOIN platnosci p ON r.id = p.rodzic_id
      WHERE 1=1
    `;
    let params = [];

    if (grupaId) {
      query += ' AND g.id = ?';
      params.push(grupaId);
    }

    const stmt = this.db.prepare(query);
    return stmt.get(...params);
  }

  close() {
    this.db.close();
  }
}

module.exports = DatabaseManager;
