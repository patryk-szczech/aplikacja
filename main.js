const { app, BrowserWindow, ipcMain, Menu, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const DatabaseManager = require('./src/database');
const EmailManager = require('./src/email');
const ReportManager = require('./src/reports');
const FinanceManager = require('./src/finance');
const ImportManager = require('./src/import');
const SyncManager = require('./src/sync');
const CalendarManager = require('./src/calendar');
const StorageManager = require('./src/storage');

let mainWindow;
let db;
let emailManager;
let reportManager;
let financeManager;
let importManager;
let syncManager;
let calendarManager;
let storageManager;

app.on('ready', () => {
  // Inicjalizacja menedżerów
  db = new DatabaseManager();
  emailManager = new EmailManager(db);
  reportManager = new ReportManager(db);
  financeManager = new FinanceManager(db);
  importManager = new ImportManager(db);
  syncManager = new SyncManager(db);
  calendarManager = new CalendarManager(db);
  storageManager = new StorageManager();

  // Tworzenie okna
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      sandbox: true
    },
    icon: path.join(__dirname, 'assets', 'icon.png')
  });

  mainWindow.loadFile('index.html');

  // Otwiera DevTools w development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  createMenu();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (db) db.close();
    app.quit();
  }
});

// ============ MENU ============
function createMenu() {
  const template = [
    {
      label: 'Plik',
      submenu: [
        {
          label: 'Nowy Backup',
          accelerator: 'Ctrl+B',
          click: () => handleBackup()
        },
        {
          label: 'Przywróć z Backup',
          click: () => handleRestore()
        },
        { type: 'separator' },
        {
          label: 'Wyjście',
          accelerator: 'Ctrl+Q',
          click: () => app.quit()
        }
      ]
    },
    {
      label: 'Edycja',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' }
      ]
    },
    {
      label: 'Widok',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Pomoc',
      submenu: [
        {
          label: 'O aplikacji',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'O aplikacji',
              message: 'Kwitariusz Szkoły v2.0.0',
              detail: 'System zarządzania opłatami szkolnymi'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// ============ IPC HANDLERS ============

// PLACÓWKA
ipcMain.handle('get-placowka', () => {
  return db.getPlacowka();
});

ipcMain.handle('add-placowka', (event, data) => {
  return db.addPlacowka(data);
});

ipcMain.handle('update-placowka', (event, id, data) => {
  return db.updatePlacowka(id, data);
});

// GRUPY
ipcMain.handle('get-grupy', (event, placowkaId) => {
  return db.getGrupy(placowkaId);
});

ipcMain.handle('add-grupa', (event, data) => {
  return db.addGrupa(data);
});

ipcMain.handle('update-grupa', (event, id, data) => {
  return db.updateGrupa(id, data);
});

ipcMain.handle('delete-grupa', (event, id) => {
  return db.deleteGrupa(id);
});

// RODZICE
ipcMain.handle('get-rodzice', (event, placowkaId) => {
  return db.getRodzice(placowkaId);
});

ipcMain.handle('add-rodzic', (event, data) => {
  return db.addRodzic(data);
});

ipcMain.handle('update-rodzic', (event, id, data) => {
  return db.updateRodzic(id, data);
});

ipcMain.handle('delete-rodzic', (event, id) => {
  return db.deleteRodzic(id);
});

// DZIECI
ipcMain.handle('get-dzieci', (event, grupaId, rodzicId) => {
  return db.getDzieci(grupaId, rodzicId);
});

ipcMain.handle('add-dziecko', (event, data) => {
  return db.addDziecko(data);
});

ipcMain.handle('update-dziecko', (event, id, data) => {
  return db.updateDziecko(id, data);
});

ipcMain.handle('delete-dziecko', (event, id) => {
  return db.deleteDziecko(id);
});

// STAWKI
ipcMain.handle('get-stawki', (event, grupaId) => {
  return db.getStawki(grupaId);
});

ipcMain.handle('add-stawka', (event, data) => {
  return db.addStawka(data);
});

ipcMain.handle('update-stawka', (event, id, data) => {
  return db.updateStawka(id, data);
});

ipcMain.handle('delete-stawka', (event, id) => {
  return db.deleteStawka(id);
});

// OBECNOŚCI
ipcMain.handle('get-obecnosci', (event, dzieckoId, dataOd, dataDo) => {
  return db.getObecnosci(dzieckoId, dataOd, dataDo);
});

ipcMain.handle('set-obecnosc', (event, dzieckoId, data, present, kategoria) => {
  return db.setObecnosc(dzieckoId, data, present, kategoria);
});

ipcMain.handle('delete-obecnosc', (event, id) => {
  return db.deleteObecnosc(id);
});

// PŁATNOŚCI
ipcMain.handle('get-platnosci', (event, rodzicId, dzieckoId, statusFilter) => {
  return db.getPlatnosci(rodzicId, dzieckoId, statusFilter);
});

ipcMain.handle('add-platnosc', (event, data) => {
  return db.addPlatnosc(data);
});

ipcMain.handle('update-platnosc', (event, id, data) => {
  return db.updatePlatnosc(id, data);
});

ipcMain.handle('delete-platnosc', (event, id) => {
  return db.deletePlatnosc(id);
});

// HISTORIA TRANSAKCJI
ipcMain.handle('get-historia-transakcji', (event, rodzicId, dzieckoId) => {
  return db.getHistoriaTransakcji(rodzicId, dzieckoId);
});

ipcMain.handle('add-transakcje', (event, data) => {
  return db.addTransakcje(data);
});

// DNI WOLNE
ipcMain.handle('get-dni-wolne', (event, placowkaId, dataOd, dataDo) => {
  return db.getDniWolne(placowkaId, dataOd, dataDo);
});

ipcMain.handle('add-dzien-wolny', (event, data) => {
  return db.addDzienWolny(data);
});

ipcMain.handle('update-dzien-wolny', (event, id, data) => {
  return db.updateDzienWolny(id, data);
});

ipcMain.handle('delete-dzien-wolny', (event, id) => {
  return db.deleteDzienWolny(id);
});

// EMAIL CONFIG
ipcMain.handle('get-email-config', () => {
  return db.getEmailConfig();
});

ipcMain.handle('save-email-config', (event, data) => {
  if (db.getEmailConfig()) {
    return db.updateEmailConfig(db.getEmailConfig().id, data);
  }
  return db.addEmailConfig(data);
});

ipcMain.handle('test-email', async (event, config) => {
  return await emailManager.testConnection(config);
});

// WYSYŁANIE EMAILI
ipcMain.handle('send-email', async (event, options) => {
  return await emailManager.sendEmail(options);
});

ipcMain.handle('send-bulk-email', async (event, recipients, subject, template) => {
  return await emailManager.sendBulkEmail(recipients, subject, template);
});

ipcMain.handle('send-reminder-email', async (event, rodzicId) => {
  return await emailManager.sendReminderEmail(rodzicId);
});

// RAPORTY
ipcMain.handle('generate-pdf-report', async (event, type, data) => {
  return await reportManager.generatePdfReport(type, data);
});

ipcMain.handle('generate-excel-report', async (event, type, data) => {
  return await reportManager.generateExcelReport(type, data);
});

ipcMain.handle('generate-invoice', async (event, rodzicId, period) => {
  return await reportManager.generateInvoice(rodzicId, period);
});

// FINANSE
ipcMain.handle('get-zaleglosci', (event, grupaId) => {
  return db.getZaleglosci(grupaId);
});

ipcMain.handle('get-statystyki', (event, grupaId) => {
  return db.getStatystyki(grupaId);
});

ipcMain.handle('calculate-rates', (event, dzieckoId, dataOd, dataDo) => {
  return financeManager.calculateRates(dzieckoId, dataOd, dataDo);
});

// IMPORT
ipcMain.handle('import-csv', async (event, filePath) => {
  return await importManager.importCSV(filePath);
});

ipcMain.handle('import-xlsx', async (event, filePath) => {
  return await importManager.importXLSX(filePath);
});

ipcMain.handle('select-import-file', async (event) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'CSV/Excel', extensions: ['csv', 'xlsx', 'xls'] }
    ]
  });
  return result.filePaths[0] || null;
});

// BACKUP & RESTORE
ipcMain.handle('backup-data', async (event) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: path.join(os.homedir(), `kwitariusz-backup-${new Date().toISOString().split('T')[0]}.db`),
    filters: [{ name: 'Database', extensions: ['db'] }]
  });

  if (!result.canceled) {
    return storageManager.createBackup(db, result.filePath);
  }
  return false;
});

ipcMain.handle('restore-data', async (event) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Database', extensions: ['db'] }]
  });

  if (!result.canceled) {
    return storageManager.restoreBackup(db, result.filePaths[0]);
  }
  return false;
});

ipcMain.handle('get-backupy', () => {
  return db.getBackupy();
});

// GOOGLE DRIVE SYNC
ipcMain.handle('sync-to-google-drive', async (event) => {
  return await syncManager.syncToGoogleDrive();
});

ipcMain.handle('sync-from-google-drive', async (event) => {
  return await syncManager.syncFromGoogleDrive();
});

// USTAWIENIA
ipcMain.handle('get-ustawienie', (event, klucz) => {
  return db.getUstawienie(klucz);
});

ipcMain.handle('save-ustawienie', (event, klucz, wartosc, typ) => {
  return db.saveUstawienie(klucz, wartosc, typ);
});

// LOGI
ipcMain.handle('get-logi', (event, limit) => {
  return db.getLogi(limit);
});

// ============ BACKUP FUNCTION ============
async function handleBackup() {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: path.join(os.homedir(), `kwitariusz-backup-${new Date().toISOString().split('T')[0]}.db`),
    filters: [{ name: 'Database', extensions: ['db'] }]
  });

  if (!result.canceled) {
    try {
      await storageManager.createBackup(db, result.filePath);
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Sukces',
        message: 'Backup został utworzony pomyślnie'
      });
    } catch (error) {
      dialog.showErrorBox('Błąd', `Nie udało się utworzyć backup: ${error.message}`);
    }
  }
}

async function handleRestore() {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Database', extensions: ['db'] }]
  });

  if (!result.canceled) {
    try {
      await storageManager.restoreBackup(db, result.filePaths[0]);
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Sukces',
        message: 'Dane zostały przywrócone. Aplikacja będzie przeładowana.'
      });
      mainWindow.reload();
    } catch (error) {
      dialog.showErrorBox('Błąd', `Nie udało się przywrócić danych: ${error.message}`);
    }
  }
}

// Obsługa gracefulnego zamknięcia
process.on('exit', () => {
  if (db) db.close();
});
