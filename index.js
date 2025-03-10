// Main entry point for the WhatsApp Group Scraper
require('dotenv').config();
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const whatsappConnection = require('./modules/connectWA');
const envManager = require('./modules/envManager');
const groupListener = require('./modules/groupListener');
const sheetsUpdater = require('./modules/sheetsUpdater');
const promptManager = require('./modules/promptManager');

let mainWindow;
let connectionWindow;
let isMonitoring = false;

// Forward logs to UI
function sendLog(window, type, message) {
    if (window && !window.isDestroyed()) {
        window.webContents.send('log-message', { type, message });
    }
}

// Forward monitoring logs to UI
function sendMonitoringLog(type, message) {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('monitoring-log', { type, message });
    }
}

function createConnectionWindow() {
    connectionWindow = new BrowserWindow({
        width: 600,
        height: 500,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        autoHideMenuBar: true,
        title: 'WhatsApp Connection'
    });

    connectionWindow.loadFile('ui/connection.html');
}

function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        autoHideMenuBar: true,
        title: 'WhatsApp Group Manager'
    });

    mainWindow.loadFile('ui/main.html');
}

app.whenReady().then(() => {
    createConnectionWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createConnectionWindow();
    }
});

// Handle WhatsApp connection events
ipcMain.on('check-connection', async (event) => {
    try {
        // Override console.log to forward to UI
        const originalLog = console.log;
        console.log = (...args) => {
            const message = args.join(' ');
            sendLog(connectionWindow, 'info', message);
            // Don't write to stdout to avoid duplicate Hebrew logs
        };

        const sock = await whatsappConnection;
        
        // Terminal logs in English
        process.stdout.write('Connecting to WhatsApp...\n');
        process.stdout.write(`Connected as: ${sock.user.name}\n`);
        process.stdout.write(`Phone number: ${sock.user.id.split(':')[0]}\n`);
        
        // UI logs in Hebrew
        console.log('מתחבר לווצאפ...');
        console.log(`מחובר בתור: ${sock.user.name}`);
        console.log(`מספר טלפון: ${sock.user.id.split(':')[0]}`);
        
        // Restore console.log
        console.log = originalLog;
        
        // If connection successful, close connection window and open main window
        connectionWindow.close();
        createMainWindow();
    } catch (error) {
        // Send error back to renderer
        sendLog(connectionWindow, 'error', error.message);
        event.reply('connection-error', error.message);
    }
});

// Handle group listing request
ipcMain.on('list-groups', async (event) => {
    try {
        const { fetchAndUpdateGroups } = require('./modules/listGroups');
        
        // Override console.log to forward to UI
        const originalLog = console.log;
        console.log = (...args) => {
            const message = args.join(' ');
            sendLog(mainWindow, 'info', message);
        };

        const groups = await fetchAndUpdateGroups();
        
        // Restore console.log
        console.log = originalLog;

        // Send groups to UI for selection
        event.reply('groups-list', groups);
        event.reply('groups-updated');
    } catch (error) {
        sendLog(mainWindow, 'error', error.message);
        event.reply('groups-error', error.message);
    }
});

// Handle monitoring controls
ipcMain.on('start-monitoring', async (event, selectedGroups) => {
    if (isMonitoring) {
        sendMonitoringLog('info', 'ניטור כבר פעיל');
        return;
    }

    try {
        // Initialize components
        sendMonitoringLog('info', 'מאתחל רכיבי ניטור...');
        
        await Promise.all([
            groupListener.initialize(),
            sheetsUpdater.initialize()
        ]);

        // Set up event handler for processed messages
        groupListener.on('processedMessage', async (row) => {
            try {
                await sheetsUpdater.appendRow(row);
                sendMonitoringLog('info', 'נוספה רשומה חדשה לגיליון');
            } catch (error) {
                sendMonitoringLog('error', 'שגיאה בהוספת רשומה: ' + error.message);
            }
        });

        // Start monitoring selected groups
        const groupIds = selectedGroups.map(g => g.id);
        groupListener.setSelectedGroups(groupIds);
        await groupListener.startListening();
        
        isMonitoring = true;
        sendMonitoringLog('info', 'התחיל ניטור קבוצות נבחרות');
        console.log(`Monitoring ${selectedGroups.length} groups`);
        
        // Initialize query bot after WhatsApp connection is established
        setTimeout(async () => {
            try {
                const queryBot = require('./modules/queryBot');
                await queryBot.initialize();
                sendLog(mainWindow, 'info', 'בוט השאילתות מוכן לשימוש דרך ווצאפ');
                console.log('=== DEBUG: QueryBot initialized successfully ===');
            } catch (error) {
                console.error('=== DEBUG: QueryBot initialization error ===', error);
                sendLog(mainWindow, 'error', 'שגיאה באתחול בוט השאילתות: ' + error.message);
            }
        }, 5000); // Wait 5 seconds for WhatsApp connection to stabilize

        // Update UI status
        event.reply('monitoring-started');
    } catch (error) {
        sendMonitoringLog('error', 'שגיאה בהפעלת ניטור: ' + error.message);
        event.reply('monitoring-error', error.message);
    }
});

ipcMain.on('stop-monitoring', (event) => {
    if (!isMonitoring) {
        sendMonitoringLog('info', 'ניטור כבר מושבת');
        return;
    }

    try {
        groupListener.stopListening();
        isMonitoring = false;
        sendMonitoringLog('info', 'הניטור הופסק');
        console.log('Stopped monitoring groups'); // Single log
        event.reply('monitoring-stopped');
    } catch (error) {
        sendMonitoringLog('error', 'שגיאה בהפסקת ניטור: ' + error.message);
        event.reply('monitoring-error', error.message);
    }
});

// Handle environment variable management
ipcMain.on('load-env', async (event) => {
    try {
        const envVars = await envManager.loadEnv();
        event.reply('env-loaded', envVars);
    } catch (error) {
        console.error('Error loading .env:', error);
        event.reply('env-error', error.message);
    }
});

ipcMain.on('save-env', async (event, variables) => {
    try {
        await envManager.saveEnv(variables);
        event.reply('env-saved');
    } catch (error) {
        console.error('Error saving .env:', error);
        event.reply('env-error', error.message);
    }
});

// Handle prompt management
ipcMain.on('get-prompts-list', async (event) => {
    try {
        const promptsList = await promptManager.getPromptsList();
        event.reply('prompts-list', promptsList);
    } catch (error) {
        console.error('Error fetching prompts list:', error);
        event.reply('prompts-error', error.message);
    }
});

ipcMain.on('get-prompt-content', async (event, promptId) => {
    try {
        const content = await promptManager.getPromptContent(promptId);
        event.reply('prompt-content', { promptId, content });
    } catch (error) {
        console.error(`Error fetching prompt content for ${promptId}:`, error);
        event.reply('prompts-error', error.message);
    }
});

ipcMain.on('save-prompt-content', async (event, { promptId, content }) => {
    try {
        await promptManager.savePromptContent(promptId, content);
        event.reply('prompt-saved', promptId);
    } catch (error) {
        console.error(`Error saving prompt content for ${promptId}:`, error);
        event.reply('prompts-error', error.message);
    }
});

module.exports = { sendLog, sendMonitoringLog }; 