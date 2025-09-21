# Service Contracts Documentation

Generated on: 2025-09-20

## Overview

This document defines the contracts (interfaces) for all core services in the MCP Configuration Manager. These contracts ensure loose coupling and enable easy testing through dependency injection.

## Core Service Interfaces

### IConfigurationManager

Manages MCP server configurations across different clients and scopes.

```typescript
interface IConfigurationManager {
  readConfiguration(clientId: string, scope?: string): Promise<any>;
  writeConfiguration(clientId: string, config: any, scope?: string): Promise<void>;
  deleteConfiguration(clientId: string, scope?: string): Promise<void>;
  validateConfiguration(config: any): Promise<any>;
}
```

**Methods:**
- `readConfiguration`: Load configuration for a specific client and scope
- `writeConfiguration`: Save configuration for a specific client and scope
- `deleteConfiguration`: Remove configuration for a specific client and scope
- `validateConfiguration`: Validate configuration structure and content

---

### IClientDetector

Discovers and manages installed MCP clients on the system.

```typescript
interface IClientDetector {
  detectClients(): Promise<ClientDetectionResult>;
  detectClient(clientType: string): Promise<MCPClient | undefined>;
  isClientActive(clientId: string): Promise<boolean>;
  validateClient(client: any): Promise<ValidationResult>;
}
```

**Methods:**
- `detectClients`: Discover all installed MCP clients on the system
- `detectClient`: Find a specific client by type
- `isClientActive`: Check if a client is currently running
- `validateClient`: Validate client configuration and paths

---

### IValidationEngine

Validates configurations, servers, and data structures.

```typescript
interface IValidationEngine {
  validate(data: any, schema?: any): Promise<ValidationResult>;
  validateConfiguration(config: any): Promise<ValidationResult>;
  validateServer(server: any): Promise<ValidationResult>;
}
```

**Methods:**
- `validate`: Generic validation against a schema
- `validateConfiguration`: Validate MCP configuration structure
- `validateServer`: Validate server configuration

---

### IBackupManager

Manages configuration backups and restoration.

```typescript
interface IBackupManager {
  createBackup(clientId: string, config: any): Promise<string>;
  restoreBackup(backupId: string): Promise<void>;
  listBackups(clientId?: string): Promise<BackupEntry[]>;
  deleteBackup(backupId: string): Promise<void>;
}
```

**Methods:**
- `createBackup`: Create a backup of client configuration
- `restoreBackup`: Restore configuration from backup
- `listBackups`: List available backups (optionally filtered by client)
- `deleteBackup`: Delete a specific backup

---

### IMetricsService

Collects and manages metrics for MCP servers.

```typescript
interface IMetricsService {
  getServerMetrics(serverName: string): ServerMetrics;
  getTotalMetrics(serverNames: string[]): TotalMetrics;
  updateMetrics(serverName: string, metrics: Partial<ServerMetrics>): void;
  clearMetrics(): void;
}
```

**Methods:**
- `getServerMetrics`: Get metrics for a specific server
- `getTotalMetrics`: Get aggregated metrics for multiple servers
- `updateMetrics`: Update metrics for a server
- `clearMetrics`: Clear all collected metrics

---

### IUnifiedConfigService

Unified service for managing configurations across different client formats.

```typescript
interface IUnifiedConfigService {
  detectClients(): Promise<DetectedClient[]>;
  readConfig(clientName: string, scope: ConfigScope, projectDirectory?: string): Promise<MCPConfig>;
  writeConfig(clientName: string, scope: ConfigScope, config: MCPConfig, projectDirectory?: string): Promise<void>;
  backupConfig(clientName: string, scope: ConfigScope, projectDirectory?: string): Promise<string>;
  normalizeServers(config: MCPConfig): Record<string, MCPServer>;
  denormalizeServers(servers: Record<string, MCPServer>, clientName: string): MCPConfig;
}
```

**Methods:**
- `detectClients`: Discover installed clients
- `readConfig`: Read configuration for a client
- `writeConfig`: Write configuration for a client
- `backupConfig`: Create configuration backup
- `normalizeServers`: Convert various server formats to standard format
- `denormalizeServers`: Convert standard format to client-specific format

---

### IServerCatalogService

Manages the MCP server catalog with discovery and search capabilities.

```typescript
interface IServerCatalogService {
  getCatalog(): Promise<CatalogServer[]>;
  searchServers(query: string): Promise<CatalogServer[]>;
  getServersByCategory(category: string): Promise<CatalogServer[]>;
  getPopularServers(limit?: number): Promise<CatalogServer[]>;
  getRecentlyUpdated(limit?: number): Promise<CatalogServer[]>;
}
```

**Methods:**
- `getCatalog`: Get full server catalog
- `searchServers`: Search servers by query
- `getServersByCategory`: Filter servers by category
- `getPopularServers`: Get most popular servers
- `getRecentlyUpdated`: Get recently updated servers

---

### IMcpDiscoveryService

Discovers MCP servers from various sources.

```typescript
interface IMcpDiscoveryService {
  discoverFromNpm(): Promise<DiscoveredServer[]>;
  discoverFromGitHub(): Promise<DiscoveredServer[]>;
  discoverFromRegistry(): Promise<DiscoveredServer[]>;
  mergeDiscoveredServers(servers: DiscoveredServer[]): CatalogServer[];
}
```

**Methods:**
- `discoverFromNpm`: Discover servers from npm registry
- `discoverFromGitHub`: Discover servers from GitHub
- `discoverFromRegistry`: Discover from MCP registry
- `mergeDiscoveredServers`: Merge and deduplicate discovered servers

---

### IConnectionMonitor

Monitors and manages MCP server connections.

```typescript
interface IConnectionMonitor {
  startMonitoring(serverId: string, config: ServerConfig): Promise<void>;
  stopMonitoring(serverId: string): Promise<void>;
  getStatus(serverId: string): ConnectionStatus | undefined;
  getAllStatuses(): Map<string, ConnectionStatus>;
  checkHealth(serverId: string): Promise<boolean>;
}
```

**Methods:**
- `startMonitoring`: Start monitoring a server connection
- `stopMonitoring`: Stop monitoring a server
- `getStatus`: Get current connection status
- `getAllStatuses`: Get all connection statuses
- `checkHealth`: Check if server is healthy

---

### IMCPClient

Native MCP protocol client for server communication.

```typescript
interface IMCPClient {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  ping(): Promise<boolean>;
  listTools(): Promise<Tool[]>;
  listResources(): Promise<Resource[]>;
  listPrompts(): Promise<Prompt[]>;
  callTool(name: string, args: any): Promise<any>;
  readResource(uri: string): Promise<any>;
}
```

**Methods:**
- `connect`: Establish connection to MCP server
- `disconnect`: Close connection to server
- `ping`: Check if server is responsive
- `listTools`: Get available tools from server
- `listResources`: Get available resources
- `listPrompts`: Get available prompts
- `callTool`: Execute a tool on the server
- `readResource`: Read a resource from the server

---

## Data Types

### Common Types

```typescript
type ConfigScope = 'global' | 'user' | 'local' | 'project';

interface MCPServer {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  type?: 'stdio' | 'http' | 'websocket';
  disabled?: boolean;
}

interface MCPConfig {
  mcpServers?: Record<string, MCPServer>;
  servers?: Record<string, MCPServer>;
  mcp_servers?: Record<string, any>;
  configPath?: string;
}

interface MCPClient {
  id: string;
  type: string;
  name: string;
  configPaths: {
    primary: string;
    secondary?: string;
  };
  status: 'active' | 'inactive' | 'unknown';
  isActive?: boolean;
  detectedAt: Date;
}

interface ValidationResult {
  valid: boolean;
  errors?: ValidationError[];
  warnings?: ValidationWarning[];
}

interface ServerMetrics {
  toolCount: number;
  resourceCount: number;
  promptCount: number;
  responseTime: number;
  lastChecked: Date;
  status: 'online' | 'offline' | 'error';
}

interface ConnectionStatus {
  connected: boolean;
  lastPing: Date;
  responseTime: number;
  error?: string;
  retryCount: number;
}

interface BackupEntry {
  id: string;
  clientId: string;
  timestamp: Date;
  path: string;
  size: number;
  configuration: MCPConfig;
}

interface CatalogServer {
  name: string;
  description?: string;
  author?: string;
  repository?: string;
  website?: string;
  category?: string;
  tags?: string[];
  npm?: string;
  github?: string;
  installed?: boolean;
  popularity?: number;
  lastUpdated?: Date;
}
```

---

## Dependency Injection Usage

All services are registered with the DI container and can be accessed via:

```typescript
import { container } from './container';

// Get typed service
const configManager = container.getConfigurationManager();
const clientDetector = container.getClientDetector();
const metricsService = container.getMetricsService();

// Or get by name
const service = container.get<IServiceType>('serviceName');
```

### Service Registration

Services are registered in `container.ts`:

```typescript
// Singleton services (one instance)
container.registerSingleton('configurationManager', () => new ConfigurationManager());
container.registerSingleton('metricsService', () => new MetricsService());

// Transient services (new instance each time)
container.registerTransient('mcpClient', () => new MCPClient());

// Instance registration (pre-created instance)
container.registerInstance('logger', logger);
```

---

## Testing with Contracts

Contracts enable easy mocking for unit tests:

```typescript
// Mock implementation
class MockConfigurationManager implements IConfigurationManager {
  async readConfiguration(clientId: string, scope?: string) {
    return { mcpServers: {} };
  }
  // ... other methods
}

// In tests
const mockManager = new MockConfigurationManager();
container.registerInstance('configurationManager', mockManager);
```

---

## Best Practices

1. **Program to interfaces, not implementations** - Always use interface types in your code
2. **Use dependency injection** - Get services from the container, don't import directly
3. **Keep interfaces focused** - Each interface should have a single responsibility
4. **Document contracts** - Keep this documentation updated when contracts change
5. **Version carefully** - Breaking interface changes require major version bumps

---

## Migration Guide

When refactoring existing code to use contracts:

1. Identify the service's responsibilities
2. Define the interface contract
3. Implement the interface in the service class
4. Register with the DI container
5. Update consumers to use the interface type
6. Add unit tests using mock implementations

Example:
```typescript
// Before
import { ConfigurationManager } from './services/ConfigurationManager';
const config = await ConfigurationManager.loadConfiguration(client);

// After
import { container } from './container';
const configManager = container.getConfigurationManager();
const config = await configManager.readConfiguration(client.id);
```

---

## Future Enhancements

- Add async disposal pattern for cleanup
- Implement service lifecycle hooks
- Add service health checks interface
- Create service factory interfaces
- Add event emitter contracts for reactive updates