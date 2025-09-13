# MCP Configuration Manager - User Guide

## Table of Contents
- [Introduction](#introduction)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Getting Started](#getting-started)
- [Main Interface](#main-interface)
- [Managing MCP Servers](#managing-mcp-servers)
- [Configuration Scopes](#configuration-scopes)
- [Settings](#settings)
- [Profiles](#profiles)
- [Troubleshooting](#troubleshooting)
- [Keyboard Shortcuts](#keyboard-shortcuts)

---

## Introduction

MCP Configuration Manager (MCM) is a unified desktop application for managing Model Context Protocol (MCP) server configurations across multiple AI client applications. It eliminates manual JSON editing and provides a centralized interface with form-based editing, validation, scope management, and cross-client synchronization.

### Supported AI Clients
- Claude Desktop
- Claude Code
- Kiro
- Windsurf
- Cursor
- VS Code
- Codex
- Gemini Desktop
- Gemini CLI

---

## Quick Start

### 1. Launch the Application

When you first launch MCP Configuration Manager, you'll see the welcome screen:

![Landing Page](userguide/00-landing-page.png)

### 2. Click Get Started

Click the **Get Started** button to begin managing your MCP servers:

![Get Started Button](userguide/00-landing-get-started-button.png)

### 3. Select Your AI Client

The main interface will appear. Select your AI client from the dropdown menu to view and manage its MCP server configurations:

![Main Interface](userguide/01-main-interface-full.png)

---

## Installation

### macOS
1. Download the latest `.dmg` file from the [releases page](https://github.com/thechrisgreen/mcp-config-manager/releases)
2. Open the downloaded file and drag the app to your Applications folder
3. On first launch, you may need to bypass Gatekeeper:
   - Right-click the app and select "Open"
   - Click "Open" in the security dialog

### Windows
1. Download the latest `.exe` installer
2. Run the installer and follow the prompts
3. Launch from the Start Menu or Desktop shortcut

### Linux
1. Download the appropriate package (`.deb`, `.rpm`, or `.AppImage`)
2. Install using your package manager or run the AppImage directly

---

## Getting Started

### Understanding the Interface

The main interface consists of several key components:

![Main Interface Full Screen](userguide/main-interface-fullscreen.png)

#### Top Navigation Bar

![Top Toolbar](userguide/07-top-toolbar.png)

- **Client Selector**: Choose which AI client's configuration to manage
- **Scope Buttons**: Switch between User, Project, and System configurations
- **Action Buttons**: Settings, Profiles, and Save options

#### Client Dropdown

Select your AI client from the dropdown menu. The app automatically detects installed clients:

![Client Dropdown](userguide/01-main-client-dropdown.png)

#### Scope Selection

Choose the configuration scope you want to work with:

![Scope Buttons](userguide/01-main-scope-buttons.png)

- **User**: Personal configurations in your home directory
- **Project**: Project-specific configurations (requires a project directory)
- **System**: System-wide configurations (may require admin privileges)

---

## Managing MCP Servers

### Viewing Configured Servers

Once you select a client, you'll see all configured MCP servers in a table format:

![Server List](userguide/02-server-list-full.png)

Each server entry shows:
- Server name
- Command type (npx, node, python, etc.)
- Arguments
- Environment variables
- Action buttons (copy, edit, delete)

![Server Row Detail](userguide/02-server-row-detail.png)

### Adding a New Server

1. Click the **Add Server** button in the top right corner
2. The Add Server modal will appear:

![Add Server Modal](userguide/03-add-server-modal-full.png)

3. Fill in the server details:

#### Server Configuration Fields

![Add Server Complete](userguide/03-add-server-complete.png)

- **Server Name**: A descriptive name for your MCP server (e.g., "GitHub MCP Server")
- **Server Type**: Choose between:
  - **Local (Command)**: For locally installed servers
  - **Remote (HTTP/SSE)**: For remote server connections
- **Command**: The command to run (e.g., `npx`, `node`, `python`)
- **Arguments**: Command-line arguments (comma-separated or one per line)

#### Environment Variables

Environment variables are entered in JSON format:

![Environment Variables JSON](userguide/03-environment-variables-json.png)

Example format:
```json
{
  "GITHUB_TOKEN": "ghp_xxxxxxxxxxxx",
  "GITHUB_ORG": "my-organization",
  "DEBUG": "true",
  "API_URL": "https://api.github.com"
}
```

4. Click **Add Server** to save your configuration

### Editing Existing Servers

1. Find the server you want to edit in the list
2. Click the **Edit** button (pencil icon) in the Actions column
3. Modify the server configuration in the modal
4. Click **Save** to apply changes

### Deleting Servers

1. Find the server you want to remove
2. Click the **Delete** button (trash icon) in the Actions column
3. Confirm the deletion when prompted

### Copying Server Configuration

Click the **Copy** button to copy the server's JSON configuration to your clipboard. This is useful for:
- Sharing configurations with team members
- Backing up server settings
- Moving configurations between clients

---

## Configuration Scopes

MCP Configuration Manager supports multiple configuration scopes, allowing you to manage settings at different levels:

### User Scope

The default scope for personal configurations:

![User Scope](userguide/01-main-interface-full.png)

- Stored in your home directory
- Applies to all your projects
- Location varies by client (e.g., `~/.claude/claude_desktop_config.json`)

### Project Scope

Project-specific configurations that override user settings:

![Project Scope](userguide/06-project-scope.png)

- Stored in project directories
- Takes precedence over user configurations
- Ideal for team-shared settings
- Requires selecting a project directory

### System Scope

System-wide configurations for all users:

![System Scope](userguide/06-system-scope.png)

- Stored in system directories
- Requires administrator privileges to modify
- Applies to all users on the machine
- Lowest priority (overridden by user and project scopes)

### Scope Hierarchy

Configuration priority (highest to lowest):
1. **Project** - Most specific, highest priority
2. **User** - Personal settings
3. **System** - Global defaults

### Status Bar

The status bar shows the current configuration file path:

![Status Bar](userguide/07-status-bar.png)

This helps you verify which configuration file you're currently editing.

---

## Settings

Access application settings by clicking the **Settings** button in the top navigation:

### Client Management

Manage detected clients and add custom client configurations:

(Settings screenshots would go here if they were captured)

- View all detected AI clients
- Check installation paths
- Add custom client configurations
- Enable/disable client detection

### General Settings

Configure application preferences:
- **Theme**: Choose between Dark, Light, or System theme
- **Auto-save**: Enable automatic configuration saving
- **Backup**: Set backup preferences
- **Notifications**: Configure notification settings

### Advanced Settings

Developer and power user options:
- **Debug Mode**: Enable detailed logging
- **Config Validation**: Strict or lenient validation rules
- **File Watching**: Auto-reload on external changes
- **Export/Import**: Backup and restore all configurations

---

## Profiles

Profiles allow you to save and switch between different sets of MCP server configurations:

### Creating a Profile

1. Click the **Profiles** button in the navigation bar
2. Select **Create New Profile**
3. Enter a profile name and description
4. Choose which servers to include
5. Save the profile

### Switching Profiles

1. Click the **Profiles** button
2. Select a profile from the list
3. The configuration will switch to the selected profile

### Managing Profiles

- **Export Profile**: Share profiles with team members
- **Import Profile**: Load profiles from files
- **Delete Profile**: Remove unused profiles

---

## Troubleshooting

### Common Issues

#### "Failed to detect clients" Error

If you see this error message, it means the app couldn't find installed AI clients:

1. Ensure your AI clients are properly installed
2. Check that they're in standard installation locations
3. Try adding custom client paths in Settings

#### Configuration Not Saving

1. Check file permissions for the configuration directory
2. Ensure you have write access to the config file
3. Try running the app with administrator privileges for system scope

#### Servers Not Working

1. Verify the command path is correct
2. Check that all required environment variables are set
3. Test the command manually in a terminal
4. Review the server logs in your AI client

### File Locations

#### macOS
- Claude Desktop: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Claude Code: `~/.claude/claude_code_config.json`
- Kiro: `~/.kiro/settings/mcp.json`

#### Windows
- Claude Desktop: `%APPDATA%\Claude\claude_desktop_config.json`
- VS Code: `%APPDATA%\Code\User\settings.json`

#### Linux
- Claude Code: `~/.claude/claude_code_config.json`
- VS Code: `~/.config/Code/User/settings.json`

---

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Save Configuration | `Cmd/Ctrl + S` |
| Add New Server | `Cmd/Ctrl + N` |
| Delete Selected | `Delete` or `Backspace` |
| Open Settings | `Cmd/Ctrl + ,` |
| Switch Client | `Cmd/Ctrl + 1-9` |
| Toggle Scope | `Tab` |
| Search Servers | `Cmd/Ctrl + F` |
| Refresh | `Cmd/Ctrl + R` |
| Quit | `Cmd/Ctrl + Q` |

---

## Best Practices

### Security

1. **Never commit tokens**: Use environment variables for sensitive data
2. **Use project scope**: Keep project-specific servers in project configs
3. **Regular backups**: Export your configurations regularly
4. **Validate servers**: Test servers before saving configurations

### Organization

1. **Naming conventions**: Use descriptive server names
2. **Group related servers**: Use profiles for different workflows
3. **Document configurations**: Add comments in environment variables
4. **Version control**: Track project configurations in git

### Performance

1. **Limit active servers**: Only enable servers you actively use
2. **Optimize environment variables**: Remove unused variables
3. **Regular cleanup**: Remove obsolete server configurations
4. **Monitor resources**: Check server resource usage

---

## Advanced Features

### Bulk Operations

1. Select multiple servers using checkboxes
2. Use bulk actions menu for:
   - Enable/disable multiple servers
   - Export selected servers
   - Delete multiple servers
   - Copy configurations

### Import/Export

#### Exporting Configurations

1. Go to Settings > Advanced
2. Click "Export All Configurations"
3. Choose export format (JSON or YAML)
4. Save to file

#### Importing Configurations

1. Go to Settings > Advanced
2. Click "Import Configurations"
3. Select your configuration file
4. Review and confirm import

### Custom Client Support

Add support for unsupported AI clients:

1. Go to Settings > Client Management
2. Click "Add Custom Client"
3. Configure:
   - Client name
   - Configuration file path
   - File format (JSON, YAML, TOML)
   - Configuration structure

---

## Getting Help

### Resources

- **GitHub Issues**: [Report bugs or request features](https://github.com/thechrisgreen/mcp-config-manager/issues)
- **Documentation**: [Online documentation](https://github.com/thechrisgreen/mcp-config-manager/docs)
- **MCP Specification**: [Model Context Protocol docs](https://modelcontextprotocol.io)

### Contact

- **Email**: support@mcp-manager.com
- **Discord**: Join our community server
- **Twitter**: @MCPManager

---

## Appendix

### Configuration File Format

MCP server configurations follow this structure:

```json
{
  "mcpServers": {
    "server-name": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-name"],
      "env": {
        "API_KEY": "your-key-here"
      }
    }
  }
}
```

### Supported Command Types

- `npx`: Node Package Execute
- `node`: Node.js scripts
- `python`: Python scripts
- `uvx`: Python UV package executor
- `docker`: Docker containers
- `bash`: Shell scripts
- Custom executables

### Environment Variable Best Practices

1. Use uppercase with underscores: `API_KEY`, `DEBUG_MODE`
2. Namespace your variables: `GITHUB_TOKEN`, `GITHUB_ORG`
3. Document required vs optional variables
4. Never hardcode sensitive values

---

*Last updated: Version 0.1.4*