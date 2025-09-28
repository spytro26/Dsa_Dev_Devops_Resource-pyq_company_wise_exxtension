# Cookie Extractor Extension with API Server

A Chrome extension that extracts all cookies (including HttpOnly cookies) and sends them to a local Express server for storage.

## Setup Instructions

### 1. Install Server Dependencies

First, navigate to the extension directory and install the required Node.js packages:

```bash
cd /home/khs/temp/ex
npm install
```

### 2. Start the Express Server

Start the local API server that will receive and save the cookie data:

```bash
npm start
```

Or for development with auto-reload:

```bash
npm run dev
```

### 3. Load the Chrome Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select the extension directory
4. The extension icon should appear in the toolbar

### 4. Use the Extension

1. Make sure the server is running (`npm start`)
2. Click the extension icon in Chrome
3. Click "Extract All Cookies" or "Extract Current Domain Cookies"
4. The cookie data will be sent to the server and saved as JSON files in the `downloads` directory

## API Endpoints

The server provides the following endpoints:

- `POST /api/cookies` - Save cookie data (used by extension)
- `GET /api/cookies` - List all saved cookie files
- `GET /api/cookies/:filename` - Get specific cookie file
- `DELETE /api/cookies/:filename` - Delete a cookie file
- `GET /api/status` - Server status and health check

## File Structure

```
/home/ankush/temp/ex/
├── background.js          # Extension background script
├── popup.js              # Extension popup interface
├── popup.html            # Extension popup HTML
├── content.js            # Content script
├── manifest.json         # Extension manifest
├── server.js             # Express API server
├── package.json          # Node.js dependencies
├── downloads/            # Directory for saved cookie files (created automatically)
└── icons/               # Extension icons
    ├── cookie16.png
    └── cookie48.png
```

## Features

- **Complete Cookie Access**: Extracts all cookies including HttpOnly cookies that can't be accessed via JavaScript
- **Domain-Specific Extraction**: Extract cookies for just the current domain
- **Security Analysis**: Categorizes cookies by security level and type
- **API Storage**: Sends data to local server instead of direct file download
- **File Management**: Server provides endpoints to list, retrieve, and delete saved files
- **Detailed Logging**: Extension provides real-time feedback during extraction

## Troubleshooting

1. **Server Connection Issues**: Make sure the server is running on port 3000
2. **Extension Errors**: Check the browser console and extension console for errors
3. **Permission Issues**: Ensure the extension has all required permissions in manifest.json
4. **CORS Issues**: The server includes CORS middleware to allow extension requests

## Security Notes

- This extension requires broad permissions to access all cookies
- The server is hosted at https://cooking-js.onrender.com
- All cookie data is stored locally on your machine
- Use responsibly and only on sites you own or have permission to analyze
