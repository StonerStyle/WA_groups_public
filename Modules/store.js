const log = require('electron-log');

/**
 * Store module for handling app settings and credentials
 */
class StoreManager {
  constructor() {
    this.store = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the store - must be called before using any other methods
   */
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Dynamically import electron-store (ES Module)
      const electronStore = await import('electron-store');
      const Store = electronStore.default;
      
      // Create a schema for the store
      const schema = {
        openai_api_key: {
          type: 'string'
        },
        spreadsheet_id: {
          type: 'string'
        },
        google_auth: {
          type: 'object',
          properties: {
            email: { type: 'string' },
            token: { type: 'string' }
          }
        },
        whatsapp_auth: {
          type: 'object'
        }
      };
      
      // Create the store instance with encryption
      this.store = new Store({
        schema,
        encryptionKey: 'wa-scraper-encryption-key',  // In a real app, use a more secure key
        clearInvalidConfig: true,
        name: 'wa-group-scraper-settings',
        defaults: {
          openai: {
            apiKey: null,
            isConnected: false
          },
          google: {
            credentials: null,
            isConnected: false
          },
          whatsapp: {
            isConnected: false,
            lastConnection: null
          }
        }
      });
      
      this.isInitialized = true;
      log.info('Store initialized');
    } catch (error) {
      log.error('Error initializing store:', error);
      throw error;
    }
  }

  /**
   * Save settings to the store
   * @param {Object} settings - The settings to save
   */
  saveSettings(settings) {
    if (!this.isInitialized) {
      log.error('Store not initialized');
      return false;
    }
    
    try {
      if (settings.openai_api_key) {
        this.store.set('openai_api_key', settings.openai_api_key);
      }
      
      if (settings.spreadsheet_id) {
        this.store.set('spreadsheet_id', settings.spreadsheet_id);
      }
      
      log.info('Settings saved successfully');
      return true;
    } catch (error) {
      log.error('Error saving settings:', error);
      return false;
    }
  }

  /**
   * Load all settings from the store
   * @returns {Object} The loaded settings
   */
  loadSettings() {
    if (!this.isInitialized) {
      log.error('Store not initialized');
      return {
        openai_api_key: '',
        spreadsheet_id: '',
        google_auth: null,
        whatsapp_auth: null
      };
    }
    
    try {
      return {
        openai_api_key: this.store.get('openai_api_key') || '',
        spreadsheet_id: this.store.get('spreadsheet_id') || '',
        google_auth: this.store.get('google_auth') || null,
        whatsapp_auth: this.store.get('whatsapp_auth') || null
      };
    } catch (error) {
      log.error('Error loading settings:', error);
      return {
        openai_api_key: '',
        spreadsheet_id: '',
        google_auth: null,
        whatsapp_auth: null
      };
    }
  }

  /**
   * Save Google authentication data
   * @param {Object} authData - The Google auth data
   */
  saveGoogleAuth(authData) {
    if (!this.isInitialized) {
      log.error('Store not initialized');
      return false;
    }
    
    try {
      this.store.set('google_auth', authData);
      log.info('Google auth data saved');
      return true;
    } catch (error) {
      log.error('Error saving Google auth:', error);
      return false;
    }
  }

  /**
   * Save WhatsApp authentication data
   * @param {Object} authData - The WhatsApp auth data
   */
  saveWhatsAppAuth(authData) {
    if (!this.isInitialized) {
      log.error('Store not initialized');
      return false;
    }
    
    try {
      this.store.set('whatsapp_auth', authData);
      log.info('WhatsApp auth data saved');
      return true;
    } catch (error) {
      log.error('Error saving WhatsApp auth:', error);
      return false;
    }
  }

  /**
   * Clear Google authentication data
   */
  clearGoogleAuth() {
    if (!this.isInitialized) {
      log.error('Store not initialized');
      return false;
    }
    
    try {
      this.store.delete('google_auth');
      log.info('Google auth data cleared');
      return true;
    } catch (error) {
      log.error('Error clearing Google auth:', error);
      return false;
    }
  }

  /**
   * Clear WhatsApp authentication data
   */
  clearWhatsAppAuth() {
    if (!this.isInitialized) {
      log.error('Store not initialized');
      return false;
    }
    
    try {
      this.store.delete('whatsapp_auth');
      log.info('WhatsApp auth data cleared');
      return true;
    } catch (error) {
      log.error('Error clearing WhatsApp auth:', error);
      return false;
    }
  }

  /**
   * Save OpenAI API key
   * @param {string} apiKey - The OpenAI API key
   */
  saveOpenAIKey(apiKey) {
    if (!this.isInitialized) {
      log.error('Store not initialized');
      return false;
    }
    
    try {
      this.store.set('openai_api_key', apiKey);
      log.info('OpenAI API key saved');
      return true;
    } catch (error) {
      log.error('Error saving OpenAI API key:', error);
      return false;
    }
  }

  /**
   * Clear OpenAI API key
   */
  clearOpenAIKey() {
    if (!this.isInitialized) {
      log.error('Store not initialized');
      return false;
    }
    
    try {
      this.store.delete('openai_api_key');
      log.info('OpenAI API key cleared');
      return true;
    } catch (error) {
      log.error('Error clearing OpenAI API key:', error);
      return false;
    }
  }
}

// Create a singleton instance
const storeManager = new StoreManager();

// Export the singleton
module.exports = storeManager; 