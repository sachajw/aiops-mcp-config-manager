# Bug-023 Validation Test Plan

**Bug**: Save button doesn't activate after dragging nodes on canvas
**Status**: Code fix implemented, awaiting validation
**Date**: 2025-09-30
**Tester**: Manual validation required

---

## ✅ Pre-Test Checklist

- [ ] App is running (port 5175)
- [ ] Browser DevTools console is open and visible
- [ ] Visual Workspace is loaded
- [ ] At least one client is selected (e.g., Claude Desktop)
- [ ] Canvas shows existing server nodes

---

## 🧪 Test Cases

### Test Case 1: Drag Existing Node on Canvas
**Objective**: Verify save button activates when moving an existing node

**Pre-conditions**:
- Visual Workspace is open
- Client is selected (e.g., Claude Desktop)
- At least one server node is visible on canvas
- Save button shows "Save Configuration" (no asterisk)
- Save button is disabled (grey/dimmed)

**Steps**:
1. Identify the current save button state
2. Click and hold on an existing server node (e.g., "desktop_mcp")
3. Drag the node to a new position (move at least 50px)
4. Release the mouse button
5. Observe the save button state

**Expected Console Output**:
```
[VisualWorkspace] onNodesChange called with changes: [...]
[VisualWorkspace] Change 0: { type: 'position', id: 'server-...', dragging: true, ... }
[VisualWorkspace] Detected position change
[VisualWorkspace] Setting dirty state due to node changes
[Store] Setting isDirty to true
[VisualWorkspace] onNodeDrag triggered for node: server-...
[VisualWorkspace] onNodeDragStop triggered for node: server-...
```

**Expected Results**:
- ✅ Save button changes from "Save Configuration" to "Save Configuration *"
- ✅ Save button becomes enabled (blue/clickable)
- ✅ Console shows "[Store] Setting isDirty to true"
- ✅ Console shows position change detection logs

**Actual Results** (fill in after testing):
- Save button state: _______________
- Save button enabled: _______________
- Console logs present: _______________

**PASS/FAIL**: _______________

---

### Test Case 2: Add Server from Library
**Objective**: Verify save button activates when adding new server (baseline test)

**Pre-conditions**:
- Visual Workspace is open
- Client is selected
- Server Library is visible on left
- Canvas is visible

**Steps**:
1. Note save button state (should be disabled)
2. Drag a server from the library (e.g., "filesystem")
3. Drop it onto the canvas
4. Observe save button state

**Expected Results**:
- ✅ Server node appears on canvas
- ✅ Save button becomes enabled
- ✅ Save button shows asterisk (*)
- ✅ Console shows dirty state change

**Actual Results**:
- Save button state: _______________
- New node created: _______________
- Console logs: _______________

**PASS/FAIL**: _______________

---

### Test Case 3: Multiple Node Movements
**Objective**: Verify save button stays active after multiple drags

**Pre-conditions**:
- Visual Workspace has 2+ server nodes
- Save button is initially disabled

**Steps**:
1. Drag first node to new position
2. Verify save button activates
3. Drag second node to new position
4. Verify save button remains active

**Expected Results**:
- ✅ Save button activates after first drag
- ✅ Save button stays active after second drag
- ✅ Only one asterisk shown (not multiple)

**Actual Results**:
- First drag button state: _______________
- Second drag button state: _______________

**PASS/FAIL**: _______________

---

### Test Case 4: Drag Client Node
**Objective**: Verify save button activates when moving client nodes

**Pre-conditions**:
- Visual Workspace is open
- Client node is visible on canvas

**Steps**:
1. Drag the client node (e.g., "Claude Desktop")
2. Release at new position
3. Check save button state

**Expected Results**:
- ✅ Save button activates
- ✅ Console shows position change

**Actual Results**:
- Button state: _______________

**PASS/FAIL**: _______________

---

### Test Case 5: Edge Connection Changes
**Objective**: Verify save button activates when connecting nodes

**Pre-conditions**:
- Two server nodes exist on canvas

**Steps**:
1. Draw an edge between two server nodes
2. Check save button state

**Expected Results**:
- ✅ Edge is created
- ✅ Save button activates (if edge changes trigger dirty state)

**Actual Results**:
- Button state: _______________

**PASS/FAIL**: _______________

---

### Test Case 6: Save and Verify Reset
**Objective**: Verify save button resets after successful save

**Pre-conditions**:
- Save button is active (dirty state = true)

**Steps**:
1. Click "Save Configuration *" button
2. Wait for save to complete
3. Observe button state change

**Expected Results**:
- ✅ Button text changes from "Save Configuration *" to "Save Configuration"
- ✅ Button becomes disabled/dimmed
- ✅ Console shows save completion

**Actual Results**:
- Button state after save: _______________
- Save successful: _______________

**PASS/FAIL**: _______________

---

## 🔍 Console Log Validation

Check for these specific log patterns in DevTools console:

### Required Logs for Successful Fix:

1. **onNodesChange called**:
   ```
   [VisualWorkspace] onNodesChange called with changes: [...]
   ```

2. **Position change detected**:
   ```
   [VisualWorkspace] Detected position change
   ```

3. **Dirty state set**:
   ```
   [VisualWorkspace] Setting dirty state due to node changes
   [Store] Setting isDirty to true
   ```

4. **Drag handlers called**:
   ```
   [VisualWorkspace] onNodeDrag triggered for node: server-xxx
   [VisualWorkspace] onNodeDragStop triggered for node: server-xxx
   ```

### Logs That Indicate Failure:

- ❌ "No dirty-triggering changes detected"
- ❌ Missing "[Store] Setting isDirty to true"
- ❌ No onNodesChange logs when dragging

---

## 📊 Overall Validation Result

**Total Test Cases**: 6
**Passed**: _____ / 6
**Failed**: _____ / 6

**Critical Path Tests** (must all pass):
- [ ] Test Case 1: Drag existing node
- [ ] Test Case 6: Save and reset

**Bug-023 Status**:
- [ ] ✅ VERIFIED FIXED - All tests passed
- [ ] ❌ NOT FIXED - Tests failed (see details below)
- [ ] ⚠️ PARTIALLY FIXED - Some tests failed

---

## 🐛 Issues Found During Testing

If any tests fail, document here:

**Issue 1**:
- Test Case: _____
- Description: _____
- Console Output: _____
- Expected: _____
- Actual: _____

**Issue 2**:
- Test Case: _____
- Description: _____

---

## 📸 Evidence Required

To mark Bug-023 as VERIFIED FIXED, provide:

1. **Screenshot 1**: Canvas BEFORE dragging node (save button disabled)
2. **Screenshot 2**: Canvas AFTER dragging node (save button enabled with *)
3. **Screenshot 3**: Console logs showing position change and setDirty calls
4. **Screenshot 4**: Save button returning to disabled state after save

Save screenshots as:
- `bug-023-before-drag.png`
- `bug-023-after-drag.png`
- `bug-023-console-logs.png`
- `bug-023-after-save.png`

---

## ✍️ Sign-Off

**Tester Name**: _________________
**Date Tested**: _________________
**Time**: _________________
**Result**: PASS / FAIL / PARTIAL

**Comments**:
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

---

## 🔄 Next Steps

### If All Tests Pass:
1. Update ACTIVE_BUGS_AUDIT.md with verification timestamp
2. Add screenshots to documentation
3. Mark Bug-023 as ✅ VERIFIED FIXED
4. Update tasks.md to mark Task 180 complete
5. Proceed to Bug-024

### If Any Tests Fail:
1. Document failure details above
2. Review console logs for errors
3. Check if onNodesChange is actually being called
4. Verify setDirty function exists in store
5. Check React Flow version compatibility
6. Report findings to developer for additional fixes