# Backend Services Context

## Active Tasks
- Task 125: Convert static services to instance-based
- Task 126: Document service contracts

## Service Refactoring Plan

### Static → Instance Conversion
```typescript
// OLD (static)
export class MetricsService {
  private static cache = new Map();
  static async getMetrics() { ... }
}

// NEW (instance-based)
export class MetricsService {
  constructor(private cache: Map<string, Metrics>) {}
  async getMetrics() { ... }
}

// With dependency injection
container.register<MetricsService>('MetricsService', {
  useClass: MetricsService,
  singleton: true
});
```

## Key Services to Refactor
1. `src/main/services/MetricsService.ts`
2. `src/main/services/ServerCatalogService.ts`
3. `src/main/services/McpDiscoveryService.ts`

## IPC Handlers
- `src/main/ipc/handlers.ts` - Update to use injected services

## Commands
```bash
npm run type-check  # Validate types
npm test -- services  # Test services
```