# MCP Configuration File Paths - Official Documentation

**Last Updated**: January 31, 2025
**Purpose**: Official configuration file paths for all MCP-compatible clients
**Critical**: These are the CORRECT paths per official documentation - DO NOT use `.mcp` directory

## 1. Claude Desktop

### Configuration File
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

### Scope Support
- ✅ User scope only
- ❌ No project-specific configs
- ❌ No workspace configs

### Example Structure
```json
{
  "mcpServers": {
    "server-name": {
      "command": "node",
      "args": ["path/to/server.js"],
      "env": {
        "API_KEY": "value"
      }
    }
  }
}
```

## 2. Claude Code (CLI)

### Configuration Files (Multiple Options)

#### Primary Locations (Confirmed Working)
- **User Config**: `~/.claude.json` (RECOMMENDED - most reliable)
- **Project Config**: `.mcp.json` (in project root, version-controlled)

#### Secondary Locations (Documented but inconsistent)
- `~/.claude/settings.local.json` (user-specific)
- `.claude/settings.local.json` (project-specific)

### ⚠️ Known Issues
- Documentation states `~/.claude/settings.json` but this DOES NOT WORK for MCP
- CLI-managed configs (`claude mcp add`) stored internally, not visible in filesystem
- Inconsistency between documentation and actual working paths

### Scope Support
- ✅ User scope (`~/.claude.json`)
- ✅ Project scope (`.mcp.json` in project root)
- ✅ Environment variable expansion supported

### Example Structure
```json
{
  "projects": {
    "/path/to/project": {
      "mcpServers": {
        "filesystem": {
          "command": "npx",
          "args": ["-y", "@modelcontextprotocol/server-filesystem", "/allowed/path"]
        }
      }
    }
  }
}
```

## 3. VS Code

### Configuration Files
- **Workspace**: `.vscode/mcp.json` (RECOMMENDED)
- **User Settings**: Can also add to `settings.json` for global access

### Scope Support
- ✅ Workspace scope (`.vscode/mcp.json`)
- ✅ User scope (via settings.json)
- ⚠️ Using same server in both locations may cause conflicts

### Example Structure
```json
{
  "mcpServers": {
    "my-mcp-server": {
      "command": "node",
      "args": ["C:\\Repos\\my-mcp-server\\dist\\index.js"],
      "env": {},
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

## 4. Cursor IDE

### Configuration Files
- **Project**: `.cursor/mcp.json` (in project root)
- **Global**: `~/.cursor/mcp.json` (home directory)

### Scope Support
- ✅ Project scope (`.cursor/mcp.json`)
- ✅ User/Global scope (`~/.cursor/mcp.json`)

### UI Management
- View/edit via: Cursor Settings → MCP
- Shows as "Project Managed" for project-level configs

## 5. Windsurf

### Configuration File
- **Primary**: `mcp_config.json`
- **Access**: File → Preferences → Windsurf Settings → Manage MCPs → View raw config

### Scope Support
- ✅ User scope
- ❓ Project scope support unclear from documentation

## 6. Codex

### Configuration Files (Not officially documented for MCP)
- **Primary**: `~/.codex/config.json`
- **macOS Alt**: `~/Library/Application Support/Codex/config.json`
- **Windows**: `%APPDATA%\Codex\config.json`

### Scope Support
- ❓ MCP support not confirmed in official docs

## 7. Gemini Desktop & CLI

### Configuration Files (Not officially documented for MCP)
- **Desktop**: `~/Library/Application Support/Gemini/config.json` (macOS)
- **CLI**: `~/.gemini/config.json`

### Scope Support
- ❓ MCP support not confirmed in official docs

## Important Implementation Notes

### ❌ INCORRECT Paths (Do NOT Use)
- `.mcp/` directory - This does NOT exist in any official implementation
- `.claude/claude_desktop_config.json` - Wrong location for Claude Desktop
- `.vscode/settings.json` for MCP - Use `.vscode/mcp.json` instead

### ✅ Project Scope Paths (Per Client)
When implementing project scope in our app, use these paths:

```typescript
// CORRECT project-scope paths
const PROJECT_PATHS = {
  CLAUDE_CODE: '.mcp.json',                    // Root of project
  VS_CODE: '.vscode/mcp.json',                 // VS Code folder
  CURSOR: '.cursor/mcp.json',                  // Cursor folder
  CLAUDE_DESKTOP: null,                        // Not supported
  WINDSURF: null,                              // Unclear from docs
  CODEX: null,                                 // Not documented
  GEMINI: null                                 // Not documented
};
```

### Windows Path Considerations
- Always use full paths for executables
- Example: `"C:\\Program Files\\nodejs\\npx.cmd"` instead of just `"npx"`
- Prevents "Cannot connect to MCP server" errors

## References
- [Model Context Protocol Official Docs](https://modelcontextprotocol.io/docs)
- [Claude Desktop MCP Guide](https://support.anthropic.com/en/articles/10949351)
- [VS Code MCP Documentation](https://code.visualstudio.com/docs/copilot/customization/mcp-servers)
- [Cursor MCP Documentation](https://cursor.com/docs/context/mcp)

## Updates Required in Our Codebase

Based on this research, the following files need updating:

1. **src/main/utils/pathResolver.ts**
   - Remove all `.mcp` directory references
   - Update project paths to use correct locations
   - Claude Desktop has NO project scope support

2. **Task 175 (Bug-019)**
   - Project configs are NOT in `.mcp` directory
   - Use `.mcp.json` (Claude Code), `.vscode/mcp.json` (VS Code), `.cursor/mcp.json` (Cursor)
   - Claude Desktop doesn't support project configs at all

3. **Documentation**
   - Update all references to `.mcp` directory
   - Clarify which clients support project scope
   - Add warnings about known issues (especially Claude Code)