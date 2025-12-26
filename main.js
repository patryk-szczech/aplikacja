const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const Database = require('better-sqlite3');
const fs = require('fs');

let mainWindow;
let db;

// ============ DATABASE INITIALIZATION ============
function initDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'kwitariusz.db');
  
  try {
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    
    // Utwórz tabele
    db.exec(`
      CREATE TABLE IF NOT EXISTS placowka (
        id INTEGER PRIMARY KEY,
        nazwa TEXT,
        adres TEXT,
        telefon TEXT,
        email TEXT
      );

      CREATE TABLE IF NOT EXISTS grupy (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        placowka_id INTEGER,
        nazwa TEXT,
        opis TEXT
      );

      CREATE TABLE IF NOT EXISTS rodzice (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        placowka_id INTEGER,
        imie TEXT,
        nazwisko TEXT,
        email TEXT,
        telefon TEXT,
        adres TEXT,
        miasto TEXT,
        kod_pocztowy TEXT
      );

    CREATE TABLE IF NOT EXISTS dzieci (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rodzic_id INTEGER,
    rodzic_id_2 INTEGER,  // ← DODAJ TĘ LINIĘ
    grupa_id INTEGER,
    imie TEXT,
    nazwisko TEXT,
    data_urodzenia TEXT
);


      CREATE TABLE IF NOT EXISTS stawki (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        grupa_id INTEGER,
        kategoria TEXT,
        kwota INTEGER,
        data_od TEXT,
        data_do TEXT
      );

      CREATE TABLE IF NOT EXISTS platnosci (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rodzic_id INTEGER,
        dziecko_id INTEGER,
        kwota INTEGER,
        data_platnosci TEXT,
        kategoria TEXT,
        opis TEXT,
        status TEXT
      );

      CREATE TABLE IF NOT EXISTS obecnosci (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dziecko_id INTEGER,
        data TEXT,
        kategoria TEXT,
        obecny BOOLEAN
      );

      CREATE TABLE IF NOT EXISTS dni_wolne (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        data TEXT,
        nazwa TEXT,
        opis TEXT
      );

      CREATE TABLE IF NOT EXISTS backupy (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        data_utworzenia TEXT,
        sciezka TEXT
      );
    `);

    console.log('✅ Baza danych zainicjalizowana:', dbPath);
  } catch (error) {
    console.error('❌ Błąd inicjalizacji bazy danych:', error);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      sandbox: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', () => {
  initDatabase();
  createWindow();
});

app.on('window-all-closed', () => {
  if (db) db.close();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// ============ PLACÓWKA ============
ipcMain.handle('getPlacowka', async () => {
  try {
    const row = db.prepare('SELECT * FROM placowka LIMIT 1').get();
    return row || null;
  } catch (error) {
    console.error('Error getPlacowka:', error);
    return null;
  }
});

ipcMain.handle('addPlacowka', async (event, data) => {
  try {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO placowka (id, nazwa, adres, telefon, email)
      VALUES (1, ?, ?, ?, ?)
    `);
    const result = stmt.run(data.nazwa, data.adres, data.telefon, data.email);
    return { lastInsertRowid: result.lastInsertRowid };
  } catch (error) {
    console.error('Error addPlacowka:', error);
    throw error;
  }
});

ipcMain.handle('updatePlacowka', async (event, id, data) => {
  try {
    const stmt = db.prepare(`
      UPDATE placowka SET nazwa = ?, adres = ?, telefon = ?, email = ?
      WHERE id = ?
    `);
    const result = stmt.run(data.nazwa, data.adres, data.telefon, data.email, id);
    return { changes: result.changes };
  } catch (error) {
    console.error('Error updatePlacowka:', error);
    throw error;
  }
});

// ============ GRUPY ============
ipcMain.handle('getGrupy', async (event, placowkaId) => {
  try {
    const stmt = db.prepare('SELECT * FROM grupy WHERE placowka_id = ?');
    return stmt.all(placowkaId);
  } catch (error) {
    console.error('Error getGrupy:', error);
    return [];
  }
});

ipcMain.handle('addGrupa', async (event, data) => {
  try {
    const stmt = db.prepare(`
      INSERT INTO grupy (placowka_id, nazwa, opis)
      VALUES (?, ?, ?)
    `);
    const result = stmt.run(data.placowka_id, data.nazwa, data.opis);
    return { lastInsertRowid: result.lastInsertRowid };
  } catch (error) {
    console.error('Error addGrupa:', error);
    throw error;
  }
});

ipcMain.handle('deleteGrupa', async (event, id) => {
  try {
    const stmt = db.prepare('DELETE FROM grupy WHERE id = ?');
    const result = stmt.run(id);
    return { changes: result.changes };
  } catch (error) {
    console.error('Error deleteGrupa:', error);
    throw error;
  }
});

// ============ RODZICE ============
ipcMain.handle('getRodzice', async (event, placowkaId) => {
  try {
    const stmt = db.prepare('SELECT * FROM rodzice WHERE placowka_id = ?');
    return stmt.all(placowkaId);
  } catch (error) {
    console.error('Error getRodzice:', error);
    return [];
  }
});

ipcMain.handle('addRodzic', async (event, data) => {
  try {
    const stmt = db.prepare(`
      INSERT INTO rodzice (placowka_id, imie, nazwisko, email, telefon, adres, miasto, kod_pocztowy)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      data.placowka_id, data.imie, data.nazwisko, data.email,
      data.telefon, data.adres, data.miasto, data.kod_pocztowy
    );
    return { lastInsertRowid: result.lastInsertRowid };
  } catch (error) {
    console.error('Error addRodzic:', error);
    throw error;
  }
});

ipcMain.handle('deleteRodzic', async (event, id) => {
  try {
    const stmt = db.prepare('DELETE FROM rodzice WHERE id = ?');
    const result = stmt.run(id);
    return { changes: result.changes };
  } catch (error) {
    console.error('Error deleteRodzic:', error);
    throw error;
  }
});

// ============ DZIECI ============
ipcMain.handle('getDzieci', async () => {
  try {
    return db.prepare('SELECT * FROM dzieci').all();
  } catch (error) {
    console.error('Error getDzieci:', error);
    return [];
  }
});

ipcMain.handle('addDziecko', async (event, data) => {
  try {
    const stmt = db.prepare(`
      INSERT INTO dzieci (rodzic_id, grupa_id, imie, nazwisko, data_urodzenia)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(data.rodzic_id, data.grupa_id, data.imie, data.nazwisko, data.data_urodzenia);
    return { lastInsertRowid: result.lastInsertRowid };
  } catch (error) {
    console.error('Error addDziecko:', error);
    throw error;
  }
});

ipcMain.handle('deleteDziecko', async (event, id) => {
  try {
    const stmt = db.prepare('DELETE FROM dzieci WHERE id = ?');
    const result = stmt.run(id);
    return { changes: result.changes };
  } catch (error) {
    console.error('Error deleteDziecko:', error);
    throw error;
  }
});

// ============ STAWKI ============
ipcMain.handle('getStawki', async () => {
  try {
    return db.prepare('SELECT * FROM stawki').all();
  } catch (error) {
    console.error('Error getStawki:', error);
    return [];
  }
});

ipcMain.handle('addStawka', async (event, data) => {
  try {
    const stmt = db.prepare(`
      INSERT INTO stawki (grupa_id, kategoria, kwota, data_od, data_do)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(data.grupa_id, data.kategoria, data.kwota, data.data_od, data.data_do);
    return { lastInsertRowid: result.lastInsertRowid };
  } catch (error) {
    console.error('Error addStawka:', error);
    throw error;
  }
});

ipcMain.handle('deleteStawka', async (event, id) => {
  try {
    const stmt = db.prepare('DELETE FROM stawki WHERE id = ?');
    const result = stmt.run(id);
    return { changes: result.changes };
  } catch (error) {
    console.error('Error deleteStawka:', error);
    throw error;
  }
});

// ============ PŁATNOŚCI ============
ipcMain.handle('getPlatnosci', async () => {
  try {
    return db.prepare('SELECT * FROM platnosci ORDER BY data_platnosci DESC').all();
  } catch (error) {
    console.error('Error getPlatnosci:', error);
    return [];
  }
});

ipcMain.handle('addPlatnosc', async (event, data) => {
  try {
    const stmt = db.prepare(`
      INSERT INTO platnosci (rodzic_id, dziecko_id, kwota, data_platnosci, kategoria, opis, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      data.rodzic_id, data.dziecko_id || null, data.kwota, data.data_platnosci,
      data.kategoria, data.opis, data.status
    );
    return { lastInsertRowid: result.lastInsertRowid };
  } catch (error) {
    console.error('Error addPlatnosc:', error);
    throw error;
  }
});

ipcMain.handle('deletePlatnosc', async (event, id) => {
  try {
    const stmt = db.prepare('DELETE FROM platnosci WHERE id = ?');
    const result = stmt.run(id);
    return { changes: result.changes };
  } catch (error) {
    console.error('Error deletePlatnosc:', error);
    throw error;
  }
});

// ============ STATYSTYKI ============
ipcMain.handle('getStatystyki', async (event, grupaId) => {
  try {
    const rodzice = db.prepare('SELECT COUNT(*) as count FROM rodzice').get();
    const dzieci = db.prepare('SELECT COUNT(*) as count FROM dzieci').get();
    const oplacone = db.prepare('SELECT SUM(kwota) as suma FROM platnosci WHERE status = ?').get('opłacona');
    
    return {
      liczba_rodzicow: rodzice.count,
      liczba_dzieci: dzieci.count,
      razem_oplacone: oplacone.suma || 0,
      razem_zaleglosci: 0
    };
  } catch (error) {
    console.error('Error getStatystyki:', error);
    return { liczba_rodzicow: 0, liczba_dzieci: 0, razem_oplacone: 0, razem_zaleglosci: 0 };
  }
});

// ============ RAPORTY ============
ipcMain.handle('generatePdfReport', async (event, type, options) => {
  try {
    console.log('Generating PDF report:', type);
    return { success: true };
  } catch (error) {
    console.error('Error generatePdfReport:', error);
    throw error;
  }
});

ipcMain.handle('generateExcelReport', async (event, type, options) => {
  try {
    console.log('Generating Excel report:', type);
    return { success: true };
  } catch (error) {
    console.error('Error generateExcelReport:', error);
    throw error;
  }
});

ipcMain.handle('generateInvoice', async (event, rodzicId, date) => {
  try {
    console.log('Generating invoice for:', rodzicId);
    return { success: true };
  } catch (error) {
    console.error('Error generateInvoice:', error);
    throw error;
  }
});

// ============ IMPORT ============
ipcMain.handle('selectImportFile', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    filters: [{ name: 'CSV/Excel', extensions: ['csv', 'xlsx'] }]
  });
  return result.filePaths[0] || null;
});

ipcMain.handle('importCSV', async (event, filePath) => {
  try {
    console.log('Importing CSV:', filePath);
    return { success: true, imported: 0 };
  } catch (error) {
    console.error('Error importCSV:', error);
    throw error;
  }
});

ipcMain.handle('importXLSX', async (event, filePath) => {
  try {
    console.log('Importing XLSX:', filePath);
    return { success: true, imported: 0 };
  } catch (error) {
    console.error('Error importXLSX:', error);
    throw error;
  }
});

// ============ BACKUP ============
ipcMain.handle('backupData', async () => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(app.getPath('userData'), 'backups');
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const backupPath = path.join(backupDir, `backup-${timestamp}.db`);
    const dbPath = path.join(app.getPath('userData'), 'kwitariusz.db');
    
    fs.copyFileSync(dbPath, backupPath);
    
    const stmt = db.prepare('INSERT INTO backupy (data_utworzenia, sciezka) VALUES (?, ?)');
    stmt.run(new Date().toISOString(), backupPath);
    
    return { success: true };
  } catch (error) {
    console.error('Error backupData:', error);
    throw error;
  }
});

ipcMain.handle('restoreData', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      filters: [{ name: 'Backup', extensions: ['db'] }]
    });

    if (result.filePaths.length > 0) {
      const backupPath = result.filePaths[0];
      const dbPath = path.join(app.getPath('userData'), 'kwitariusz.db');
      
      db.close();
      fs.copyFileSync(backupPath, dbPath);
      
      return { success: true };
    }
    return { success: false };
  } catch (error) {
    console.error('Error restoreData:', error);
    throw error;
  }
});

// ============ HELPERS ============
ipcMain.handle('calculatePaymentFromAttendance', async (event, dzieckoId, month) => {
  try {
    return { kwota: 0 };
  } catch (error) {
    console.error('Error calculatePaymentFromAttendance:', error);
    return { kwota: 0 };
  }
});

ipcMain.handle('getArrearsForParent', async (event, rodzicId) => {
  try {
    return { zaleglosc: 0, data_od: null };
  } catch (error) {
    console.error('Error getArrearsForParent:', error);
    return { zaleglosc: 0, data_od: null };
  }
});
