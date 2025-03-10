require('dotenv').config();
const { google } = require('googleapis');

class SheetsUpdater {
    constructor() {
        this.sheets = null;
    }

    async initialize() {
        try {
            console.log('Connecting to Google Sheets...');
            process.stdout.write('Connecting to Google Sheets...\n');

            const auth = new google.auth.GoogleAuth({
                keyFile: 'service-account.json',
                scopes: ['https://www.googleapis.com/auth/spreadsheets']
            });
            const authClient = await auth.getClient();
            this.sheets = google.sheets({ version: 'v4', auth: authClient });

            console.log('Connected to Google Sheets');
            process.stdout.write('Connected to Google Sheets\n');
        } catch (error) {
            const errorMsg = 'Failed to connect to Google Sheets: ' + error.message;
            console.error(errorMsg);
            process.stdout.write(errorMsg + '\n');
            throw error;
        }
    }

    async appendRow(row) {
        if (!this.sheets) {
            throw new Error('Google Sheets not initialized');
        }

        try {
            const spreadsheetId = process.env.SPREADSHEET_ID;
            await this.sheets.spreadsheets.values.append({
                spreadsheetId,
                range: 'Assets!A2',
                valueInputOption: 'RAW',
                insertDataOption: 'INSERT_ROWS',
                resource: { values: [row] },
            });

            console.log('Added new row to Google Sheets');
            process.stdout.write('Added new row to Google Sheets\n');
        } catch (error) {
            const errorMsg = 'Failed to append row to Google Sheets: ' + error.message;
            console.error(errorMsg);
            process.stdout.write(errorMsg + '\n');
            throw error;
        }
    }
}

module.exports = new SheetsUpdater(); 