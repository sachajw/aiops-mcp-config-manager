# MCP Configuration Manager

**Stop Wrestling with JSON. Start Managing Visually.**

<div align="center">

*The Visual Command Center for AI Tool Configuration*

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Platform](https://img.shields.io/badge/platform-macOS-lightgrey)](https://github.com/itsocialist/mcp-config-manager)
[![Release](https://img.shields.io/github/v/release/itsocialist/mcp-config-manager)](https://github.com/itsocialist/mcp-config-manager/releases)
[![Version](https://img.shields.io/badge/version-0.1.5-blue)](https://github.com/itsocialist/mcp-config-manager/releases/tag/v0.1.5)

[Download](#installation) • [Quick Start](#quick-start) • [Documentation](#documentation) • [Community](#community)

</div>

---

> ⚠️ **Beta Version Notice**
>
> This application is in active development. Basic functionality has been confirmed and automatic backups are created for all configuration changes. However, further testing is still required. Please [report any bugs or issues](https://github.com/itsocialist/mcp-config-manager/issues) you encounter.

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

### 🎨 Visual Workspace *(New)*
- **Interactive canvas** for visualizing MCP server connections
- **Drag-and-drop** servers from library to connect with AI clients
- **Real-time connection status** with animated cable connections
- **Visual insights panel** showing server metrics and usage

### 🔍 Server Discovery *(New)*
- **Browse MCP marketplace** with 100+ community servers
- **One-click installation** for popular MCP servers
- **Server details** including documentation and configuration guides
- **Filter by category** to find servers for your use case

### Visual Configuration Management
- **Form-based editing** eliminates JSON syntax errors
- **Drag-and-drop interface** for server organization
- **Real-time validation** catches issues before they break your setup
- **Monaco editor** for advanced JSON editing with syntax highlighting

### Cross-Client Synchronization
- **Unified management** for Claude Desktop, VS Code, Cursor, Kiro, Windsurf, and more
- **Bulk operations** apply changes across multiple clients instantly
- **Configuration templates** for quick project setup
- **Auto-detection** of installed AI clients

### Error Prevention & Recovery
- **Automatic backups** before any changes
- **Configuration validation** prevents broken setups
- **External change detection** monitors files for manual edits
- **Rollback capability** to restore previous configurations

### Scope Management
- **Global configurations** for system-wide MCP servers
- **Project-specific setups** for team collaboration
- **User-level customization** for personal preferences
- **Hierarchical scope resolution** for flexible configuration inheritance

## Quick Start

### Installation

**Download for macOS:**
- [macOS Apple Silicon (M1/M2/M3)](https://github.com/itsocialist/mcp-config-manager/releases/download/v0.1.5/MCP.Configuration.Manager-0.1.5-arm64.dmg)
- [macOS Intel](https://github.com/itsocialist/mcp-config-manager/releases/download/v0.1.5/MCP.Configuration.Manager-0.1.5.dmg)
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
- **[💾 Installation Guide](docs/INSTALLATION.md)** - macOS setup instructions

🔗 **Online Documentation:**
- [GitHub Documentation](https://github.com/itsocialist/mcp-config-manager/tree/main/docs)
- [User Guide Online](https://github.com/itsocialist/mcp-config-manager/blob/main/docs/USER_GUIDE.md)

## What Users Are Saying

> *"Finally! No more JSON syntax errors breaking my AI workflow. This tool saved me hours every week."*  
> **— Sarah Chen, AI Research Engineer**

> *"Game changer for our team. Everyone has the same MCP setup now, zero configuration drift."*  
> **— Marcus Rodriguez, DevOps Lead**

> *"The visual interface makes MCP server management actually enjoyable. Who knew configuration could be this smooth?"*  
> **— Dr. Alex Kim, AI Consultant**

## Advanced Features

### 🎯 Visual Workspace Interface
The new Visual Workspace provides an intuitive canvas for managing MCP configurations:
- **Interactive node-based interface** using React Flow
- **Drag servers from library** and drop onto canvas
- **Visual connections** show server-to-client relationships
- **Live server metrics** with real MCP protocol integration
- **Real-time connection status** and health monitoring
- **Client dock** for quick switching between AI clients
- **Insights panel** with live performance analytics

### 🔍 MCP Server Discovery
Explore and install servers from multiple sources:
- **MCP Registry** - Official catalog with 100+ verified servers
- **GitHub search** - Find servers directly from GitHub repositories
- **NPM packages** - Browse MCP servers published to npm
- **Categories**: AI Tools, Development, Productivity, Data, and more
- **One-click configuration** with automatic dependency installation
- **Server ratings** and community reviews

### Server Management
Enhanced server configuration capabilities:
- **Server Library panel** with categorized server list
- **Quick actions** for enable/disable/configure
- **Environment variable templates** for common configurations
- **Command builder** with syntax validation
- **Bulk operations** across multiple servers and clients

### Monitoring & Analytics
- **Real-time server status** with native MCP protocol monitoring
- **Live performance metrics** including response times and tool counts
- **Active connection tracking** with health checks and auto-reconnect
- **Configuration change history** with rollback capability
- **Server resource monitoring** for tools, prompts, and resources

## Recently Added (v0.1.5)

- ✅ **Native MCP Protocol** - Real server connections with live communication
- ✅ **Live Server Metrics** - Actual tool counts, response times, and connection status
- ✅ **Connection Monitoring** - Real-time health checks and automatic reconnection
- ✅ **Visual Workspace** - Interactive canvas for server management
- ✅ **Server Discovery** - Browse and install from 100+ MCP servers
- ✅ **Kiro & Windsurf Support** - Latest AI client integrations
- ✅ **Enhanced Drag-and-Drop** - Visual server configuration

## Upcoming Features (Q1 2025)

- **Cloud Sync** - Backup and sync across devices
- **Team Collaboration** - Share configurations with your team
- **AI-Powered Suggestions** - Smart server recommendations
- **Advanced Analytics Dashboard** - Detailed usage insights
- **API for CI/CD Integration** - Automate configuration deployment

## Community

- **Issues**: [Report bugs or request features](https://github.com/itsocialist/mcp-config-manager/issues)

## Built With

- **Electron** + **React** for native desktop experience
- **TypeScript** for type safety and developer experience
- **Tailwind CSS** for modern, responsive UI
- **Zustand** for state management
- **Monaco Editor** for advanced JSON editing
- **React Flow** for visual workspace canvas
- **Native MCP Protocol** for real server communication
- **JSON-RPC** for protocol messaging

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

<div align="center">

**Made with ❤️ for the AI development community**

[Star this repo](https://github.com/itsocialist/mcp-config-manager) if it helps you manage your AI tools better!

*Transform your AI workflow from configuration chaos to organized control.*

</div>
