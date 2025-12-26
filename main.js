const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

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

// Podstawowe IPC handlers (bez sqlite)
ipcMain.handle('getPlacowka', async () => {
  return { id: 1, nazwa: 'Szkoła Testowa', adres: 'ul. Testowa 1' };
});

ipcMain.handle('getGrupy', async (event, placowkaId) => {
  return [
    { id: 1, nazwa: 'Przedszkole', opis: 'Grupy przedszkolne' },
    { id: 2, nazwa: 'Szkoła', opis: 'Klasy szkolne' }
  ];
});

ipcMain.handle('getRodzice', async (event, placowkaId) => {
  return [];
});

ipcMain.handle('getDzieci', async () => {
  return [];
});

ipcMain.handle('getStawki', async () => {
  return [];
});

ipcMain.handle('getPlatnosci', async () => {
  return [];
});

ipcMain.handle('getStatystyki', async (event, grupaId) => {
  return {
    liczba_rodzicow: 0,
    liczba_dzieci: 0,
    razem_oplacone: 0,
    razem_zaleglosci: 0
  };
});
