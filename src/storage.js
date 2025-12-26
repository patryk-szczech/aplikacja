const fs = require('fs');
const path = require('path');
const os = require('os');
const { app } = require('electron');

class StorageManager {
  constructor() {
    this.userDataPath = app.getPath('userData');
    this.backupDir = path.join(this.userDataPath, 'backups');
    
    // Utwórz folder na backupy jeśli nie istnieje
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * Tworzy backup bazy danych
   */
  async createBackup(db, outputPath = null) {
    try {
      const dbPath = path.join(this.userDataPath, 'kwitariusz.db');

      if (!outputPath) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        outputPath = path.join(this.backupDir, `backup-${timestamp}.db`);
      }

      // Skopiuj plik bazy danych
      fs.copyFileSync(dbPath, outputPath);

      // Pobierz rozmiar pliku
      const stats = fs.statSync(outputPath);

      // Dodaj wpis do bazy (jeśli używasz menadżera)
      if (db) {
        db.addBackup(outputPath, stats.size, 'Backup utworzony ręcznie', 'ręczny');
      }

      return {
        success: true,
        filePath: outputPath,
        size: stats.size,
        message: 'Backup został utworzony pomyślnie'
      };
    } catch (error) {
      return {
        success: false,
        message: `Błąd podczas tworzenia backupu: ${error.message}`
      };
    }
  }

  /**
   * Przywraca backup bazy danych
   */
  async restoreBackup(db, backupPath) {
    try {
      const dbPath = path.join(this.userDataPath, 'kwitariusz.db');

      if (!fs.existsSync(backupPath)) {
        return {
          success: false,
          message: 'Plik backupu nie istnieje'
        };
      }

      // Zamknij aktualną bazę (jeśli została zainicjalizowana)
      if (db && db.close) {
        db.close();
      }

      // Utwórz backup aktualnego pliku przed przywróceniem
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const safetyBackup = path.join(this.backupDir, `pre-restore-${timestamp}.db`);
      if (fs.existsSync(dbPath)) {
        fs.copyFileSync(dbPath, safetyBackup);
      }

      // Przywróć backup
      fs.copyFileSync(backupPath, dbPath);

      return {
        success: true,
        message: 'Backup został przywrócony pomyślnie',
        safetyBackup: safetyBackup
      };
    } catch (error) {
      return {
        success: false,
        message: `Błąd podczas przywracania backupu: ${error.message}`
      };
    }
  }

  /**
   * Pobiera listę dostępnych backupów
   */
  getAvailableBackups() {
    try {
      if (!fs.existsSync(this.backupDir)) {
        return [];
      }

      const files = fs.readdirSync(this.backupDir);
      const backups = [];

      files.forEach(file => {
        const filePath = path.join(this.backupDir, file);
        const stats = fs.statSync(filePath);

        backups.push({
          nazwa: file,
          sciezka: filePath,
          rozmiar: stats.size,
          rozmiar_mb: (stats.size / 1024 / 1024).toFixed(2),
          data_utworzenia: stats.birthtime,
          data_modyfikacji: stats.mtime
        });
      });

      // Sortuj po dacie (najnowsze na górze)
      backups.sort((a, b) => b.data_modyfikacji - a.data_modyfikacji);

      return backups;
    } catch (error) {
      console.error('Błąd przy pobieraniu backupów:', error);
      return [];
    }
  }

  /**
   * Usuwa stary backup
   */
  deleteBackup(backupPath) {
    try {
      if (fs.existsSync(backupPath)) {
        fs.unlinkSync(backupPath);
        return {
          success: true,
          message: 'Backup został usunięty'
        };
      }
      return {
        success: false,
        message: 'Plik backupu nie istnieje'
      };
    } catch (error) {
      return {
        success: false,
        message: `Błąd przy usuwaniu backupu: ${error.message}`
      };
    }
  }

  /**
   * Obsługuje zapis na pendrive
   */
  async setupPortableStorage(pendrivePath) {
    try {
      if (!fs.existsSync(pendrivePath)) {
        return {
          success: false,
          message: 'Ścieżka pendrive\'a nie istnieje'
        };
      }

      const appDir = path.join(pendrivePath, 'kwitariusz-data');
      if (!fs.existsSync(appDir)) {
        fs.mkdirSync(appDir, { recursive: true });
      }

      // Skopiuj baza danych
      const dbPath = path.join(this.userDataPath, 'kwitariusz.db');
      const portableDbPath = path.join(appDir, 'kwitariusz.db');

      if (fs.existsSync(dbPath)) {
        fs.copyFileSync(dbPath, portableDbPath);
      }

      return {
        success: true,
        message: 'Aplikacja została skopiowana na pendrive',
        sciezka: appDir
      };
    } catch (error) {
      return {
        success: false,
        message: `Błąd przy zapisie na pendrive: ${error.message}`
      };
    }
  }

  /**
   * Uruchamia aplikację z pendrive'a
   */
  async runFromPortable(pendrivePath) {
    try {
      const dbPath = path.join(pendrivePath, 'kwitariusz-data', 'kwitariusz.db');

      if (!fs.existsSync(dbPath)) {
        return {
          success: false,
          message: 'Baza danych nie znaleziona na pendrive'
        };
      }

      return {
        success: true,
        message: 'Aplikacja pracuje w trybie przenośnym',
        dbPath: dbPath
      };
    } catch (error) {
      return {
        success: false,
        message: `Błąd przy uruchamianiu z pendrive: ${error.message}`
      };
    }
  }

  /**
   * Synchronizuje dane między pendrive'em a komputerem
   */
  async syncPortableStorage(pendrivePath, direction = 'from-portable') {
    try {
      const portableDbPath = path.join(pendrivePath, 'kwitariusz-data', 'kwitariusz.db');
      const localDbPath = path.join(this.userDataPath, 'kwitariusz.db');

      if (direction === 'from-portable') {
        // Kopiuj z pendrive na komputer
        if (fs.existsSync(portableDbPath)) {
          fs.copyFileSync(portableDbPath, localDbPath);
          return {
            success: true,
            message: 'Dane zsynchronizowane z pendrive na komputer'
          };
        }
      } else {
        // Kopiuj z komputera na pendrive
        if (fs.existsSync(localDbPath)) {
          fs.copyFileSync(localDbPath, portableDbPath);
          return {
            success: true,
            message: 'Dane zsynchronizowane z komputera na pendrive'
          };
        }
      }

      return {
        success: false,
        message: 'Nie można zsynchronizować danych'
      };
    } catch (error) {
      return {
        success: false,
        message: `Błąd przy synchronizacji: ${error.message}`
      };
    }
  }

  /**
   * Pobiera informacje o dostępnym miejscu na dysku
   */
  async getStorageInfo() {
    try {
      const diskSpace = require('diskusage');
      const info = diskSpace.check(this.userDataPath);

      return {
        total: info.total,
        used: info.used,
        available: info.available,
        totalMB: (info.total / 1024 / 1024).toFixed(2),
        usedMB: (info.used / 1024 / 1024).toFixed(2),
        availableMB: (info.available / 1024 / 1024).toFixed(2)
      };
    } catch (error) {
      return {
        success: false,
        message: `Błąd przy pobieraniu informacji o dysku: ${error.message}`
      };
    }
  }

  /**
   * Czyści stare backupy (starsze niż X dni)
   */
  cleanOldBackups(daysOld = 30) {
    try {
      const backups = this.getAvailableBackups();
      const now = Date.now();
      const millisecondsPerDay = 24 * 60 * 60 * 1000;
      const cutoffTime = now - (daysOld * millisecondsPerDay);

      let deletedCount = 0;

      backups.forEach(backup => {
        if (backup.data_modyfikacji.getTime() < cutoffTime) {
          try {
            fs.unlinkSync(backup.sciezka);
            deletedCount++;
          } catch (e) {
            console.error(`Nie udało się usunąć: ${backup.sciezka}`);
          }
        }
      });

      return {
        success: true,
        message: `Usunięto ${deletedCount} starych backupów`,
        deleted: deletedCount
      };
    } catch (error) {
      return {
        success: false,
        message: `Błąd przy czyszczeniu backupów: ${error.message}`
      };
    }
  }
}

module.exports = StorageManager;
