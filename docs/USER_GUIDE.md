# MCP Configuration Manager - User Guide

## Overview

MCP Configuration Manager is a desktop application that helps you manage Model Context Protocol (MCP) server configurations across multiple AI client applications like Claude Desktop, Claude Code, VS Code, and others.

## Getting Started

### 1. Client Selection
- Use the **Client** dropdown to select which AI client you want to configure
- The app automatically detects installed clients on your system
- You can also use the **Server Catalog** to manage a global collection of servers

### 2. Configuration Scope
Choose the appropriate scope for your configuration:
- **User**: Your personal configuration (recommended for most use cases)
- **Project**: Configuration specific to a project directory
- **System**: System-wide configuration (requires admin privileges)

### 3. Managing MCP Servers

#### Adding a Server
1. Click **Add Server** button
2. Choose server type:
   - **Local**: Runs a command on your machine (e.g., Python scripts, Node.js)
   - **Remote**: Connects to a remote HTTP/SSE server
3. Fill in the required fields:
   - **Server Name**: Unique identifier for the server
   - **Command/URL**: The command to run or URL to connect to
   - **Arguments**: Command-line arguments (for local servers)
   - **Environment Variables**: Key-value pairs in JSON format

#### Editing Server Configuration
- Click the **edit** icon (pencil) next to any server
- You can also click on configuration badges to edit specific parts inline:
  - Click "Args" badges to edit arguments quickly
  - Click "Env" badges to edit environment variables

#### Copying Servers Between Clients
- Click the **copy** icon next to any server
- Select the target client from the list
- The server configuration will be copied to the selected client

## Features

### Server Catalog
The catalog is a centralized collection of all your MCP servers across clients:
- Automatically discovers servers from all installed clients
- Stores servers locally in your browser
- Use it as a template library for new configurations

### Configuration Profiles
Save and load complete server configurations:
- **Save Profile**: Save current configuration as a reusable template
- **Load Profile**: Apply a saved configuration to the current client
- **Export/Import**: Share profiles between devices or with others

### Project-Specific Configuration
When using **Project** scope:
1. Select a project directory using the folder button
2. Configurations will be saved in that directory
3. Perfect for team projects where everyone needs the same MCP setup

## Tips & Best Practices

### Environment Variables
- Use JSON format: `{"API_KEY": "your-key", "DEBUG": "true"}`
- Store sensitive information like API keys here
- Click the environment badge to edit inline

### Arguments
- Separate multiple arguments with commas: `arg1, arg2, arg3`
- Use the inline editor for quick adjustments
- Click the arguments badge to edit inline

### Backup & Safety
- The app automatically creates backups before saving changes
- Backups are stored in `~/.mcp-config-backups/`
- You can restore from backups manually if needed

### Common Server Types
- **File System**: `npx @modelcontextprotocol/server-filesystem`
- **GitHub**: `npx @modelcontextprotocol/server-github`
- **Database**: `python -m your-database-server`
- **Custom Scripts**: `node your-custom-server.js`

## Troubleshooting

### Server Not Working
1. Check the command/arguments are correct
2. Verify environment variables are valid JSON
3. Ensure the server package is installed
4. Check the AI client's logs for error messages

### Configuration Not Saving
1. Ensure you have write permissions to the config directory
2. Check that the target client is properly installed
3. Verify the configuration file isn't locked by another process

### Can't Find Configuration File
- Check the status bar at the bottom for the current config file path
- Click the "Open" button next to the path to view in file explorer
- Ensure the client is properly installed and has been run at least once

## Support

For issues or questions:
- Check the [GitHub repository](https://github.com/your-repo/mcp-config-manager)
- Review the console logs for error messages
- Ensure all AI clients are properly installed and up to date

---

*This application simplifies MCP server management - no more manual JSON editing required!*