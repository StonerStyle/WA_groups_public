const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qr = require('qrcode-terminal');
const fs = require('fs');

// Create a promise that will resolve with the established connection
const connectionPromise = new Promise(async (resolve, reject) => {
    if (!fs.existsSync('./auth_info')) {
        fs.mkdirSync('./auth_info');
    }

    // Define a recursive function to handle connection and reconnection
    const connectToWhatsApp = async (retryCount = 0) => {
        try {
            const { state, saveCreds } = await useMultiFileAuthState('auth_info');
            
            // Create a complete logger with all required functions
            // This custom logger implementation includes the .child() method
            // that Baileys requires, and is likely why this works better
            // than the more complex Pino logger
            const logger = {
                info: () => {},
                error: () => {},
                warn: () => {},
                debug: () => {},
                trace: () => {},
                child: () => ({
                    info: () => {},
                    error: () => {},
                    warn: () => {},
                    debug: () => {},
                    trace: () => {}
                })
            };
            
            const sock = makeWASocket({
                auth: state,
                printQRInTerminal: false,
                // This browser fingerprint seems to be accepted better by WhatsApp
                browser: ['Ubuntu', 'Chrome', '20.0.04'],
                connectTimeoutMs: 60000,
                defaultQueryTimeoutMs: 60000,
                keepAliveIntervalMs: 25000,
                emitOwnEvents: true,
                retryRequestDelayMs: 250,
                logger: logger
            });

            sock.ev.on('creds.update', saveCreds);
            
            sock.ev.on('connection.update', (update) => {
                const { connection, lastDisconnect, qr: qrCode } = update;
                
                if (qrCode) {
                    console.log('Generating new QR...');
                    qr.generate(qrCode, { small: true });
                }
                
                if (connection === 'close') {
                    const statusCode = lastDisconnect?.error?.output?.statusCode;
                    
                    if (statusCode === DisconnectReason.loggedOut || statusCode === 401) {
                        console.log('Connection removed, generating new QR...');
                        try {
                            fs.rmSync('./auth_info', { recursive: true, force: true });
                            // Instead of rejecting, attempt to reconnect
                            connectToWhatsApp(retryCount + 1);
                        } catch (err) {
                            console.log('[ERROR]:\n', err);
                            reject(err);
                        }
                    } else if (statusCode === 515) {
                        console.log('Device removed, attempting to reconnect...');
                        // Instead of rejecting with error, attempt to reconnect
                        setTimeout(() => {
                            connectToWhatsApp(retryCount + 1);
                        }, 5000); // Wait 5 seconds before attempting to reconnect
                    } else if (statusCode === 440) {
                        console.log('Connection timeout, attempting to reconnect...');
                        setTimeout(() => {
                            connectToWhatsApp(retryCount + 1);
                        }, 10000); // Wait 10 seconds before attempting to reconnect
                    } else if (statusCode) {
                        console.log('[ERROR]:\n', lastDisconnect?.error);
                        // For other errors, attempt to reconnect with exponential backoff
                        const backoffTime = Math.min(Math.pow(2, retryCount) * 1000, 60000); // Capped at 1 minute
                        console.log(`Reconnecting in ${backoffTime/1000} seconds...`);
                        setTimeout(() => {
                            connectToWhatsApp(retryCount + 1);
                        }, backoffTime);
                    }
                } else if (connection === 'connecting') {
                    console.log('Connecting to WhatsApp...');
                } else if (connection === 'open') {
                    const phoneNumber = sock.user?.id?.split(':')[0] || 'unknown';
                    console.log(`Connected as: ${sock.user?.name || 'unknown'}`);
                    console.log(`Phone number: ${phoneNumber}`);
                    resolve(sock);
                }
            });

            // Handle errors
            sock.ev.on('error', (err) => {
                if (!err.message?.includes('Connection')) {
                    console.log('[ERROR]:\n', err);
                }
                if (err.message?.includes('Unauthorized') || err.message?.includes('401')) {
                    try {
                        fs.rmSync('./auth_info', { recursive: true, force: true });
                    } catch (err) {
                        console.log('[ERROR]:\n', err);
                    }
                    // Try to reconnect instead of rejecting
                    setTimeout(() => {
                        connectToWhatsApp(retryCount + 1);
                    }, 5000);
                }
            });

        } catch (err) {
            console.log('[ERROR]:\n', err);
            // Implement retry logic for initial connection errors
            if (retryCount < 5) {
                console.log(`Connection attempt failed. Retrying in ${3 * (retryCount + 1)} seconds...`);
                setTimeout(() => {
                    connectToWhatsApp(retryCount + 1);
                }, 3000 * (retryCount + 1));
            } else {
                console.log('Maximum retry attempts reached. Giving up.');
                reject(err);
            }
        }
    };

    // Start the initial connection attempt
    connectToWhatsApp();
});

// Start the connection
const connection = connectionPromise.catch(err => {
    if (!err.message?.includes('Connection')) {
        console.log('[ERROR]:\n', err);
    }
    if (err.message?.includes('auth') || err.message?.includes('401')) {
        fs.rmSync('./auth_info', { recursive: true, force: true });
    }
    throw err;
});

// Handle process termination quietly
process.on('SIGINT', () => process.exit(0));

// Export the connection promise
module.exports = connection;