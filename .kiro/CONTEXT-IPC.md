# IPC Context

## Common IPC Issues to Avoid
- Handler name mismatches (e.g., `metrics:getServer` vs `metrics:getServerMetrics`)
- Missing await on async handlers
- Type mismatches between main and renderer

## IPC Handler Patterns

### Correct Pattern
```typescript
// Main process handler
ipcMain.handle('metrics:getServerMetrics', async (event, serverId: string) => {
  return await metricsService.getMetrics(serverId);
});

// Renderer process call
const metrics = await window.electron.invoke('metrics:getServerMetrics', serverId);
```

## Key Files
- `src/main/ipc/handlers.ts` - All IPC handlers
- `src/preload/index.ts` - Exposed API
- `/docs/api/ipc-contracts.md` - Documentation (create if missing)

## Current IPC Prefixes
- `config:` - Configuration operations
- `clients:` - Client discovery
- `server:` - Server operations
- `metrics:` - Metrics collection
- `catalog:` - Server catalog
- `connection:` - Connection monitoring
- `mcp:` - MCP protocol operations

## Testing IPC
```bash
npm run electron:dev
# Open DevTools Console
# Test: await window.electron.invoke('clients:discover')
```