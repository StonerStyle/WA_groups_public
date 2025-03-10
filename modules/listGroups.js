require('dotenv').config();
const { google } = require('googleapis');
const whatsappConnection = require('./connectWA');

async function updateGoogleSheet(groups) {
    try {
        // Initialize Google Sheets API client
        const auth = new google.auth.GoogleAuth({
            keyFile: 'service-account.json',
            scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });
        const authClient = await auth.getClient();
        const sheets = google.sheets({ version: 'v4', auth: authClient });
        
        // Prepare data: each row is [group ID, group subject]
        const values = groups.map(group => [group.id, group.subject]);
        
        const spreadsheetId = process.env.SPREADSHEET_ID;
        // The range "ListGroups!A2:B" starts at row 2 to skip the header row.
        const range = 'ListGroups!A2:B';

        const result = await sheets.spreadsheets.values.update({
            spreadsheetId,
            range,
            valueInputOption: 'RAW',
            resource: { values }
        });
        process.stdout.write('Sheet updated successfully!\n');
        return result.data;
    } catch (error) {
        console.error('[ERROR]:\n', error);
        throw error;
    }
}

async function fetchAndUpdateGroups() {
    try {
        // Wait for the WhatsApp connection to be established
        const sock = await whatsappConnection;
        
        // Terminal logs in English
        process.stdout.write('Fetching groups...\n');
        // UI logs in Hebrew (through console.log which is intercepted)
        console.log('מסנכרן קבוצות...');
        
        const chats = await sock.groupFetchAllParticipating();
        const groups = Object.values(chats).map(group => ({
            id: group.id,
            subject: group.subject
        }));
        
        process.stdout.write(`Found ${groups.length} groups\n`);
        console.log(`נמצאו ${groups.length} קבוצות`);
        
        await updateGoogleSheet(groups);
        process.stdout.write('Sheet updated successfully!\n');
        console.log('קבוצות סונכרנו!');
        
        return groups;  // Return groups for UI display
    } catch (error) {
        console.error('[ERROR]:\n', error);
        throw error;
    }
}

module.exports = {
    fetchAndUpdateGroups
};
