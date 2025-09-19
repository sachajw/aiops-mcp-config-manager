# MCP Protocol Implementation

## Overview

MCP Configuration Manager now includes a complete native implementation of the Model Context Protocol (MCP), enabling real-time communication with MCP servers without requiring mock data or simulations.

## Architecture

### Core Components

#### MCPClient (`src/main/services/MCPClient.ts`)
The heart of our MCP implementation, handling:
- **Process Management**: Spawns actual server processes using Node.js child_process
- **JSON-RPC Communication**: Full protocol implementation with request/response handling
- **Connection Lifecycle**: Initialize, connect, disconnect with proper cleanup
- **Error Recovery**: Automatic reconnection with exponential backoff

```typescript
// Example usage
const client = new MCPClient({
  name: 'filesystem-server',
  command: 'npx',
  args: ['@modelcontextprotocol/server-filesystem'],
  env: { /* environment variables */ }
});

await client.connect();
const tools = await client.getTools();
const metrics = client.getMetrics();
```

#### ConnectionMonitor (`src/main/services/ConnectionMonitor.ts`)
Manages multiple MCP client connections:
- **Health Monitoring**: Regular ping checks to verify server responsiveness
- **Status Tracking**: Real-time connection state for each server
- **Metrics Collection**: Response times, error counts, tool/resource counts
- **Auto-Recovery**: Automatic reconnection on connection loss

#### MetricsService (`src/main/services/MetricsService.ts`)
Collects and aggregates performance data:
- **Tool Metrics**: Count of available tools per server
- **Resource Metrics**: Available resources and their types
- **Performance Data**: Response times, latency measurements
- **Connection Health**: Uptime, error rates, reconnection attempts

### Protocol Implementation

#### Message Format
All communication uses JSON-RPC 2.0 over stdio:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": {},
      "resources": {},
      "prompts": {}
    },
    "clientInfo": {
      "name": "mcp-config-manager",
      "version": "0.1.5"
    }
  }
}
```

#### Supported Methods
- `initialize`: Protocol handshake and capability negotiation
- `tools/list`: Retrieve available tools from server
- `resources/list`: Get available resources
- `prompts/list`: Fetch available prompts
- Custom server methods as defined by each MCP server

### IPC Communication

The main process communicates with the renderer using Electron IPC:

```typescript
// Main process handler
ipcMain.handle('mcp:connect', async (event, serverId, config) => {
  const client = new MCPClient(config);
  await client.connect();
  return client.getMetrics();
});

// Renderer process call
const metrics = await window.electronAPI.mcpConnect(serverId, config);
```

## Real-Time Features

### Live Connection Status
- Green: Connected and responding
- Yellow: Degraded performance or high latency
- Red: Disconnected or unresponsive
- Gray: Never connected

### Dynamic Metrics
- **Tool Count**: Real number of tools exposed by the server
- **Response Time**: Actual round-trip time for requests
- **Error Rate**: Percentage of failed requests
- **Last Activity**: Timestamp of last successful communication

### Auto-Reconnection
When a server disconnects unexpectedly:
1. Immediate detection via process exit event
2. Exponential backoff retry (1s, 2s, 4s, up to 3 attempts)
3. Notification to UI of connection state changes
4. Automatic re-initialization on successful reconnect

## Server Catalog Integration

The `ServerCatalogService` provides access to 100+ MCP servers:

### Categories
- **Core**: Essential MCP servers (filesystem, search)
- **Data**: Database connections (PostgreSQL, MongoDB, Redis)
- **Web**: Web services (GitHub, Slack, AWS)
- **AI**: AI service integrations (OpenAI, Anthropic)
- **Tools**: Development tools (Python, Node.js, Docker)
- **Community**: Community-contributed servers

### Installation Detection
Automatically checks if servers are installed:
- Global npm packages
- Local node_modules
- System PATH binaries

## Testing the Implementation

### Manual Testing
1. Start the application: `npm run electron:dev`
2. Navigate to Visual Workspace
3. Drag a server from the library
4. Observe real-time connection status
5. Check Insights panel for live metrics

### Automated Testing
```bash
# Unit tests for MCP components
npm test -- MCPClient
npm test -- ConnectionMonitor
npm test -- MetricsService

# Integration tests
npm run test:e2e
```

### Test Servers
For testing without real MCP servers:
```bash
# Echo server (simple test)
echo '{"jsonrpc":"2.0","id":1,"result":{"tools":[]}}'

# Mock MCP server
node test/mock-mcp-server.js
```

## Performance Considerations

### Resource Management
- Maximum 10 concurrent server connections
- 30-second timeout for unresponsive servers
- Automatic cleanup of zombie processes
- Memory-efficient message buffering

### Optimization Strategies
- Connection pooling for frequently used servers
- Lazy loading of server capabilities
- Caching of static server information
- Debounced metric updates to UI

## Security

### Process Isolation
- Each MCP server runs in a separate child process
- No shared memory between server processes
- Controlled environment variable exposure
- Sandboxed file system access

### Communication Security
- Validated JSON-RPC messages
- Sanitized server commands and arguments
- No direct shell command execution
- Encrypted IPC between main and renderer

## Troubleshooting

### Common Issues

1. **Server Won't Connect**
   - Check server is installed: `npx [server-name] --version`
   - Verify PATH environment variable
   - Check server permissions

2. **High Latency**
   - Server may be performing heavy computation
   - Network issues for remote servers
   - Check system resource usage

3. **Frequent Disconnections**
   - Server crash - check server logs
   - Memory limits exceeded
   - Incompatible protocol version

### Debug Mode
Enable debug logging:
```bash
DEBUG=mcp:* npm run electron:dev
```

### Log Files
Logs are stored in:
- macOS: `~/Library/Logs/mcp-config-manager/`
- Windows: `%APPDATA%\mcp-config-manager\logs\`
- Linux: `~/.config/mcp-config-manager/logs/`

## Future Enhancements

### Planned Features
- WebSocket transport support
- Server marketplace integration
- Custom server templates
- Performance profiling tools
- Server dependency management

### Protocol Extensions
- Batch request support
- Streaming responses
- Binary data transfer
- Compression for large payloads

## API Reference

### MCPClient Methods

```typescript
class MCPClient {
  // Connection management
  async connect(): Promise<void>
  async disconnect(): Promise<void>
  isConnected(): boolean

  // Server interaction
  async getTools(): Promise<MCPTool[]>
  async getResources(): Promise<MCPResource[]>
  async ping(): Promise<number>

  // Metrics
  getMetrics(): MCPClientMetrics

  // Events
  on('connected', () => void)
  on('disconnected', (reason) => void)
  on('error', (error) => void)
  on('notification', (message) => void)
}
```

### Types

```typescript
interface MCPServerConfig {
  name: string
  command: string
  args?: string[]
  env?: Record<string, string>
  cwd?: string
}

interface MCPClientMetrics {
  toolCount: number
  resourceCount: number
  responseTime: number
  lastActivity: Date
  errorCount: number
  isConnected: boolean
  serverInfo?: MCPServerInfo
}

interface MCPTool {
  name: string
  description: string
  inputSchema: any
}

interface MCPResource {
  uri: string
  name: string
  description?: string
  mimeType?: string
}
```

## Contributing

To add support for new MCP servers:

1. Add server definition to `ServerCatalogService`
2. Test connection with `MCPClient`
3. Add integration tests
4. Update documentation
5. Submit pull request

## License

MIT - See LICENSE file for details