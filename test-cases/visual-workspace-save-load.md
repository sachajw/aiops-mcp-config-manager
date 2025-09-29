# Visual Workspace Save/Load Test Cases

## Test Suite Overview
This document contains comprehensive test cases for the Visual Workspace save/load functionality in MCP Configuration Manager. These tests verify data persistence, state management, and error handling.

## Test Environment Setup
- Application: MCP Configuration Manager v0.1.5
- Component: Visual Workspace (`/visual-workspace` route)
- Test Data: Pre-configured workspaces with various states
- Validation: Manual and automated (Playwright e2e)

---

## 1. Basic Save/Load Operations

### TC001: Save Empty Workspace
**Objective**: Verify empty workspace can be saved
**Preconditions**: New Visual Workspace with no nodes
**Steps**:
1. Navigate to Visual Workspace
2. Click "Save Workspace" button
3. Enter name "empty-workspace"
4. Click Save
**Expected**:
- Success notification appears
- Workspace saved to localStorage
- Save button becomes disabled (no unsaved changes)
**Validation**:
```javascript
localStorage.getItem('visualWorkspace-empty-workspace') !== null
```

### TC002: Load Saved Empty Workspace
**Objective**: Verify empty workspace loads correctly
**Preconditions**: TC001 completed successfully
**Steps**:
1. Navigate away from Visual Workspace
2. Return to Visual Workspace
3. Click "Load Workspace"
4. Select "empty-workspace"
**Expected**:
- Canvas clears
- No nodes present
- Workspace name shows "empty-workspace"

### TC003: Save Workspace with Single Server
**Objective**: Verify workspace with one server saves correctly
**Preconditions**: Clean Visual Workspace
**Steps**:
1. Drag "filesystem" server from library to canvas
2. Position at coordinates (100, 100)
3. Save as "single-server"
**Expected**:
- Server position preserved
- Server configuration saved
- Node ID maintained
**Validation**:
```javascript
const data = JSON.parse(localStorage.getItem('visualWorkspace-single-server'));
assert(data.nodes.length === 1);
assert(data.nodes[0].type === 'server');
assert(data.nodes[0].position.x === 100);
```

---

## 2. Complex State Persistence

### TC004: Save Multiple Servers with Connections
**Objective**: Verify complex workspace state persists
**Preconditions**: Clean workspace
**Steps**:
1. Add 3 servers: filesystem, github, sqlite
2. Connect filesystem → github
3. Connect github → sqlite
4. Save as "connected-servers"
**Expected**:
- All 3 servers saved
- 2 edges saved
- Connection IDs preserved
**Validation**:
```javascript
const data = JSON.parse(localStorage.getItem('visualWorkspace-connected-servers'));
assert(data.nodes.length === 3);
assert(data.edges.length === 2);
assert(data.edges[0].source && data.edges[0].target);
```

### TC005: Save Workspace with Client Nodes
**Objective**: Verify client nodes persist correctly
**Preconditions**: Clean workspace
**Steps**:
1. Add Claude Desktop client
2. Add VS Code client
3. Connect both to filesystem server
4. Save as "multi-client"
**Expected**:
- 2 client nodes saved
- 1 server node saved
- 2 edges saved
- Client metadata preserved
**Validation**:
```javascript
const data = JSON.parse(localStorage.getItem('visualWorkspace-multi-client'));
const clients = data.nodes.filter(n => n.type === 'client');
assert(clients.length === 2);
assert(clients[0].data.metadata !== undefined);
```

### TC006: Preserve Node Positions After Load
**Objective**: Verify exact positions maintained
**Preconditions**: Workspace with positioned nodes
**Steps**:
1. Create workspace with 5 nodes at specific positions
2. Record all positions
3. Save workspace
4. Load workspace
5. Compare positions
**Expected**:
- All X,Y coordinates match exactly
- No drift or rounding errors
- Zoom level preserved
**Validation**:
```javascript
originalNodes.forEach((orig, i) => {
  assert(loadedNodes[i].position.x === orig.position.x);
  assert(loadedNodes[i].position.y === orig.position.y);
});
```

---

## 3. Edge Cases & Error Handling

### TC007: Save with Special Characters in Name
**Objective**: Verify special characters handled correctly
**Preconditions**: Workspace with content
**Steps**:
1. Save with name: "test!@#$%^&*()"
2. Attempt to load
**Expected**:
- Save succeeds
- Load succeeds
- Name displayed correctly
**Edge Cases**:
- Unicode: "测试工作区"
- Emoji: "🚀 Workspace"
- Spaces: "My   Workspace   "

### TC008: Overwrite Existing Workspace
**Objective**: Verify overwrite functionality
**Preconditions**: Existing saved workspace
**Steps**:
1. Load existing workspace
2. Make changes
3. Save with same name
4. Confirm overwrite dialog
**Expected**:
- Confirmation dialog appears
- On confirm: Old data replaced
- On cancel: Save aborted

### TC009: Load Corrupted Workspace Data
**Objective**: Verify graceful handling of corrupted data
**Preconditions**: Manually corrupt localStorage data
**Steps**:
1. Corrupt saved workspace JSON
2. Attempt to load
**Expected**:
- Error notification shown
- Workspace remains unchanged
- App doesn't crash
**Test Data**:
```javascript
// Corrupt scenarios:
localStorage.setItem('visualWorkspace-corrupt1', 'not-json');
localStorage.setItem('visualWorkspace-corrupt2', '{"nodes": "not-array"}');
localStorage.setItem('visualWorkspace-corrupt3', '{}'); // Missing required fields
```

### TC010: Maximum Workspace Size
**Objective**: Verify large workspaces handle correctly
**Preconditions**: Clean workspace
**Steps**:
1. Add 50 servers
2. Create 100 connections
3. Save workspace
4. Load workspace
**Expected**:
- Save completes < 3 seconds
- Load completes < 3 seconds
- All data preserved
- No performance degradation

---

## 4. State Management Tests

### TC011: Unsaved Changes Indicator
**Objective**: Verify unsaved changes tracked correctly
**Preconditions**: Saved workspace loaded
**Steps**:
1. Load workspace
2. Move a node
3. Check save button
4. Save workspace
5. Check save button again
**Expected**:
- After change: Button shows "Save Workspace*"
- After save: Button shows "Save Workspace"
- Indicator accurate

### TC012: Auto-Save on Timer
**Objective**: Verify auto-save functionality (if enabled)
**Preconditions**: Auto-save enabled in settings
**Steps**:
1. Make changes
2. Wait for auto-save interval (30s)
3. Check localStorage
**Expected**:
- Changes saved automatically
- No user notification
- Timestamp updated

### TC013: Preserve Selection State
**Objective**: Verify selected nodes maintained
**Preconditions**: Workspace with multiple nodes
**Steps**:
1. Select 3 nodes (multi-select)
2. Save workspace
3. Load workspace
**Expected**:
- Same nodes selected after load
- Selection visual state preserved
- Multi-select state maintained

---

## 5. Integration Tests

### TC014: Save/Load with Active Connections
**Objective**: Verify connected servers handled properly
**Preconditions**: Servers with active connections
**Steps**:
1. Connect to live MCP servers
2. Save workspace
3. Load workspace
**Expected**:
- Layout preserved
- Connections re-established
- Status indicators accurate

### TC015: Cross-Session Persistence
**Objective**: Verify data persists across app restarts
**Preconditions**: Saved workspaces
**Steps**:
1. Save workspace
2. Quit application
3. Restart application
4. Load workspace
**Expected**:
- All workspaces available
- Data intact
- No corruption

### TC016: Import/Export Workspace
**Objective**: Verify workspace portability
**Preconditions**: Saved workspace
**Steps**:
1. Export workspace to file
2. Import on different machine
**Expected**:
- JSON file created
- Import succeeds
- Full fidelity maintained

---

## 6. Performance Tests

### TC017: Save Performance Benchmark
**Objective**: Measure save operation performance
**Test Matrix**:
| Nodes | Edges | Target Time |
|-------|-------|-------------|
| 10    | 5     | < 100ms     |
| 50    | 25    | < 500ms     |
| 100   | 100   | < 1s        |
| 500   | 500   | < 3s        |

### TC018: Load Performance Benchmark
**Objective**: Measure load operation performance
**Test Matrix**:
| Nodes | Edges | Target Time |
|-------|-------|-------------|
| 10    | 5     | < 200ms     |
| 50    | 25    | < 1s        |
| 100   | 100   | < 2s        |
| 500   | 500   | < 5s        |

---

## 7. Regression Tests

### TC019: Node Duplication on Load
**Objective**: Verify no duplicate nodes created
**Preconditions**: Workspace with unique nodes
**Steps**:
1. Save workspace with 5 unique servers
2. Load workspace
3. Count nodes
**Expected**:
- Exactly 5 nodes present
- No duplicates
- IDs unchanged

### TC020: Edge Validation on Load
**Objective**: Verify edges connect to valid nodes
**Preconditions**: Workspace with connections
**Steps**:
1. Save workspace with edges
2. Load workspace
3. Validate each edge
**Expected**:
- All edges have valid source/target
- No orphaned edges
- No edges to non-existent nodes

---

## 8. Accessibility & UX Tests

### TC021: Keyboard Navigation Save/Load
**Objective**: Verify keyboard accessibility
**Steps**:
1. Tab to Save button
2. Press Enter
3. Type workspace name
4. Tab to confirm
5. Press Enter
**Expected**:
- Full keyboard navigation
- Focus indicators visible
- Screen reader compatible

### TC022: Save Confirmation Feedback
**Objective**: Verify user feedback on save
**Steps**:
1. Save workspace
2. Observe notification
**Expected**:
- Success toast appears
- Message includes workspace name
- Toast auto-dismisses after 3s

---

## Automated Test Implementation

### Playwright E2E Test
```typescript
// visual-workspace-save-load.e2e.ts
import { test, expect } from '@playwright/test';

test.describe('Visual Workspace Save/Load', () => {
  test('should save and load workspace state', async ({ page }) => {
    await page.goto('/visual-workspace');

    // Add nodes
    await page.dragAndDrop('[data-server="filesystem"]', '[data-testid="canvas"]');

    // Save
    await page.click('[data-testid="save-workspace"]');
    await page.fill('[data-testid="workspace-name"]', 'test-workspace');
    await page.click('[data-testid="confirm-save"]');

    // Verify saved
    const savedData = await page.evaluate(() =>
      localStorage.getItem('visualWorkspace-test-workspace')
    );
    expect(savedData).toBeTruthy();

    // Load
    await page.click('[data-testid="load-workspace"]');
    await page.click('[data-workspace="test-workspace"]');

    // Verify loaded
    const nodes = await page.locator('[data-testid="server-node"]').count();
    expect(nodes).toBe(1);
  });
});
```

---

## Verification Checklist

### Pre-Deployment Verification
- [ ] All basic save/load tests pass
- [ ] No data loss on save/load cycle
- [ ] Performance within targets
- [ ] Error handling robust
- [ ] Keyboard navigation works
- [ ] Cross-browser compatibility
- [ ] localStorage size limits handled

### Post-Deployment Monitoring
- [ ] Monitor error logs for save/load failures
- [ ] Track save/load performance metrics
- [ ] User feedback on data loss
- [ ] Memory usage during large workspace operations

### Critical Success Criteria
1. **Data Integrity**: 100% of workspace data preserved
2. **Performance**: Save < 1s, Load < 2s for typical workspaces
3. **Reliability**: 0% data loss rate
4. **UX**: Clear feedback on all operations

---

## Known Issues & Workarounds

### Issue: Large workspaces slow to save
**Workaround**: Implement chunked saving or compression

### Issue: localStorage quota exceeded
**Workaround**: Implement cleanup of old workspaces or use IndexedDB

### Issue: Concurrent save operations
**Workaround**: Implement save queue or mutex lock

---

## Test Execution Schedule

| Test Category | Frequency | Automation |
|--------------|-----------|------------|
| Basic Operations | Every build | ✅ Automated |
| Complex State | Daily | ✅ Automated |
| Edge Cases | Weekly | ⚠️ Partial |
| Performance | Per release | ✅ Automated |
| Integration | Per release | ❌ Manual |
| Accessibility | Monthly | ❌ Manual |

---

## Contact & Resources
- **Test Owner**: QA Team
- **Last Updated**: 2025-01-27
- **Test Framework**: Playwright + Jest
- **CI Pipeline**: GitHub Actions