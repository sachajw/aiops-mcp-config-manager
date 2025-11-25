# Sprint 4 Work Items - Critical Fixes
*Updated: January 27, 2025*

## 🔴 CRITICAL - Visual Workspace Save/Load System (RELEASE BLOCKERS)

### Bug-023: Save Button Not Activating ✅ Dev Complete, QA Testing
**Developer Status**: Implementation complete
**QA Status**: Currently validating
**What Was Fixed**:
- Save button enables when `isDirty = true` (after drag)
- Save button disables when `isDirty = false` (after save)
- Connected drag events to store state management

**QA Verification Checklist**:
- [ ] Save button disabled initially
- [ ] Save button enables after dragging server
- [ ] Save button enables after removing server
- [ ] Save button enables after moving server
- [ ] Save button disables after clicking Save
- [ ] Multiple drag operations keep button enabled

---

### Bug-024: Config File Not Updated After Drag 🔴 ACTIVE
**Developer Action Required**: Verify actual file persistence
**Problem**: Save button works but file may not be written to disk

**Developer Investigation Steps**:
1. **Add debug logging**:
   ```typescript
   console.log('[DEBUG] Calling saveConfig with:', currentConfig);
   console.log('[DEBUG] IPC handler received:', data);
   console.log('[DEBUG] Writing to file:', configPath);
   ```

2. **Manual verification**:
   ```bash
   # After clicking Save, check actual config file:
   cat ~/Library/Application\ Support/Claude/claude_desktop_config.json | jq .mcpServers
   ```

3. **Check critical points**:
   - Is `saveConfig()` making the IPC call?
   - Is IPC handler `config:write` receiving data?
   - Is file write operation succeeding?
   - Any silent errors being swallowed?

**QA Testing Required**:
- [ ] Config file contains dragged servers after save
- [ ] Changes persist after app restart
- [ ] Config format is valid JSON
- [ ] Client can read the saved config

---

### Bug-025: Auto-Save Not Working 🔴 PENDING
**Dependencies**: Requires Bug-024 to be fixed first
**Implementation Plan**:
1. Add debounced auto-save (30 second timer)
2. Visual indicator for auto-save status
3. Prevent concurrent save operations
4. Handle save failures gracefully

**Developer Tasks**:
- [ ] Implement auto-save timer on canvas changes
- [ ] Add save status indicator UI
- [ ] Add debouncing to prevent excessive saves
- [ ] Test with rapid changes

**QA Testing**:
- [ ] Auto-save triggers after 30 seconds of inactivity
- [ ] Visual feedback shows save in progress
- [ ] Multiple rapid changes don't cause issues
- [ ] Failed saves show error message

---

### Bug-026: Canvas State Not Persisted After Refresh 🔴 PENDING
**Dependencies**: Requires Bug-024 to be fixed first
**Problem**: Page refresh loses all Visual Workspace configurations

**Developer Implementation**:
1. Load saved config on component mount
2. Parse server positions from config
3. Restore node positions and connections
4. Handle missing/invalid saved states

**Key Files**:
- `src/renderer/components/VisualWorkspace/index.tsx`
- Config loading in `useEffect` on mount

**QA Testing**:
- [ ] Save workspace with multiple servers
- [ ] Refresh page (F5)
- [ ] All servers appear in same positions
- [ ] Connections are preserved
- [ ] Works across app restarts

---

## 🟡 HIGH PRIORITY - System Issues

### Bug-021: Infinite Retry Loop 🔴 ACTIVE
**Problem**: Failed servers retry endlessly, flooding console
**Example**: figma-dev-mode server "ECONNREFUSED ::1:9458"

**Developer Fix Required**:
```typescript
// In MCPClient.ts
const MAX_RETRIES = 5;
const BACKOFF_DELAYS = [1000, 2000, 4000, 8000, 16000];

// Add retry limiting logic
if (retryCount >= MAX_RETRIES) {
  markServerAsUnavailable();
  return;
}
```

**QA Testing**:
- [ ] Start app with unavailable server
- [ ] Verify max 5 retry attempts
- [ ] Check exponential backoff timing
- [ ] Console not flooded with errors
- [ ] Server marked as unavailable after max retries

---

### Bug-022: Claude Desktop Auto-Launch 🟡 MEDIUM
**Problem**: Claude Desktop launches when app/tests run
**Root Cause**: macOS Launch Services triggered by config file access

**Developer Solutions**:
1. **Option A - Read-only flags**:
   ```javascript
   fs.readFile(configPath, { flag: 'r' }, ...)
   ```

2. **Option B - Process check**:
   ```javascript
   // Check if Claude is running before accessing files
   const isClaudeRunning = await checkProcess('Claude');
   if (!isClaudeRunning) {
     skip detection or use cached data
   }
   ```

3. **Option C - Lazy detection**:
   - Don't auto-detect on startup
   - Only detect when user requests

**QA Testing**:
```bash
# Monitor for Claude launch
ps aux | grep -i Claude | grep -v grep

# Test scenarios:
# 1. App startup - should NOT launch Claude
# 2. Client detection - should NOT launch Claude
# 3. Config save - should NOT launch Claude
```

---

## 📊 Sprint 4 Priority Order

### Day 1-2 (Jan 27-28): Save/Load Crisis
1. ✅ Bug-023: Save button (Dev done, QA testing)
2. 🔄 Bug-024: File persistence (In Progress)
3. ⏳ Bug-025: Auto-save
4. ⏳ Bug-026: State restoration

### Day 3 (Jan 29): System Stability
1. Bug-021: Infinite retry loop
2. Bug-022: Claude auto-launch

### Day 4-5 (Jan 30-31): UI Polish
1. Bug-007: Floating toolbar overlap
2. Bug-008: Save buttons inconsistency
3. Bug-009: Canvas/JSON editor save logic
4. Bug-010: Project scope header cutoff
5. Bug-011: TOML support
6. Bug-012: Context menu for cards
7. Bug-013: Discovery installation errors

### Day 6-7 (Feb 1-2): Testing & Validation
1. Full regression testing
2. Performance validation
3. Cross-platform testing
4. Release candidate preparation

---

## ✅ Success Metrics

**Must Have (Release Blockers)**:
- [ ] Visual Workspace save/load fully functional
- [ ] No infinite retry loops
- [ ] Performance <2s for all operations
- [ ] No data loss on refresh

**Should Have**:
- [ ] Claude doesn't auto-launch
- [ ] All UI bugs fixed
- [ ] Auto-save working smoothly
- [ ] Clean console output (no spam)

**Nice to Have**:
- [ ] TOML support for VS Code
- [ ] Context menus implemented
- [ ] Advanced error recovery

---

## 📝 Testing Protocols

### Save/Load Test Suite
```
1. Drag multiple servers to canvas
2. Save configuration
3. Verify config file updated
4. Refresh page
5. Verify state restored
6. Restart app
7. Verify state still restored
```

### Performance Test Suite
```
1. Load 20+ servers
2. Switch between clients rapidly
3. Measure response times (<2s required)
4. Monitor memory usage
5. Check for memory leaks
```

### Stability Test Suite
```
1. Configure unavailable servers
2. Verify no infinite loops
3. Check retry limits working
4. Monitor CPU usage
5. Verify error handling
```

---

## 🚀 Communication Templates

### Daily Standup Format
```
Developer:
- Yesterday: [Bug fixed/in progress]
- Today: [Target bug]
- Blockers: [Any issues]

QA:
- Verified: [Bugs confirmed fixed]
- Testing: [Currently validating]
- Found: [New issues]

PM:
- Progress: X/12 bugs fixed
- Risk: [Any concerns]
- Priority changes: [If any]
```

### Bug Handoff Format
```
Developer → QA:
"Bug-XXX ready for validation
- What was changed: [details]
- How to test: [steps]
- Expected behavior: [results]"

QA → Developer:
"Bug-XXX validation complete
- Test result: PASS/FAIL
- Issues found: [if any]
- Evidence: [screenshots/logs]"
```

---

## 🎯 Definition of Done

A bug is considered DONE when:
1. Developer implements fix
2. QA validates all test cases pass
3. No regression in related features
4. Documentation updated if needed
5. ACTIVE_BUGS_AUDIT.md updated
6. Git commit with bug number reference

---

## 📅 Timeline

**Sprint 4 Duration**: January 27 - February 2, 2025
**Release Target**: February 12, 2025

**Current Status**: Day 1 of 7
**Bugs Fixed Today**: 1 (Bug-020 Performance)
**Bugs In Progress**: 1 (Bug-023 Save Button)
**Bugs Remaining**: 11

Keep this document updated as bugs are fixed!