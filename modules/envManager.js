const fs = require('fs').promises;
const path = require('path');
const dotenv = require('dotenv');

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
            const envFile = await fs.readFile(this.envPath, 'utf8');
            const parsed = dotenv.parse(envFile);
            
            console.log('Loaded .env file:', parsed); // Debug line
            
            // Map the environment variables to form field names
            const result = {};
            Object.entries(this.keyMapping).forEach(([formKey, envKey]) => {
                result[formKey] = parsed[envKey] || '';
                console.log(`Mapping ${envKey} to ${formKey}:`, result[formKey]); // Debug line
            });
            
            console.log('Final result:', result); // Debug line
            return result;
        } catch (error) {
            if (error.code === 'ENOENT') {
                // If .env doesn't exist, return empty values for all form fields
                return Object.keys(this.keyMapping).reduce((acc, key) => {
                    acc[key] = '';
                    return acc;
                }, {});
            }
            console.error('Error loading .env:', error); // Debug line
            throw error;
        }
    }

    async saveEnv(variables) {
        try {
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
            
            return true;
        } catch (error) {
            console.error('Error saving .env file:', error);
            throw error;
        }
    }
}

module.exports = new EnvManager(); 