require('dotenv').config();
const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');
const { google } = require('googleapis');
const whatsappConnection = require('./connectWA');
const { standardizePrice, getNextAssetId, getRealtorInfo, validateLocation } = require('./dataUtils');

// Read the system prompt from prompt_groups_listner.txt
let systemPrompt;
try {
    systemPrompt = fs.readFileSync(path.join(process.cwd(), 'prompt_groups_listner.txt'), 'utf8');
    console.log('Successfully loaded prompt file');
} catch (error) {
    console.error('Error loading prompt file:', error);
    systemPrompt = 'Please analyze the WhatsApp message and extract relevant real estate information in JSON format.';
}

// Helper function to transform advertised phone numbers
function transformAdvertisedPhone(phoneStr) {
    if (phoneStr && phoneStr.startsWith("0")) {
        return "972" + phoneStr.slice(1);
    }
    return phoneStr;
}

class GroupListener extends EventEmitter {
    constructor() {
        super();  // Initialize EventEmitter
        this.openai = null;
        this.sheetsClient = null;
        this.selectedGroups = new Set();
        this.isListening = false;
        this.predefinedLists = null;
    }

    async initialize() {
        try {
            // Initialize OpenAI
            console.log('Connecting to OpenAI...');
            process.stdout.write('Connecting to OpenAI...\n');
            
            const openaiModule = await import('openai');
            const OpenAI = openaiModule.default;
            this.openai = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY,
            });
            console.log('Connected to OpenAI');
            process.stdout.write('Connected to OpenAI\n');

            // Initialize Google Sheets
            console.log('Connecting to Google Sheets...');
            process.stdout.write('Connecting to Google Sheets...\n');
            
            const auth = new google.auth.GoogleAuth({
                keyFile: 'service-account.json',
                scopes: ['https://www.googleapis.com/auth/spreadsheets']
            });
            const authClient = await auth.getClient();
            this.sheetsClient = google.sheets({ version: 'v4', auth: authClient });
            
            console.log('Connected to Google Sheets');
            process.stdout.write('Connected to Google Sheets\n');

        } catch (error) {
            const errorMsg = 'Failed to initialize: ' + error.message;
            console.error(errorMsg);
            process.stdout.write(errorMsg + '\n');
            throw error;
        }
    }

    async loadPredefinedLists() {
        try {
            console.log('Fetching predefined lists...');
            
            // Fetch Streets worksheet (contains neighborhoods, streets, cities)
            const streets = await this.sheetsClient.spreadsheets.values.get({
                spreadsheetId: process.env.SPREADSHEET_ID,
                range: 'Streets!A:C'
            });

            // Fetch Apt_Types worksheet
            const aptTypes = await this.sheetsClient.spreadsheets.values.get({
                spreadsheetId: process.env.SPREADSHEET_ID,
                range: 'Apt_Types!A:A'
            });

            // Fetch Apt_Conditions worksheet
            const aptConditions = await this.sheetsClient.spreadsheets.values.get({
                spreadsheetId: process.env.SPREADSHEET_ID,
                range: 'Apt_Conditions!A:A'
            });

            // Debug print the lists
            console.log('DEBUG - Loaded Lists:');
            console.log('Streets Data:', JSON.stringify(streets.data.values, null, 2));
            console.log('Apartment Types:', JSON.stringify(aptTypes.data.values.flat(), null, 2));
            console.log('Apartment Conditions:', JSON.stringify(aptConditions.data.values.flat(), null, 2));

            // Format the lists for the prompt
            const formattedLists = `
רשימת ערים, שכונות ורחובות:
${JSON.stringify(streets.data.values, null, 2)}

רשימת סוגי דירות:
${JSON.stringify(aptTypes.data.values.flat(), null, 2)}

רשימת מצבי דירה:
${JSON.stringify(aptConditions.data.values.flat(), null, 2)}`;

            return formattedLists;

        } catch (error) {
            console.error('Error loading predefined lists:', error);
            process.stdout.write('Error loading predefined lists: ' + error.message + '\n');
            return "Error loading lists - using free text input";
        }
    }

    setSelectedGroups(groups) {
        this.selectedGroups = new Set(groups);
        console.log(`Monitoring ${groups.length} groups`);
        process.stdout.write(`Monitoring ${groups.length} groups\n`);
    }

    async startListening() {
        if (this.isListening) {
            return;
        }

        try {
            const sock = await whatsappConnection;
            this.isListening = true;

            // Process incoming messages
            sock.ev.on('messages.upsert', async (m) => {
                for (let msg of m.messages) {
                    // Only process messages from selected groups
                    if (msg.key && this.selectedGroups.has(msg.key.remoteJid)) {
                        await this.processMessage(sock, msg);
                    }
                }
            });

            console.log('Started monitoring selected groups');
            process.stdout.write('Started monitoring selected groups\n');
        } catch (error) {
            const errorMsg = 'Failed to start listening: ' + error.message;
            console.error(errorMsg);
            process.stdout.write(errorMsg + '\n');
            throw error;
        }
    }

    async processMessage(sock, msg) {
        try {
            // Get group metadata for group name
            const groupId = msg.key.remoteJid;
            let groupName = "";
            try {
                const metadata = await sock.groupMetadata(groupId);
                groupName = metadata.subject;
            } catch (err) {
                console.error('Error fetching group metadata:', err);
                process.stdout.write('Error fetching group metadata: ' + err.message + '\n');
            }

            // Use the WhatsApp message timestamp
            const dt = new Date(msg.messageTimestamp ? msg.messageTimestamp * 1000 : Date.now());
            const day = ("0" + dt.getDate()).slice(-2);
            const month = ("0" + (dt.getMonth() + 1)).slice(-2);
            const year = dt.getFullYear();
            const hours = ("0" + dt.getHours()).slice(-2);
            const minutes = ("0" + dt.getMinutes()).slice(-2);
            const timestamp = `${day}/${month}/${year} ${hours}:${minutes}`;

            // Process sender's phone number
            const rawPhone = msg.key.participant || msg.key.remoteJid || 'Unknown';
            const phone = rawPhone.replace(/@s\.whatsapp\.net$/, '').replace(/@g\.us$/, '');
            const username = msg.pushName || 'Unknown';

            let messageContent = '';
            if (msg.message) {
                if (msg.message.conversation) {
                    messageContent = msg.message.conversation;
                } else if (msg.message.extendedTextMessage && msg.message.extendedTextMessage.text) {
                    messageContent = msg.message.extendedTextMessage.text;
                } else {
                    messageContent = '[Non-text message]';
                }
            }

            // Print message details to terminal and UI
            console.log(`Group ID: ${groupId}`);
            console.log(`Group Name: ${groupName}`);
            console.log(`Sender Name: ${username}`);
            console.log(`Phone Number: ${phone}`);
            console.log(`Timestamp: ${timestamp}`);
            console.log(`Message: ${messageContent}`);

            process.stdout.write(`Group ID: ${groupId}\n`);
            process.stdout.write(`Group Name: ${groupName}\n`);
            process.stdout.write(`Sender Name: ${username}\n`);
            process.stdout.write(`Phone Number: ${phone}\n`);
            process.stdout.write(`Timestamp: ${timestamp}\n`);
            process.stdout.write(`Message: ${messageContent}\n`);

            // Load current predefined lists
            const currentLists = await this.loadPredefinedLists();
            
            // Create dynamic prompt with current lists
            const dynamicPrompt = systemPrompt.replace(
                '{DYNAMIC_LISTS_PLACEHOLDER}',
                currentLists
            );

            // Build metadata-enhanced prompt for OpenAI
            const messageForAI = `Group id: ${groupId}
Group name: ${groupName}
Sender name: ${username}
Phone number: ${phone}
Timestamp: ${timestamp}

Message:
${messageContent}`;

            if (messageContent && messageContent !== '[Non-text message]' && this.openai) {
                try {
                    const response = await this.openai.chat.completions.create({
                        model: "gpt-4o-mini-2024-07-18",
                        messages: [
                            { role: "system", content: dynamicPrompt },
                            { role: "user", content: messageForAI },
                        ],
                    });
                    const aiResponse = response.choices[0].message.content.trim();
                    console.log(`AI Response: ${aiResponse}`);
                    process.stdout.write(`AI Response: ${aiResponse}\n`);

                    let jsonString = aiResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
                    let parsedOutput;
                    try {
                        parsedOutput = JSON.parse(jsonString);
                        console.log('DEBUG - Parsed Output:', JSON.stringify(parsedOutput, null, 2));

                        // Process locations
                        const locationTypes = {
                            'שכונה': 'neighborhood',
                            'רחוב': 'street',
                            'עיר': 'city'
                        };

                        let locationNotes = [];
                        for (const [hebrewKey, type] of Object.entries(locationTypes)) {
                            if (parsedOutput[hebrewKey]) {
                                const result = await validateLocation(
                                    parsedOutput[hebrewKey],
                                    type,
                                    this.sheetsClient,
                                    process.env.SPREADSHEET_ID
                                );
                                
                                // Always use the location value from the AI response
                                if (result.internalNote) {
                                    locationNotes.push(result.internalNote);
                                }
                            }
                        }

                        // Add location notes to internal notes if any
                        if (locationNotes.length > 0) {
                            parsedOutput['הערות פנימיות'] = (parsedOutput['הערות פנימיות'] || '') + 
                                '\n' + locationNotes.join('\n');
                        }

                        // Get realtor info
                        const realtorInfo = await getRealtorInfo(
                            phone,
                            this.sheetsClient,
                            process.env.SPREADSHEET_ID
                        );

                        // Get next asset ID
                        const assetId = await getNextAssetId(
                            this.sheetsClient,
                            process.env.SPREADSHEET_ID
                        );

                        // Prepare final row
                        const finalRow = [
                            assetId,  // Asset ID
                            realtorInfo ? realtorInfo.name : '',  // Realtor name
                            phone,  // Phone number
                            parsedOutput['שכונה'] || '',
                            parsedOutput['רחוב'] || '',
                            parsedOutput['עיר'] || '',
                            parsedOutput['מספר בית'] || '',
                            parsedOutput['סוג הדירה'] || '',
                            parsedOutput['מספר החדרים'] || '',
                            parsedOutput['גודל בטאבו'] || '',
                            parsedOutput['גודל בארנונה'] || '',
                            parsedOutput['פינת אוכל מוגדרת'] || '',
                            parsedOutput['מטבע'] || 'ש"ח',
                            parsedOutput['מחיר מעודכן 1'] || '',
                            parsedOutput['מחיר מעודכן 2'] || '',
                            parsedOutput['מחיר מעודכן 3'] || '',
                            parsedOutput['מחיר מעודכן 4'] || '',
                            parsedOutput['קומה/מתוך כמה'] || '',
                            parsedOutput['נגישות (מפורט)'] || '',
                            parsedOutput['רמת נגישות'] || '',
                            parsedOutput['מעלית'] || '',
                            parsedOutput['מרפסת 1 (מפורט)'] || '',
                            parsedOutput['מרפסת 2 (מפורט)'] || '',
                            parsedOutput['מרפסת 3 (מפורט)'] || '',
                            parsedOutput['מחסן (מפורט)'] || '',
                            parsedOutput['מקלט (מפורט)'] || '',
                            parsedOutput['גינה (מפורט)'] || '',
                            parsedOutput['חניה (מפורט)'] || '',
                            parsedOutput['מצב הדירה'] || '',
                            parsedOutput['פינוי (מתי)'] || '',
                            parsedOutput['הערות (פרטי הנכס)'] || '',
                            timestamp,  // Timestamp
                            groupName,  // Group name
                            parsedOutput['סטטוס'] || 'פעיל',
                            parsedOutput['הערות פנימיות'] || ''
                        ];

                        console.log('DEBUG - Final Row:', JSON.stringify(finalRow, null, 2));

                        // Emit the processed message
                        this.emit('processedMessage', finalRow);

                    } catch (e) {
                        // Attempt to fix unescaped quotes
                        const fixedJsonString = jsonString.replace(/ש"ח/g, 'ש\\"ח');
                        try {
                            parsedOutput = JSON.parse(fixedJsonString);
                            console.log('DEBUG - Parsed Output:', JSON.stringify(parsedOutput, null, 2));

                            // Process locations
                            const locationTypes = {
                                'שכונה': 'neighborhood',
                                'רחוב': 'street',
                                'עיר': 'city'
                            };

                            let locationNotes = [];
                            for (const [hebrewKey, type] of Object.entries(locationTypes)) {
                                if (parsedOutput[hebrewKey]) {
                                    const result = await validateLocation(
                                        parsedOutput[hebrewKey],
                                        type,
                                        this.sheetsClient,
                                        process.env.SPREADSHEET_ID
                                    );
                                    
                                    // Always use the location value from the AI response
                                    if (result.internalNote) {
                                        locationNotes.push(result.internalNote);
                                    }
                                }
                            }

                            // Add location notes to internal notes if any
                            if (locationNotes.length > 0) {
                                parsedOutput['הערות פנימיות'] = (parsedOutput['הערות פנימיות'] || '') + 
                                    '\n' + locationNotes.join('\n');
                            }

                            // Get realtor info
                            const realtorInfo = await getRealtorInfo(
                                phone,
                                this.sheetsClient,
                                process.env.SPREADSHEET_ID
                            );

                            // Get next asset ID
                            const assetId = await getNextAssetId(
                                this.sheetsClient,
                                process.env.SPREADSHEET_ID
                            );

                            // Prepare final row
                            const finalRow = [
                                assetId,  // Asset ID
                                realtorInfo ? realtorInfo.name : '',  // Realtor name
                                phone,  // Phone number
                                parsedOutput['שכונה'] || '',
                                parsedOutput['רחוב'] || '',
                                parsedOutput['עיר'] || '',
                                parsedOutput['מספר בית'] || '',
                                parsedOutput['סוג הדירה'] || '',
                                parsedOutput['מספר החדרים'] || '',
                                parsedOutput['גודל בטאבו'] || '',
                                parsedOutput['גודל בארנונה'] || '',
                                parsedOutput['פינת אוכל מוגדרת'] || '',
                                parsedOutput['מטבע'] || 'ש"ח',
                                parsedOutput['מחיר מעודכן 1'] || '',
                                parsedOutput['מחיר מעודכן 2'] || '',
                                parsedOutput['מחיר מעודכן 3'] || '',
                                parsedOutput['מחיר מעודכן 4'] || '',
                                parsedOutput['קומה/מתוך כמה'] || '',
                                parsedOutput['נגישות (מפורט)'] || '',
                                parsedOutput['רמת נגישות'] || '',
                                parsedOutput['מעלית'] || '',
                                parsedOutput['מרפסת 1 (מפורט)'] || '',
                                parsedOutput['מרפסת 2 (מפורט)'] || '',
                                parsedOutput['מרפסת 3 (מפורט)'] || '',
                                parsedOutput['מחסן (מפורט)'] || '',
                                parsedOutput['מקלט (מפורט)'] || '',
                                parsedOutput['גינה (מפורט)'] || '',
                                parsedOutput['חניה (מפורט)'] || '',
                                parsedOutput['מצב הדירה'] || '',
                                parsedOutput['פינוי (מתי)'] || '',
                                parsedOutput['הערות (פרטי הנכס)'] || '',
                                timestamp,  // Timestamp
                                groupName,  // Group name
                                parsedOutput['סטטוס'] || 'פעיל',
                                parsedOutput['הערות פנימיות'] || ''
                            ];

                            console.log('DEBUG - Final Row:', JSON.stringify(finalRow, null, 2));

                            // Emit the processed message
                            this.emit('processedMessage', finalRow);

                        } catch (e2) {
                            console.error('Failed to parse AI response:', e2);
                            process.stdout.write('Failed to parse AI response: ' + e2.message + '\n');
                        }
                    }
                } catch (error) {
                    console.error('Error processing message with AI:', error);
                    process.stdout.write('Error processing message with AI: ' + error.message + '\n');
                }
            }
        } catch (error) {
            console.error('Error in processMessage:', error);
            process.stdout.write('Error in processMessage: ' + error.message + '\n');
        }
    }

    stopListening() {
        this.isListening = false;
        this.selectedGroups.clear();
        console.log('Stopped monitoring groups');
        process.stdout.write('Stopped monitoring groups\n');
    }
}

// Create and export a singleton instance
module.exports = new GroupListener(); 