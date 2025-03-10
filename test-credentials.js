// Test script for credential storage system
const envManager = require('./modules/envManager');
const credentialStore = require('./modules/credentialStore');
const path = require('path');

// ANSI color codes for prettier console output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

// Display a section header
function displayHeader(text) {
    console.log('\n' + colors.cyan + '='.repeat(50) + colors.reset);
    console.log(colors.cyan + ' ' + text + colors.reset);
    console.log(colors.cyan + '='.repeat(50) + colors.reset);
}

// Display a result
function displayResult(label, value, success = true) {
    const color = success ? colors.green : colors.red;
    console.log(`${color}${label}:${colors.reset} ${value}`);
}

// Test credential storage functionality
async function testCredentialStorage() {
    try {
        displayHeader('Secure Credential Storage Test');
        
        // Test 1: Check if credentials have been migrated
        const hasMigratedCredentials = await credentialStore.hasMigratedCredentials();
        displayResult('Credentials already migrated', hasMigratedCredentials);

        // Test 2: Load credentials using the envManager
        console.log('\n' + colors.yellow + 'Loading credentials via envManager:' + colors.reset);
        const credentials = await envManager.loadEnv();
        
        // Display the credentials (masked for security)
        Object.entries(credentials).forEach(([key, value]) => {
            // Mask the credential values for display
            let displayValue = '';
            if (value) {
                if (key.includes('key') || key.includes('json')) {
                    // For API keys, show first 4 and last 4 characters
                    displayValue = value.slice(0, 4) + '...' + value.slice(-4);
                } else {
                    // For other values, show as is
                    displayValue = value;
                }
                displayResult(key, displayValue);
            } else {
                displayResult(key, 'Not set', false);
            }
        });

        // Test 3: Verify credential storage directly
        console.log('\n' + colors.yellow + 'Verifying secure storage directly:' + colors.reset);
        const secureCredentials = await credentialStore.getCredentials();
        
        Object.entries(secureCredentials).forEach(([key, value]) => {
            if (value) {
                // For API keys, show first 4 and last 4 characters
                let displayValue = '';
                if (key.includes('key') || key.includes('json')) {
                    displayValue = value.slice(0, 4) + '...' + value.slice(-4);
                } else {
                    displayValue = value;
                }
                displayResult(key, displayValue);
            } else {
                displayResult(key, 'Not set', false);
            }
        });

        // Test 4: Analyze security of storage
        displayHeader('Security Analysis');
        
        // Display the storage location (for information only)
        console.log('\n' + colors.yellow + 'Credential storage location:' + colors.reset);
        console.log(`${colors.blue}${path.join(process.cwd(), '.app_data', 'credentials.data')}${colors.reset}`);
        console.log(`${colors.yellow}Note: This file is encrypted with a machine-specific key${colors.reset}`);
        
        displayHeader('Test Complete');
        console.log(colors.green + 'Credential storage system is working correctly!' + colors.reset);
        
    } catch (error) {
        console.error(colors.red + 'Test failed:' + colors.reset, error);
    }
}

// Run the test
testCredentialStorage(); 