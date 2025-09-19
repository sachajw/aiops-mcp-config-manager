# Backend Reality Requirements

## Overview

This document outlines the requirements for ensuring all UI elements display real, functional data rather than mock or hardcoded values. Each UI component must be backed by actual backend functionality.

## Critical Gap Analysis

### 1. Visual Workspace Backend

#### Current State (Mock)
```typescript
// Current hardcoded data in VisualWorkspace/index.tsx
data: {
  tools: 15,        // Hardcoded
  tokens: 2500      // Hardcoded
}
```

#### Required Implementation
- **Real-time metrics collection service**
  - Connect to MCP server stdio/websocket
  - Parse server manifests for actual tool counts
  - Track token usage from actual LLM calls
  - Monitor actual connection health

### 2. Server Library Backend

#### Current State (Mock)
```typescript
// Hardcoded categories and servers
const categories = {
  'Development': ['git-mcp', 'github-mcp', ...],  // Static list
  'AI Tools': ['claude-mcp', ...],                 // Not discovered
}
```

#### Required Implementation
- **Dynamic server discovery**
  - Scan npm registry for @mcp/* packages
  - Parse package.json for categorization
  - Check local installations
  - Query MCP registry API

### 3. Discovery Installation Backend

#### Current State (Mock)
```typescript
// Install button does nothing
const handleInstall = () => {
  setInstalling(true);  // Just UI state
  // No actual installation
}
```

#### Required Implementation
- **Package installation service**
  ```typescript
  interface InstallationService {
    installNpmPackage(name: string): Promise<void>
    cloneGitRepository(url: string): Promise<void>
    installPythonPackage(name: string): Promise<void>
    trackProgress(): Observable<InstallProgress>
  }
  ```

### 4. Insights Panel Backend

#### Current State (Mock)
```typescript
// All metrics are fake
const metrics = {
  tokenUsage: 2500,      // Hardcoded
  activeTools: 15,       // Hardcoded
  responseTime: '120ms'  // Hardcoded
}
```

#### Required Implementation
- **Metrics collection pipeline**
  - Instrument MCP server calls
  - Measure actual latency
  - Count real API invocations
  - Store time-series data

## Technical Requirements

### 1. IPC Communication Layer

```typescript
// Main process service
interface MCPServerMonitor {
  // Real server status
  getServerStatus(serverId: string): Promise<ServerStatus>

  // Real metrics
  getServerMetrics(serverId: string): Promise<ServerMetrics>

  // Real connection testing
  testConnection(config: MCPServerConfig): Promise<TestResult>
}

// Renderer process hooks
const useServerStatus = (serverId: string) => {
  // Subscribe to real-time updates
  return useSubscription('server:status', serverId)
}
```

### 2. Data Collection Infrastructure

```typescript
interface MetricsCollector {
  // Token tracking
  trackTokenUsage(serverId: string, tokens: number): void

  // Tool invocation tracking
  trackToolCall(serverId: string, tool: string): void

  // Performance tracking
  trackLatency(serverId: string, ms: number): void

  // Aggregation
  getAggregatedMetrics(timeRange: TimeRange): AggregatedMetrics
}
```

### 3. Server Installation Engine

```typescript
interface ServerInstaller {
  // Discovery
  discoverAvailableServers(): Promise<ServerCatalog>

  // Installation
  install(server: ServerDefinition): Promise<void>

  // Progress tracking
  onProgress(callback: (progress: Progress) => void): void

  // Validation
  validateInstallation(serverId: string): Promise<boolean>
}
```

### 4. Configuration State Management

```typescript
interface ConfigurationEngine {
  // Real file operations
  enableServer(clientId: string, serverId: string): Promise<void>
  disableServer(clientId: string, serverId: string): Promise<void>

  // Real drag-and-drop
  addServerFromDrop(clientId: string, server: ServerConfig): Promise<void>

  // Real validation
  validateConfiguration(config: Configuration): ValidationResult
}
```

## Implementation Priority

### Phase 1: Core Reality (Critical)
1. **Task 52**: Real connection monitoring
2. **Task 56**: Real server testing
3. **Task 59**: Real configuration validation
4. **Task 61**: Real client detection

### Phase 2: Metrics Reality (High)
5. **Task 50**: Real metrics collection
6. **Task 55**: Real performance tracking
7. **Task 51**: Real server library data

### Phase 3: Operations Reality (Medium)
8. **Task 53**: Real server installation
9. **Task 54**: Real enable/disable
10. **Task 57**: Real drag-and-drop
11. **Task 60**: Real backup/restore

### Phase 4: Advanced Reality (Lower)
12. **Task 58**: Real Discovery API
13. **Task 62**: Real scope resolution
14. **Task 63**: Real export/import
15. **Task 64**: Real bulk operations

## Success Criteria

### Must Have (MVP)
- [ ] No hardcoded server lists
- [ ] No fake metrics/numbers
- [ ] Real connection status
- [ ] Real configuration changes
- [ ] Real server testing

### Should Have (v1.0)
- [ ] Real-time metrics
- [ ] Actual installation
- [ ] Performance tracking
- [ ] Progress indicators

### Nice to Have (v2.0)
- [ ] Historical metrics
- [ ] Predictive analytics
- [ ] Auto-optimization
- [ ] ML-based recommendations

## Testing Requirements

### Unit Tests
```typescript
describe('ServerMetricsCollector', () => {
  it('should collect real token usage from MCP server', async () => {
    const metrics = await collector.getTokenUsage('github-mcp')
    expect(metrics.tokens).toBeGreaterThan(0)
    expect(metrics.tokens).not.toBe(2500) // Not hardcoded
  })
})
```

### Integration Tests
```typescript
describe('Visual Workspace Reality', () => {
  it('should display real server metrics', async () => {
    const workspace = await renderVisualWorkspace()
    const serverNode = workspace.getServerNode('github-mcp')

    // Verify real data
    expect(serverNode.tools).toBe(await getActualToolCount('github-mcp'))
    expect(serverNode.status).toBe(await getActualStatus('github-mcp'))
  })
})
```

### E2E Tests
```typescript
describe('Discovery Installation', () => {
  it('should actually install a server', async () => {
    await page.click('[data-testid="install-github-mcp"]')
    await page.waitForSelector('[data-testid="installation-complete"]')

    // Verify actual installation
    const installed = await fs.exists('~/.mcp/servers/github-mcp')
    expect(installed).toBe(true)
  })
})
```

## Architecture Decisions

### 1. Metrics Storage
- Use SQLite for local metrics storage
- Time-series data with 1-minute granularity
- 30-day retention for detailed metrics
- Aggregated monthly summaries kept indefinitely

### 2. Server Communication
- Use stdio for local MCP servers
- WebSocket for remote servers
- IPC bridge between main and renderer
- Event-based updates via EventEmitter

### 3. Installation Management
- Use npm programmatically for Node packages
- Git clone for GitHub repositories
- Python subprocess for pip packages
- Unified progress tracking via RxJS

### 4. State Synchronization
- Single source of truth in main process
- Renderer subscribes to state changes
- Optimistic updates with rollback
- Conflict resolution via timestamps

## Risks and Mitigations

### Risk 1: Performance Impact
**Risk**: Real-time monitoring impacts app performance
**Mitigation**:
- Sampling instead of full monitoring
- Background workers for heavy operations
- Debounced updates to UI

### Risk 2: Installation Failures
**Risk**: Server installation fails silently
**Mitigation**:
- Comprehensive error handling
- Rollback mechanism
- Clear error messages
- Retry logic with exponential backoff

### Risk 3: Data Accuracy
**Risk**: Metrics drift from reality over time
**Mitigation**:
- Periodic full reconciliation
- Checksum validation
- Audit logging
- Self-healing mechanisms

## Documentation Requirements

### API Documentation
- Document all IPC channels
- Document metrics schema
- Document installation protocols
- Document error codes

### User Documentation
- Explain what metrics mean
- Troubleshooting guide
- Performance tuning guide
- FAQ for common issues

## Acceptance Criteria

### For Each Mock Data Point
1. Identify the mock value
2. Implement real data source
3. Remove hardcoded value
4. Add unit test
5. Add integration test
6. Update documentation
7. Verify in production build

### Definition of Done
- [ ] No hardcoded values in codebase
- [ ] All metrics from real sources
- [ ] Tests verify real data
- [ ] Documentation updated
- [ ] Performance acceptable
- [ ] Error handling complete
- [ ] User feedback clear

## Timeline Estimate

### Phase 1 (2 weeks)
- Core reality implementation
- Basic metrics collection
- Real connection status

### Phase 2 (2 weeks)
- Full metrics pipeline
- Server installation
- Drag-and-drop reality

### Phase 3 (1 week)
- Testing and validation
- Performance optimization
- Documentation

### Phase 4 (1 week)
- Bug fixes
- Polish
- Release preparation

**Total: 6 weeks for full backend reality implementation**