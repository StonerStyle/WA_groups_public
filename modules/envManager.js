const fs = require('fs').promises;
const path = require('path');
const dotenv = require('dotenv');
const credentialStore = require('./credentialStore');

class EnvManager {
    constructor() {
        this.envPath = path.join(process.cwd(), '.env');
        // Define the mapping between form field names and .env file keys - exact matches from .env
        this.keyMapping = {
            'spreadsheet_id': 'SPREADSHEET_ID',
            'openai_api_key': 'OpenAI_API_KEY',  // Changed to match .env
            'google_api_key': 'Google_API_KEY',  // Added from .env
            'google_service_account_json': 'GOOGLE_SERVICE_ACCOUNT_JSON'
        };
    }

    async loadEnv() {
        try {
            // First check if credentials have been migrated to secure storage
            const hasMigratedCredentials = await credentialStore.hasMigratedCredentials();
            if (hasMigratedCredentials) {
                console.log('Loading credentials from secure storage');
                const secureCredentials = await credentialStore.getCredentials();
                
                // Convert keys to form field format
                const result = {};
                Object.entries(this.keyMapping).forEach(([formKey]) => {
                    result[formKey] = secureCredentials[formKey] || '';
                });
                
                return result;
            }
            
            // Fall back to .env file if secure storage is empty
            console.log('Loading credentials from .env file');
            const envFile = await fs.readFile(this.envPath, 'utf8');
            const parsed = dotenv.parse(envFile);
            
            // First time loading from .env - migrate to secure storage
            await this.migrateToSecureStorage(parsed);
            
            // Map the environment variables to form field names
            const result = {};
            Object.entries(this.keyMapping).forEach(([formKey, envKey]) => {
                result[formKey] = parsed[envKey] || '';
            });
            
            return result;
        } catch (error) {
            if (error.code === 'ENOENT') {
                // If .env doesn't exist, return empty values for all form fields
                return Object.keys(this.keyMapping).reduce((acc, key) => {
                    acc[key] = '';
                    return acc;
                }, {});
            }
            console.error('Error loading credentials:', error);
            throw error;
        }
    }

    async saveEnv(variables) {
        try {
            // First save to secure storage (primary storage)
            for (const [formKey, value] of Object.entries(variables)) {
                if (value) {
                    await credentialStore.setCredential(formKey, value);
                }
            }
            
            // Also update .env file for backward compatibility
            // Read existing env file if it exists
            let existingVars = {};
            try {
                const envFile = await fs.readFile(this.envPath, 'utf8');
                existingVars = dotenv.parse(envFile);
            } catch (error) {
                if (error.code !== 'ENOENT') throw error;
            }

            // Convert form field names to .env keys and merge with existing vars
            const mergedVars = { ...existingVars };
            Object.entries(variables).forEach(([formKey, value]) => {
                const envKey = this.keyMapping[formKey];
                if (envKey && value) {
                    mergedVars[envKey] = value;
                }
            });
            
            // Filter out empty values
            const cleanVars = Object.entries(mergedVars)
                .filter(([_, value]) => value !== undefined && value !== '')
                .reduce((acc, [key, value]) => {
                    acc[key] = value;
                    return acc;
                }, {});

            // Convert to env file format
            const envContent = Object.entries(cleanVars)
                .map(([key, value]) => `${key}=${value}`)
                .join('\n');
            
            await fs.writeFile(this.envPath, envContent);
            
            // Update process.env
            Object.entries(cleanVars).forEach(([key, value]) => {
                process.env[key] = value;
            });
            
            console.log('Credentials saved to secure storage and .env file');
            return true;
        } catch (error) {
            console.error('Error saving credentials:', error);
            throw error;
        }
    }

    // Migrate from .env file to secure storage
    async migrateToSecureStorage(envVars) {
        try {
            const result = await credentialStore.migrateFromEnv(envVars);
            if (result) {
                console.log('Successfully migrated credentials to secure storage');
            }
            return result;
        } catch (error) {
            console.error('Error migrating to secure storage:', error);
            return false;
        }
    }
}

module.exports = new EnvManager(); 