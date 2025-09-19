# MCP Configuration Storage Locations

## Overview
This document details where various MCP-enabled tools store their configuration settings across different scopes (global, user, local, project).

Last Updated: September 10, 2025

## 1. Claude Desktop

### Configuration Location
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

### Configuration Format
```json
{
  "mcpServers": {
    "server-name": {
      "command": "command-to-run",
      "args": ["arg1", "arg2"],
      "env": {
        "API_KEY": "value"
      }
    }
  }
}
```

### Access Method
- Via Settings → Developer → Edit Config in Claude Desktop UI
- Direct file editing

## 2. Claude Code (CLI)

### Configuration Locations (Multiple Options)
1. **Primary (Recommended)**: `~/.claude.json`
2. **Alternative**: `~/.claude/settings.local.json`
3. **Project-specific**: `./.mcp.json` (in project directory)
4. **Project Claude settings**: `./.claude/settings.local.json`

### Important Notes
- Documentation inconsistency: `~/.claude/settings.json` mentioned in docs but doesn't work for MCP
- The `.claude.json` file is more reliable and contains more than just MCP configurations
- Supports environment variable expansion

### Configuration Format
```json
{
  "mcpServers": {
    "server-name": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "package-name"],
      "env": {
        "API_KEY": "${API_KEY:-default-value}"
      }
    }
  }
}
```

### CLI Commands
- `claude mcp add` - Interactive wizard to add MCP servers
- `claude mcp` - View/manage MCP servers

## 3. Gemini CLI

### Configuration Locations (Hierarchical)
1. **User/Global**: `~/.gemini/settings.json`
2. **Project-specific**: `./.gemini/settings.json` (overrides user)
3. **System-wide**: `/etc/gemini-cli/settings.json` (highest precedence)
4. **Environment**: `.env` files (in project or `~/.gemini/.env`)

### Additional Locations
- **Extensions**: `~/.gemini/extensions/` or `<workspace>/.gemini/extensions/`
- **Project Instructions**: `GEMINI.md` in project root

### Configuration Format
```json
{
  "mcpServers": {
    "server-name": {
      "command": "command-to-run",
      "args": ["arg1", "arg2"],
      "env": {
        "KEY": "value"
      }
    }
  }
}
```

### CLI Commands
- `gemini mcp add [server-name] [config]` - Add MCP server
- `gemini mcp remove [server-name]` - Remove MCP server
- `gemini mcp list` - List all MCP servers
- `/mcp` - List configured MCP servers in agent mode
- `/tools` - Display available tools in agent mode

## 4. Codex CLI

### Configuration Location
- **Primary**: `~/.codex/config.toml`
- **Alternative**: Can specify via `--config` option
- **Project-specific**: `.agent/mcps.json` (optional, for some implementations)

### Additional Files
- **Security Instructions**: `AGENTS.md` in project root

### Configuration Format (TOML)
```toml
[mcp_servers]
[mcp_servers.server_name]
command = "command-to-run"
args = ["arg1", "arg2"]

[mcp_servers.server_name.env]
API_KEY = "value"
```

## 5. VS Code (Native MCP Support)

### Configuration Locations
1. **Workspace/Project**: `.vscode/mcp.json`
2. **User/Global**: VS Code user settings.json
   - Access via: `MCP: Open User Configuration` command
   - Or: Settings → Extensions → MCP
3. **Auto-discovery**: Can discover from other tools (Claude Desktop, etc.)

### Settings Location
- **macOS**: `~/Library/Application Support/Code/User/settings.json`

### Configuration Format
```json
// In .vscode/mcp.json or settings.json
{
  "chat.mcp.enabled": true,
  "chat.mcp.discovery.enabled": true,
  "chat.mcp.servers": {
    "server-name": {
      "command": "command",
      "args": ["arg1"],
      "env": {
        "KEY": "value"
      }
    }
  }
}
```

### Access Methods
- `MCP: Open User Configuration` - Open user config
- `MCP: Open Workspace Folder Configuration` - Open workspace config
- `MCP: Browse Servers` - Browse available servers
- `MCP: Show Installed Servers` - View installed servers

## 6. Gemini for VS Code Extension

### Configuration Location
Same as Gemini CLI, but integrated with VS Code:
- **Primary**: `~/.gemini/settings.json`
- **Project**: `./.gemini/settings.json`

### Important Notes
- Cannot use VS Code command palette to install MCP servers for agent mode
- Must manually edit Gemini settings JSON file
- Requires Gemini CLI version 0.1.20 or higher

### Commands in Agent Mode
- `/tools` - Display available tools
- `/mcp` - List configured MCP servers

## 7. Codex for VS Code Extension

### Configuration Locations
Uses same locations as standard VS Code MCP support:
1. **Workspace**: `.vscode/mcp.json`
2. **User**: VS Code settings.json

### Important Notes
- Built on open-source Codex CLI
- Should support same MCP management as GitHub Copilot
- Unified configuration with VS Code's native MCP support

## 8. Claude Code for VS Code Extension

### Configuration Locations
Integrates with VS Code's native MCP support:
1. **Workspace**: `.vscode/mcp.json`
2. **User**: VS Code settings.json
3. **Auto-discovery**: From Claude Desktop config (`~/.claude.json`)

### Key Settings
```json
{
  "chat.mcp.enabled": true,
  "chat.mcp.discovery.enabled": true
}
```

## Configuration Scope Hierarchy

### Standard Hierarchy (most tools follow this pattern)
1. **Project** (highest priority): Project-specific config files
2. **Local**: Directory-specific configurations
3. **User**: User home directory configurations
4. **Global/System** (lowest priority): System-wide configurations

### Scope Definitions
- **Global/System**: Applies to all users on the system
- **User**: Applies to specific user across all projects
- **Local**: Applies to specific directory/workspace
- **Project**: Applies only to current project

## Best Practices for MCP Configuration Manager

### Recommended Implementation Approach
1. **Detect installed clients** first
2. **Read existing configurations** from known locations
3. **Provide unified interface** for editing
4. **Write back to appropriate locations** based on scope
5. **Support environment variables** and `.env` files
6. **Validate configurations** before saving

### File Format Support
- JSON (most common)
- JSON5 (supports comments)
- JSONC (JSON with comments)
- TOML (Codex only)
- Environment variables (all tools)

### Security Considerations
- Never hardcode API keys or secrets
- Support environment variable expansion
- Use `.env` files for sensitive data
- Respect file permissions and ownership
- Validate server sources before execution

## Quick Reference Table

| Tool | Primary Config Location | Format | Scopes Supported |
|------|------------------------|---------|------------------|
| Claude Desktop | `~/Library/Application Support/Claude/claude_desktop_config.json` | JSON | User |
| Claude Code | `~/.claude.json` | JSON/JSON5 | User, Project |
| Gemini CLI | `~/.gemini/settings.json` | JSON | System, User, Project |
| Codex CLI | `~/.codex/config.toml` | TOML | User |
| VS Code (Native) | `.vscode/mcp.json` | JSON | User, Workspace |
| Gemini VS Code | `~/.gemini/settings.json` | JSON | User, Project |
| Codex VS Code | `.vscode/mcp.json` | JSON | User, Workspace |
| Claude Code VS Code | `.vscode/mcp.json` | JSON | User, Workspace |

## Notes for Implementation

1. **File Watching**: Monitor these locations for changes
2. **Backup Strategy**: Always backup before modifying
3. **Migration Support**: Help users migrate between formats
4. **Validation**: Validate against MCP schema before saving
5. **Cross-Platform**: Handle platform-specific paths correctly
6. **Permissions**: Check read/write permissions before operations