const { app, dialog, BrowserWindow } = require('electron');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

// Configure logging
log.transports.file.level = 'info';
autoUpdater.logger = log;
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

class AppUpdater {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    
    // Configure event handlers
    autoUpdater.on('checking-for-update', () => {
      this.sendStatusToWindow('checking-for-update', 'בודק עדכונים...');
    });
    
    autoUpdater.on('update-available', (info) => {
      this.sendStatusToWindow('update-available', `עדכון חדש זמין! גרסה ${info.version}`);
    });
    
    autoUpdater.on('update-not-available', () => {
      this.sendStatusToWindow('update-not-available', 'אתה משתמש בגרסה האחרונה');
    });
    
    autoUpdater.on('error', (err) => {
      this.sendStatusToWindow('error', `שגיאה בבדיקת עדכונים: ${err.message}`);
    });
    
    autoUpdater.on('download-progress', (progressObj) => {
      const message = `מהירות: ${progressObj.bytesPerSecond} - ${progressObj.percent.toFixed(2)}% (${progressObj.transferred}/${progressObj.total})`;
      this.sendStatusToWindow('download-progress', message);
    });
    
    autoUpdater.on('update-downloaded', (info) => {
      this.sendStatusToWindow('update-downloaded', `עדכון הורד! גרסה ${info.version}`);
    });
  }
  
  // Send update messages to renderer
  sendStatusToWindow(status, message) {
    log.info(`Update status: ${status} - ${message}`);
    
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      // Send both specific update status and log entry
      this.mainWindow.webContents.send('update-status', { status, message });
      this.mainWindow.webContents.send('log-update', { 
        level: status.includes('error') ? 'error' : 'info',
        message: `עדכון: ${message}`
      });
    }
  }
  
  // Check for updates
  checkForUpdates() {
    if (app.isPackaged) {
      try {
        autoUpdater.checkForUpdatesAndNotify();
      } catch (error) {
        log.error('Error checking for updates:', error);
        this.sendStatusToWindow('error', `שגיאה בבדיקת עדכונים: ${error.message}`);
      }
    } else {
      log.info('Auto-update disabled in development mode');
      this.sendStatusToWindow('update-not-available', 'עדכונים מנוטרלים במצב פיתוח');
    }
  }
  
  // Quit and install update
  quitAndInstall() {
    autoUpdater.quitAndInstall(true, true);
  }
}

module.exports = AppUpdater; 