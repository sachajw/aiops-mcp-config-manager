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