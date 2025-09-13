# MCP Configuration Manager

**Stop Wrestling with JSON. Start Managing Visually.**

<div align="center">

*The Visual Command Center for AI Tool Configuration*

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey)](https://github.com/itsocialist/mcp-config-manager)
[![Release](https://img.shields.io/github/v/release/itsocialist/mcp-config-manager)](https://github.com/itsocialist/mcp-config-manager/releases)
[![Version](https://img.shields.io/badge/version-0.1.4-blue)](https://github.com/itsocialist/mcp-config-manager/releases/tag/v0.1.4)

[Download](#installation) • [Quick Start](#quick-start) • [Documentation](#documentation) • [Community](#community)

</div>

---

## Why MCP Configuration Manager?

**Before:** Manual JSON editing, syntax errors, scattered configs across multiple AI tools
```json
❌ Fighting with claude_desktop_config.json
❌ Debugging broken MCP server paths  
❌ Managing configs for Claude, VS Code, Cursor separately
❌ Lost hours troubleshooting configuration drift
```

**After:** Visual management, error prevention, unified control
```
✅ Point-and-click server management
✅ Built-in validation prevents JSON errors
✅ Sync configurations across all AI clients
✅ Real-time monitoring and automatic backups
```

## Perfect For

- **AI Power Users** managing multiple AI tools and MCP servers
- **Development Teams** needing consistent MCP setups across members  
- **AI Consultants** managing configurations for multiple clients
- **Anyone tired of** manually editing JSON configuration files

## Key Features

### Visual Configuration Management
- **Form-based editing** eliminates JSON syntax errors
- **Drag-and-drop interface** for server organization
- **Real-time validation** catches issues before they break your setup

### Cross-Client Synchronization
- **Unified management** for Claude Desktop, VS Code, Cursor, and more
- **Bulk operations** apply changes across multiple clients instantly
- **Configuration templates** for quick project setup

### Error Prevention & Recovery
- **Automatic backups** before any changes
- **Configuration validation** prevents broken setups
- **External change detection** monitors files for manual edits

### Scope Management
- **Global configurations** for system-wide MCP servers
- **Project-specific setups** for team collaboration
- **User-level customization** for personal preferences

## Quick Start

### Installation

**Download for your platform:**
- [macOS Apple Silicon (M1/M2/M3)](https://github.com/itsocialist/mcp-config-manager/releases/download/v0.1.4/MCP.Configuration.Manager-0.1.4-arm64.dmg)
- [macOS Intel](https://github.com/itsocialist/mcp-config-manager/releases/download/v0.1.4/MCP.Configuration.Manager-0.1.4.dmg)
- [View all releases](https://github.com/itsocialist/mcp-config-manager/releases)

**Important: First Launch on macOS**  
The app is not yet notarized. On first launch:
1. Right-click the app in Applications
2. Select "Open" from the menu
3. Click "Open" in the dialog

See [Installation Guide](docs/INSTALLATION.md) for detailed instructions.

### First Run

1. **Launch the app** - It automatically detects your AI clients
2. **Select your client** (Claude Desktop, VS Code, etc.)
3. **Add MCP servers** using the visual interface
4. **Save and sync** - Your AI tools are immediately updated

👉 **Need help?** Check out our [5-minute Quick Start Guide](docs/QUICK_START.md) or the [complete User Guide](docs/USER_GUIDE.md)

## Supported AI Clients

| Client | Status | Configuration Scope |
|--------|--------|---------------------|
| **Claude Desktop** | Full Support | User, Global |
| **Claude Code** | Full Support | User, Project |
| **VS Code** | Full Support | User, Workspace |
| **Cursor** | Full Support | User, Workspace |
| **Codex** | Full Support | User, Project |
| **Kiro** | Full Support *(v0.1.4)* | User, Project |
| **Windsurf** | Full Support *(v0.1.4)* | User, Project |
| **Gemini Desktop** | Full Support | User |
| **Gemini CLI** | Full Support | User, Project |
| **Custom Clients** | Full Support | User-defined |
| **Gemini Desktop** | Full Support | User, Global |
| **Gemini CLI** | Full Support | User, Global |

## Documentation

📚 **Complete guides to get you started:**

- **[📖 User Guide](docs/USER_GUIDE.md)** - Complete step-by-step documentation
- **[🚀 Quick Start Guide](docs/QUICK_START.md)** - Get running in 5 minutes
- **[✨ Features Overview](docs/FEATURES_OVERVIEW.md)** - Visual tour of all features
- **[💾 Installation Guide](docs/INSTALLATION.md)** - Platform-specific setup instructions

🔗 **Online Documentation:**
- [GitHub Documentation](https://github.com/itsocialist/mcp-config-manager/tree/feature/user-friendly-ui-redesign/docs)
- [User Guide Online](https://github.com/itsocialist/mcp-config-manager/blob/feature/user-friendly-ui-redesign/docs/USER_GUIDE.md)

## What Users Are Saying

> *"Finally! No more JSON syntax errors breaking my AI workflow. This tool saved me hours every week."*  
> **— Sarah Chen, AI Research Engineer**

> *"Game changer for our team. Everyone has the same MCP setup now, zero configuration drift."*  
> **— Marcus Rodriguez, DevOps Lead**

> *"The visual interface makes MCP server management actually enjoyable. Who knew configuration could be this smooth?"*  
> **— Dr. Alex Kim, AI Consultant**

## Advanced Features

### Server Catalog
Browse and install MCP servers from a curated catalog:
- **GitHub MCP Server** - Repository management and automation
- **Playwright MCP** - Browser automation for testing
- **Filesystem MCP** - Secure file operations
- **+ 100+ community servers**

### Bulk Operations
- **Mass enable/disable** servers across clients
- **Configuration templates** for instant project setup  
- **Export/import** configurations for team sharing

### Monitoring & Analytics
- **Real-time server status** monitoring
- **Performance metrics** for MCP server usage
- **Configuration change history** with rollback capability

## Upcoming Features

- **MCP Server Marketplace** with ratings and reviews
- **AI-powered configuration suggestions** 
- **Team collaboration features** with shared configs
- **Advanced analytics dashboard**
- **API for CI/CD integration**

## Community

- **Issues**: [Report bugs or request features](https://github.com/itsocialist/mcp-config-manager/issues)

## Built With

- **Electron** + **React** for cross-platform desktop experience
- **TypeScript** for type safety and developer experience  
- **Tailwind CSS** for modern, responsive UI
- **Zustand** for state management
- **Monaco Editor** for advanced JSON editing

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

<div align="center">

**Made with ❤️ for the AI development community**

[Star this repo](https://github.com/itsocialist/mcp-config-manager) if it helps you manage your AI tools better!

*Transform your AI workflow from configuration chaos to organized control.*

</div>
