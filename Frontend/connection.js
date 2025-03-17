// Connection window renderer process
const { ipcRenderer } = require('electron');
const QRCode = require('qrcode');

// When the document is ready
document.addEventListener('DOMContentLoaded', () => {
    initConnectionWindow();
});

// Initialize the connection window
function initConnectionWindow() {
    console.log('Connection window initialized');
    
    // Let the main process know we're ready
    ipcRenderer.send('connection-window-ready');
    
    // Listen for QR code from main process
    ipcRenderer.on('qr-code', (event, qrData) => {
        displayQRCode(qrData);
    });
    
    // Listen for connection status updates
    ipcRenderer.on('connection-status', (event, status) => {
        updateConnectionStatus(status);
    });
    
    // Setup UI event handlers
    document.getElementById('refresh-btn').addEventListener('click', () => {
        refreshQRCode();
    });
    
    document.getElementById('cancel-btn').addEventListener('click', () => {
        cancelConnection();
    });
    
    // Simulate QR code display for UI development
    simulateQRCodeDisplay();
}

// Display the QR code
function displayQRCode(qrData) {
    const qrElement = document.getElementById('qrcode');
    const loadingElement = document.getElementById('loading-qr');
    
    if (loadingElement) {
        loadingElement.classList.add('hidden');
    }
    
    // Clear previous content
    qrElement.innerHTML = '';
    
    // Create a canvas element for the QR code
    const canvas = document.createElement('canvas');
    qrElement.appendChild(canvas);
    
    // Generate QR code on the canvas
    QRCode.toCanvas(canvas, qrData || 'https://example.com/whatsapp-connect', {
        width: 180,
        margin: 1,
        color: {
            dark: '#000000',  // Black dots
            light: '#ffffff'  // White background
        }
    }, (error) => {
        if (error) {
            console.error('Error generating QR code:', error);
            qrElement.innerHTML = '<p style="color: red;">שגיאה ביצירת קוד QR</p>';
        }
    });
}

// Update connection status display
function updateConnectionStatus(status) {
    const statusDot = document.getElementById('connection-status');
    const statusText = document.getElementById('connection-text');
    
    if (!statusDot || !statusText) return;
    
    // Remove all status classes
    statusDot.classList.remove('status-connecting', 'status-connected', 'status-error');
    
    // Update status based on the status received
    switch (status) {
        case 'connected':
            statusDot.classList.add('status-connected');
            statusText.textContent = 'מחובר!';
            // Close window after a delay
            setTimeout(() => {
                ipcRenderer.send('connection-successful');
            }, 2000);
            break;
        case 'error':
            statusDot.classList.add('status-error');
            statusText.textContent = 'שגיאת התחברות';
            break;
        default:
            statusDot.classList.add('status-connecting');
            statusText.textContent = 'מתחבר...';
    }
}

// Request a new QR code
function refreshQRCode() {
    const qrElement = document.getElementById('qrcode');
    const loadingElement = document.getElementById('loading-qr');
    
    // Show loading spinner
    qrElement.innerHTML = '';
    if (loadingElement) {
        loadingElement.classList.remove('hidden');
    }
    
    // Request new QR code from main process
    ipcRenderer.send('refresh-qr-code');
    
    // For UI development, simulate a new QR after a delay
    setTimeout(() => {
        simulateQRCodeDisplay();
    }, 2000);
}

// Cancel the connection attempt
function cancelConnection() {
    ipcRenderer.send('cancel-connection');
    window.close();
}

// Simulate QR code display for UI development
function simulateQRCodeDisplay() {
    const qrElement = document.getElementById('qrcode');
    const loadingElement = document.getElementById('loading-qr');
    
    // Simulate loading delay
    setTimeout(() => {
        if (loadingElement) {
            loadingElement.classList.add('hidden');
        }
        // Create a random data string to simulate different QR codes
        const randomData = 'whatsapp://connect/' + Math.random().toString(36).substring(2, 15);
        displayQRCode(randomData);
        
        // Simulate a successful connection after delay
        setTimeout(() => {
            updateConnectionStatus('connected');
        }, 5000);
    }, 1500);
} 