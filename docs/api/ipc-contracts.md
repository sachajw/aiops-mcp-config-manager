# IPC Contract Documentation

Generated on: 2025-09-20

## Overview

This document describes all IPC (Inter-Process Communication) endpoints available in the MCP Configuration Manager after the modular refactoring.

## IPC Handlers Architecture

The IPC system has been refactored into modular handlers, each responsible for a specific domain:

```
src/main/ipc/handlers/
├── BaseHandler.ts       # Abstract base with error handling
├── ClientHandler.ts      # Client discovery & management
├── ConfigHandler.ts      # Configuration CRUD operations
├── ServerHandler.ts      # Server testing & validation
├── MetricsHandler.ts     # Metrics & monitoring
├── SystemHandler.ts      # System operations (backups, utils)
├── CatalogHandler.ts     # Server catalog operations
├── ConnectionHandler.ts  # Connection monitoring
├── MCPHandler.ts        # MCP server inspection
└── index.ts             # Central registration

```

## Endpoints by Handler

### SystemHandler (No prefix)

#### `app:getSettings`
**Description:** Get application settings
**Parameters:** None
**Returns:** `AppSettings`

#### `app:saveSettings`
**Description:** Save application settings
**Parameters:** `[AppSettings]`
**Returns:** `boolean`

#### `backup:create`
**Description:** Create configuration backup
**Parameters:** `[string, Configuration]` (clientId, configuration)
**Returns:** `BackupEntry`

#### `backup:restore`
**Description:** Restore from backup
**Parameters:** `[string]` (backupId)
**Returns:** `any`

#### `backup:list`
**Description:** List available backups
**Parameters:** `[string?]` (optional clientId)
**Returns:** `any[]`

#### `backup:delete`
**Description:** Delete a backup
**Parameters:** `[string]` (backupId)
**Returns:** `void`

#### `utils:validateJson`
**Description:** Validate JSON content
**Parameters:** `[string]` (jsonContent)
**Returns:** `ValidationResult`

#### `system:openExternal`
**Description:** Open external URL
**Parameters:** `[string]` (url)
**Returns:** `void`

---

### ClientHandler (Prefix: `clients`)

#### `clients:discover`
**Description:** Discover installed MCP clients
**Parameters:** None
**Returns:** `ClientDetectionResult`

#### `clients:validateClient`
**Description:** Validate client configuration
**Parameters:** `[string]` (clientId)
**Returns:** `any`

#### `clients:isActive`
**Description:** Check if client is active/running
**Parameters:** `[string]` (clientId)
**Returns:** `boolean`

#### `clients:getDetails`
**Description:** Get detailed client information
**Parameters:** `[string]` (clientId)
**Returns:** `MCPClient | null`

#### `clients:refreshStatuses`
**Description:** Refresh all client statuses
**Parameters:** None
**Returns:** `MCPClient[]`

---

### ConfigHandler (Prefix: `config`)

#### `config:load`
**Description:** Load configuration for a client
**Parameters:** `[string, ConfigScope?]` (clientId, scope)
**Returns:** `Configuration | null`

#### `config:save`
**Description:** Save configuration for a client
**Parameters:** `[string, Configuration, ConfigScope?]`
**Returns:** `boolean`

#### `config:loadFromScope`
**Description:** Load configuration from specific scope
**Parameters:** `[string]` (clientId)
**Returns:** `Configuration | null`

#### `config:validate`
**Description:** Validate a configuration
**Parameters:** `[Configuration]`
**Returns:** `any`

#### `config:getScopes`
**Description:** Get available configuration scopes
**Parameters:** `[string]` (clientId)
**Returns:** `ConfigScope[]`

#### `config:deleteScope`
**Description:** Delete configuration from scope
**Parameters:** `[string, ConfigScope?]` (clientId, scope)
**Returns:** `void`

#### `config:export`
**Description:** Export configuration to file
**Parameters:** `[string]` (clientId)
**Returns:** `string`

#### `config:import`
**Description:** Import configuration from JSON
**Parameters:** `[string, string]` (clientId, configJson)
**Returns:** `boolean`

---

### ServerHandler (Prefix: `server`)

#### `server:test`
**Description:** Test server connection
**Parameters:** `[string, any]` (serverName, serverConfig)
**Returns:** `TestResult`

#### `server:testCommand`
**Description:** Test server command validity
**Parameters:** `[string]` (command)
**Returns:** `boolean`

#### `server:validateEnvironment`
**Description:** Validate server environment
**Parameters:** `[Record<string, string>]` (env)
**Returns:** `any`

---

### MetricsHandler (Prefix: `metrics`)

#### `metrics:getServerMetrics`
**Description:** Get metrics for specific server
**Parameters:** `[string, any?]` (serverName, serverConfig)
**Returns:** `any`

#### `metrics:getTotal`
**Description:** Get total metrics for multiple servers
**Parameters:** `[string[]]` (serverNames)
**Returns:** `any`

#### `metrics:getClientMetrics`
**Description:** Get metrics for all client servers
**Parameters:** `[string]` (clientId)
**Returns:** `any`

---

### CatalogHandler (Prefix: `catalog`)

#### `catalog:getServers`
**Description:** Get server catalog
**Parameters:** None
**Returns:** `any`

#### `catalog:searchServers`
**Description:** Search servers by query
**Parameters:** `[string]` (query)
**Returns:** `any`

#### `catalog:getServersByCategory`
**Description:** Get servers by category
**Parameters:** `[string]` (category)
**Returns:** `any`

#### `catalog:getPopularServers`
**Description:** Get popular servers
**Parameters:** `[number?]` (limit)
**Returns:** `any`

---

### ConnectionHandler (Prefix: `connection`)

#### `connection:startMonitoring`
**Description:** Start monitoring server connection
**Parameters:** `[string, string, string, string[]?, Record<string, string>?, string?]`
- serverId
- serverName
- command
- args (optional)
- env (optional)
- cwd (optional)
**Returns:** `boolean`

#### `connection:stopMonitoring`
**Description:** Stop monitoring server connection
**Parameters:** `[string]` (serverId)
**Returns:** `boolean`

#### `connection:getStatus`
**Description:** Get connection status for server
**Parameters:** `[string]` (serverId)
**Returns:** `ConnectionStatus | undefined`

#### `connection:getAllStatuses`
**Description:** Get all connection statuses
**Parameters:** None
**Returns:** `Map<string, ConnectionStatus>`

#### `connection:connect`
**Description:** Connect to a server
**Parameters:** `[string, any]` (serverName, config)
**Returns:** `ConnectionStatus | undefined`

#### `connection:disconnect`
**Description:** Disconnect from a server
**Parameters:** `[string]` (serverName)
**Returns:** `{ success: boolean }`

---

### MCPHandler (Prefix: `mcp`)

#### `mcp:inspectServer`
**Description:** Inspect MCP server capabilities
**Parameters:** `[string, any]` (serverName, serverConfig)
**Returns:** `ServerInspectionResult`

#### `mcp:testServer`
**Description:** Test MCP server
**Parameters:** `[string, string, string, string[]?]`
- serverId
- serverName
- command
- args (optional)
**Returns:** `{ success: boolean; error?: string; metrics?: any }`

#### `mcp:testCommonServers`
**Description:** Test common MCP servers
**Parameters:** None
**Returns:** `any`

#### `mcp:testFilesystemServer`
**Description:** Test filesystem MCP server
**Parameters:** None
**Returns:** `any`

---

### DiscoveryHandler (Prefix: `discovery`)

#### `discovery:fetchCatalog`
**Description:** Fetch MCP server catalog from remote repository
**Parameters:** `[boolean?, Partial<McpDiscoverySettings>?]`
- forceRefresh (optional): Force refresh catalog cache
- settings (optional): Override discovery settings
**Returns:** `McpServerCatalog`
**Errors:**
- `CATALOG_FETCH_ERROR` - When unable to fetch catalog from remote

#### `discovery:getInstalledServers`
**Description:** Get list of installed MCP servers
**Parameters:** None
**Returns:** `InstalledServer[]`

#### `discovery:isServerInstalled`
**Description:** Check if a specific server is installed
**Parameters:** `[string]` (serverId)
**Returns:** `boolean`

#### `discovery:installServer`
**Description:** Install an MCP server from catalog
**Parameters:** `[string]` (serverId)
**Returns:** `void`
**Errors:**
- `SERVER_NOT_FOUND` - When serverId doesn't exist in catalog
- `ALREADY_INSTALLED` - When server is already installed
- `INSTALLATION_FAILED` - When npm/pip/git installation fails

#### `discovery:uninstallServer`
**Description:** Uninstall an MCP server
**Parameters:** `[string]` (serverId)
**Returns:** `void`
**Errors:**
- `NOT_INSTALLED` - When server is not installed
- `UNINSTALL_FAILED` - When filesystem removal fails

#### `discovery:getInstallationState`
**Description:** Get current installation state for a server
**Parameters:** `[string]` (serverId)
**Returns:** `InstallationState | undefined`
**Notes:** Returns undefined if no active installation

#### `discovery:updateSettings`
**Description:** Update discovery service settings
**Parameters:** `[Partial<McpDiscoverySettings>]`
**Returns:** `void`

#### `discovery:getSettings`
**Description:** Get current discovery settings
**Parameters:** None
**Returns:** `McpDiscoverySettings`

#### `discovery:getInstallationLogs`
**Description:** Get installation output logs for a server
**Parameters:** `[string]` (serverId)
**Returns:** `string[]`
**Notes:** Returns last 5 lines of installation output

---

### InstallationHandler (Prefix: `installation`)

#### `installation:install`
**Description:** Install an MCP server from npm, pip, cargo, or git
**Parameters:** `[string, string]`
- serverId: Unique identifier for the server
- source: Installation source (e.g., "npm:@mcp/server", "pip:mcp-server", "git:https://...")
**Returns:** `InstallResult`
```typescript
{
  success: boolean;
  version?: string;
  path?: string;
  error?: string;
}
```
**Errors:**
- `UNKNOWN_SOURCE` - When source type is not recognized
- `INSTALL_FAILED` - When installation process fails
- `ALREADY_INSTALLED` - When server is already installed

#### `installation:uninstall`
**Description:** Uninstall an MCP server
**Parameters:** `[string]` (serverId)
**Returns:** `InstallResult`
**Errors:**
- `SERVER_NOT_FOUND` - When server is not installed
- `UNINSTALL_FAILED` - When uninstallation process fails

#### `installation:check`
**Description:** Check if a package is installed
**Parameters:** `[string]` (packageSource)
**Returns:** `{ installed: boolean; version?: string; }`
**Notes:** Checks system for npm, pip, cargo, or git installations

#### `installation:getInstalled`
**Description:** Get list of all installed servers
**Parameters:** None
**Returns:** `InstalledServerInfo[]`
```typescript
{
  serverId: string;
  packageName: string;
  version: string;
  installDate: Date;
  installPath: string;
  type: 'npm' | 'pip' | 'cargo' | 'git' | 'manual';
}
```

#### `installation:getInfo`
**Description:** Get detailed information about an installed server
**Parameters:** `[string]` (serverId)
**Returns:** `InstalledServerInfo | null`

#### `installation:getVersion`
**Description:** Get version of an installed package
**Parameters:** `[string]` (packageName)
**Returns:** `string | null`

---

### ServerHandler Extensions

#### `servers:install`
**Description:** Install a server from the catalog (delegates to InstallationService)
**Parameters:** `[string, McpServerEntry]`
- serverId: Server identifier
- serverEntry: Full server metadata from catalog
**Returns:** `InstallResult`
**Notes:** Uses InstallationService internally for actual installation

#### `servers:uninstall`
**Description:** Uninstall a server (delegates to InstallationService)
**Parameters:** `[string]` (serverId)
**Returns:** `InstallResult`

#### `servers:checkInstalled`
**Description:** Check installation status of a server
**Parameters:** `[string]` (serverId)
**Returns:** `{ installed: boolean; version?: string; configuredClients?: string[] }`
**Notes:** Returns installation status and which clients use this server

---

## TypeScript Contract Definition

```typescript
export interface IPCContracts {
  // System handlers
  'app:getSettings': {
    params: void;
    returns: AppSettings;
  };
  'app:saveSettings': {
    params: [AppSettings];
    returns: boolean;
  };

  // Client handlers
  'clients:discover': {
    params: void;
    returns: ClientDetectionResult;
  };
  'clients:validateClient': {
    params: [string];
    returns: any;
  };
  'clients:isActive': {
    params: [string];
    returns: boolean;
  };

  // Config handlers
  'config:load': {
    params: [string, ConfigScope?];
    returns: Configuration | null;
  };
  'config:save': {
    params: [string, Configuration, ConfigScope?];
    returns: boolean;
  };
  'config:validate': {
    params: [Configuration];
    returns: ValidationResult;
  };

  // Server handlers
  'server:test': {
    params: [string, any];
    returns: TestResult;
  };

  // Metrics handlers
  'metrics:getServerMetrics': {
    params: [string, any?];
    returns: ServerMetrics;
  };
  'metrics:getTotal': {
    params: [string[]];
    returns: TotalMetrics;
  };

  // Catalog handlers
  'catalog:getServers': {
    params: void;
    returns: CatalogServer[];
  };
  'catalog:searchServers': {
    params: [string];
    returns: CatalogServer[];
  };

  // Connection handlers
  'connection:startMonitoring': {
    params: [string, string, string, string[]?, Record<string, string>?, string?];
    returns: boolean;
  };
  'connection:getStatus': {
    params: [string];
    returns: ConnectionStatus | undefined;
  };

  // MCP handlers
  'mcp:inspectServer': {
    params: [string, any];
    returns: ServerInspectionResult;
  };
  'mcp:testServer': {
    params: [string, string, string, string[]?];
    returns: TestResult;
  };

  // Discovery handlers
  'discovery:fetchCatalog': {
    params: [boolean?, Partial<McpDiscoverySettings>?];
    returns: McpServerCatalog;
  };
  'discovery:getInstalledServers': {
    params: void;
    returns: InstalledServer[];
  };
  'discovery:isServerInstalled': {
    params: [string];
    returns: boolean;
  };
  'discovery:installServer': {
    params: [string];
    returns: void;
  };
  'discovery:uninstallServer': {
    params: [string];
    returns: void;
  };
  'discovery:getInstallationState': {
    params: [string];
    returns: InstallationState | undefined;
  };
  'discovery:updateSettings': {
    params: [Partial<McpDiscoverySettings>];
    returns: void;
  };
  'discovery:getSettings': {
    params: void;
    returns: McpDiscoverySettings;
  };
  'discovery:getInstallationLogs': {
    params: [string];
    returns: string[];
  };
}

// Type-safe IPC invoke helper
export async function invokeIPC<K extends keyof IPCContracts>(
  channel: K,
  ...args: IPCContracts[K]['params'] extends void ? [] : [IPCContracts[K]['params']]
): Promise<IPCContracts[K]['returns']> {
  return window.electron.invoke(channel, ...args);
}
```

## Error Handling

All handlers inherit from `BaseHandler` which provides:
- Automatic error catching and logging
- Conversion to `ApplicationError` with categories and severity
- Error recovery suggestions
- Consistent error format across all endpoints

## Usage Examples

### Client Discovery
```typescript
// Renderer process
const result = await invokeIPC('clients:discover');
console.log(`Found ${result.clients.length} clients`);
```

### Load Configuration
```typescript
// Load user-scoped configuration
const config = await invokeIPC('config:load', 'claude-desktop', 'user');
if (config) {
  console.log(`Loaded ${Object.keys(config.mcpServers).length} servers`);
}
```

### Test Server Connection
```typescript
// Test a server
const result = await invokeIPC('server:test', 'my-server', {
  command: 'node',
  args: ['server.js'],
  env: { PORT: '3000' }
});
console.log(`Test ${result.success ? 'passed' : 'failed'}`);
```

### Get Server Metrics
```typescript
// Get metrics for a specific server
const metrics = await invokeIPC('metrics:getServerMetrics', 'filesystem');
console.log(`Tools: ${metrics.toolCount}, Tokens: ${metrics.tokenUsage}`);
```

### Discovery - Install Server with Output Streaming
```typescript
// Set up listener for installation output
const unsubscribe = window.electronAPI.discovery.onInstallationOutput((event, data) => {
  if (data.serverId === 'my-server') {
    console.log('Installation output:', data.output);
    console.log('Stream:', data.stream); // 'stdout' or 'stderr'
    console.log('Last 5 lines:', data.lastFiveLines);
  }
});

// Install the server
try {
  await invokeIPC('discovery:installServer', 'my-server');
  console.log('Installation complete');
} catch (error) {
  console.error('Installation failed:', error);
} finally {
  // Clean up listener
  unsubscribe();
}
```

## Event Listeners

### Discovery Installation Output Event
**Event:** `discovery:installationOutput`
**Description:** Real-time streaming of server installation output from discovery service
**Payload:**
```typescript
{
  serverId: string;        // ID of the server being installed
  output: string;          // Raw output from the installation process
  stream: 'stdout' | 'stderr';  // Output stream type
  lastFiveLines: string[]; // Circular buffer of last 5 output lines
}
```

### Installation Service Output Event
**Event:** `installation:output`
**Description:** Real-time streaming of installation output from InstallationService
**Payload:**
```typescript
{
  serverId: string;        // ID of the server being installed
  type: 'npm' | 'pip' | 'cargo' | 'git';  // Installation type
  message: string;         // Installation message
  progress?: number;       // Installation progress (0-100)
  stream: 'stdout' | 'stderr';  // Output stream type
}
```

### Installation State Change Event
**Event:** `installation:stateChange`
**Description:** Installation state updates
**Payload:**
```typescript
{
  serverId: string;
  state: 'pending' | 'downloading' | 'installing' | 'configuring' | 'completed' | 'failed';
  progress: number;        // 0-100
  error?: string;         // Error message if failed
}
```

## Migration from Old Handlers

The old monolithic `handlers.ts` (463 lines) has been split into focused modules:
- Better separation of concerns
- Easier testing and maintenance
- Type-safe contracts
- Consistent error handling
- Improved code organization

## Best Practices

1. **Always use the typed `invokeIPC` helper** for type safety
2. **Handle errors** - All handlers can throw ApplicationError
3. **Check null returns** - Many handlers return null on not found
4. **Use appropriate scopes** - Respect the scope hierarchy
5. **Validate before saving** - Use validation endpoints first

## Future Enhancements

- Add WebSocket support for real-time updates
- Implement request batching for performance
- Add rate limiting for resource-intensive operations
- Create OpenAPI specification for external tools
- Add request/response logging for debugging