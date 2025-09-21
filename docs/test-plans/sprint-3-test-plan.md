# Sprint 3 Test Plan: Production-Ready Server Management

## Sprint Goal
**"Production-ready with reliable server management"**

## Definition of Done Criteria
- ✅ All server lifecycle operations work (install/test/enable/disable/uninstall)
- ✅ Configuration validation prevents invalid setups
- ✅ Backup/restore provides safety net
- ✅ UI is polished with no known bugs
- ✅ Test coverage meets targets (80% for services, 70% for components)
- ✅ Documentation is complete

---

## Test Coverage Targets

### Module-Specific Coverage Requirements

| Module | Current Coverage | Target Coverage | Priority |
|--------|-----------------|-----------------|----------|
| **Services** | | | |
| ServerTester | 0% | 85% | P0 - Critical |
| ConfigurationService | 15% | 80% | P0 - Critical |
| BackupManager | 0% | 85% | P0 - Critical |
| ValidationEngine | 10% | 90% | P0 - Critical |
| InstallationService | 60% | 85% | P1 - High |
| UnifiedConfigService | 5% | 80% | P1 - High |
| **Components** | | | |
| ServerManagementPanel | 0% | 75% | P0 - Critical |
| ConfigurationEditor | 0% | 70% | P1 - High |
| BackupDialog | 0% | 70% | P1 - High |
| ServerCard | 0% | 70% | P2 - Medium |
| ValidationErrorDisplay | 0% | 65% | P2 - Medium |
| **IPC Handlers** | | | |
| ServerHandler | 20% | 85% | P0 - Critical |
| ConfigHandler | 30% | 85% | P0 - Critical |
| SystemHandler (backup) | 10% | 80% | P1 - High |

---

## Feature Test Scenarios

### 1. Server Testing Functionality (Task 56) - P0

#### Unit Tests
```typescript
// ServerTester.test.ts
- ✅ Test connection to valid server
- ✅ Handle connection timeout (5s limit)
- ✅ Validate server manifest structure
- ✅ Check tool/resource availability
- ✅ Handle authentication failures
- ✅ Test with different transport types (stdio, http, websocket)
- ✅ Concurrent server testing (max 3)
- ✅ Retry logic (3 attempts)
```

#### Integration Tests
```typescript
// ServerTestingFlow.integration.test.ts
- ✅ User clicks "Test Connection" → Shows loading → Success/Failure feedback
- ✅ Test all server types (npm, pip, git, manual)
- ✅ Test with real MCP servers (filesystem, github, etc.)
- ✅ Batch testing multiple servers
- ✅ Cancel ongoing test
```

#### E2E Tests
```typescript
// server-testing.e2e.test.ts
Scenario: Test Server Before Enabling
  Given: User has installed 'filesystem' server
  When: User clicks "Test Connection"
  Then: Loading spinner appears
  And: Connection status shows "Connected"
  And: Tool count is displayed (>0)
  And: "Enable" button becomes active

Scenario: Handle Test Failure
  Given: Server with invalid configuration
  When: User clicks "Test Connection"
  Then: Error message appears with specific issue
  And: Suggested fixes are displayed
  And: "Enable" button remains disabled
```

### 2. Enable/Disable Servers (Task 54) - P0

#### Unit Tests
```typescript
// ConfigurationService.test.ts
- ✅ Enable server adds to configuration
- ✅ Disable server removes from configuration
- ✅ Prevent enabling duplicate servers
- ✅ Handle concurrent enable/disable operations
- ✅ Validate server config before enabling
- ✅ Update configuredClients array correctly
```

#### Integration Tests
```typescript
// EnableDisableFlow.integration.test.ts
- ✅ Enable server → Config file updated → UI reflects change
- ✅ Disable server → Config cleaned → Server available in library
- ✅ Bulk enable multiple servers
- ✅ Disable all servers for client
- ✅ Toggle server state rapidly (stress test)
```

#### E2E Tests
```typescript
// enable-disable.e2e.test.ts
Scenario: Enable Server for Client
  Given: Server "github" is installed but not enabled
  When: User drags server to Claude Desktop
  Then: Server appears in client's configuration
  And: Server is removed from available list
  And: Config file is updated immediately
  And: Backup is created automatically

Scenario: Disable Server from Client
  Given: Claude Desktop has "filesystem" server enabled
  When: User clicks disable button on server card
  Then: Confirmation dialog appears
  And: Server is removed from configuration
  And: Server returns to available library
```

### 3. Uninstall UI (Task 118) - P1

#### Component Tests
```typescript
// UninstallDialog.test.tsx
- ✅ Show confirmation with server details
- ✅ List affected clients before uninstall
- ✅ Disable uninstall if server in use
- ✅ Show progress during uninstallation
- ✅ Handle uninstall errors gracefully
- ✅ Update UI after successful uninstall
```

#### Integration Tests
```typescript
// UninstallFlow.integration.test.ts
- ✅ Check dependencies before uninstall
- ✅ Remove from all client configs
- ✅ Clean up installation directory
- ✅ Update installed servers list
- ✅ Rollback on failure
```

### 4. Configuration Validation (Task 59) - P0

#### Unit Tests
```typescript
// ValidationEngine.test.ts
- ✅ Validate required fields (command)
- ✅ Check command existence and executability
- ✅ Validate environment variables
- ✅ Check port availability for HTTP servers
- ✅ Validate file paths exist
- ✅ Check duplicate server names
- ✅ Validate JSON schema compliance
- ✅ Check circular dependencies
```

#### Integration Tests
```typescript
// ValidationFlow.integration.test.ts
- ✅ Real-time validation as user types
- ✅ Prevent saving invalid configuration
- ✅ Show specific validation errors
- ✅ Suggest fixes for common issues
- ✅ Validate on import from file
```

#### E2E Tests
```typescript
// validation.e2e.test.ts
Scenario: Prevent Invalid Configuration
  Given: User editing server configuration
  When: User enters invalid command path
  Then: Red error indicator appears immediately
  And: Specific error message is shown
  And: Save button is disabled
  And: Suggested fix is displayed

Scenario: Fix Validation Errors
  Given: Configuration with validation errors
  When: User clicks "Auto-fix" button
  Then: Fixable issues are resolved
  And: User is prompted for unfixable issues
  And: Configuration becomes valid
```

### 5. Backup/Restore (Task 60) - P0

#### Unit Tests
```typescript
// BackupManager.test.ts
- ✅ Create timestamped backup
- ✅ Compress backup files
- ✅ Store metadata (date, client, scope)
- ✅ List all backups chronologically
- ✅ Restore specific backup
- ✅ Delete old backups (>30 days)
- ✅ Automatic backup before changes
- ✅ Handle corrupted backup files
```

#### Integration Tests
```typescript
// BackupRestore.integration.test.ts
- ✅ Auto-backup on configuration change
- ✅ Restore to previous state
- ✅ Selective restore (specific client)
- ✅ Backup/restore across scopes
- ✅ Migrate backups to new format
```

#### E2E Tests
```typescript
// backup-restore.e2e.test.ts
Scenario: Automatic Backup
  Given: User has working configuration
  When: User makes any change
  Then: Backup is created silently
  And: Backup appears in history
  And: Maximum 10 backups retained

Scenario: Restore from Backup
  Given: User accidentally broke configuration
  When: User selects backup from 1 hour ago
  Then: Preview shows differences
  And: User confirms restore
  And: Configuration is restored
  And: All servers work as before
```

### 6. UI Polish (Tasks 117, 131) - P1

#### Visual Regression Tests
```typescript
// ui-polish.visual.test.ts
- ✅ Server cards consistent height
- ✅ Loading states smooth animations
- ✅ Error states clearly visible
- ✅ Success feedback appropriate
- ✅ Dark/light theme consistency
- ✅ Responsive layout (1024px - 4K)
- ✅ Accessibility (WCAG 2.1 AA)
```

#### Performance Tests
```typescript
// performance.test.ts
- ✅ Initial load < 2 seconds
- ✅ Server test response < 5 seconds
- ✅ Configuration save < 500ms
- ✅ Smooth animations (60 fps)
- ✅ Memory usage < 200MB
- ✅ Handle 50+ servers efficiently
```

---

## Integration Test Workflows

### Critical Path 1: Complete Server Lifecycle
```
1. Discover server in catalog
2. Install server (npm/pip/git)
3. Test server connection
4. Enable for specific client
5. Modify configuration
6. Test again
7. Disable server
8. Uninstall server
```

### Critical Path 2: Configuration Management
```
1. Create new configuration
2. Add multiple servers
3. Validate configuration
4. Save with auto-backup
5. Make breaking change
6. Restore from backup
7. Export configuration
8. Import to another client
```

### Critical Path 3: Error Recovery
```
1. Simulate server crash
2. Detect failed connection
3. Show error to user
4. Attempt auto-recovery
5. Fallback to manual fix
6. Validate fix
7. Resume normal operation
```

---

## Regression Test Suite

### Core Functionality (Run before each release)
```typescript
// regression.test.ts
describe('Regression Suite', () => {
  // Previous Sprint Features
  test('TypeScript compilation - 0 errors');
  test('Visual Workspace - drag and drop works');
  test('Discovery - catalog loads');
  test('Metrics - real data displayed');

  // Current Sprint Features
  test('Server lifecycle - all operations');
  test('Validation - prevents bad configs');
  test('Backup - automatic and manual');
  test('UI - no visual regressions');

  // Performance Benchmarks
  test('Load time < 2s');
  test('Memory < 200MB');
  test('CPU < 50% idle');
});
```

---

## Documentation Checklist

### User Documentation
- [ ] Installation guide with screenshots
- [ ] Server configuration tutorial
- [ ] Troubleshooting guide
- [ ] FAQ section
- [ ] Video walkthrough

### Developer Documentation
- [ ] API reference (100% coverage)
- [ ] Architecture diagrams updated
- [ ] Service contracts documented
- [ ] IPC endpoints complete
- [ ] Type definitions exported

### Test Documentation
- [ ] Test plan (this document)
- [ ] Test case specifications
- [ ] Coverage reports
- [ ] Performance benchmarks
- [ ] Known issues list

---

## Test Execution Schedule

### Week 1: Foundation
- Day 1-2: Unit tests for ServerTester, ValidationEngine
- Day 3-4: Unit tests for BackupManager, ConfigurationService
- Day 5: Integration tests for server lifecycle

### Week 2: Integration
- Day 1-2: Enable/disable flow tests
- Day 3-4: Backup/restore flow tests
- Day 5: E2E test setup and critical paths

### Week 3: Polish & Coverage
- Day 1-2: UI component tests
- Day 3: Visual regression tests
- Day 4: Performance tests
- Day 5: Coverage gap analysis and fixes

### Week 4: Validation & Release
- Day 1-2: Full regression suite
- Day 3: Bug fixes from testing
- Day 4: Documentation completion
- Day 5: Final validation & sign-off

---

## Success Metrics

### Quantitative Metrics
- **Test Coverage**: Services ≥80%, Components ≥70%
- **Test Pass Rate**: ≥98% of all tests passing
- **Performance**: All operations within defined limits
- **Bugs**: Zero P0/P1 bugs, <5 P2 bugs

### Qualitative Metrics
- **User Feedback**: Intuitive server management
- **Code Quality**: Maintainable and well-documented
- **Reliability**: No data loss scenarios
- **Polish**: Professional, consistent UI

---

## Risk Mitigation

### High-Risk Areas
1. **Server Testing**: Network timeouts, process management
   - Mitigation: Comprehensive timeout handling, retry logic

2. **Configuration Validation**: Complex validation rules
   - Mitigation: Extensive test cases, clear error messages

3. **Backup/Restore**: Data integrity
   - Mitigation: Checksums, versioning, recovery tests

4. **Cross-Platform**: Windows/Mac/Linux differences
   - Mitigation: CI/CD on all platforms, platform-specific tests

---

## Test Tools & Infrastructure

### Required Tools
- **Jest**: Unit and integration testing
- **Testing Library**: React component testing
- **Playwright**: E2E testing
- **Percy**: Visual regression testing
- **Lighthouse**: Performance testing
- **ESLint/Prettier**: Code quality
- **TypeScript**: Type checking
- **Coverage**: Istanbul/nyc

### CI/CD Pipeline
```yaml
on: [push, pull_request]
jobs:
  test:
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
        node: [18, 20]
    steps:
      - Unit tests
      - Integration tests
      - E2E tests
      - Coverage check (fail if below target)
      - Performance tests
      - Build verification
```

---

## Appendix: Test File Templates

### Unit Test Template
```typescript
import { ServiceName } from '../ServiceName';

describe('ServiceName', () => {
  let service: ServiceName;

  beforeEach(() => {
    service = new ServiceName();
  });

  describe('methodName', () => {
    it('should handle normal case', () => {
      // Arrange
      const input = 'test';

      // Act
      const result = service.methodName(input);

      // Assert
      expect(result).toBe('expected');
    });

    it('should handle error case', () => {
      expect(() => service.methodName(null))
        .toThrow('Expected error');
    });
  });
});
```

### Integration Test Template
```typescript
describe('Feature Flow', () => {
  it('should complete full workflow', async () => {
    // Step 1: Setup
    const client = await setupClient();

    // Step 2: Action
    await client.enableServer('test-server');

    // Step 3: Verify
    const config = await client.getConfiguration();
    expect(config.servers).toContain('test-server');

    // Step 4: Cleanup
    await cleanup(client);
  });
});
```

### E2E Test Template
```typescript
import { test, expect } from '@playwright/test';

test.describe('Server Management', () => {
  test('should install and enable server', async ({ page }) => {
    // Navigate
    await page.goto('/discovery');

    // Install
    await page.click('[data-testid="install-filesystem"]');
    await expect(page.locator('.installation-progress')).toBeVisible();

    // Wait for completion
    await expect(page.locator('[data-testid="test-connection"]')).toBeEnabled();

    // Test
    await page.click('[data-testid="test-connection"]');
    await expect(page.locator('.connection-success')).toBeVisible();

    // Enable
    await page.click('[data-testid="enable-server"]');
    await expect(page.locator('.server-enabled')).toBeVisible();
  });
});
```

---

## Sign-off Criteria

Sprint 3 is complete when:
- [ ] All test scenarios pass
- [ ] Coverage targets met
- [ ] Documentation complete
- [ ] Performance benchmarks met
- [ ] No P0/P1 bugs
- [ ] Stakeholder approval

**Test Plan Version**: 1.0
**Created**: 2025-01-20
**Owner**: QA Team
**Status**: Ready for Execution