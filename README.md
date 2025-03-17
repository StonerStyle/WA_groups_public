# WhatsApp Group Scraper - Clean Version

A modern, well-architected desktop application that monitors WhatsApp groups for real estate information, processes content using AI, and syncs extracted data with Google Sheets.

## Project Overview

This application helps real estate professionals track and analyze property listings shared in WhatsApp groups by:

- Connecting to WhatsApp using web protocol
- Monitoring selected groups for real estate messages
- Analyzing messages with AI to extract structured data
- Storing organized property information in Google Sheets
- Providing a query bot for interactive data retrieval

## Key Features

- QR code-based WhatsApp authentication with refresh capability
- AI-powered real estate data extraction (via OpenAI)
- Automatic data synchronization with Google Sheets
- Interactive query system for data retrieval
- Secure credential storage
- Comprehensive connection status visualization
- Auto-update system for seamless upgrades

## Project Structure

```
WA_SCRAPE_CLEAN/
├── Modules/           # Core functionality modules
├── Prompts/           # AI prompt templates
├── Credentials/       # Secure storage for credentials
├── Frontend/          # User interface files
└── README.md          # This file
```

## Development Roadmap

- [x] Initial project structure setup
- [x] Implement basic UI screens 
- [ ] WhatsApp connection service
- [ ] Google Sheets integration
- [ ] OpenAI message analysis
- [ ] Data extraction and processing
- [ ] Query system and data retrieval
- [ ] Secure credential management
- [ ] Connection status visualization
- [x] Auto-update system

## Technical Architecture

This application is built with:
- Electron
- Node.js
- WhatsApp Web API (via Baileys)
- OpenAI API
- Google Sheets API

## Building and Running

### Development

To run the application in development mode:

```bash
# Install dependencies
npm install

# Start the app with development tools
npm run dev
```

### Production Build

To create a production build:

```bash
# Install dependencies
npm install

# Build for production
npm run build
```

The built application will be available in the `dist` directory.

### Release

To build and publish a new release:

```bash
# Build and publish
npm run release
```

## Current Version

Current version: 3.0.0

See [RELEASES.md](RELEASES.md) for detailed release notes. 