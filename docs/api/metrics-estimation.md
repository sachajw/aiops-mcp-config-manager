# Metrics Estimation Documentation

## Token Usage Estimation

### Overview
The MCP (Model Context Protocol) doesn't provide direct token usage metrics from servers. To provide users with a relative measure of server activity and resource consumption, we implement an estimation formula.

### Estimation Formula

```typescript
tokenUsage = resourceCount * 100
```

### Explanation

- **resourceCount**: The number of resources exposed by an MCP server (files, databases, APIs, etc.)
- **100**: Estimated average tokens per resource interaction
- **tokenUsage**: The estimated total token consumption

### Why This Estimation?

1. **MCP Protocol Limitation**: The MCP protocol specification doesn't include token metrics in server responses
2. **User Feedback**: Users need some indication of relative server activity
3. **Reasonable Approximation**: Each resource interaction typically involves:
   - Resource description (~20 tokens)
   - Request/response metadata (~30 tokens)
   - Content preview/summary (~50 tokens)
   - Total: ~100 tokens per resource

### Examples

| Server Type | Resources | Estimated Tokens | Reasoning |
|------------|-----------|------------------|-----------|
| File System | 10 files | 1,000 | Each file access ~100 tokens |
| Database | 5 tables | 500 | Each table query ~100 tokens |
| API Gateway | 20 endpoints | 2,000 | Each API call ~100 tokens |
| Empty/Disconnected | 0 | 0 | No resources = no tokens |

### Important Notes

⚠️ **This is an ESTIMATION, not actual usage**
- Real token consumption depends on:
  - Actual content size
  - Query complexity
  - Response verbosity
  - Model behavior

### Implementation Location

The estimation is implemented in:
- `/src/main/services/MetricsService.ts` (line 53)
- Formula: `realMetrics.resourceCount * 100`

### Future Improvements

When MCP protocol adds token metrics support:
1. Replace estimation with actual metrics
2. Track historical token usage
3. Provide detailed breakdown by operation type
4. Show real-time token consumption

### Related Code

```typescript
// MetricsService.ts
public getServerMetrics(serverName: string): ServerMetrics {
  const realMetrics = connectionMonitor.getRealMetrics(serverName);
  if (realMetrics) {
    return {
      toolCount: realMetrics.toolCount,
      tokenUsage: realMetrics.resourceCount * 100, // ESTIMATED
      responseTime: realMetrics.responseTime,
      lastUpdated: realMetrics.lastActivity,
      isConnected: realMetrics.isConnected
    };
  }
  // ...
}
```

### Testing Considerations

When testing token metrics:
1. Mock `resourceCount` values to test estimation
2. Verify zero resources = zero tokens
3. Test edge cases (negative, null, undefined)
4. Ensure UI clearly indicates "estimated" values

### UI Display Guidelines

When displaying token metrics:
- Add "~" or "est." prefix to indicate estimation
- Use tooltips to explain the estimation
- Consider showing resource count alongside tokens
- Example: "~1,760 tokens (17 resources)"