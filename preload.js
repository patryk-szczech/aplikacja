const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Placówka
  getPlacowka: () => ipcRenderer.invoke('getPlacowka'),
  addPlacowka: (data) => ipcRenderer.invoke('addPlacowka', data),
  updatePlacowka: (id, data) => ipcRenderer.invoke('updatePlacowka', id, data),

  // Grupy
  getGrupy: (placowkaId) => ipcRenderer.invoke('getGrupy', placowkaId),
  addGrupa: (data) => ipcRenderer.invoke('addGrupa', data),
  deleteGrupa: (id) => ipcRenderer.invoke('deleteGrupa', id),

  // Rodzice
  getRodzice: (placowkaId) => ipcRenderer.invoke('getRodzice', placowkaId),
  addRodzic: (data) => ipcRenderer.invoke('addRodzic', data),
  deleteRodzic: (id) => ipcRenderer.invoke('deleteRodzic', id),

  // Dzieci
  getDzieci: () => ipcRenderer.invoke('getDzieci'),
  addDziecko: (data) => ipcRenderer.invoke('addDziecko', data),
  deleteDziecko: (id) => ipcRenderer.invoke('deleteDziecko', id),

  // Stawki
  getStawki: () => ipcRenderer.invoke('getStawki'),
  addStawka: (data) => ipcRenderer.invoke('addStawka', data),
  deleteStawka: (id) => ipcRenderer.invoke('deleteStawka', id),

  // Płatności
  getPlatnosci: () => ipcRenderer.invoke('getPlatnosci'),
  addPlatnosc: (data) => ipcRenderer.invoke('addPlatnosc', data),
  deletePlatnosc: (id) => ipcRenderer.invoke('deletePlatnosc', id),

  // Statystyki
  getStatystyki: (grupaId) => ipcRenderer.invoke('getStatystyki', grupaId),

  // Raporty
  generatePdfReport: (type, options) => ipcRenderer.invoke('generatePdfReport', type, options),
  generateExcelReport: (type, options) => ipcRenderer.invoke('generateExcelReport', type, options),
  generateInvoice: (rodzicId, date) => ipcRenderer.invoke('generateInvoice', rodzicId, date),

  // Import
  selectImportFile: () => ipcRenderer.invoke('selectImportFile'),
  importCSV: (filePath) => ipcRenderer.invoke('importCSV', filePath),
  importXLSX: (filePath) => ipcRenderer.invoke('importXLSX', filePath),

  // Backup
  backupData: () => ipcRenderer.invoke('backupData'),
  restoreData: () => ipcRenderer.invoke('restoreData'),

  // Helpers
  calculatePaymentFromAttendance: (dzieckoId, month) => ipcRenderer.invoke('calculatePaymentFromAttendance', dzieckoId, month),
  getArrearsForParent: (rodzicId) => ipcRenderer.invoke('getArrearsForParent', rodzicId)
});
