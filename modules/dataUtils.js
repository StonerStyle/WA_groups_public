const { google } = require('googleapis');

// Asset ID management
async function getNextAssetId(sheetsClient, spreadsheetId) {
    try {
        const response = await sheetsClient.spreadsheets.values.get({
            spreadsheetId: spreadsheetId,
            range: 'Assets!A:A'  // Assuming column A contains asset IDs
        });

        const assetIds = response.data.values || [];
        const numericIds = assetIds
            .flat()
            .filter(id => id && !isNaN(parseInt(id.replace(/^0+/, ''))))  // Filter out non-numeric and empty values
            .map(id => parseInt(id.replace(/^0+/, ''))); // Convert "0001" to 1
        
        // If no valid IDs found, start from 1
        const nextId = numericIds.length > 0 ? Math.max(...numericIds, 0) + 1 : 1;
        return nextId.toString().padStart(4, '0'); // Format as "0001"
    } catch (error) {
        console.error('Error getting next asset ID:', error);
        // Return a fallback ID if there's an error
        return '0001';
    }
}

// Realtor management
async function getRealtorInfo(phoneNumber, sheetsClient, spreadsheetId) {
    try {
        const response = await sheetsClient.spreadsheets.values.get({
            spreadsheetId: spreadsheetId,
            range: 'Realtors!A:B'  // A for names, B for phone numbers
        });

        const realtors = response.data.values || [];
        const realtor = realtors.find(row => row[1] === phoneNumber);
        
        return realtor ? {
            name: realtor[0],
            phone: realtor[1]
        } : null;
    } catch (error) {
        console.error('Error getting realtor info:', error);
        throw error;
    }
}

// Location validation and management
async function validateLocation(location, type, sheetsClient, spreadsheetId) {
    try {
        if (!location) {
            return {
                value: '',
                internalNote: ''
            };
        }

        // Clean and normalize the location
        const cleanLocation = location.trim()
            .replace(/^ב/, '')  // Remove leading ב (in/at)
            .replace(/^ה/, '')  // Remove leading ה (the)
            .trim();

        // Get current locations from Streets sheet
        const response = await sheetsClient.spreadsheets.values.get({
            spreadsheetId: spreadsheetId,
            range: 'Streets!A:C'  // A for neighborhoods, B for streets, C for cities
        });

        const streets = response.data.values || [];
        let columnIndex;
        let locationType;
        
        switch(type.toLowerCase()) {
            case 'neighborhood':
                columnIndex = 0;
                locationType = 'שכונה';
                break;
            case 'street':
                columnIndex = 1;
                locationType = 'רחוב';
                break;
            case 'city':
                columnIndex = 2;
                locationType = 'עיר';
                break;
            default:
                throw new Error('Invalid location type');
        }

        // Case-insensitive comparison
        const existingLocations = streets
            .map(row => row[columnIndex]?.toLowerCase())
            .filter(Boolean);
        
        const isNew = !existingLocations.includes(cleanLocation.toLowerCase());

        // Return object with original value and note if it's a new location
        return {
            value: cleanLocation,
            internalNote: isNew ? 
                `נמצא/ה ${locationType} חדש/ה: ${cleanLocation}. יש להוסיף ידנית לרשימה.` : 
                ''
        };
    } catch (error) {
        console.error('Error validating location:', error);
        return {
            value: location,
            internalNote: `שגיאה באימות ${type === 'neighborhood' ? 'שכונה' : type === 'street' ? 'רחוב' : 'עיר'}: ${error.message}`
        };
    }
}

module.exports = {
    getNextAssetId,
    getRealtorInfo,
    validateLocation
}; 