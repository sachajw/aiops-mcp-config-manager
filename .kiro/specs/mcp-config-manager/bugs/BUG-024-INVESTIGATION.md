# Bug-024 Investigation Report: Config File Not Updated After Drag

## Summary
Investigation into why the config file is not being updated when dragging servers to the Visual Workspace canvas.

## Current Status
**In Progress** - Added comprehensive logging throughout the save flow. Awaiting test results.

## Investigation Steps Completed

### 1. Added Logging to UI Component
- File: `src/renderer/components/VisualWorkspace/index.tsx`
- Added console logs to track:
  - When handleSaveConfiguration is called
  - Server count being saved
  - Auto-save status

### 2. Added Logging to Store
- File: `src/renderer/store/simplifiedStore.ts`
- Added logging to saveConfig function to track:
  - When saveConfig is invoked
  - IPC call parameters

### 3. Added Logging to IPC Handler
- File: `src/main/ipc/simplifiedHandlers.ts`
- Added extensive logging to config:write handler:
  - Input parameters (client, scope, servers)
  - Denormalized config
  - Success/failure status

### 4. Added Logging to UnifiedConfigService
- File: `src/main/services/UnifiedConfigService.ts`
- Added detailed logging in writeConfig method:
  - Config path resolution
  - Directory creation
  - File merge operations
  - Actual file write
  - Post-write verification (file exists, size, modified time)

## Test Script Created
Created `test-drag-save.sh` to monitor config file changes in real-time:
```bash
./test-drag-save.sh
```

This script monitors the Claude Desktop config file and reports:
- File size changes
- Modification time updates
- Server count changes

## How to Test

1. Run the monitoring script in one terminal:
   ```bash
   ./test-drag-save.sh
   ```

2. Run the app in another terminal:
   ```bash
   npm run electron:dev
   ```

3. In the app:
   - Navigate to Visual Workspace
   - Select Claude Desktop as the client
   - Drag a server from the library to the canvas
   - Click the Save button when it becomes active

4. Watch for:
   - Console logs showing the save flow
   - File monitor showing file changes
   - Save button state changes (should deactivate after save)

## Expected Console Output Flow

1. **UI Layer**:
   ```
   [VisualWorkspace] handleSaveConfiguration called
   [VisualWorkspace] Saving servers: {...}
   [VisualWorkspace] Auto-save enabled: true/false
   ```

2. **Store Layer**:
   ```
   [Store] saveConfig called
   [Store] Invoking IPC with: {...}
   ```

3. **IPC Handler**:
   ```
   [IPC Handler] config:write called with: {...}
   [IPC Handler] Denormalized config: {...}
   [IPC Handler] Config written successfully to disk
   ```

4. **Service Layer**:
   ```
   [UnifiedConfigService] writeConfig called: {...}
   [UnifiedConfigService] Resolved config path: /path/to/config.json
   [UnifiedConfigService] Writing to file: /path/to/config.json
   [UnifiedConfigService] File write completed successfully
   [UnifiedConfigService] File verification: {exists: true, size: X, modified: ...}
   ```

## Potential Issues to Check

1. **IPC Communication**: Verify the config:write handler receives the correct data
2. **File Path**: Ensure the resolved config path is correct for the client
3. **File Permissions**: Check if the app has write permissions to the config location
4. **Data Format**: Verify the server data is properly formatted before writing
5. **Error Handling**: Look for any caught errors that prevent file writes

## Related Files
- Bug-023: Save button activation (FIXED)
- Bug-025: Auto-save not working (pending)
- Bug-026: Canvas state not persisted (pending)

## Next Steps
1. Run tests with logging enabled
2. Identify where in the flow the save operation fails
3. Fix the identified issue
4. Verify fix resolves Bug-025 and Bug-026 as well