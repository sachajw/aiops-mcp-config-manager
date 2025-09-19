# Mock Data Fix Plan

## Overview
This document identifies all mock/hardcoded data in the application and provides a prioritized plan to replace it with real functionality.

## Identified Mock Data Locations

### 1. Visual Workspace Component
**Location**: `src/renderer/components/VisualWorkspace/`

#### Mock Data Found:
```typescript
// index.tsx:70-71
tools: 15, // TODO: Get actual tool count
tokens: 2500 // TODO: Calculate actual tokens

// ServerLibrary.tsx:235-236
tools: 15,
tokens: 2500,
```

#### Fix Required:
- Implement actual tool count retrieval from MCP server manifests
- Track real token usage from LLM API calls
- **Priority**: HIGH - Core feature visibility

---

### 2. Insights Panel
**Location**: `src/renderer/components/VisualWorkspace/InsightsPanel.tsx`

#### Mock Data Found:
```typescript
// Lines 12-15
const totalTokens = Object.keys(servers).length * 2500; // Mock calculation
const activeConnections = Object.keys(servers).length;  // No real status check
const responseTime = 45; // Hardcoded response time
```

#### Fix Required:
- Implement real token tracking system
- Add actual connection health monitoring
- Measure real response times
- **Priority**: HIGH - User relies on these metrics

---

### 3. Server Library
**Location**: `src/renderer/components/VisualWorkspace/ServerLibrary.tsx`

#### Mock Data Found:
- Static server list with hardcoded categories
- Fake ratings (4.8, 4.9, etc.)
- Hardcoded installation counts
- Mock "Popular", "New" badges

#### Fix Required:
- Connect to actual MCP registry/catalog
- Implement real rating system
- Track actual installation statistics
- **Priority**: MEDIUM - Discovery feature enhancement

---

### 4. Discovery Installation
**Location**: `src/renderer/pages/Discovery/components/ServerDetailsModal.tsx`

#### Mock Data Found:
- `handleInstall` function doesn't actually install
- Installation progress is simulated
- Success/failure states are fake

#### Fix Required:
- Implement actual npm/pip/git installation
- Real progress tracking from package managers
- Actual error handling from installation failures
- **Priority**: HIGH - Core Discovery functionality

---

### 5. Connection Status
**Location**: Throughout Visual Workspace components

#### Mock Data Found:
- All connections show as "connected"
- No real health checks
- Cable animations don't reflect real data flow

#### Fix Required:
- Implement MCP server health checks
- Monitor actual data transmission
- Update visual indicators based on real status
- **Priority**: HIGH - Critical for troubleshooting

---

### 6. Server Testing
**Location**: `src/renderer/components/Simplified/ServerFormModal.tsx`

#### Mock Data Found:
- "Test Connection" partially implemented
- Some success/failure states are simulated

#### Fix Required:
- Complete real server connection testing
- Actual command execution validation
- Real timeout handling
- **Priority**: HIGH - Essential for configuration

---

## Implementation Priority Plan

### Phase 1: Critical Backend Reality (Week 1-2)
**Focus**: Make existing UI features functional

1. **Task 56: Real Server Testing**
   - Implement actual MCP server connection testing
   - Validate commands can execute
   - Check environment variables
   - Estimated: 3 days

2. **Task 52: Real Connection Monitoring**
   - Create health check service
   - Monitor actual server processes
   - Update Visual Workspace status in real-time
   - Estimated: 3 days

3. **Task 59: Real Configuration Validation**
   - Validate command paths exist
   - Check file permissions
   - Verify environment variables
   - Estimated: 2 days

### Phase 2: Metrics and Analytics (Week 3)
**Focus**: Replace mock metrics with real data

4. **Task 50: Real Metrics Collection**
   - Implement token usage tracking
   - Count actual tools from server manifests
   - Track real response times
   - Estimated: 4 days

5. **Task 55: Performance Metrics**
   - Monitor CPU/memory usage
   - Track API call counts
   - Build metrics aggregation
   - Estimated: 3 days

### Phase 3: Discovery Reality (Week 4)
**Focus**: Make Discovery functional

6. **Task 53: Real Server Installation**
   - Implement npm package installation
   - Add git clone functionality
   - Handle Python pip installs
   - Estimated: 5 days

7. **Task 58: Connect to Real Registries**
   - Integrate with MCP registry API
   - Parse real catalog data
   - Implement real search
   - Estimated: 3 days

### Phase 4: Advanced Features (Week 5-6)
**Focus**: Complete remaining mock replacements

8. **Task 51: Real Server Library**
   - Populate from actual discovered servers
   - Implement real categorization
   - Add availability checking
   - Estimated: 3 days

9. **Task 57: Real Drag-and-Drop**
   - Make drag-drop actually modify configs
   - Persist canvas positions
   - Handle validation on drop
   - Estimated: 3 days

10. **Task 60-64: Remaining Backend Tasks**
    - Backup/restore functionality
    - Client detection
    - Scope resolution
    - Bulk operations
    - Estimated: 5 days

---

## Technical Implementation Details

### 1. Token Tracking System
```typescript
interface TokenTracker {
  trackUsage(serverId: string, tokens: number): void;
  getUsage(serverId: string, timeRange?: TimeRange): TokenUsage;
  subscribeToUpdates(callback: (usage: TokenUsage) => void): void;
}
```

### 2. Connection Monitor Service
```typescript
interface ConnectionMonitor {
  checkHealth(serverId: string): Promise<HealthStatus>;
  subscribeToStatus(serverId: string, callback: (status: Status) => void): void;
  getLatency(serverId: string): number;
}
```

### 3. Installation Service
```typescript
interface ServerInstaller {
  installNpm(packageName: string): Promise<void>;
  installGit(repoUrl: string): Promise<void>;
  installPip(packageName: string): Promise<void>;
  trackProgress(callback: (progress: Progress) => void): void;
}
```

### 4. Metrics Collector
```typescript
interface MetricsCollector {
  collectServerMetrics(serverId: string): ServerMetrics;
  aggregateMetrics(timeRange: TimeRange): AggregatedMetrics;
  exportMetrics(format: 'json' | 'csv'): string;
}
```

---

## Testing Requirements

### Unit Tests Needed
- Token tracking accuracy
- Connection health detection
- Installation success/failure paths
- Metrics calculation correctness

### Integration Tests Needed
- Full server installation flow
- Real-time status updates
- Configuration validation with file system
- Drag-drop to configuration changes

### E2E Tests Needed
- Complete Discovery installation workflow
- Visual Workspace with real servers
- Metrics dashboard accuracy
- Server testing functionality

---

## Success Criteria

### Definition of "Real"
1. **No hardcoded values** - All numbers come from actual measurements
2. **Live updates** - UI reflects current state within 5 seconds
3. **Accurate status** - Connection states match actual server status
4. **Functional actions** - Buttons do what they claim
5. **Error handling** - Real errors shown, not simulated

### Acceptance Criteria
- [ ] Token counts update when servers are used
- [ ] Connection status reflects actual health
- [ ] Install button actually installs servers
- [ ] Test connection performs real tests
- [ ] Metrics show actual performance data
- [ ] Drag-drop modifies real configurations

---

## Risk Mitigation

### Performance Impact
- **Risk**: Real-time monitoring affects performance
- **Mitigation**: Use sampling, debouncing, and worker threads

### Installation Failures
- **Risk**: Package installation fails silently
- **Mitigation**: Comprehensive error handling and rollback

### Data Accuracy
- **Risk**: Metrics drift from reality
- **Mitigation**: Periodic reconciliation and validation

---

## Timeline Summary

- **Week 1-2**: Critical backend (Tasks 56, 52, 59)
- **Week 3**: Metrics implementation (Tasks 50, 55)
- **Week 4**: Discovery functionality (Tasks 53, 58)
- **Week 5-6**: Complete remaining (Tasks 51, 57, 60-64)

**Total Estimated Time**: 6 weeks for full mock data replacement

---

## Next Steps

1. Start with Task 56 (Real Server Testing) - Most immediate user value
2. Set up metrics infrastructure early for other features to use
3. Create shared services for common functionality
4. Implement comprehensive error handling from the start
5. Add tests as each mock is replaced with real functionality