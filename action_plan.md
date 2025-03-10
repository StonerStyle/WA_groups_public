# WhatsApp Group Scraper - Implementation Action Plan

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

## Phase 5: Testing & Release

### 5.1 Test Packaging Locally
- [ ] Test build locally:
  ```bash
  npm run build
  ```
- [ ] Verify the installer works
- [ ] Test installation in a clean environment
- [ ] Verify all features work in packaged app

### 5.2 Prepare First Release
- [ ] Update version in package.json
- [ ] Create a GitHub personal access token with repo scope
- [ ] Set the GH_TOKEN environment variable:
  ```bash
  # Windows
  set GH_TOKEN=your_token_here
  
  # Linux/macOS
  export GH_TOKEN=your_token_here
  ```

### 5.3 Create First Release
- [ ] Build and publish:
  ```bash
  npm run release
  ```
- [ ] Verify the release appears on GitHub

### 5.4 Test Auto-Update
- [ ] Install app from first release
- [ ] Make a change to the app
- [ ] Increment version in package.json
- [ ] Create a new release
- [ ] Verify the installed app detects and installs the update

## Phase 6: Documentation & Final Steps

### 6.1 Create Documentation
- [ ] Create installation instructions for users
- [ ] Document update process
- [ ] Create troubleshooting guide

### 6.2 Final Review
- [ ] Verify security of credential storage
- [ ] Ensure WhatsApp auth state persistence
- [ ] Test on multiple Windows versions
- [ ] Review error handling in packaged app

## Phase 7: Distribution

### 7.1 Share GitHub Release
- [ ] Share direct link to latest release:
  `https://github.com/StonerStyle/WA_Group_Scrape/releases/latest`
- [ ] Consider creating a landing page or documentation site
- [ ] Set up GitHub release notes template for future releases 