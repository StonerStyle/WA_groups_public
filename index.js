const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const AppUpdater = require('./Modules/autoUpdater');
const StoreManager = require('./Modules/store');

// Enable live reload for development
if (!app.isPackaged) {
  try {
    require('electron-reloader')(module);
  } catch (_) {}
}

// Keep a global reference of the window objects
let mainWindow = null;
let connectionWindow = null;
let appUpdater = null;

// Create the main application window
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'WhatsApp Group Scraper',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    autoHideMenuBar: true,
    frame: true,
    show: false // Don't show until ready-to-show
  });

  // Maximize the window when created
  mainWindow.maximize();

  // Load the main HTML file
  mainWindow.loadFile(path.join(__dirname, 'Frontend', 'main.html'));
  
  // Set menu to null to remove it completely
  mainWindow.setMenu(null);

  // Show window when ready to avoid flashing
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open DevTools ONLY in explicit dev mode, not by default
  if (process.argv.includes('--dev') && process.argv.includes('--devtools')) {
    mainWindow.webContents.openDevTools();
  }

  // Handle window close
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Initialize and start the updater
  appUpdater = new AppUpdater(mainWindow);
  appUpdater.checkForUpdates();
}

// Create the WhatsApp connection window
function createConnectionWindow() {
  // Close any existing connection window
  if (connectionWindow) {
    connectionWindow.close();
  }

  connectionWindow = new BrowserWindow({
    width: 480,
    height: 680,
    title: 'התחברות ל-WhatsApp',
    parent: mainWindow,
    modal: true,
    resizable: false,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    }
  });

  // Load the connection HTML file
  connectionWindow.loadFile(path.join(__dirname, 'Frontend', 'connection.html'));
  
  // Set menu to null to remove it completely
  connectionWindow.setMenu(null);

  // Open DevTools ONLY in explicit dev mode, not by default
  if (process.argv.includes('--dev') && process.argv.includes('--devtools')) {
    connectionWindow.webContents.openDevTools();
  }

  // Handle window close
  connectionWindow.on('closed', () => {
    connectionWindow = null;
  });
}

// Create windows when Electron app is ready
app.whenReady().then(() => {
  createMainWindow();
  
  // On macOS, re-create window when dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

// Quit the app when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers for communication between main and renderer processes
ipcMain.on('app-ready', (event) => {
  console.log('Renderer process is ready');
  
  // Send initial connection status to UI
  event.sender.send('connection-status-update', {
    whatsapp: 'unknown',
    openai: 'unknown',
    googleSheets: 'unknown'
  });
  
  // Send mock groups data (for UI development)
  const mockGroups = [
    { id: '1', name: 'נדל"ן חיפה והסביבה', participants: 37, isTracked: true },
    { id: '2', name: 'נדל"ן תל אביב - דירות למכירה', participants: 122, isTracked: true },
    { id: '3', name: 'נדל"ן ירושלים ערוץ 1', participants: 56, isTracked: false },
  ];
  event.sender.send('groups-list-update', mockGroups);
  
  // Send initial log entries
  event.sender.send('log-update', { level: 'info', message: 'יישום הופעל' });
  event.sender.send('log-update', { level: 'info', message: 'גרסה 3.0.0' });
  event.sender.send('log-update', { level: 'info', message: 'טוען הגדרות...' });
  
  // Load saved settings and send to renderer
  const settings = StoreManager.loadSettings();
  event.sender.send('settings-loaded', settings);
  
  // Update connection status based on saved credentials
  const connectionStatus = {
    whatsapp: settings.whatsapp_auth ? 'connected' : 'unknown',
    openai: settings.openai_api_key ? 'unknown' : 'unknown', // Don't automatically connect OpenAI
    googleSheets: settings.google_auth ? 'connected' : 'unknown'
  };
  
  event.sender.send('connection-status-update', connectionStatus);
  event.sender.send('log-update', { level: 'info', message: 'הגדרות נטענו בהצלחה' });
});

// Handle opening the connection window
ipcMain.on('open-connection-window', () => {
  createConnectionWindow();
});

// Handle Google connection
ipcMain.on('connect-google', (event) => {
  console.log('Google connection requested');
  
  // Placeholder: In production, this would launch Google OAuth flow
  // For UI development, we'll simulate a successful Google authentication
  
  // Simulate connecting status
  event.sender.send('connection-status-update', { 
    googleSheets: 'connecting'
  });
  
  event.sender.send('log-update', { 
    level: 'info', 
    message: 'מתחבר לחשבון Google...' 
  });
  
  // Simulate successful connection after a delay
  setTimeout(() => {
    // Update connection status
    event.sender.send('connection-status-update', { 
      googleSheets: 'connected'
    });
    
    event.sender.send('log-update', { 
      level: 'info', 
      message: 'התחברות ל-Google Sheets הצליחה' 
    });
    
    // Mock Google account info
    const authData = {
      success: true,
      email: 'user@example.com',
      token: 'mock-google-token'
    };
    
    // Save auth data to store
    StoreManager.saveGoogleAuth({
      email: authData.email,
      token: authData.token
    });
    
    // Send auth result to renderer
    event.sender.send('google-auth-result', authData);
  }, 2000);
});

// Handle OpenAI connection
ipcMain.on('connect-openai', (event, { apiKey }) => {
  console.log('OpenAI connection requested');
  
  // Check if API key is provided
  if (!apiKey) {
    event.sender.send('log-update', { 
      level: 'error', 
      message: 'נדרש מפתח API של OpenAI' 
    });
    
    event.sender.send('openai-auth-result', {
      success: false,
      error: 'נדרש מפתח API'
    });
    
    return;
  }
  
  // Simulate connecting status
  event.sender.send('connection-status-update', { 
    openai: 'connecting'
  });
  
  event.sender.send('log-update', { 
    level: 'info', 
    message: 'מתחבר ל-OpenAI...' 
  });
  
  // Simulate API validation
  setTimeout(() => {
    // In production, this would validate the API key with OpenAI
    // For now, we'll simulate a successful connection
    
    // Save API key
    StoreManager.saveOpenAIKey(apiKey);
    
    // Update connection status
    event.sender.send('connection-status-update', { 
      openai: 'connected'
    });
    
    // Send success result
    event.sender.send('openai-auth-result', {
      success: true
    });
  }, 1500);
});

// Handle WhatsApp disconnection
ipcMain.on('disconnect-whatsapp', (event) => {
  console.log('WhatsApp disconnection requested');
  
  // Clear WhatsApp auth data
  StoreManager.clearWhatsAppAuth();
  
  // Update connection status
  event.sender.send('connection-status-update', { 
    whatsapp: 'unknown'
  });
  
  event.sender.send('log-update', { 
    level: 'info', 
    message: 'התנתקות מ-WhatsApp הושלמה' 
  });
});

// Handle Google disconnection
ipcMain.on('disconnect-google', (event) => {
  console.log('Google disconnection requested');
  
  // Clear Google auth data
  StoreManager.clearGoogleAuth();
  
  // Update connection status
  event.sender.send('connection-status-update', { 
    googleSheets: 'unknown'
  });
  
  event.sender.send('log-update', { 
    level: 'info', 
    message: 'התנתקות מ-Google הושלמה' 
  });
});

// Handle OpenAI disconnection
ipcMain.on('disconnect-openai', (event) => {
  console.log('OpenAI disconnection requested');
  
  // Don't clear the API key, just disconnect
  
  // Update connection status
  event.sender.send('connection-status-update', { 
    openai: 'unknown'
  });
  
  event.sender.send('log-update', { 
    level: 'info', 
    message: 'התנתקות מ-OpenAI הושלמה' 
  });
});

// Handle connection window events
ipcMain.on('connection-window-ready', () => {
  if (connectionWindow && !connectionWindow.isDestroyed()) {
    // Will eventually simulate or generate a real QR code
    connectionWindow.webContents.send('qr-code', 'simulated-qr-data');
  }
});

ipcMain.on('connection-successful', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    // Update connection status in main window
    mainWindow.webContents.send('connection-status-update', { 
      whatsapp: 'connected'
    });
    
    mainWindow.webContents.send('log-update', { 
      level: 'info', 
      message: 'התחברות ל-WhatsApp הצליחה' 
    });
    
    // Save WhatsApp auth data
    StoreManager.saveWhatsAppAuth({
      authenticated: true,
      timestamp: Date.now()
    });
    
    // Send auth result to renderer
    mainWindow.webContents.send('whatsapp-auth-result', {
      success: true
    });
  }
  
  // Close connection window
  if (connectionWindow && !connectionWindow.isDestroyed()) {
    connectionWindow.close();
  }
});

ipcMain.on('refresh-qr-code', () => {
  if (connectionWindow && !connectionWindow.isDestroyed()) {
    // Will eventually generate a new QR code
    connectionWindow.webContents.send('qr-code', 'new-simulated-qr-data');
  }
});

ipcMain.on('cancel-connection', () => {
  // Will eventually cancel any active connection process
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('log-update', { 
      level: 'info', 
      message: 'התחברות בוטלה על ידי המשתמש' 
    });
  }
});

// Handle testing connections
ipcMain.on('test-connections', (event) => {
  console.log('Testing service connections');
  
  // Send status updates as each service is tested
  // Note: In a real implementation, these would happen after actual connection tests
  
  // Test WhatsApp (simulate with timeout)
  event.sender.send('connection-status-update', { 
    whatsapp: 'connecting'
  });
  
  setTimeout(() => {
    event.sender.send('connection-status-update', { 
      whatsapp: 'error'
    });
    event.sender.send('log-update', { 
      level: 'warn', 
      message: 'לא ניתן להתחבר ל-WhatsApp. נדרשת סריקת קוד QR.' 
    });
  }, 2000);
  
  // Test OpenAI (simulate with timeout)
  setTimeout(() => {
    event.sender.send('connection-status-update', { 
      openai: 'connecting'
    });
    
    setTimeout(() => {
      event.sender.send('connection-status-update', { 
        openai: 'connected'
      });
      event.sender.send('log-update', { 
        level: 'info', 
        message: 'התחברות ל-OpenAI הצליחה' 
      });
    }, 3000);
  }, 500);
  
  // Test Google Sheets (simulate with timeout)
  setTimeout(() => {
    event.sender.send('connection-status-update', { 
      googleSheets: 'connecting'
    });
    
    setTimeout(() => {
      event.sender.send('connection-status-update', { 
        googleSheets: 'connected'
      });
      event.sender.send('log-update', { 
        level: 'info', 
        message: 'התחברות ל-Google Sheets הצליחה' 
      });
    }, 2500);
  }, 1000);
});

// Handle checking for updates
ipcMain.on('check-for-updates', (event) => {
  console.log('Checking for updates');
  
  if (appUpdater) {
    // Let the renderer know we're checking
    event.sender.send('update-status', { 
      status: 'checking-for-update', 
      message: 'בודק עדכונים...' 
    });
    
    // Force check for updates
    appUpdater.checkForUpdates();
  } else {
    // No updater available
    event.sender.send('update-status', { 
      status: 'error', 
      message: 'מנגנון העדכון אינו זמין' 
    });
  }
});

// Handle installing update
ipcMain.on('install-update', (event) => {
  console.log('Installing update');
  
  if (appUpdater) {
    // Send status before quitting
    event.sender.send('update-status', { 
      status: 'installing', 
      message: 'מתקין עדכון ומפעיל מחדש את היישום...' 
    });
    
    // Install the update (will restart the app)
    appUpdater.quitAndInstall();
  } else {
    // No updater available
    event.sender.send('update-status', { 
      status: 'error', 
      message: 'מנגנון העדכון אינו זמין' 
    });
  }
});

// Handle saving settings
ipcMain.on('save-settings', (event, settings) => {
  console.log('Saving settings:', settings);
  
  // Save to store
  const saved = StoreManager.saveSettings(settings);
  
  if (saved) {
    event.sender.send('log-update', { 
      level: 'info', 
      message: 'הגדרות נשמרו בהצלחה' 
    });
  } else {
    event.sender.send('log-update', { 
      level: 'error', 
      message: 'שגיאה בשמירת הגדרות' 
    });
  }
});

// Handle toggling group tracking
ipcMain.on('toggle-group-tracking', (event, { groupId, track }) => {
  console.log(`${track ? 'Enabling' : 'Disabling'} tracking for group ${groupId}`);
  
  // In real implementation, this would update tracking settings
  // For now, just show a status message
  event.sender.send('log-update', { 
    level: 'info', 
    message: `${track ? 'הפעלת' : 'הפסקת'} מעקב אחר קבוצה ${groupId}` 
  });
});

// Handle errors globally
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  
  // Send error to UI
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('log-update', { 
      level: 'error', 
      message: `שגיאה לא צפויה: ${error.message}` 
    });
  }
}); 