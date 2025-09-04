# MCP Configuration Manager - Product Definition Document

## Project Overview

### Product Name
MCP Configuration Manager (MCM)

### Vision Statement
To provide a unified, user-friendly graphical interface for managing Model Context Protocol (MCP) server configurations across multiple AI client applications, eliminating the need for manual JSON editing and reducing configuration errors.

### Problem Statement
Currently, users must manually edit JSON configuration files for each MCP client application separately, leading to:
- Configuration inconsistencies across clients
- Syntax errors in JSON files
- Difficulty in discovering and managing MCP servers
- Time-consuming setup and maintenance processes
- Lack of visibility into current configurations

## Target Users

### Primary Users
1. **Developers** using MCP servers for development workflows
2. **Power Users** managing multiple AI assistants with MCP integrations
3. **System Administrators** deploying MCP configurations across teams
4. **Non-Technical AI Users** (Lower priority, later phase) who have Claude Desktop/Code but need help discovering and deploying MCP servers

### User Personas

#### Developer Dana
- Uses multiple AI assistants for coding
- Frequently adds/removes MCP servers
- Needs quick configuration changes
- Values consistency across tools
- Manages configurations across different scopes (global, user, project)

#### Admin Alex
- Manages MCP configurations for a team
- Needs to standardize configurations
- Requires backup and restore capabilities
- Monitors server health and usage

#### AI Enthusiast Emma (Later Phase)
- Non-technical user with Claude Desktop
- Wants to enhance AI capabilities with MCP servers
- Needs guided setup and discovery
- Requires simple, one-click installations
- Values pre-configured templates and recommendations

## Core Features

### 1. Configuration Discovery & Display
- **Auto-detection** of installed MCP clients
- **Visual representation** of current configurations
- **Syntax highlighting** for configuration viewing
- **Configuration validation** with error indicators

### 2. Unified Configuration Management
- **Single interface** to manage all client configurations
- **Bulk operations** for adding/removing servers across clients
- **Configuration templates** for common setups
- **Import/Export** functionality for sharing configurations

### 3. Server Management
- **Add/Edit/Remove** MCP servers
- **Server testing** and validation
- **Environment variable management**
- **Command argument configuration**
- **Working directory settings**

### 4. Client-Specific Features
- **Client profiles** for different configuration sets
- **Client-specific settings** preservation
- **Version compatibility** checking
- **Client status monitoring**

### 5. Configuration Scope Management
- **Global Scope** - System-wide MCP server configurations
- **User Scope** - User-specific configurations
- **Local/Workspace Scope** - Project or directory-specific settings
- **Project Scope** - Configurations tied to specific projects
- **Scope Inheritance** - Clear hierarchy and override rules
- **Scope Visualization** - Visual indicators showing which scope is active
- **Scope Migration** - Move configurations between scopes

### 6. MCP Server Discovery & Marketplace (Later Phase)
- **Server Discovery** - Browse available MCP servers
- **One-Click Install** - Simplified installation for non-technical users
- **Server Recommendations** - Suggested servers based on usage
- **Pre-configured Templates** - Ready-to-use server configurations
- **Community Ratings** - User reviews and ratings
- **Guided Setup Wizards** - Step-by-step configuration helpers

## Technical Requirements

### Supported Clients
1. **Claude Desktop** (Mac priority, Windows/Linux later)
   - Config location: `~/Library/Application Support/Claude/claude_desktop_config.json` (Mac)
   - Config location: `%APPDATA%\Claude\claude_desktop_config.json` (Windows - Phase 2)
   - Config location: `~/.config/Claude/claude_desktop_config.json` (Linux - Phase 2)

2. **Claude Code**
   - Config location: `~/.claude/claude_code_config.json`
   - Alternative: `~/.config/claude/claude_code_config.json`

3. **Codex**
   - Config location: `~/.codex/config.json` (Mac)
   - Alternative: `~/Library/Application Support/Codex/config.json`
   - Scope support: Global, user, workspace, project

4. **VS Code (Continue/Codeium extensions)**
   - Config location: Workspace settings or user settings
   - Extension-specific configurations

5. **Gemini Desktop**
   - Config location: `~/Library/Application Support/Gemini/config.json` (Mac)
   - Windows: `%APPDATA%\Gemini\config.json` (Phase 2)
   - Linux: `~/.config/gemini/config.json` (Phase 2)

6. **Gemini CLI**
   - Config location: `~/.gemini/config.json`
   - Alternative: `~/.config/gemini-cli/config.json`

### Configuration File Formats
```json
{
  "mcpServers": {
    "server-name": {
      "command": "executable-path",
      "args": ["arg1", "arg2"],
      "env": {
        "KEY": "value"
      },
      "cwd": "/working/directory",
      "scope": "user" // Optional: global, user, local, project
    }
  }
}
```

### Configuration Scopes
```json
{
  "scopes": {
    "global": {
      "path": "/etc/mcp/config.json",
      "priority": 1
    },
    "user": {
      "path": "~/.config/mcp/config.json",
      "priority": 2
    },
    "local": {
      "path": "./.mcp/config.json",
      "priority": 3
    },
    "project": {
      "path": "./project.mcp.json",
      "priority": 4
    }
  }
}
```

### Platform Support
- **Phase 1**: macOS 12+ (Monterey and later) - Primary focus
- **Phase 2**: Windows 10/11
- **Phase 2**: Linux (Ubuntu 20.04+, Fedora, Arch)

## User Interface Design

### Main Window Components
1. **Client List Panel** (left sidebar)
   - Tree view of detected clients
   - Status indicators (active/inactive)
   - Version information
   - Scope indicators (G/U/L/P icons)

2. **Configuration Editor** (center panel)
   - Tabbed interface for each client
   - JSON editor with syntax highlighting
   - Form-based editor option
   - Real-time validation
   - **Scope selector dropdown**
   - **Scope inheritance viewer**

3. **Server Management Panel** (right sidebar)
   - List of configured servers
   - Add/Edit/Remove buttons
   - Test connection functionality
   - **Server discovery browser** (later phase)
   - **Scope indicator per server**

4. **Status Bar**
   - Configuration file paths
   - Validation status
   - Last saved timestamp
   - **Active scope indicator**

### Key Screens

#### 1. Dashboard
- Overview of all configured clients
- Quick stats (total servers, active clients)
- Recent changes log
- Health check status

#### 2. Server Configuration Dialog
- Server name input
- Command/executable browser
- Arguments list editor
- Environment variables table
- Working directory selector
- Test configuration button

#### 3. Settings Screen
- Application preferences
- Backup settings
- Theme selection
- Auto-detection options

## User Workflows

### Workflow 1: Adding a New MCP Server
1. User opens MCM
2. Selects target client(s) from the list
3. **Chooses configuration scope** (global/user/local/project)
4. Clicks "Add Server" button
5. Fills in server configuration form
6. Tests the configuration
7. Applies changes to selected clients
8. Configuration files are updated automatically at the appropriate scope

### Workflow 2: Synchronizing Configurations
1. User selects a "master" client configuration
2. **Selects source scope** to copy from
3. Chooses target clients for synchronization
4. **Selects target scope** for each client
5. Reviews differences in a diff view
6. Selects which configurations to sync
7. Applies changes with one click

### Workflow 3: Troubleshooting
1. User notices MCP server not working
2. Opens MCM and sees error indicator
3. **Checks scope hierarchy** to see if server is being overridden
4. Clicks on problematic configuration
5. Views detailed error messages
6. Uses "Test Connection" to diagnose
7. Fixes configuration and re-tests

### Workflow 4: Non-Technical User Setup (Later Phase)
1. User opens MCM
2. Clicks "Discover MCP Servers" button
3. Browses categorized server list
4. Reads simple descriptions and reviews
5. Clicks "Install" on desired server
6. Follows guided setup wizard
7. Server is automatically configured and tested

## Success Metrics

### Quantitative Metrics
- **Time to configure**: Reduce from 5-10 minutes to under 1 minute
- **Configuration errors**: Reduce by 90%
- **User adoption**: 80% of MCP users within 6 months
- **Cross-client consistency**: 100% synchronized configurations

### Qualitative Metrics
- User satisfaction scores (NPS > 70)
- Reduced support tickets for configuration issues
- Positive user feedback on ease of use

## Technical Architecture

### Technology Stack
- **Frontend**: Electron + React/Vue.js
- **Backend**: Node.js for file system operations
- **Configuration Parser**: JSON5 for flexible parsing
- **UI Framework**: Material-UI or Ant Design
- **Testing**: Jest + Electron testing framework

### Key Libraries
- `fs-extra` for file operations
- `json5` for JSON parsing with comments
- `diff` for configuration comparison
- `monaco-editor` for code editing

## Security Considerations

### Data Protection
- No cloud storage of configurations
- Local-only operation
- Secure handling of environment variables
- No transmission of sensitive data

### Permissions
- Request only necessary file system permissions
- Sandboxed execution environment
- User consent for configuration changes

## Roadmap

### Phase 1: Mac MVP (Month 1-2)
- Basic configuration reading/writing for macOS
- Support for Claude Desktop, Claude Code, and Codex
- Simple form-based editor
- Manual refresh functionality
- Basic scope management (user/local)
- Core configuration operations

### Phase 2: Enhanced Features & Cross-Platform (Month 3-4)
- Windows and Linux support
- Auto-detection of clients
- Full scope management (global/user/local/project)
- Configuration templates
- Import/export functionality
- Server testing capabilities
- Scope inheritance visualization

### Phase 3: Advanced Features (Month 5-6)
- Configuration synchronization
- Backup and restore
- Command palette for quick actions
- Plugin system for custom clients
- Advanced scope conflict resolution

### Phase 4: Non-Technical User Features (Month 7-8)
- MCP server marketplace/discovery
- One-click server installation
- Guided setup wizards
- Server recommendations engine
- Pre-configured templates library
- Visual configuration builders

### Future Considerations
- Cloud sync (optional, with encryption)
- Team configuration management
- Configuration versioning
- MCP server marketplace integration
- AI-assisted configuration recommendations
- Server performance monitoring

## Risks and Mitigation

### Technical Risks
1. **Client API changes**: Maintain version compatibility matrix
2. **File permission issues**: Provide clear error messages and fixes
3. **Cross-platform compatibility**: Extensive testing on all platforms

### User Adoption Risks
1. **Learning curve**: Provide interactive tutorials
2. **Trust in automation**: Allow manual override options
3. **Migration from manual editing**: Import existing configurations

## Open Questions

1. Should we support custom MCP client applications?
2. What level of configuration validation should we provide?
3. Should we include a CLI version for automation?
4. How do we handle breaking changes in MCP protocol?
5. Should we provide configuration backup to cloud services?
6. How do we handle different configuration formats across clients?
7. Should we support configuration profiles for different use cases?
8. **How should scope conflicts be resolved and displayed?**
9. **What's the best way to handle Codex's unique configuration structure?**
10. **Should the marketplace be curated or community-driven?**
11. **How do we ensure server security for non-technical users?**
12. **What level of sandboxing should we provide for testing servers?**

## Success Criteria

The project will be considered successful when:
1. Users can configure any MCP server in under 60 seconds
2. 90% reduction in configuration-related support issues
3. All major MCP clients are supported
4. Zero data loss or corruption incidents
5. Positive user reviews and organic adoption

## Implementation Considerations

### Configuration File Monitoring
- File system watchers for real-time updates
- Conflict resolution when external changes occur
- Lock files to prevent concurrent modifications
- **Scope-aware file watching across multiple locations**

### Error Handling
- Graceful degradation when clients are missing
- Clear error messages with actionable solutions
- Rollback capability for failed operations
- **Scope conflict warnings and resolution suggestions**

### Performance
- Lazy loading of configurations
- Efficient JSON parsing and validation
- Minimal memory footprint
- **Efficient scope hierarchy resolution**

### macOS-Specific Considerations
- Native macOS UI elements and behaviors
- Integration with macOS security features
- Proper code signing and notarization
- Sandbox-compatible file access
- Support for macOS-specific paths and conventions

### Scope Management Implementation
- Clear visual hierarchy of scope precedence
- Efficient merging of configurations across scopes
- Conflict detection and resolution UI
- Scope-specific backup and restore
- Migration tools between scopes

## Appendix

### Related Documentation
- MCP Protocol Specification
- Client-specific configuration guides
- Electron security best practices

### Competitor Analysis
- No direct competitors identified
- Manual JSON editors (VS Code, Sublime)
- General configuration management tools

### MCP Server Examples
Common MCP servers that users might configure:
- File system access servers
- Database connection servers
- API integration servers
- Development tool servers
- Custom business logic servers

### Priority Platform Support
**Phase 1 - macOS First**
- Primary development and testing on macOS
- Native macOS user experience
- Full feature parity on Mac platform
- Optimized for Apple Silicon and Intel Macs

**Phase 2 - Cross-Platform Expansion**
- Windows 10/11 support
- Linux distributions (Ubuntu, Fedora, Arch)
- Platform-specific adaptations

### Configuration Scope Hierarchy
1. **Project Scope** (Highest Priority)
   - Project-specific `.mcp/config.json`
   - Overrides all other scopes
   
2. **Local/Workspace Scope**
   - Directory-specific configurations
   - Useful for shared team settings
   
3. **User Scope**
   - User home directory configurations
   - Personal preferences and servers
   
4. **Global Scope** (Lowest Priority)
   - System-wide configurations
   - Organization-wide defaults

---

*Document Version: 1.0*  
*Last Updated: September 3, 2025*  
*Author: Product Management Team*