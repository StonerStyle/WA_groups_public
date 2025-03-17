// Renderer Process - Main UI Logic
const { ipcRenderer } = require('electron');

// Document ready event
document.addEventListener('DOMContentLoaded', () => {
    console.log('UI initialized');
    initializeUI();
});

// Initialize the UI and event listeners
function initializeUI() {
    // Notify main process that UI is ready
    ipcRenderer.send('app-ready');
    
    // Listen for connection status updates from main process
    ipcRenderer.on('connection-status-update', (event, statuses) => {
        updateConnectionStatus(statuses);
    });
    
    // Listen for group list updates
    ipcRenderer.on('groups-list-update', (event, groups) => {
        renderGroups(groups);
    });
    
    // Listen for log updates
    ipcRenderer.on('log-update', (event, logEntry) => {
        addLogEntry(logEntry);
    });
    
    // Listen for Google authentication result
    ipcRenderer.on('google-auth-result', (event, result) => {
        handleGoogleAuthResult(result);
    });
    
    // Listen for WhatsApp authentication result
    ipcRenderer.on('whatsapp-auth-result', (event, result) => {
        handleWhatsAppAuthResult(result);
    });
    
    // Listen for OpenAI authentication result
    ipcRenderer.on('openai-auth-result', (event, result) => {
        handleOpenAIAuthResult(result);
    });
    
    // Listen for update status messages
    ipcRenderer.on('update-status', (event, data) => {
        handleUpdateStatus(data);
    });
    
    // Listen for settings loaded
    ipcRenderer.on('settings-loaded', (event, settings) => {
        updateSettingsForm(settings);
    });
    
    // Set up event handlers
    setupEventHandlers();
}

// Setup all UI event handlers
function setupEventHandlers() {
    // WhatsApp Connection Button
    document.getElementById('connect-whatsapp').addEventListener('click', () => {
        ipcRenderer.send('open-connection-window');
    });
    
    // Google Connection Button
    document.getElementById('connect-google').addEventListener('click', () => {
        ipcRenderer.send('connect-google');
    });
    
    // OpenAI Connection Button
    document.getElementById('connect-openai').addEventListener('click', () => {
        // Get API key from settings
        const apiKey = document.getElementById('openai_api_key').value;
        
        if (!apiKey) {
            addLogEntry({
                level: 'warn',
                message: 'נדרש מפתח API של OpenAI. אנא הזן אותו בהגדרות.'
            });
            
            // Switch to settings page
            document.querySelectorAll('.nav-item').forEach(navItem => 
                navItem.classList.remove('active'));
            document.querySelector('.nav-item[data-page="settings"]').classList.add('active');
            
            document.querySelectorAll('.content-page').forEach(page => 
                page.classList.add('hidden'));
            document.getElementById('settings-page').classList.remove('hidden');
            
            return;
        }
        
        ipcRenderer.send('connect-openai', { apiKey });
    });
    
    // WhatsApp Disconnect Button
    document.getElementById('whatsapp-disconnect').addEventListener('click', () => {
        ipcRenderer.send('disconnect-whatsapp');
        showWhatsAppDisconnected();
    });
    
    // Google Disconnect Button
    document.getElementById('google-disconnect').addEventListener('click', () => {
        ipcRenderer.send('disconnect-google');
        showGoogleDisconnected();
    });
    
    // OpenAI Disconnect Button
    document.getElementById('openai-disconnect').addEventListener('click', () => {
        ipcRenderer.send('disconnect-openai');
        showOpenAIDisconnected();
    });
    
    // Test Connections Button
    document.getElementById('test-connections').addEventListener('click', () => {
        testConnections();
    });
    
    // Check for Updates Button
    document.getElementById('check-updates').addEventListener('click', () => {
        checkForUpdates();
    });
    
    // Settings Form Submission
    document.getElementById('settings-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        saveSettings();
    });
    
    // Clean Log Button
    document.querySelector('#logs-page .btn-secondary').addEventListener('click', () => {
        clearLogs();
    });
    
    // Navigation items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            // Update active nav item
            document.querySelectorAll('.nav-item').forEach(navItem => 
                navItem.classList.remove('active'));
            item.classList.add('active');
            
            // Show corresponding content page
            const pageId = item.getAttribute('data-page');
            document.querySelectorAll('.content-page').forEach(page => 
                page.classList.add('hidden'));
            document.getElementById(`${pageId}-page`).classList.remove('hidden');
        });
    });
    
    // Show/hide password buttons
    document.querySelectorAll('.toggle-password').forEach(button => {
        button.addEventListener('click', () => {
            const inputId = button.getAttribute('data-for');
            const input = document.getElementById(inputId);
            
            if (input.type === 'password') {
                input.type = 'text';
                button.textContent = 'הסתר';
            } else {
                input.type = 'password';
                button.textContent = 'הצג';
            }
        });
    });
}

// Update connection status indicators
function updateConnectionStatus(statuses) {
    console.log('Updating connection status:', statuses);
    
    // Update each service status
    if (statuses.whatsapp) {
        updateStatusDot('whatsapp-status', statuses.whatsapp);
    }
    
    if (statuses.openai) {
        updateStatusDot('openai-status', statuses.openai);
    }
    
    if (statuses.googleSheets) {
        updateStatusDot('sheets-status', statuses.googleSheets);
    }
}

// Update a single status dot
function updateStatusDot(elementId, status) {
    const statusDot = document.getElementById(elementId);
    if (!statusDot) return;
    
    // Remove all status classes
    statusDot.classList.remove(
        'status-unknown', 
        'status-connecting', 
        'status-connected', 
        'status-error'
    );
    
    // Add the appropriate class based on status
    switch (status) {
        case 'connected':
            statusDot.classList.add('status-connected');
            break;
        case 'connecting':
            statusDot.classList.add('status-connecting');
            break;
        case 'error':
            statusDot.classList.add('status-error');
            break;
        default:
            statusDot.classList.add('status-unknown');
    }
}

// Test service connections
function testConnections() {
    // Update UI to show connecting status
    const services = ['whatsapp', 'openai', 'sheets'];
    services.forEach(service => {
        updateStatusDot(`${service}-status`, 'connecting');
    });
    
    // Request connection tests from main process
    ipcRenderer.send('test-connections');
}

// Save settings from the form
function saveSettings() {
    const settings = {
        openai_api_key: document.getElementById('openai_api_key').value,
        spreadsheet_id: document.getElementById('spreadsheet_id').value
    };
    
    ipcRenderer.send('save-settings', settings);
}

// Render WhatsApp groups list
function renderGroups(groups) {
    const groupsContainer = document.querySelector('.groups-list');
    if (!groupsContainer) return;
    
    // Clear existing groups
    groupsContainer.innerHTML = '';
    
    // Add groups
    groups.forEach(group => {
        const groupElement = createGroupElement(group);
        groupsContainer.appendChild(groupElement);
    });
}

// Create a group card element
function createGroupElement(group) {
    const groupCard = document.createElement('div');
    groupCard.className = 'group-card';
    
    // Get first letter for avatar or use default
    const firstLetter = group.name.charAt(0) || 'נ';
    
    groupCard.innerHTML = `
        <div class="group-header">
            <div class="group-avatar">${firstLetter}</div>
            <div class="group-info">
                <div class="group-name">${group.name}</div>
                <div class="group-meta">${group.participants || 0} חברים</div>
            </div>
        </div>
        <div class="group-actions">
            <span>במעקב</span>
            <label class="switch">
                <input type="checkbox" data-group-id="${group.id}" ${group.isTracked ? 'checked' : ''}>
                <span class="slider"></span>
            </label>
        </div>
    `;
    
    // Add event listener for tracking toggle
    const checkbox = groupCard.querySelector('input[type="checkbox"]');
    checkbox.addEventListener('change', () => {
        ipcRenderer.send('toggle-group-tracking', {
            groupId: group.id,
            track: checkbox.checked
        });
    });
    
    return groupCard;
}

// Add a log entry to the logs container
function addLogEntry(logEntry) {
    const logsContainer = document.querySelector('.logs-container');
    if (!logsContainer) return;
    
    const logElement = document.createElement('div');
    logElement.className = 'log-entry';
    
    const time = new Date().toTimeString().split(' ')[0];
    const logClass = getLogClass(logEntry.level);
    
    logElement.innerHTML = `
        <span class="log-time">[${time}]</span>
        <span class="${logClass}">${logEntry.message}</span>
    `;
    
    logsContainer.appendChild(logElement);
    logsContainer.scrollTop = logsContainer.scrollHeight;
}

// Get the appropriate CSS class for a log level
function getLogClass(level) {
    switch (level?.toLowerCase()) {
        case 'error':
            return 'log-error';
        case 'warn':
            return 'log-warn';
        default:
            return 'log-info';
    }
}

// Clear all logs from the log container
function clearLogs() {
    const logsContainer = document.querySelector('.logs-container');
    if (!logsContainer) return;
    
    // Clear the container
    logsContainer.innerHTML = '';
    
    // Add a new entry indicating logs were cleared
    addLogEntry({
        level: 'info',
        message: 'יומן פעילות נוקה'
    });
}

// Request a check for application updates
function checkForUpdates() {
    // Change button appearance to show checking state
    const button = document.getElementById('check-updates');
    const versionLabel = button.querySelector('.version-label');
    const checkText = button.querySelector('.check-updates-text');
    
    // Save original text to restore later
    const originalText = checkText.textContent;
    
    // Update button appearance
    button.disabled = true;
    checkText.textContent = 'בודק...';
    
    // Add loading indicator
    const spinner = document.createElement('span');
    spinner.className = 'spinner';
    button.appendChild(spinner);
    
    // Send message to main process to check for updates
    ipcRenderer.send('check-for-updates');
    
    // Restore button after timeout (in case of no response)
    setTimeout(() => {
        button.disabled = false;
        checkText.textContent = originalText;
        spinner.remove();
    }, 15000); // 15 second timeout
}

// Handle update status messages from main process
function handleUpdateStatus(data) {
    const button = document.getElementById('check-updates');
    const versionLabel = button.querySelector('.version-label');
    const checkText = button.querySelector('.check-updates-text');
    const spinner = button.querySelector('.spinner');
    
    // Remove loading spinner if it exists
    if (spinner) spinner.remove();
    
    // Enable button
    button.disabled = false;
    
    // Reset text
    checkText.textContent = 'בדוק עדכונים';
    
    // Handle different status messages
    switch (data.status) {
        case 'update-not-available':
            addLogEntry({
                level: 'info',
                message: data.message || 'אתה משתמש בגרסה האחרונה'
            });
            break;
            
        case 'update-available':
            addLogEntry({
                level: 'info',
                message: data.message || 'עדכון חדש זמין'
            });
            // Update button appearance
            button.classList.add('btn-primary');
            button.classList.remove('btn-outline');
            checkText.textContent = 'עדכון זמין!';
            break;
            
        case 'update-downloaded':
            addLogEntry({
                level: 'info',
                message: data.message || 'עדכון הורד והוא מוכן להתקנה'
            });
            // Update button appearance to indicate ready for install
            button.classList.add('btn-primary');
            button.classList.remove('btn-outline');
            checkText.textContent = 'התקן עדכון';
            // Change click handler to install update
            button.removeEventListener('click', checkForUpdates);
            button.addEventListener('click', () => {
                ipcRenderer.send('install-update');
            });
            break;
            
        case 'error':
            addLogEntry({
                level: 'error',
                message: data.message || 'שגיאה בבדיקת עדכונים'
            });
            break;
            
        default:
            addLogEntry({
                level: 'info',
                message: data.message || 'בודק עדכונים...'
            });
    }
}

// Handle Google authentication result
function handleGoogleAuthResult(result) {
    if (result.success) {
        showGoogleConnected(result.email);
        
        // Add log entry
        addLogEntry({
            level: 'info',
            message: `התחברות לחשבון Google הצליחה: ${result.email}`
        });
    } else {
        // Add error log entry
        addLogEntry({
            level: 'error',
            message: `שגיאה בהתחברות לחשבון Google: ${result.error || 'שגיאה לא ידועה'}`
        });
    }
}

// Handle WhatsApp authentication result
function handleWhatsAppAuthResult(result) {
    if (result.success) {
        showWhatsAppConnected();
        
        // Add log entry
        addLogEntry({
            level: 'info',
            message: 'התחברות ל-WhatsApp הצליחה'
        });
    } else {
        // Add error log entry
        addLogEntry({
            level: 'error',
            message: `שגיאה בהתחברות ל-WhatsApp: ${result.error || 'שגיאה לא ידועה'}`
        });
    }
}

// Handle OpenAI authentication result
function handleOpenAIAuthResult(result) {
    if (result.success) {
        showOpenAIConnected();
        
        // Add log entry
        addLogEntry({
            level: 'info',
            message: 'התחברות ל-OpenAI הצליחה'
        });
    } else {
        // Add error log entry
        addLogEntry({
            level: 'error',
            message: `שגיאה בהתחברות ל-OpenAI: ${result.error || 'שגיאה לא ידועה'}`
        });
    }
}

// Show Google connected UI
function showGoogleConnected(email) {
    const connectionInfo = document.getElementById('google-connection-info');
    const emailDisplay = document.getElementById('google-email-display');
    const connectButton = document.getElementById('connect-google');
    
    if (connectionInfo && emailDisplay && connectButton) {
        emailDisplay.textContent = email || '';
        connectionInfo.classList.remove('hidden');
        connectButton.classList.add('hidden');
    }
}

// Show Google disconnected UI
function showGoogleDisconnected() {
    const connectionInfo = document.getElementById('google-connection-info');
    const connectButton = document.getElementById('connect-google');
    
    if (connectionInfo && connectButton) {
        connectionInfo.classList.add('hidden');
        connectButton.classList.remove('hidden');
    }
}

// Show WhatsApp connected UI
function showWhatsAppConnected() {
    const connectionInfo = document.getElementById('whatsapp-connection-info');
    const connectButton = document.getElementById('connect-whatsapp');
    
    if (connectionInfo && connectButton) {
        connectionInfo.classList.remove('hidden');
        connectButton.classList.add('hidden');
    }
}

// Show WhatsApp disconnected UI
function showWhatsAppDisconnected() {
    const connectionInfo = document.getElementById('whatsapp-connection-info');
    const connectButton = document.getElementById('connect-whatsapp');
    
    if (connectionInfo && connectButton) {
        connectionInfo.classList.add('hidden');
        connectButton.classList.remove('hidden');
    }
}

// Show OpenAI connected UI
function showOpenAIConnected() {
    const connectionInfo = document.getElementById('openai-connection-info');
    const connectButton = document.getElementById('connect-openai');
    
    if (connectionInfo && connectButton) {
        connectionInfo.classList.remove('hidden');
        connectButton.classList.add('hidden');
    }
}

// Show OpenAI disconnected UI
function showOpenAIDisconnected() {
    const connectionInfo = document.getElementById('openai-connection-info');
    const connectButton = document.getElementById('connect-openai');
    
    if (connectionInfo && connectButton) {
        connectionInfo.classList.add('hidden');
        connectButton.classList.remove('hidden');
    }
}

// Update settings form with loaded settings
function updateSettingsForm(settings) {
    if (settings.openai_api_key) {
        document.getElementById('openai_api_key').value = settings.openai_api_key;
    }
    
    if (settings.spreadsheet_id) {
        document.getElementById('spreadsheet_id').value = settings.spreadsheet_id;
    }
    
    // Update connection info based on saved credentials
    if (settings.google_auth) {
        showGoogleConnected(settings.google_auth.email);
    } else {
        showGoogleDisconnected();
    }
    
    if (settings.whatsapp_auth) {
        showWhatsAppConnected();
    } else {
        showWhatsAppDisconnected();
    }
    
    if (settings.openai_api_key) {
        // We don't automatically connect to OpenAI, just show the key is saved
        addLogEntry({
            level: 'info',
            message: 'נמצא מפתח OpenAI שמור'
        });
    }
}