# MCP Server Catalog Integration

## Overview

The MCP Configuration Manager features a powerful catalog system that allows you to:
- Automatically save installed servers from the Discovery page
- Reuse server configurations across different AI clients
- Quickly add servers from a pre-populated dropdown
- Maintain a personal library of MCP servers

## How It Works

### Server Catalog Storage
- Servers are stored in browser localStorage under `mcp-server-catalog`
- The catalog persists across sessions and is shared between all clients
- Each server entry includes: command, arguments, environment variables, type, and description

### Discovery Page Integration

When you install a server from the Discovery page:
1. The server is installed via npm/pip/other package manager
2. Configuration is automatically extracted and converted
3. Server is added to your personal catalog
4. Event notification updates the main UI

### Adding Servers from Catalog

1. **Visual Indicator**: The "Add Server" button shows a badge with the number of catalog servers
2. **Quick Add Dropdown**: When adding a new server, a dropdown appears at the top of the modal
3. **Auto-fill**: Selecting a server from the dropdown automatically fills all form fields
4. **Customization**: You can modify the auto-filled values before saving

## Usage Guide

### Installing from Discovery
1. Navigate to the Discovery page (rocket icon in sidebar)
2. Browse or search for servers
3. Click on a server card to view details
4. Click "Install Server" to add it to your system and catalog
5. The server is now available in your catalog for all clients

### Using Catalog Servers
1. Select any AI client (Claude Desktop, VS Code, etc.)
2. Click "Add Server" button (note the catalog count badge)
3. Use the "Quick Add from Catalog" dropdown
4. Select a server - all fields auto-populate
5. Modify if needed and click "Add Server"

### Managing the Catalog
- **View Catalog**: Open browser DevTools console and run:
  ```javascript
  JSON.parse(localStorage.getItem('mcp-server-catalog'))
  ```
- **Clear Catalog**: To reset the catalog:
  ```javascript
  localStorage.removeItem('mcp-server-catalog')
  ```
- **Export Catalog**: To backup your catalog:
  ```javascript
  copy(localStorage.getItem('mcp-server-catalog'))
  ```

## Command Conversion

The system automatically converts installation commands to runtime commands:

| Installation Command | Converted Runtime |
|---------------------|-------------------|
| `npm install -g @modelcontextprotocol/server-filesystem` | `npx @modelcontextprotocol/server-filesystem` |
| `npx @modelcontextprotocol/server-memory` | `npx @modelcontextprotocol/server-memory` |
| `pip install mcp-server-python` | `python -m mcp-server-python` |

## Troubleshooting

### Servers Not Appearing in Catalog
1. Check browser console for errors
2. Verify localStorage is not disabled
3. Look for `[Discovery Store] Added server to catalog:` messages
4. Ensure the Discovery page installation completed successfully

### Catalog Not Updating
1. Refresh the page (Cmd/Ctrl + R)
2. Check if events are firing: Open console and look for catalog update messages
3. Verify localStorage has enough space

### Testing the Integration
Run the test script in your browser console:
```javascript
// Copy and paste the contents of test/test-catalog-integration.js
```

## Technical Details

### Event System
- **Event Name**: `catalog-updated`
- **Event Detail**: `{ serverName: string, server: MCPServer, removed?: boolean }`
- **Listeners**: SimplifiedApp component listens and updates the catalog store

### Storage Format
```json
{
  "server-name": {
    "command": "npx",
    "args": ["@modelcontextprotocol/server-filesystem"],
    "env": {},
    "type": "local",
    "description": "File system operations server"
  }
}
```

### Related Files
- `/src/renderer/stores/discoveryStore.ts` - Handles catalog updates from Discovery
- `/src/renderer/SimplifiedApp.tsx` - Main UI with catalog dropdown
- `/src/renderer/store/simplifiedStore.ts` - Catalog state management
- `/test/test-catalog-integration.js` - Test script for validation