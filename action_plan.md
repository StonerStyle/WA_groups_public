# WhatsApp Group Scraper - Implementation Action Plan

Phase 1: Preparation & Dependencies
This phase focuses on setting up the foundation for the application. You'll start by identifying all the libraries and tools your app needs, making sure they're properly documented in your package.json. More importantly, you'll implement a secure way to store sensitive API keys and credentials using encrypted storage instead of plain text files. This creates a more secure foundation before packaging the application.
Phase 2: Configure Electron Builder
This phase prepares your app for distribution as a professional desktop application. You'll set up Electron Builder, which packages your Node.js application into an executable Windows program with proper installation features. You'll configure how the app should be installed, where it should be placed on users' computers, what shortcuts it creates, and what icon it uses. This transforms your app from a developer project into something end users can easily install.
Phase 3: Auto-Update Implementation
In this phase, you'll add the ability for your app to automatically check for, download, and install updates. This is crucial for maintaining your software, as you can release fixes and improvements without requiring users to manually download a new version. The system will connect to GitHub to check for new releases, notify users when updates are available, and seamlessly install them.
Phase 4: WhatsApp QR Reconnection Feature
This phase improves the user experience by adding a "refresh QR code" button to the WhatsApp connection screen. Currently, if a QR code expires or a connection fails, users might need to restart the entire application. With this feature, they can simply click a button to generate a new QR code, making the reconnection process much smoother.
Phase 5: Prompt Management Implementation
This phase focuses on the prompt management feature we've already implemented. It allows users to view and edit the AI prompts that control how the system processes WhatsApp messages and responds to queries. The implementation includes a dedicated UI tab with a list of available prompts and an editor for modifying them. This gives users more control over how the AI behaves without requiring code changes.
Phase 6: Error Handling for AI Services
This phase adds robust error handling specifically for AI-related operations. You'll create a centralized error logging system that captures and stores detailed information about any AI failures (like OpenAI API errors). A dedicated UI tab will display these errors, making it easier to troubleshoot problems. This improves the app's reliability and makes it easier to diagnose issues when they occur.
Phase 7: Memory Management Optimization
This phase addresses potential stability issues during long-running sessions. It includes implementing periodic garbage collection to free up unused memory, proper cleanup of WhatsApp connections to prevent resource leaks, memory usage monitoring to detect high memory situations, and an automatic restart mechanism that can refresh the application during quiet periods (like at 3 AM). These features help ensure the app can run reliably for extended periods without degradation.
Phase 8: Testing & Release
This phase covers the testing and initial release of your packaged application. You'll test the build process, verify the installer works correctly, and ensure all features function properly in the packaged app. You'll then prepare your first official GitHub release, which users can download and install. This phase also involves testing the auto-update mechanism to ensure future updates will work seamlessly.
Phase 9: Documentation & Final Steps
This phase focuses on creating comprehensive documentation for your application. You'll create installation instructions, document how updates work, create a troubleshooting guide, and provide specific documentation for features like prompt management and error tracking. You'll also perform final security and compatibility checks to ensure everything works properly across different Windows versions.
Phase 10: Distribution
The final phase deals with sharing your application with users. You'll set up proper distribution channels via GitHub releases, potentially create a landing page or documentation site, and establish a template for future release notes. This ensures a smooth, professional experience for users discovering and downloading your application.
Each of these phases builds upon the previous ones to transform your WhatsApp Group Scraper from a developer-focused tool to a polished, user-friendly, and reliable desktop application that can be easily distributed and maintained over time.




## Phase 1: Preparation & Dependencies

### 1.1 Ensure All Dependencies Are Included
- [ ] Scan codebase for all explicit `require()` and `import` statements
  ```bash
  grep -r "require(" --include="*.js" ./
  grep -r "import " --include="*.js" ./
  ```
- [ ] Check for dynamic imports that might not be detected by static analysis
- [ ] Verify all required dependencies are in package.json
- [ ] Install electron-builder and related packages:
  ```bash
  npm install --save-dev electron-builder electron-updater
  ```

### 1.2 Set Up Secure Credential Storage
- [ ] Install electron-store:
  ```bash
  npm install --save electron-store
  ```
- [ ] Create a credential store module to replace .env:
  ```javascript
  // credentialStore.js
  const Store = require('electron-store');
  
  const store = new Store({
    name: 'credentials',
    encryptionKey: 'your-app-specific-encryption-key', // Change this
  });
  
  module.exports = {
    getCredentials: () => {
      return {
        openai_api_key: store.get('openai_api_key'),
        google_api_key: store.get('google_api_key'),
        google_service_account_json: store.get('google_service_account_json'),
        spreadsheet_id: store.get('spreadsheet_id')
      };
    },
    
    setCredential: (key, value) => {
      store.set(key, value);
    },
    
    // First-run migration from .env
    migrateFromEnv: (envVars) => {
      Object.entries(envVars).forEach(([key, value]) => {
        if (value) store.set(key, value);
      });
    }
  };
  ```
- [ ] Update the envManager.js to use credentialStore
- [ ] Add migration logic for existing users

## Phase 2: Configure Electron Builder

### 2.1 Basic Configuration
- [ ] Add build configuration to package.json:
  ```json
  "build": {
    "appId": "com.yourcompany.whatsapp-group-scraper",
    "productName": "WhatsApp Group Scraper",
    "copyright": "Copyright © 2023",
    "directories": {
      "output": "dist",
      "buildResources": "build"
    },
    "files": [
      "**/*",
      "!**/.git/*",
      "!**/node_modules/*/{CHANGELOG.md,README.md,README,readme.md,readme}",
      "!**/node_modules/*/{test,__tests__,tests,powered-test,example,examples}",
      "!**/node_modules/*.d.ts",
      "!**/node_modules/.bin",
      "!**/*.{o,hprof,orig,pyc,pyo,rbc,swp,csproj,sln,xproj}",
      "!.editorconfig",
      "!**/._*",
      "!**/{.DS_Store,.git,.hg,.svn,CVS,RCS,SCCS,.gitignore,.gitattributes}",
      "!**/{__pycache__,thumbs.db,.flowconfig,.idea,.vs,.nyc_output}",
      "!**/{appveyor.yml,.travis.yml,circle.yml}",
      "!**/{npm-debug.log,yarn.lock,.yarn-integrity,.yarn-metadata.json}"
    ]
  }
  ```

### 2.2 Windows Specific Configuration
- [ ] Add Windows build options:
  ```json
  "win": {
    "target": "nsis",
    "icon": "build/icon.ico"
  },
  "nsis": {
    "allowToChangeInstallationDirectory": true,
    "oneClick": false,
    "installerIcon": "build/icon.ico",
    "uninstallerIcon": "build/icon.ico",
    "installerHeaderIcon": "build/icon.ico",
    "createDesktopShortcut": true,
    "createStartMenuShortcut": true,
    "shortcutName": "WhatsApp Group Scraper",
    "artifactName": "WhatsApp-Group-Scraper-Setup-${version}.exe",
    "installLocation": "C:\\Whatsapp_Scraper_Sheets"
  }
  ```

### 2.3 Update Configuration
- [ ] Add publish configuration for auto-updates:
  ```json
  "publish": [
    {
      "provider": "github",
      "owner": "StonerStyle",
      "repo": "WA_Group_Scrape"
    }
  ]
  ```

### 2.4 Add Build Scripts
- [ ] Add scripts to package.json:
  ```json
  "scripts": {
    "start": "electron .",
    "build": "electron-builder --win",
    "release": "electron-builder --win --publish always"
  }
  ```

### 2.5 Create App Icons
- [ ] Create icon.ico file (256x256px minimum)
- [ ] Place in a build folder in project root

## Phase 3: Auto-Update Implementation

### 3.1 Update Main Process
- [ ] Import auto-updater in main process (index.js):
  ```javascript
  const { autoUpdater } = require('electron-updater');
  
  // Configure logging
  autoUpdater.logger = require('electron-log');
  autoUpdater.logger.transports.file.level = 'info';
  ```

### 3.2 Add Update Events
- [ ] Add auto-update event handlers:
  ```javascript
  autoUpdater.on('checking-for-update', () => {
    sendStatusToWindow('Checking for update...');
  });
  
  autoUpdater.on('update-available', (info) => {
    sendStatusToWindow('Update available. Will download in background.');
  });
  
  autoUpdater.on('update-not-available', (info) => {
    sendStatusToWindow('Update not available.');
  });
  
  autoUpdater.on('error', (err) => {
    sendStatusToWindow('Error in auto-updater. ' + err);
  });
  
  autoUpdater.on('download-progress', (progressObj) => {
    sendStatusToWindow(
      `Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}% (${progressObj.transferred}/${progressObj.total})`
    );
  });
  
  autoUpdater.on('update-downloaded', (info) => {
    sendStatusToWindow('Update downloaded. Will install on restart.');
  });
  
  function sendStatusToWindow(text) {
    if (mainWindow) {
      mainWindow.webContents.send('update-status', text);
    }
  }
  ```

### 3.3 Trigger Update Checks
- [ ] Add update check on app start:
  ```javascript
  app.on('ready', function() {
    // Your existing startup code...
    
    // Check for updates after a delay
    setTimeout(() => {
      autoUpdater.checkForUpdatesAndNotify();
    }, 5000);
  });
  ```

### 3.4 Add Manual Update Check
- [ ] Add IPC handler for manual update checks:
  ```javascript
  ipcMain.on('check-for-updates', () => {
    autoUpdater.checkForUpdatesAndNotify();
  });
  ```

### 3.5 Add UI Updates
- [ ] Modify UI to show update status:
  ```html
  <!-- Add to main.html -->
  <div id="update-status" class="update-status"></div>
  ```
  
  ```javascript
  // Add to renderer script
  ipcRenderer.on('update-status', (event, text) => {
    document.getElementById('update-status').innerText = text;
  });
  
  // Add button event handler
  document.getElementById('checkUpdateBtn').addEventListener('click', () => {
    ipcRenderer.send('check-for-updates');
  });
  ```

## Phase 4: WhatsApp QR Reconnection Feature

### 4.1 Add QR Refresh Button
- [ ] Add button to connection UI:
  ```html
  <button id="refreshQrBtn" class="button">Refresh QR Code</button>
  ```

### 4.2 Implement QR Refresh Logic
- [ ] Add QR refresh handler:
  ```javascript
  // In renderer
  document.getElementById('refreshQrBtn').addEventListener('click', () => {
    ipcRenderer.send('refresh-qr');
  });
  
  // In main process
  ipcMain.on('refresh-qr', async (event) => {
    try {
      // Clear existing connection
      // This depends on how your WhatsApp connection is implemented
      
      // Restart the connection process
      // Send new QR to UI
    } catch (error) {
      // Handle error
    }
  });
  ```

## Phase 5: Prompt Management Implementation

### 5.1 Implement Prompt Management Module
- [ ] Create a module for managing prompts:
  ```javascript
  // modules/promptManager.js
  const fs = require('fs').promises;
  const path = require('path');

  // Define accessible prompts
  const PROMPT_FILES = {
    'groups_listener': {
      path: path.join(process.cwd(), 'prompts', 'groups_listener.txt'),
      description: 'עיבוד הודעות קבוצות WhatsApp והסקת מידע על נכסים'
    },
    'query_interpret': {
      path: path.join(process.cwd(), 'prompts', 'query_interpret.txt'),
      description: 'פירוש שאילתות חיפוש נכסים'
    },
    'query_summarize': {
      path: path.join(process.cwd(), 'prompts', 'query_summarize.txt'),
      description: 'סיכום תוצאות חיפוש נכסים'
    }
  };

  // Methods for getting prompts list, retrieving and saving contents
  ```

### 5.2 Add Prompt Management UI
- [ ] Add tab to main UI:
  ```html
  <button class="tab" data-tab="prompts">פרומפטים</button>
  
  <div class="tab-content" id="prompts-tab">
    <div class="card">
      <h2>ניהול פרומפטים</h2>
      <p>ערוך את הפרומפטים המשמשים לעיבוד הודעות ומענה לשאילתות</p>
      
      <!-- Split panel UI with prompt list and editor -->
    </div>
  </div>
  ```

### 5.3 Implement Prompt Version Control
- [ ] Add backup feature for prompts
- [ ] Add ability to restore previous versions
- [ ] Create documentation on prompt editing best practices

## Phase 6: Error Handling for AI Services

### 6.1 Implement Error Logging System
- [ ] Create centralized error logging module:
  ```javascript
  // modules/errorLogger.js
  const fs = require('fs').promises;
  const path = require('path');
  
  const ERROR_LOG_FILE = path.join(process.cwd(), 'logs', 'ai_errors.json');
  
  async function logError(service, error, context = {}) {
    try {
      const errorEntry = {
        timestamp: new Date().toISOString(),
        service,
        error: error.message || String(error),
        stack: error.stack,
        context
      };
      
      // Save error to file
      // Notify main window
      
      return errorEntry;
    } catch (logError) {
      console.error('Failed to log error:', logError);
      return null;
    }
  }
  ```

### 6.2 Add AI Error Tab to UI
- [ ] Add new tab to main UI:
  ```html
  <button class="tab" data-tab="errors">שגיאות AI</button>
  
  <div class="tab-content" id="errors-tab">
    <div class="card">
      <h2>שגיאות AI</h2>
      <p>שגיאות שהתרחשו בעת שימוש בשירותי AI</p>
      
      <!-- Error list, filters, and detail view -->
    </div>
  </div>
  ```

### 6.3 Update AI Service Modules
- [ ] Modify OpenAI calls to use error logging
- [ ] Modify WhatsApp processing to log errors
- [ ] Add visual feedback for API errors

## Phase 7: Memory Management Optimization

### 7.1 Implement Periodic Garbage Collection
- [ ] Add scheduled garbage collection:
  ```javascript
  // In main process
  let gcInterval;
  
  if (global.gc) {
    gcInterval = setInterval(() => {
      try {
        global.gc();
        console.log('Manual garbage collection completed');
      } catch (e) {
        console.error('Failed to perform garbage collection:', e);
      }
    }, 30 * 60 * 1000); // Run every 30 minutes
  }
  
  // Clear interval on app quit
  app.on('quit', () => {
    if (gcInterval) clearInterval(gcInterval);
  });
  ```

### 7.2 Resource Management
- [ ] Implement proper cleanup of WhatsApp connections:
  ```javascript
  // Clean up all listeners when stopping monitoring
  function stopListening() {
    if (this.whatsapp && this.isListening) {
      // Remove all event listeners
      this.whatsapp.ev.removeAllListeners('messages.upsert');
      
      // Reset state
      this.isListening = false;
    }
  }
  ```

### 7.3 Memory Monitoring System
- [ ] Create a memory monitoring module:
  ```javascript
  // modules/memoryMonitor.js
  function startMemoryMonitoring(app, mainWindow) {
    const interval = setInterval(() => {
      const memoryUsage = process.memoryUsage();
      const memoryUsageMB = {
        rss: Math.round(memoryUsage.rss / 1024 / 1024)
      };
      
      // Log memory usage
      console.log('Memory Usage (MB):', memoryUsageMB);
      
      // Notify on high memory
      if (memoryUsageMB.rss > 1024) { // Over 1GB
        if (mainWindow) {
          mainWindow.webContents.send('memory-warning', {
            memory: memoryUsageMB.rss,
            message: 'שימוש זיכרון גבוה - מומלץ לאתחל את האפליקציה'
          });
        }
        
        // Force GC if available
        if (global.gc) {
          global.gc();
        }
      }
    }, 15 * 60 * 1000); // Every 15 minutes
    
    return interval;
  }
  ```

### 7.4 Auto-Restart Mechanism
- [ ] Add scheduled application restart:
  ```javascript
  function scheduleAutoRestart() {
    // Calculate time until next restart (e.g., 3 AM)
    const now = new Date();
    const restartTime = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + (now.getHours() >= 3 ? 1 : 0),
      3, 0, 0
    );
    
    const timeUntilRestart = restartTime - now;
    
    // Schedule restart
    setTimeout(() => {
      // Only restart if app is being used
      if (isMonitoring) {
        // Notify user and restart
        if (mainWindow) {
          mainWindow.webContents.send('scheduled-restart');
        }
        
        setTimeout(() => {
          app.relaunch();
          app.exit();
        }, 60000); // 1 minute notice
      }
    }, timeUntilRestart);
  }
  ```

## Phase 8: Testing & Release

### 8.1 Test Packaging Locally
- [ ] Test build locally:
  ```bash
  npm run build
  ```
- [ ] Verify the installer works
- [ ] Test installation in a clean environment
- [ ] Verify all features work in packaged app

### 8.2 Prepare First Release
- [ ] Update version in package.json
- [ ] Create a GitHub personal access token with repo scope
- [ ] Set the GH_TOKEN environment variable:
  ```bash
  # Windows
  set GH_TOKEN=your_token_here
  
  # Linux/macOS
  export GH_TOKEN=your_token_here
  ```

### 8.3 Create First Release
- [ ] Build and publish:
  ```bash
  npm run release
  ```
- [ ] Verify the release appears on GitHub

### 8.4 Test Auto-Update
- [ ] Install app from first release
- [ ] Make a change to the app
- [ ] Increment version in package.json
- [ ] Create a new release
- [ ] Verify the installed app detects and installs the update

## Phase 9: Documentation & Final Steps

### 9.1 Create Documentation
- [ ] Create installation instructions for users
- [ ] Document update process
- [ ] Create troubleshooting guide
- [ ] Document prompt management feature
- [ ] Document error tracking system

### 9.2 Final Review
- [ ] Verify security of credential storage
- [ ] Ensure WhatsApp auth state persistence
- [ ] Test on multiple Windows versions
- [ ] Review error handling in packaged app
- [ ] Verify memory management effectiveness

## Phase 10: Distribution

### 10.1 Share GitHub Release
- [ ] Share direct link to latest release:
  `https://github.com/StonerStyle/WA_Group_Scrape/releases/latest`
- [ ] Consider creating a landing page or documentation site
- [ ] Set up GitHub release notes template for future releases 