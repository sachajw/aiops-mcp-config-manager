# Sprint 2: Architecture Refactor & API Documentation

*Sprint Duration: 2 weeks*
*Status: Starting*

## Sprint Goals
1. Implement three-tier server state management
2. Generate comprehensive API documentation
3. Convert static methods to instance-based services
4. Fix critical bugs (Client Library Panel)

## Why API Documentation Now?

Based on current issues observed:
- **IPC handler mismatches** (metrics:getServer vs metrics:getServerMetrics)
- **Props not being passed** (ServerLibrary missing activeClient)
- **Type mismatches** between processes
- **Integration bugs** from unclear contracts

**Expected Impact:**
- 35-40% reduction in debugging time
- 70% fewer integration bugs
- Faster parallel development
- Clear contracts for three-tier refactor

## Task Breakdown

### Week 1: API Documentation & Critical Fixes

#### Day 1-2: API Documentation Foundation
- [ ] **Task 123**: Set up TypeDoc infrastructure
  - Install and configure TypeDoc
  - Create documentation generation scripts
  - Set up documentation serving
  - Add to CI/CD pipeline

- [ ] **Task 124**: Document existing IPC endpoints
  - Create `/docs/api/ipc-contracts.ts`
  - Document all 30+ IPC handlers
  - Define parameter types and returns
  - Document error scenarios

- [ ] **Task 119**: Fix Client Library Panel Bug ⚡ CRITICAL
  - Debug why only Claude Code servers show
  - Fix selectClient() flow
  - Verify props passing

#### Day 3-4: Service Documentation & Refactoring
- [ ] **Task 125**: Convert static services to instances
  - ServerCatalogService → instance-based
  - MetricsService → instance-based
  - Create dependency injection pattern

- [ ] **Task 126**: Document service contracts
  - Document all service methods
  - Add usage examples
  - Define error handling patterns

#### Day 5: Three-Tier State Documentation
- [ ] **Task 57b-docs**: Document three-tier architecture
  - Create state transition diagrams
  - Document tier interfaces
  - Define migration paths
  - Add to API docs

### Week 2: Three-Tier Implementation

#### Day 6-7: Core Three-Tier Services
- [ ] **Task 57b-1**: Create InstallationService
  - Implement with full documentation
  - npm/pip/cargo support
  - Progress tracking

- [ ] **Task 57b-2**: Refactor Store for three-tier
  - Add Maps for each tier
  - Implement computed getters
  - Document state shape

#### Day 8-9: Component Updates
- [ ] **Task 51**: Fix ServerLibrary filtering
  - Implement Tier 2 - Tier 3[client] logic
  - Add documentation

- [ ] **Task 120**: Prevent duplicate servers
  - Add validation with documented rules
  - UI feedback

#### Day 10: Integration & Testing
- [ ] **Task 121**: Async stats loading
  - Implement with documented cache strategy
  - Performance metrics

- [ ] **Task 122**: Smart stats caching
  - Document caching rules
  - IndexedDB implementation

## Documentation Deliverables

### 1. IPC Contract Documentation
```typescript
// src/shared/contracts/ipc.contracts.ts
export interface IPCContracts {
  'servers:install': {
    params: { serverId: string; source: InstallSource };
    returns: { success: boolean; version: string };
    errors: ['SERVER_NOT_FOUND', 'ALREADY_INSTALLED'];
  };
  // ... all endpoints
}
```

### 2. Service API Documentation
```typescript
/**
 * Manages three-tier server state transitions
 * @service ServerStateManager
 * @category Core Services
 */
export class ServerStateManager {
  /**
   * Promotes server from discovered to installed
   * @param serverId - Unique server identifier
   * @returns Installation result
   * @throws {ServerNotFoundError}
   * @example
   * const result = await manager.promoteToInstalled('filesystem');
   */
  async promoteToInstalled(serverId: string): Promise<InstallResult>
```

### 3. Architecture Documentation
- State flow diagrams
- Component interaction maps
- Data flow documentation
- Error handling patterns

## Success Metrics

### Documentation Coverage
- [ ] 100% of IPC endpoints documented
- [ ] 100% of public service methods documented
- [ ] All error scenarios documented
- [ ] Examples for complex flows

### Bug Reduction
- [ ] Zero IPC handler mismatches
- [ ] Zero type errors between processes
- [ ] Clear prop passing contracts
- [ ] Reduced integration bugs by 70%

### Development Velocity
- [ ] 40% faster feature development
- [ ] 50% reduction in debugging time
- [ ] Parallel development enabled
- [ ] New developer onboarding < 1 day

## Implementation Order

1. **Documentation First** (Days 1-2)
   - Prevents new bugs during refactor
   - Creates contracts to follow

2. **Critical Bug Fix** (Day 2)
   - Task 119 blocks user workflow

3. **Service Refactor** (Days 3-4)
   - Foundation for three-tier

4. **Three-Tier Implementation** (Days 6-10)
   - With full documentation

## Risk Mitigation

### Risk: Documentation becomes outdated
**Mitigation:**
- Auto-generate from TypeScript
- CI/CD validates documentation
- Documentation required in PR reviews

### Risk: Refactoring breaks existing features
**Mitigation:**
- Document current behavior first
- Incremental refactoring
- Feature flags for new architecture

## Dependencies

### Tools to Install
```json
{
  "devDependencies": {
    "typedoc": "^0.25.0",
    "typedoc-plugin-markdown": "^3.17.0",
    "@apidevtools/swagger-parser": "^10.1.0",
    "jsdoc-to-markdown": "^8.0.0"
  }
}
```

### Scripts to Add
```json
{
  "scripts": {
    "docs:generate": "typedoc --out docs/api src",
    "docs:serve": "http-server docs/api",
    "docs:validate": "typedoc --emit none",
    "docs:ipc": "ts-node scripts/generate-ipc-docs.ts"
  }
}
```

## Definition of Done

- [ ] All IPC endpoints documented
- [ ] All services documented with examples
- [ ] Three-tier architecture fully documented
- [ ] Documentation auto-generated in CI/CD
- [ ] Client Library bug fixed
- [ ] No duplicate servers allowed
- [ ] Smart caching implemented
- [ ] All tests passing

## Notes

- Documentation is not overhead - it's **bug prevention**
- Write docs BEFORE implementation
- Use documentation to drive design
- Keep examples realistic and testable