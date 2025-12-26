const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

// ============ IN-MEMORY DATABASE (na razie) ============
let database = {
  placowka: null,
  grupy: [],
  rodzice: [],
  dzieci: [],
  stawki: [],
  platnosci: [],
  obecnosci: [],
  dni_wolne: [],
  backupy: []
};

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

app.on('ready', createWindow);

app.on('window-all-closed', () => {
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
  return database.placowka;
});

ipcMain.handle('addPlacowka', async (event, data) => {
  database.placowka = { id: 1, ...data };
  return { lastInsertRowid: 1 };
});

ipcMain.handle('updatePlacowka', async (event, id, data) => {
  database.placowka = { id, ...data };
  return { changes: 1 };
});

// ============ GRUPY ============
ipcMain.handle('getGrupy', async (event, placowkaId) => {
  return database.grupy;
});

ipcMain.handle('addGrupa', async (event, data) => {
  const id = database.grupy.length + 1;
  database.grupy.push({ id, ...data });
  return { lastInsertRowid: id };
});

ipcMain.handle('deleteGrupa', async (event, id) => {
  database.grupy = database.grupy.filter(g => g.id !== id);
  return { changes: 1 };
});

// ============ RODZICE ============
ipcMain.handle('getRodzice', async (event, placowkaId) => {
  return database.rodzice;
});

ipcMain.handle('addRodzic', async (event, data) => {
  const id = database.rodzice.length + 1;
  database.rodzice.push({ id, ...data });
  return { lastInsertRowid: id };
});

ipcMain.handle('deleteRodzic', async (event, id) => {
  database.rodzice = database.rodzice.filter(r => r.id !== id);
  return { changes: 1 };
});

// ============ DZIECI ============
ipcMain.handle('getDzieci', async () => {
  return database.dzieci;
});

ipcMain.handle('addDziecko', async (event, data) => {
  const id = database.dzieci.length + 1;
  database.dzieci.push({ id, ...data });
  return { lastInsertRowid: id };
});

ipcMain.handle('deleteDziecko', async (event, id) => {
  database.dzieci = database.dzieci.filter(d => d.id !== id);
  return { changes: 1 };
});

// ============ STAWKI ============
ipcMain.handle('getStawki', async () => {
  return database.stawki;
});

ipcMain.handle('addStawka', async (event, data) => {
  const id = database.stawki.length + 1;
  database.stawki.push({ id, ...data });
  return { lastInsertRowid: id };
});

ipcMain.handle('deleteStawka', async (event, id) => {
  database.stawki = database.stawki.filter(s => s.id !== id);
  return { changes: 1 };
});

// ============ PŁATNOŚCI ============
ipcMain.handle('getPlatnosci', async () => {
  return database.platnosci;
});

ipcMain.handle('addPlatnosc', async (event, data) => {
  const id = database.platnosci.length + 1;
  database.platnosci.push({ id, ...data });
  return { lastInsertRowid: id };
});

ipcMain.handle('deletePlatnosc', async (event, id) => {
  database.platnosci = database.platnosci.filter(p => p.id !== id);
  return { changes: 1 };
});

// ============ STATYSTYKI ============
ipcMain.handle('getStatystyki', async (event, grupaId) => {
  const liczba_rodzicow = database.rodzice.length;
  const liczba_dzieci = database.dzieci.length;
  const razem_oplacone = database.platnosci.reduce((sum, p) => sum + (p.kwota || 0), 0);
  const razem_zaleglosci = 0;

  return {
    liczba_rodzicow,
    liczba_dzieci,
    razem_oplacone,
    razem_zaleglosci
  };
});

// ============ RAPORTY ============
ipcMain.handle('generatePdfReport', async (event, type, options) => {
  console.log('Generating PDF report:', type);
  return { success: true };
});

ipcMain.handle('generateExcelReport', async (event, type, options) => {
  console.log('Generating Excel report:', type);
  return { success: true };
});

ipcMain.handle('generateInvoice', async (event, rodzicId, date) => {
  console.log('Generating invoice for:', rodzicId);
  return { success: true };
});

// ============ IMPORT ============
ipcMain.handle('selectImportFile', async () => {
  return null; // Placeholder
});

ipcMain.handle('importCSV', async (event, filePath) => {
  return { success: true, imported: 0 };
});

ipcMain.handle('importXLSX', async (event, filePath) => {
  return { success: true, imported: 0 };
});

// ============ BACKUP ============
ipcMain.handle('backupData', async () => {
  const backup = {
    id: database.backupy.length + 1,
    data: new Date().toISOString(),
    content: JSON.stringify(database)
  };
  database.backupy.push(backup);
  return { success: true };
});

ipcMain.handle('restoreData', async () => {
  return { success: true };
});

// ============ SYNC ============
ipcMain.handle('syncGoogleDrive', async () => {
  return { success: true };
});

// ============ EMAIL ============
ipcMain.handle('configureEmail', async (event, config) => {
  return { success: true };
});

ipcMain.handle('sendEmail', async (event, to, subject, body) => {
  console.log('Sending email to:', to);
  return { success: true };
});

ipcMain.handle('sendBulkEmail', async (event, recipients, template) => {
  console.log('Sending bulk email to:', recipients.length, 'recipients');
  return { success: true };
});

// ============ OBECNOŚCI ============
ipcMain.handle('getObecnosci', async (event, dzieckoId) => {
  return database.obecnosci;
});

ipcMain.handle('addObecnosc', async (event, data) => {
  const id = database.obecnosci.length + 1;
  database.obecnosci.push({ id, ...data });
  return { lastInsertRowid: id };
});

// ============ DNI WOLNE ============
ipcMain.handle('getDniWolne', async () => {
  return database.dni_wolne;
});

ipcMain.handle('addDzienWolny', async (event, data) => {
  const id = database.dni_wolne.length + 1;
  database.dni_wolne.push({ id, ...data });
  return { lastInsertRowid: id };
});

// ============ HELPERS ============
ipcMain.handle('calculatePaymentFromAttendance', async (event, dzieckoId, month) => {
  return { kwota: 0 };
});

ipcMain.handle('getArrearsForParent', async (event, rodzicId) => {
  return { zaleglosc: 0, data_od: null };
});
