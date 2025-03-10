const crypto = require('crypto');
const os = require('os');
const path = require('path');
const fs = require('fs');

// We'll need to initialize store asynchronously
let store = null;

// Create a unique machine-specific encryption key
// This combines machine-specific information with a constant salt
// to create a consistent but secure encryption key
function generateMachineKey() {
    // Get machine-specific information
    const hostname = os.hostname();
    const username = os.userInfo().username;
    const cpus = os.cpus()[0]?.model || '';
    
    // Combine with a salt (this should ideally be in a separate config)
    const salt = 'WA_Group_Scrape_Salt_8e3c9a4b';
    const machineInfo = `${hostname}-${username}-${cpus}-${salt}`;
    
    // Create a SHA-256 hash of the machine info to use as encryption key
    return crypto.createHash('sha256').update(machineInfo).digest('hex').substring(0, 32);
}

// Initialize the store asynchronously
async function initStore() {
    if (store) return store;
    
    try {
        // Create .app_data directory if it doesn't exist
        if (!fs.existsSync(path.join(process.cwd(), '.app_data'))) {
            fs.mkdirSync(path.join(process.cwd(), '.app_data'), { recursive: true });
        }
        
        // Use dynamic import for electron-store
        const { default: Store } = await import('electron-store');
        
        store = new Store({
            name: 'credentials',
            encryptionKey: generateMachineKey(),
            cwd: path.join(process.cwd(), '.app_data'),
            fileExtension: 'data'
        });
        
        return store;
    } catch (error) {
        console.error('Failed to initialize secure store:', error);
        throw error;
    }
}

/**
 * Get all stored credentials
 * @returns {Promise<Object>} Object containing all credentials
 */
async function getCredentials() {
    const store = await initStore();
    return {
        openai_api_key: store.get('openai_api_key'),
        google_api_key: store.get('google_api_key'),
        google_service_account_json: store.get('google_service_account_json'),
        spreadsheet_id: store.get('spreadsheet_id')
    };
}

/**
 * Set a specific credential
 * @param {string} key - Credential key
 * @param {string} value - Credential value
 * @returns {Promise<void>}
 */
async function setCredential(key, value) {
    const store = await initStore();
    store.set(key, value);
}

/**
 * Migrate credentials from .env file to secure storage
 * @param {Object} envVars - Environment variables from .env file
 * @returns {Promise<boolean>}
 */
async function migrateFromEnv(envVars) {
    const store = await initStore();
    
    // List of credentials to migrate
    const credentialKeys = [
        'OpenAI_API_KEY',
        'Google_API_KEY',
        'GOOGLE_SERVICE_ACCOUNT_JSON',
        'SPREADSHEET_ID'
    ];
    
    // Map old keys to new keys with consistent naming
    const keyMap = {
        'OpenAI_API_KEY': 'openai_api_key',
        'Google_API_KEY': 'google_api_key',
        'GOOGLE_SERVICE_ACCOUNT_JSON': 'google_service_account_json',
        'SPREADSHEET_ID': 'spreadsheet_id'
    };
    
    // Migrate each credential if it exists
    for (const oldKey of credentialKeys) {
        if (envVars[oldKey]) {
            const newKey = keyMap[oldKey];
            store.set(newKey, envVars[oldKey]);
            console.log(`Migrated ${oldKey} to secure storage`);
        }
    }
    
    return true;
}

/**
 * Check if credentials have been migrated to secure storage
 * @returns {Promise<boolean>} True if credentials exist in secure storage
 */
async function hasMigratedCredentials() {
    try {
        const store = await initStore();
        const credentials = await getCredentials();
        // Check if at least one credential exists
        return Object.values(credentials).some(value => value !== undefined);
    } catch (error) {
        console.error('Error checking migrated credentials:', error);
        return false;
    }
}

/**
 * Delete all stored credentials (for testing or reset)
 * @returns {Promise<void>}
 */
async function clearCredentials() {
    const store = await initStore();
    store.clear();
}

module.exports = {
    getCredentials,
    setCredential,
    migrateFromEnv,
    hasMigratedCredentials,
    clearCredentials
}; 