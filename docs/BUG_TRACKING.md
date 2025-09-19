# Bug Tracking and Known Issues

## Critical Bugs (User-Reported)

### Bug #1: Drag-and-Drop Not Working (Task 92)
**Status**: ✅ Fixed
**Severity**: High
**Component**: Visual Workspace
**Reported**: User feedback

**Description**:
Users report that drag-and-drop functionality in Visual Workspace is not working properly. Servers cannot be dragged from the Server Library to the canvas.

**Symptoms**:
- Dragging servers from library doesn't work
- Drop zones not recognizing dropped items
- State not updating when items are dropped
- Possible DndContext configuration issues

**Investigation Areas**:
1. `src/renderer/components/VisualWorkspace/index.tsx` - DndContext setup
2. `src/renderer/components/VisualWorkspace/ServerLibrary.tsx` - Draggable items
3. Drop zone configuration and event handlers
4. State management in useConfigStore

**Proposed Fix**:
- Review @dnd-kit implementation
- Debug drop zone detection
- Ensure proper event propagation
- Test across different environments

---

### Bug #2: Client Selection Issues (Task 93)
**Status**: ✅ Fixed
**Severity**: High
**Component**: Client Selector
**Reported**: User feedback

**Description**:
Client selection is not working properly. When switching between clients, the UI doesn't update correctly or loses state.

**Symptoms**:
- Client dropdown not updating selected client
- Server list not refreshing when client changes
- State synchronization issues
- Possible persistence problems

**Investigation Areas**:
1. `src/renderer/components/Simplified/ClientSelector.tsx` - Selection logic
2. `src/renderer/store/simplifiedStore.ts` - State management
3. IPC handlers for client switching
4. Configuration loading on client change

**Proposed Fix**:
- Debug state management flow
- Review client switching logic
- Ensure proper cleanup on client change
- Test persistence across restarts

---

## Known Issues (Not Yet Reported)

### Issue #3: Client Drag-and-Drop Removed
**Status**: 🟡 Tracked (Task 102)
**Severity**: Medium
**Component**: Visual Workspace - ClientDock

Client cards were previously draggable to canvas for multi-client configurations. This was removed to fix the selection bug but needs to be reimplemented properly.

---

### Issue #1: Mock Data Throughout UI
**Status**: 🟡 Tracked (Tasks 50-64)
**Severity**: Medium
**Component**: Multiple

Mock data is displayed instead of real values in:
- Token counts (hardcoded 2500)
- Tool counts (hardcoded 15)
- Connection status (always "connected")
- Response times (hardcoded 45ms)

---

### Issue #2: Discovery Install Non-Functional
**Status**: 🟡 Tracked (Task 53)
**Severity**: Medium
**Component**: Discovery

The "Install" button in Discovery doesn't actually install servers.

---

## Bug Investigation Process

### For Interactive Debugging (Tasks 92 & 93):

1. **Reproduce the Issue**
   - Get exact steps from user
   - Test in development environment
   - Document console errors

2. **Code Review with User**
   - Screen share to review implementation
   - Walk through component hierarchy
   - Identify potential problem areas

3. **Debug Together**
   - Add console.log statements
   - Use React DevTools
   - Check state management

4. **Test Fix**
   - Implement proposed solution
   - Test with user in real-time
   - Verify across different scenarios

5. **Document Solution**
   - Update this document with fix
   - Add tests to prevent regression
   - Update relevant documentation

---

## Testing Checklist

### For Drag-and-Drop (Task 92):
- [ ] Can drag servers from library
- [ ] Drop zones highlight on hover
- [ ] Server appears on canvas after drop
- [ ] State persists after drop
- [ ] Multiple items can be dragged
- [ ] Undo/redo works with drag-drop

### For Client Selection (Task 93):
- [ ] Dropdown shows all detected clients
- [ ] Selection updates immediately
- [ ] Server list refreshes for new client
- [ ] Configuration loads correctly
- [ ] Selection persists on restart
- [ ] No memory leaks on switching

---

## Priority Matrix

| Bug | Impact | Urgency | Priority |
|-----|--------|---------|----------|
| Drag-and-Drop | High | High | P1 - Critical |
| Client Selection | High | High | P1 - Critical |
| Mock Data | Medium | Medium | P2 - Important |
| Discovery Install | Medium | Low | P3 - Normal |

---

## Resolution Log

### Resolved Bugs

#### Bug #1: Drag-and-Drop (Task 92) - FIXED
**Resolution Date**: 2025-01-19
**Fix Applied**:
- Added PointerSensor configuration with 8px activation distance
- Removed conflicting native HTML5 drag event handlers
- Fixed conditional logic for drop detection when `over` is undefined
- Added visual feedback (green border) for drop zones
- Both server and client drag-and-drop now functional

**Files Modified**:
- `src/renderer/components/VisualWorkspace/index.tsx`
- `src/renderer/components/VisualWorkspace/ServerLibrary.tsx`

#### Bug #2: Client Selection Issues (Task 93) - FIXED
**Resolution Date**: 2025-01-19
**Fix Applied**:
- Made entire client card clickable for selection (not just header)
- Changed from double-click to single-click for selection
- Added visual feedback with ring and background color for selected state
- Added hover effects for better UX
- Made settings button still clickable while preventing event bubbling

**Files Modified**:
- `src/renderer/components/VisualWorkspace/ClientDock.tsx`

---

## Notes for Developers

1. **Always test fixes with actual users** when possible
2. **Document console errors** found during investigation
3. **Create regression tests** for each bug fixed
4. **Update this document** when bugs are resolved
5. **Consider adding error boundaries** to prevent cascading failures

---

*Last Updated: [Current Date]*
*Total Open Bugs: 2 Critical, 2 Known Issues*