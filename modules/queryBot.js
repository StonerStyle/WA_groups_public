const { google } = require('googleapis');
const OpenAI = require('openai');
const fs = require('fs').promises;
const path = require('path');
const whatsappConnection = require('./connectWA');

class QueryBot {
    constructor() {
        this.openai = null;
        this.sheetsClient = null;
        this.whatsapp = null;
        this.interpretPrompt = '';
        this.summarizePrompt = '';
        this.initialized = false;
        this.myNumber = null; // Store bot's number
    }

    async initialize() {
        if (this.initialized) return;

        try {
            console.log('=== DEBUG: Starting QueryBot Initialization ===');
            
            // Initialize OpenAI
            try {
                this.openai = new OpenAI({
                    apiKey: process.env.OpenAI_API_KEY,
                });
                console.log('=== DEBUG: OpenAI initialized successfully ===');
            } catch (error) {
                console.error('=== DEBUG: OpenAI initialization failed ===', error);
                throw error;
            }

            // Initialize Google Sheets
            try {
                const auth = new google.auth.GoogleAuth({
                    keyFile: 'service-account.json',
                    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
                });
                const authClient = await auth.getClient();
                this.sheetsClient = google.sheets({ version: 'v4', auth: authClient });
                console.log('=== DEBUG: Google Sheets initialized successfully ===');
                
                // Test Google Sheets connection
                await this.testSheetsConnection();
                
            } catch (error) {
                console.error('=== DEBUG: Google Sheets initialization failed ===', error);
                throw error;
            }

            // Load prompts
            try {
                this.interpretPrompt = await fs.readFile(
                    path.join(__dirname, '..', 'prompts', 'query_interpret.txt'),
                    'utf8'
                );
                this.summarizePrompt = await fs.readFile(
                    path.join(__dirname, '..', 'prompts', 'query_summarize.txt'),
                    'utf8'
                );
                console.log('=== DEBUG: Prompts loaded successfully ===');
            } catch (error) {
                console.error('=== DEBUG: Failed to load prompts ===', error);
                throw error;
            }

            // Get WhatsApp connection and store my number
            try {
                this.whatsapp = await whatsappConnection;
                this.myNumber = this.whatsapp.user.id.split(':')[0];
                console.log('=== DEBUG: WhatsApp connected successfully ===');
                console.log('Bot number:', this.myNumber);
                
                // Set up message handler for direct queries
                this.whatsapp.ev.on('messages.upsert', async ({ messages }) => {
                    if (!Array.isArray(messages)) {
                        console.log('=== DEBUG: Invalid messages format ===');
                        return;
                    }

                    for (const message of messages) {
                        try {
                            if (!message || !message.key) {
                                console.log('=== DEBUG: Invalid message format ===');
                                continue;
                            }

                            // Extract message text with additional error checking
                            let messageText = '';
                            try {
                                if (message.message) {
                                    if (message.message.conversation) {
                                        messageText = message.message.conversation;
                                    } else if (message.message.extendedTextMessage && message.message.extendedTextMessage.text) {
                                        messageText = message.message.extendedTextMessage.text;
                                    }
                                }
                            } catch (err) {
                                console.error('=== DEBUG: Error extracting message text ===', err);
                                continue;
                            }

                            console.log('=== DEBUG: Message Details ===');
                            console.log('Raw message:', JSON.stringify(message, null, 2));
                            console.log('Extracted text:', messageText);

                            // Only ignore self-messages that start with [BOT]
                            if (message.key.fromMe && messageText.trim().startsWith('[BOT]')) {
                                console.log('=== DEBUG: Ignoring bot response message ===');
                                continue;
                            }

                            // Safely extract sender ID
                            const senderId = ((message.key.participant || message.key.remoteJid || '').split('@')[0] || '').trim();
                            const isDirectMessage = message.key.remoteJid && !message.key.remoteJid.endsWith('@g.us');

                            console.log('=== DEBUG: Message Analysis ===');
                            console.log('Sender ID:', senderId);
                            console.log('Bot number:', this.myNumber);
                            console.log('Is direct message:', isDirectMessage);
                            console.log('Message text:', messageText);
                            console.log('Is from me:', message.key.fromMe);

                            // Additional validation
                            if (!senderId || !this.myNumber) {
                                console.log('=== DEBUG: Missing sender ID or bot number ===');
                                continue;
                            }

                            // Only process direct messages from my number
                            if (isDirectMessage && senderId === this.myNumber) {
                                console.log('=== DEBUG: Processing message from authorized sender ===');
                                await this.handleWhatsAppQuery(message);
                            } else {
                                console.log('=== DEBUG: Message ignored ===');
                                console.log('Reason:', !isDirectMessage ? 'Not a direct message' : 'Not from authorized number');
                            }
                        } catch (error) {
                            console.error('=== DEBUG: Error processing message ===', error);
                            console.error('Stack trace:', error.stack);
                        }
                    }
                });
                
            } catch (error) {
                console.error('=== DEBUG: WhatsApp connection failed ===', error);
                throw error;
            }

            this.initialized = true;
            console.log('=== DEBUG: QueryBot initialization completed successfully ===');
        } catch (error) {
            console.error('=== DEBUG: QueryBot initialization failed ===', error);
            throw error;
        }
    }

    async testSheetsConnection() {
        try {
            console.log('\n=== TESTING GOOGLE SHEETS CONNECTION ===');
            const spreadsheetId = process.env.SPREADSHEET_ID;
            console.log('Using spreadsheet ID:', spreadsheetId);

            // Test Assets sheet
            const assetsResponse = await this.sheetsClient.spreadsheets.values.get({
                spreadsheetId,
                range: 'Assets!A1:AJ2',
                valueRenderOption: 'UNFORMATTED_VALUE'
            });

            if (assetsResponse.data && assetsResponse.data.values) {
                console.log('\nAssets Sheet Test:');
                console.log('- Headers:', assetsResponse.data.values[0]);
                if (assetsResponse.data.values[1]) {
                    console.log('- First Row:', assetsResponse.data.values[1]);
                }
                console.log('- Total Columns:', assetsResponse.data.values[0].length);
            } else {
                console.error('No data found in Assets sheet');
            }

            // Get all sheet names
            const sheetsResponse = await this.sheetsClient.spreadsheets.get({
                spreadsheetId
            });

            console.log('\nAvailable Sheets:');
            sheetsResponse.data.sheets.forEach(sheet => {
                console.log(`- ${sheet.properties.title}`);
            });

            console.log('\n=== GOOGLE SHEETS TEST COMPLETE ===\n');
        } catch (error) {
            console.error('\n=== GOOGLE SHEETS TEST FAILED ===');
            console.error('Error:', error);
            throw error;
        }
    }

    async handleWhatsAppQuery(message) {
        try {
            let query = '';
            if (message.message) {
                if (message.message.conversation) {
                    query = message.message.conversation;
                } else if (message.message.extendedTextMessage && message.message.extendedTextMessage.text) {
                    query = message.message.extendedTextMessage.text;
                }
            }

            // Debug log: Raw message
            console.log('=== DEBUG: Received WhatsApp Message ===');
            console.log('Raw message:', JSON.stringify(message, null, 2));
            console.log('Extracted query:', query);

            // Ignore empty messages or messages starting with [BOT]
            if (!query || query.trim().startsWith('[BOT]')) {
                console.log('=== DEBUG: Message ignored ===');
                console.log('Reason:', !query ? 'Empty query' : 'Bot message');
                return;
            }

            console.log('=== DEBUG: Processing query ===');
            console.log('User query:', query);

            // Process the query
            const response = await this.processQuery(query, this.myNumber);

            console.log('=== DEBUG: Sending response ===');
            console.log('Response to send:', response);

            // Send response back through WhatsApp with [BOT] prefix
            await this.whatsapp.sendMessage(
                message.key.remoteJid,
                { text: `[BOT]\n${response}` },
                { quoted: message }
            );

            console.log('=== DEBUG: Response sent successfully ===');

        } catch (error) {
            console.error('=== DEBUG: Error in handleWhatsAppQuery ===');
            console.error('Error details:', error);
            // Send error message back with [BOT] prefix
            try {
                await this.whatsapp.sendMessage(
                    message.key.remoteJid,
                    { text: `[BOT]\nשגיאה בעיבוד השאילתה: ${error.message}` },
                    { quoted: message }
                );
                console.log('=== DEBUG: Error message sent to user ===');
            } catch (sendError) {
                console.error('=== DEBUG: Failed to send error message ===');
                console.error('Send error details:', sendError);
            }
        }
    }

    async interpretQuery(query) {
        console.log('=== DEBUG: Interpreting Query ===');
        console.log('Input query:', query);
        
        const finalPrompt = this.interpretPrompt.replace('<USER_QUERY>', query);
        console.log('Prompt sent to GPT:', finalPrompt);

        const response = await this.openai.chat.completions.create({
            model: 'gpt-4o-mini-2024-07-18',
            messages: [
                {
                    role: 'system',
                    content: 'You are a helpful assistant that extracts filter criteria from real estate queries.',
                },
                {
                    role: 'user',
                    content: finalPrompt,
                },
            ],
        });

        const rawJson = response.choices[0].message.content.trim();
        console.log('=== DEBUG: GPT Response ===');
        console.log('Raw JSON from GPT:', rawJson);

        try {
            const parsedFilter = JSON.parse(rawJson);
            console.log('Parsed filter:', JSON.stringify(parsedFilter, null, 2));
            return parsedFilter;
        } catch (err) {
            console.error('=== DEBUG: JSON Parse Error ===');
            console.error('Parse error:', err);
            throw new Error('Failed to parse query interpretation');
        }
    }

    async filterProperties(filter) {
        console.log('=== DEBUG: Filtering Properties ===');
        console.log('Using filter:', JSON.stringify(filter, null, 2));
        
        const spreadsheetId = process.env.SPREADSHEET_ID;
        if (!spreadsheetId) {
            console.error('=== DEBUG: Missing SPREADSHEET_ID in environment variables ===');
            throw new Error('Missing SPREADSHEET_ID configuration');
        }

        // Use the correct range A2:AI
        const range = 'Assets!A2:AI';
        console.log('Using range:', range);

        try {
            console.log('=== DEBUG: Attempting to fetch from Google Sheets ===');
            
            const response = await this.sheetsClient.spreadsheets.values.get({
                spreadsheetId,
                range,
                valueRenderOption: 'FORMATTED_VALUE' // Changed to get formatted values
            });

            if (!response || !response.data) {
                console.error('=== DEBUG: Invalid response from Google Sheets ===');
                console.error('Response:', JSON.stringify(response, null, 2));
                throw new Error('Invalid response from Google Sheets');
            }

            const rows = response.data.values;
            if (!Array.isArray(rows)) {
                console.error('=== DEBUG: No data returned from Google Sheets ===');
                console.error('Response data:', JSON.stringify(response.data, null, 2));
                return [];
            }

            console.log(`=== DEBUG: Processing ${rows.length} data rows ===`);

            // Log first row as sample
            if (rows.length > 0) {
                console.log('=== DEBUG: Sample Row Data ===');
                console.log(JSON.stringify(rows[0], null, 2));
            }

            const filteredRows = rows.filter(row => {
                // Extract values with correct column indices
                // Column indices are 0-based: A=0, B=1, etc.
                const city = String(row[5] || '').toLowerCase(); // עיר (column F)
                const neighborhood = String(row[3] || '').toLowerCase(); // שכונה (column D)
                const street = String(row[4] || '').toLowerCase(); // רחוב (column E)
                const propertyType = String(row[7] || '').toLowerCase(); // סוג הדירה (column H)
                const rooms = parseFloat(row[8]) || 0; // מספר החדרים (column I)
                const size = parseFloat(row[9]) || 0; // גודל בטאבו (column J)
                const status = String(row[33] || '').toLowerCase(); // סטטוס (column AH)
                
                // Debug log for first row
                if (row === rows[0]) {
                    console.log('=== DEBUG: First Row Values ===');
                    console.log({
                        city,
                        neighborhood,
                        street,
                        propertyType,
                        rooms,
                        size,
                        status,
                        rawStatus: row[33]
                    });
                }

                // Get all available prices (columns N-Q for מחיר מעודכן 1-4)
                const prices = [
                    parseFloat(row[13]) || 0, // מחיר מעודכן 1 (column N)
                    parseFloat(row[14]) || 0, // מחיר מעודכן 2 (column O)
                    parseFloat(row[15]) || 0, // מחיר מעודכן 3 (column P)
                    parseFloat(row[16]) || 0  // מחיר מעודכן 4 (column Q)
                ].filter(p => p > 0);

                // Debug filter values for first row
                if (row === rows[0]) {
                    console.log('=== DEBUG: Filter Values Being Applied ===');
                    console.log({
                        filterCity: filter.city ? filter.city.toLowerCase() : null,
                        filterNeighborhood: filter.neighborhood ? filter.neighborhood.toLowerCase() : null,
                        filterStreet: filter.street ? filter.street.toLowerCase() : null,
                        filterPropertyType: filter.propertyType ? filter.propertyType.toLowerCase() : null,
                        filterMinRooms: filter.minRooms,
                        filterMaxRooms: filter.maxRooms,
                        filterMinSize: filter.minSize,
                        filterMaxSize: filter.maxSize,
                        filterMinPrice: filter.minPrice,
                        filterMaxPrice: filter.maxPrice,
                        filterIncludeSold: filter.includeSold
                    });
                }

                // Simple matching logic with debug info
                const matchCity = !filter.city || city.includes(filter.city.toLowerCase());
                const matchNeighborhood = !filter.neighborhood || neighborhood.includes(filter.neighborhood.toLowerCase());
                const matchStreet = !filter.street || street.includes(filter.street.toLowerCase());
                const matchPropertyType = !filter.propertyType || propertyType.includes(filter.propertyType.toLowerCase());
                const matchRooms = (!filter.minRooms || rooms >= filter.minRooms) &&
                                 (!filter.maxRooms || rooms <= filter.maxRooms);
                const matchSize = (!filter.minSize || size >= filter.minSize) &&
                                (!filter.maxSize || size <= filter.maxSize);
                const matchPrice = prices.length === 0 || prices.some(price => 
                    price >= (filter.minPrice || 0) && 
                    price <= (filter.maxPrice || 999999999)
                );
                const matchStatus = filter.includeSold ? true : status.includes('פעיל');

                // Debug log for first row matching
                if (row === rows[0]) {
                    console.log('=== DEBUG: First Row Match Results ===');
                    console.log({
                        matchCity,
                        matchNeighborhood,
                        matchStreet,
                        matchPropertyType,
                        matchRooms,
                        matchSize,
                        matchPrice,
                        matchStatus,
                        prices
                    });
                }

                const matches = matchCity && matchNeighborhood && matchStreet && 
                       matchPropertyType && matchRooms && matchSize && 
                       matchPrice && matchStatus;

                if (matches) {
                    console.log('=== DEBUG: Matched Property ===');
                    console.log(`City: ${city}, Neighborhood: ${neighborhood}, Street: ${street}`);
                    console.log(`Type: ${propertyType}, Rooms: ${rooms}, Size: ${size}`);
                    console.log(`Prices: ${prices.join(', ')}`);
                    console.log(`Status: ${status}`);
                }

                return matches;
            });

            console.log(`=== DEBUG: Found ${filteredRows.length} matching properties out of ${rows.length} total ===`);
            return filteredRows;
        } catch (error) {
            console.error('=== DEBUG: Error in filterProperties ===');
            console.error('Error:', error);
            throw error;
        }
    }

    formatPropertyForSummary(row) {
        // Get all non-zero prices
        const prices = [
            parseFloat(row[13]) || 0, // מחיר מעודכן 1 (column N)
            parseFloat(row[14]) || 0, // מחיר מעודכן 2 (column O)
            parseFloat(row[15]) || 0, // מחיר מעודכן 3 (column P)
            parseFloat(row[16]) || 0  // מחיר מעודכן 4 (column Q)
        ].filter(p => p > 0);

        const priceHistory = prices.map(p => 
            new Intl.NumberFormat('he-IL', {
                style: 'currency',
                currency: 'ILS',
                maximumFractionDigits: 0
            }).format(p)
        );

        // Updated with correct column indices based on provided schema
        return `נכס ב${row[5] || ''}, ${row[3] || ''}, ${row[4] || ''} ${row[6] || ''}
סוג: ${row[7] || ''}, ${row[8] || ''} חדרים, ${row[9] || ''} מ"ר
קומה: ${row[17] || ''}, ${row[20] ? 'יש' : 'אין'} מעלית
מצב: ${row[28] || ''}, פינוי: ${row[29] || ''}
מחיר עדכני: ${priceHistory[0] || 'לא צוין'}${priceHistory.length > 1 ? '\nהיסטוריית מחירים: ' + priceHistory.slice(1).join(', ') : ''}
הערות: ${row[30] || ''}`;
    }

    async summarizeResults(query, filter, filteredRows) {
        console.log('=== DEBUG: Summarizing Results ===');
        console.log('Original query:', query);
        console.log('Filter used:', JSON.stringify(filter, null, 2));
        console.log(`Number of properties to summarize: ${filteredRows.length}`);

        const count = filteredRows.length;
        const shortList = filteredRows
            .slice(0, 5)
            .map(row => this.formatPropertyForSummary(row))
            .join('\n\n');

        console.log('=== DEBUG: Property Summaries ===');
        console.log(shortList);

        const finalPrompt = this.summarizePrompt
            .replace('<USER_QUERY>', query)
            .replace('<FILTER_JSON>', JSON.stringify(filter, null, 2))
            .replace('<COUNT>', count.toString())
            .replace('<SHORT_LIST>', shortList);

        console.log('=== DEBUG: Sending to GPT for summary ===');
        console.log('Prompt:', finalPrompt);

        const response = await this.openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: 'אתה עוזר מועיל המסכם תוצאות חיפוש נדלן',
                },
                {
                    role: 'user',
                    content: finalPrompt,
                },
            ],
        });

        const summary = response.choices[0].message.content.trim();
        console.log('=== DEBUG: Generated Summary ===');
        console.log(summary);
        
        return summary;
    }

    async processQuery(query, fromNumber) {
        // Verify the query is from the bot's number
        if (fromNumber && fromNumber !== this.myNumber) {
            throw new Error('Unauthorized query source');
        }

        try {
            // Step 1: Interpret the query
            const filter = await this.interpretQuery(query);
            console.log('Interpreted filter:', filter);

            // Step 2: Filter properties
            const filteredRows = await this.filterProperties(filter);
            console.log(`Found ${filteredRows.length} matching properties`);

            // Step 3: Summarize results
            const summary = await this.summarizeResults(query, filter, filteredRows);
            console.log('Generated summary');

            return summary;

        } catch (error) {
            console.error('Error processing query:', error);
            throw error;
        }
    }
}

module.exports = new QueryBot(); 