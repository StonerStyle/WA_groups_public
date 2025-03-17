const Store = require('electron-store');
const log = require('electron-log');

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
const store = new Store({
  schema,
  encryptionKey: 'wa-scraper-encryption-key',  // In a real app, use a more secure key
  clearInvalidConfig: true
});

/**
 * Store module for handling app settings and credentials
 */
class StoreManager {
  constructor() {
    this.store = store;
    log.info('Store initialized');
  }

  /**
   * Save settings to the store
   * @param {Object} settings - The settings to save
   */
  saveSettings(settings) {
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

module.exports = new StoreManager(); 