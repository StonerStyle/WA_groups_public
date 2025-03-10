# WhatsApp Group Scraper

A Node.js application that scrapes WhatsApp groups and syncs them with Google Sheets.

## Project Structure

```
wa-group-scrape/
├── modules/
│   ├── connectWA.js    # WhatsApp connection handling
│   └── listGroups.js   # Group listing and Google Sheets sync
├── index.js            # Main entry point
├── .env               # Environment variables (not in repo)
└── package.json
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file with your Google Sheets configuration:
```
SPREADSHEET_ID=your_spreadsheet_id
```

3. Place your `service-account.json` file in the root directory

## Usage

Run the application:
```bash
npm start
```

The application will:
1. Connect to WhatsApp (scan QR code if needed)
2. Fetch all participating groups
3. Update the Google Sheet with group information
