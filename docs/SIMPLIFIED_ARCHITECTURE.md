# Simplified MCP Configuration Manager Architecture

## Overview
A streamlined approach to MCP configuration management based on direct file access patterns discovered in the configuration research.

## Core Simplifications

### 1. Direct File Access Strategy
Instead of complex abstraction layers, directly read/write to known configuration files:

```typescript
// Simple configuration map
const CONFIG_LOCATIONS = {
  'claude-desktop': {
    mac: '~/Library/Application Support/Claude/claude_desktop_config.json',
    windows: '%APPDATA%/Roaming/Claude/claude_desktop_config.json',
    format: 'json'
  },
  'claude-code': {
    primary: '~/.claude.json',
    project: './.mcp.json',
    format: 'json5'
  },
  'gemini-cli': {
    user: '~/.gemini/settings.json',
    project: './.gemini/settings.json',
    system: '/etc/gemini-cli/settings.json',
    format: 'json'
  },
  'codex-cli': {
    user: '~/.codex/config.toml',
    format: 'toml'
  },
  'vscode': {
    workspace: './.vscode/mcp.json',
    user: 'settings.json', // Platform-specific path resolution
    format: 'json'
  }
};
```

### 2. Unified Configuration Service
Single service that handles all clients instead of separate services:

```typescript
class UnifiedConfigService {
  // Fast detection - just check if files exist
  async detectClients(): Promise<DetectedClient[]> {
    const clients = [];
    for (const [name, paths of Object.entries(CONFIG_LOCATIONS)]) {
      if (await this.clientExists(paths)) {
        clients.push({ name, paths, installed: true });
      }
    }
    return clients;
  }

  // Direct read - no complex parsing layers
  async readConfig(client: string, scope: string): Promise<Config> {
    const path = this.resolvePath(client, scope);
    const content = await fs.readFile(path, 'utf-8');
    return this.parseFormat(content, CONFIG_LOCATIONS[client].format);
  }

  // Direct write - minimal validation
  async writeConfig(client: string, scope: string, config: Config): Promise<void> {
    const path = this.resolvePath(client, scope);
    const content = this.formatConfig(config, CONFIG_LOCATIONS[client].format);
    await fs.writeFile(path, content);
  }
}
```

### 3. Simplified State Management
Replace complex Zustand stores with a single reactive state:

```typescript
interface AppState {
  clients: Map<string, ClientConfig>;
  activeClient: string | null;
  activeScope: 'user' | 'project' | 'system';
  isDirty: boolean;
}

// Single store instead of multiple stores
const useConfigStore = create<AppState>((set, get) => ({
  clients: new Map(),
  activeClient: null,
  activeScope: 'user',
  isDirty: false,
  
  loadClient: async (clientName: string) => {
    const config = await configService.readConfig(clientName, get().activeScope);
    set(state => ({
      clients: new Map(state.clients).set(clientName, config),
      activeClient: clientName
    }));
  },
  
  saveClient: async () => {
    const { activeClient, activeScope, clients } = get();
    if (!activeClient) return;
    
    const config = clients.get(activeClient);
    await configService.writeConfig(activeClient, activeScope, config);
    set({ isDirty: false });
  }
}));
```

### 4. Simplified UI Components
Focus on essential features only:

```typescript
// Main App - Single page, no routing needed
function App() {
  const { clients, activeClient, loadClient, saveClient } = useConfigStore();
  
  return (
    <div className="app">
      {/* Client selector - simple dropdown */}
      <ClientSelector 
        clients={Array.from(clients.keys())}
        active={activeClient}
        onChange={loadClient}
      />
      
      {/* Scope selector - radio buttons */}
      <ScopeSelector />
      
      {/* Server list - simple table */}
      <ServerList servers={clients.get(activeClient)?.mcpServers || {}} />
      
      {/* Add/Edit form - inline editing */}
      <ServerForm />
      
      {/* Save button - single action */}
      <Button onClick={saveClient}>Save Changes</Button>
    </div>
  );
}
```

### 5. Minimal IPC Handlers
Reduce IPC complexity to essential operations:

```typescript
// Main process - only essential handlers
ipcMain.handle('config:read', async (_, client, scope) => {
  return await configService.readConfig(client, scope);
});

ipcMain.handle('config:write', async (_, client, scope, config) => {
  return await configService.writeConfig(client, scope, config);
});

ipcMain.handle('config:detect', async () => {
  return await configService.detectClients();
});

// Renderer process - simple API
const electronAPI = {
  readConfig: (client: string, scope: string) => 
    ipcRenderer.invoke('config:read', client, scope),
  
  writeConfig: (client: string, scope: string, config: any) =>
    ipcRenderer.invoke('config:write', client, scope, config),
  
  detectClients: () =>
    ipcRenderer.invoke('config:detect')
};
```

## File Structure (Simplified)

```
src/
├── main/
│   ├── main.ts                 # Electron main entry
│   ├── configService.ts        # Unified config service
│   └── ipcHandlers.ts          # Minimal IPC handlers
├── renderer/
│   ├── App.tsx                 # Single page app
│   ├── components/
│   │   ├── ClientSelector.tsx  # Dropdown for client selection
│   │   ├── ScopeSelector.tsx   # Radio buttons for scope
│   │   ├── ServerList.tsx      # Table of MCP servers
│   │   └── ServerForm.tsx      # Add/Edit form
│   └── store.ts                # Single Zustand store
└── shared/
    └── types.ts                # Minimal type definitions
```

## Implementation Priorities

### Phase 1: Core Functionality (2-3 days)
1. **Direct file reading/writing** for all clients
2. **Basic UI** with client/scope selection
3. **Server list display** with add/edit/delete
4. **Save functionality** to write changes back

### Phase 2: Enhanced Features (2-3 days)
1. **File watching** for external changes
2. **Validation** of server configurations
3. **Import/Export** for backup and sharing
4. **Environment variable** support

### Phase 3: Polish (1-2 days)
1. **Error handling** with user-friendly messages
2. **Loading states** and progress indicators
3. **Keyboard shortcuts** for common actions
4. **Basic preferences** (theme, auto-save, etc.)

## Key Simplifications from Original Design

1. **No complex service layers** - Direct file operations
2. **No routing** - Single page application
3. **No bulk operations** - Focus on individual client management
4. **No sync service** - Manual save only
5. **No command palette** - Simple UI controls
6. **Minimal validation** - Basic checks only
7. **No telemetry** - Privacy-first approach
8. **No onboarding** - Intuitive UI that doesn't need tutorials

## Performance Optimizations

1. **Lazy loading** - Only read configs when selected
2. **Debounced saves** - Batch changes before writing
3. **Minimal re-renders** - Optimize React components
4. **Fast file operations** - Use native fs promises
5. **No unnecessary abstractions** - Direct operations

## Development Workflow

```bash
# Development
npm run dev              # Start Vite + Electron

# Testing
npm test                 # Run minimal test suite

# Building
npm run build           # Build for production
npm run electron:pack   # Package for current platform
```

## Configuration Format Examples

### Claude Desktop / Claude Code
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem"],
      "env": {
        "WORKSPACE": "/path/to/workspace"
      }
    }
  }
}
```

### Gemini CLI
```json
{
  "mcpServers": {
    "github": {
      "command": "mcp-server-github",
      "args": ["--repo", "owner/repo"],
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
      }
    }
  }
}
```

### Codex CLI (TOML)
```toml
[mcp_servers.database]
command = "mcp-server-postgres"
args = ["--connection-string", "postgresql://..."]

[mcp_servers.database.env]
DB_PASSWORD = "${DB_PASSWORD}"
```

### VS Code (mcp.json)
```json
{
  "servers": {
    "web-search": {
      "command": "npx",
      "args": ["-y", "mcp-server-websearch"],
      "env": {
        "SEARCH_API_KEY": "${SEARCH_API_KEY}"
      }
    }
  }
}
```

## Benefits of This Approach

1. **Faster Development** - Less code to write and maintain
2. **Better Performance** - Direct operations, no overhead
3. **Easier Debugging** - Simple, traceable code paths
4. **Lower Complexity** - Fewer moving parts
5. **Smaller Bundle** - Minimal dependencies
6. **Quicker Time-to-Market** - Focus on core features
7. **Easier Maintenance** - Less code = fewer bugs

## Next Steps

1. **Validate config locations** with actual installations
2. **Create minimal prototype** (1 day)
3. **Test with real MCP servers** 
4. **Gather user feedback** on essential features
5. **Iterate based on usage patterns**

This simplified approach reduces the original 25-task plan to approximately 7-10 days of focused development, delivering 80% of the value with 20% of the complexity.