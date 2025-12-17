# Bug-024 Test Protocol: Config File Persistence

## Overview
Testing that dragging servers to Visual Workspace and saving actually writes to the config file on disk.

## Test Setup ✅ COMPLETE

### Files Ready:
- **Config File**: `.claude/mcp.json` (Claude Code project config)
- **Initial Content**: Contains 1 test server (`test-server`)
- **Monitoring Script**: `test-drag-save.sh` (updated for correct path)
- **App Running**: Port 5175 with comprehensive logging

### Current State:
```json
{
  "mcpServers": {
    "test-server": {
      "command": "echo",
      "args": ["hello"],
      "description": "Test server for Bug-024 validation"
    }
  }
}
```

## Test Protocol

### Step 1: Start File Monitoring
```bash
./test-drag-save.sh
```
This will monitor `.claude/mcp.json` for changes in real-time.

### Step 2: Test Drag-Drop-Save Flow

1. **Open Running App** (should be visible on screen)
2. **Navigate to Visual Workspace**
3. **Select Claude Code client**
4. **Switch to Project scope** (important!)
5. **Drag a server** from library to canvas
6. **Verify save button activates** (shows "*")
7. **Click Save button**
8. **Check file monitor** for changes

### Step 3: Verify Results

**Expected Console Logs:**
```
[UnifiedConfigService] Resolved config path: /path/to/.claude/mcp.json
[UnifiedConfigService] Writing to file: /path/to/.claude/mcp.json
[UnifiedConfigService] File write completed successfully
[IPC Handler] Config written successfully to disk
```

**Expected File Changes:**
- File size increase
- Modified timestamp update
- New server added to `mcpServers` object

### Step 4: Validate Content

After save, check `.claude/mcp.json` should contain:
- Original `test-server`
- New server from drag operation
- Proper JSON structure

## Debug Checklist

If save doesn't work, check:

### 1. Scope Selection
- ✅ Claude Code client selected
- ✅ Project scope selected (not User)
- ✅ App shows project directory context

### 2. Console Logs
- ✅ `[VisualWorkspace]` drag detection logs
- ✅ `[Store] Setting isDirty to true`
- ✅ `[IPC Handler] config:write called`
- ✅ `[UnifiedConfigService]` write logs

### 3. File System
- ✅ `.claude/mcp.json` exists and is writable
- ✅ File modification timestamp changes
- ✅ File size increases after save

### 4. Error Scenarios
- ❌ No drag detection logs → Bug-023 still broken
- ❌ No IPC logs → Save button not calling save
- ❌ No file changes → File write failing

## Known Issues to Test

### Bug-023 Dependency
Bug-024 depends on Bug-023 working. If save button doesn't activate:
1. Check drag detection logs
2. Verify `isDirty` state changes
3. Fix Bug-023 first before testing Bug-024

### Expected Success Flow
1. Drag → Detection logs appear
2. Save button activates → `isDirty: true`
3. Click save → IPC logs appear
4. File writes → Monitor shows changes
5. Save button deactivates → `isDirty: false`

## Test Status

- **Setup**: ✅ Complete
- **Monitoring**: ✅ Ready
- **App Running**: ✅ Port 5175
- **Ready to Test**: ✅ All systems go

Run `./test-drag-save.sh` and follow the protocol to validate Bug-024.