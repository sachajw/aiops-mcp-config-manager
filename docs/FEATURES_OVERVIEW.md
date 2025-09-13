# MCP Configuration Manager - Features Overview

A visual guide to all the features of MCP Configuration Manager.

## 🎯 Core Features

### Unified Interface for All AI Clients

Manage MCP servers across multiple AI applications from one place:

![Main Interface](userguide/main-interface-fullscreen.png)

**Supported Clients:**
- ✅ Claude Desktop
- ✅ Claude Code
- ✅ Kiro
- ✅ Windsurf
- ✅ Cursor
- ✅ VS Code
- ✅ Codex
- ✅ Gemini Desktop
- ✅ Gemini CLI
- ✅ Custom clients (configurable)

---

## 🚀 Getting Started

### Welcome Screen
Clean, modern interface to get you started quickly:

![Landing Page](userguide/00-landing-page.png)

### One-Click Setup
Simple Get Started button to begin:

![Get Started Button](userguide/00-landing-get-started-button.png)

---

## 📊 Server Management

### Comprehensive Server List

View all your MCP servers at a glance with detailed information:

![Server List](userguide/02-server-list-full.png)

**Features:**
- Server name and type
- Command and arguments
- Environment variables
- Quick action buttons
- Server count badge

### Detailed Server Information

Each server shows complete configuration details:

![Server Row Detail](userguide/02-server-row-detail.png)

---

## ➕ Adding & Configuring Servers

### Intuitive Add Server Modal

Simple form-based interface for adding new servers:

![Add Server Modal](userguide/03-add-server-modal-full.png)

### Complete Configuration Example

Full server configuration with all fields filled:

![Add Server Complete](userguide/03-add-server-complete.png)

### Environment Variables

JSON-based environment variable configuration with syntax highlighting:

![Environment Variables](userguide/03-environment-variables-json.png)

**Features:**
- JSON format for complex configurations
- Syntax validation
- Auto-formatting
- Copy/paste support

---

## 🔄 Configuration Scopes

### Multi-Level Configuration Management

Switch between different configuration scopes easily:

![Scope Buttons](userguide/01-main-scope-buttons.png)

### User Scope (Default)
Personal configurations for your user account

### Project Scope
Project-specific configurations that override user settings:

![Project Scope](userguide/06-project-scope.png)

### System Scope
Global configurations for all users on the system:

![System Scope](userguide/06-system-scope.png)

---

## 🎨 User Interface Elements

### Navigation Toolbar

Clean, organized top navigation with all essential controls:

![Top Toolbar](userguide/07-top-toolbar.png)

**Components:**
- Client selector dropdown
- Scope selection buttons
- Settings access
- Profile management
- Save button

### Status Bar

Real-time information about current configuration:

![Status Bar](userguide/07-status-bar.png)

**Shows:**
- Active configuration file path
- Save status
- Server count
- Current scope

### Client Selection

Quick client switching with dropdown menu:

![Client Dropdown](userguide/01-main-client-dropdown.png)

---

## 🔧 Advanced Features

### Kiro Integration

Full support for Kiro with all MCP servers:

![Kiro Interface](userguide/kiro-interface-fullscreen.png)

### Bulk Operations
- Select multiple servers
- Bulk enable/disable
- Export selected configurations
- Mass delete operations

### Configuration Validation
- Real-time syntax checking
- Command path validation
- Environment variable verification
- Error highlighting

### Auto-Detection
- Automatically finds installed AI clients
- Detects configuration file locations
- Updates when clients are installed/removed

---

## 💡 Key Benefits

### 🚫 No More JSON Editing
- Visual form-based editing
- Syntax validation
- Auto-formatting
- Error prevention

### 🔄 Cross-Client Sync
- Copy servers between clients
- Import/export configurations
- Profile sharing
- Backup and restore

### 🛡️ Safe Configuration
- Validation before saving
- Backup on changes
- Undo/redo support
- Non-destructive editing

### ⚡ Productivity Features
- Keyboard shortcuts
- Quick actions
- Search and filter
- Bulk operations

---

## 📱 Responsive Design

### Full Screen View
Optimized for desktop use at 1920x1080:

![Full Screen](userguide/main-interface-fullscreen.png)

### Adaptive Layout
- Responsive to window size
- Collapsible panels
- Mobile-friendly controls
- Touch-optimized buttons

---

## 🎯 Use Cases

### Development Teams
- Share MCP configurations via profiles
- Project-specific server settings
- Consistent team environments
- Version control friendly

### Individual Developers
- Quick server setup
- Easy environment management
- Multiple client support
- Portable configurations

### System Administrators
- Deploy system-wide configurations
- Manage multiple user setups
- Centralized control
- Bulk provisioning

---

## 🔒 Security Features

- **No credentials in code**: Environment variables for secrets
- **Scope isolation**: Project configs don't affect other projects
- **Validation**: Prevents malformed configurations
- **Safe defaults**: Secure configuration templates

---

## 📈 Coming Soon

- Cloud sync for configurations
- Team collaboration features
- Server marketplace
- One-click server installation
- Configuration templates
- Server health monitoring
- Usage analytics
- Plugin system

---

## 🆘 Getting Help

- **User Guide**: [Complete documentation](USER_GUIDE.md)
- **Quick Start**: [5-minute setup](QUICK_START.md)
- **GitHub**: [Report issues](https://github.com/thechrisgreen/mcp-config-manager/issues)
- **Discord**: Community support

---

*MCP Configuration Manager - Making MCP server management simple, visual, and powerful.*