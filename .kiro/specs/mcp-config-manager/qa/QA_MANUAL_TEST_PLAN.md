# QA Manual Test Plan
*Last Updated: 2025-10-02*
*Purpose: End-of-Sprint Manual Testing Protocol*

## 📋 Test Execution Schedule

**When to Run**:
- End of each sprint (before release)
- After major bug fixes
- Before version releases

**Time Required**: ~45 minutes for full suite

---

## 🎯 Core Test Suite

### 1. Application Launch Tests (5 min)

#### 1.1 Clean Start Test
```bash
# Terminal 1: Start app
npm run electron:dev

# Expected:
✅ App launches without errors
✅ Landing page displays
✅ No console errors on startup
✅ All navigation links work
```

#### 1.2 Client Detection Test
- **Navigate**: Home → Click "Get Started"
- **Verify**:
  - [ ] Claude Desktop detected (if installed)
  - [ ] Claude Code detected (if installed)
  - [ ] VS Code detected (if installed)
  - [ ] At least one client shows as available

---

### 2. Visual Workspace Tests (15 min)

#### 2.1 Navigation & Loading
- **Navigate**: Visual Workspace tab
- **Verify**:
  - [ ] Visual Workspace loads without errors
  - [ ] Canvas area visible
  - [ ] Server Library panel shows servers
  - [ ] Client selector dropdown populated
  - [ ] Scope selector shows options

#### 2.2 Drag & Drop Test
- **Setup**: Select Claude Code → Project scope
- **Test**:
  1. Drag server from library to canvas
  2. **Verify**:
     - [ ] Server appears on canvas
     - [ ] Node is interactive (can select)
     - [ ] Save button activates (shows "*")
  3. Console shows:
     ```
     [VisualWorkspace] Server dragged
     [Store] Setting isDirty to true
     ```

#### 2.3 Save Configuration Test
- **Prerequisites**: Server on canvas, save button active
- **Monitor Setup**:
  ```bash
  # Terminal 2: Run monitor
  ./test-drag-save.sh
  ```
- **Test**:
  1. Click Save button
  2. **Verify**:
     - [ ] Console shows save process
     - [ ] "Save successful" message/notification
     - [ ] Save button deactivates
     - [ ] File monitor shows update
  3. Expected console output:
     ```
     [Store] 💾 SAVE CONFIG STARTED
     [Store] 📥 writeConfig returned: {"success": true}
     [Store] 🏁 SAVE CONFIG COMPLETED SUCCESSFULLY
     ```

#### 2.4 Canvas Persistence Test (Bug-026)
- **Setup**: Arrange 2-3 nodes on canvas
- **Test**:
  1. Note positions of nodes
  2. Refresh page (F5)
  3. **Verify**:
     - [ ] Nodes return to same positions
     - [ ] All nodes present
     - [ ] Connections preserved

#### 2.5 Multi-Node Test
- **Test**: Add 3+ servers to canvas
- **Verify**:
  - [ ] All nodes draggable
  - [ ] No duplicate key warnings
  - [ ] Performance remains smooth
  - [ ] Save works with multiple nodes

---

### 3. Configuration Management Tests (10 min)

#### 3.1 Scope Switching Test
- **Test each scope**:
  - [ ] Global scope loads
  - [ ] User scope loads
  - [ ] Project scope loads
  - [ ] Local scope loads (if available)
- **Verify**: Each shows appropriate config

#### 3.2 Client Switching Test
- **Test**: Switch between available clients
- **Verify**:
  - [ ] < 2 seconds to switch
  - [ ] Correct config loads
  - [ ] No freeze/hang (Bug-020)

#### 3.3 JSON Editor Test
- **Navigate**: Click JSON tab in Visual Workspace
- **Test**:
  1. Make edit in JSON
  2. Save changes
  3. **Verify**:
     - [ ] Syntax highlighting works
     - [ ] Save button activates
     - [ ] Changes persist

---

### 4. Server Connection Tests (10 min)

#### 4.1 Retry Logic Test (Bug-021)
- **Setup**: Add server with invalid port (localhost:99999)
- **Monitor**: Watch console output
- **Verify**:
  - [ ] See 5 retry attempts
  - [ ] Exponential backoff visible (1s, 2s, 4s, 8s, 16s)
  - [ ] Stops after 5 attempts
  - [ ] Server marked "unavailable"
  - [ ] NO infinite loops

#### 4.2 Valid Server Connection
- **Test**: Add working MCP server
- **Verify**:
  - [ ] Connection established
  - [ ] Metrics display (tools/tokens)
  - [ ] No errors in console

---

### 5. UI Polish Tests (5 min)

#### 5.1 Visual Consistency
- **Check across all tabs**:
  - [ ] Consistent styling
  - [ ] No overlapping elements
  - [ ] Readable text
  - [ ] Proper spacing

#### 5.2 Error Handling
- **Test**: Try invalid operations
- **Verify**:
  - [ ] Graceful error messages
  - [ ] No app crashes
  - [ ] Can recover from errors

#### 5.3 Performance Insights Panel
- **Location**: Visual Workspace → Bottom panel
- **Verify**:
  - [ ] Shows real metrics (not 0)
  - [ ] Token count accurate
  - [ ] Response time graph updates
  - [ ] Tool count aggregates correctly

---

## 🔄 Regression Test Checklist

### Critical Bugs to Retest Each Sprint

| Bug ID | Test | Expected Result | Pass/Fail |
|--------|------|-----------------|-----------|
| Bug-020 | Switch clients rapidly | < 2 sec response | ⏳ |
| Bug-021 | Invalid server connection | Max 5 retries | ⏳ |
| Bug-023 | Drag node to canvas | Save button activates | ⏳ |
| Bug-024 | Save configuration | File actually updates | ⏳ |
| Bug-026 | Refresh page | Canvas state preserved | ⏳ |

---

## 📊 Test Report Template

### Sprint X - Manual Test Results
**Date**: [Date]
**Tester**: [Name]
**Build**: [Version/Commit]

#### Summary
- Tests Passed: X/Y
- Critical Issues: [List]
- Regressions: [List]

#### Detailed Results
[Copy checklist and mark results]

#### Console Errors
```
[Paste any errors found]
```

#### Screenshots
[Attach if issues found]

#### Recommendation
- [ ] Ready for release
- [ ] Needs fixes (list)

---

## 🚨 When to Escalate

**Stop testing and report immediately if**:
- App crashes on launch
- Data loss occurs
- Infinite loops detected
- Security issues found
- Critical functionality broken

---

## 📝 Notes

### Known Issues (Non-Blocking)
- Duplicate key warning for "ship-ape" - cosmetic issue
- Performance Insights may show 0 for tools initially

### Test Environment Setup
1. Clean build: `npm run build`
2. Start fresh: `npm run electron:dev`
3. Use monitoring script: `./test-drag-save.sh`
4. Keep console visible for debugging

### Test Data
- Use `.claude/mcp.json` for project scope tests
- Test servers: figma-dev-mode, iterm-mcp, peekaboo-mcp

---

## ✅ Sprint Sign-Off Criteria

Before marking sprint complete:
1. [ ] All manual tests pass
2. [ ] No critical bugs remain
3. [ ] Regression tests pass
4. [ ] Performance acceptable
5. [ ] Console free of errors
6. [ ] File operations verified
7. [ ] UI responsive and polished

---

## 📅 Test History

### Sprint 5 (2025-10-02)
- Tester: QA Instance
- Result: Bug-024 verified working, Bug-026 needs retest
- Issues: Duplicate key warnings (non-critical)

### Sprint 4 (2025-01-27)
- Tester: QA Instance
- Result: Bug-023 NOT FIXED, Bug-024 debug logging added
- Issues: Save button activation failure

[Add new sprint results here]