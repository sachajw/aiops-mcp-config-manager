# Project Scope Fix Summary

## Issue
When Kiro client is selected with Project scope, it still shows User scope servers because the projectDirectory is null/undefined.

## Root Cause
The projectDirectory stored in the Zustand store is not being properly initialized or maintained when:
1. The app starts
2. The user switches to Project scope
3. The user hasn't selected a directory yet

## Solution Applied

### 1. Backend (UnifiedConfigService.ts)
- Added proper project scope handling for Kiro and Windsurf
- Falls back to user config if no project directory is provided
- Checks for `.kiro/settings/mcp.json` in project directory
- Falls back to `mcp.json` in project root

### 2. IPC Handler (simplifiedHandlers.ts)
- Added debug logging to track scope and projectDirectory values
- Properly passes projectDirectory to backend service

### 3. Frontend Store (simplifiedStore.ts)
- projectDirectory is initialized from localStorage
- When scope changes to 'project', it reloads the client config
- selectClient properly passes projectDirectory when scope is 'project'

## How to Use Project Scope

1. Select a client (e.g., Kiro)
2. Click "Project" scope button
3. Click "Select Directory" to choose a project folder
4. The app will look for:
   - `.kiro/settings/mcp.json` in the project
   - Or create a new empty config if none exists
5. Any servers added will be saved to the project-specific config

## Testing
1. Select Kiro client
2. Switch to Project scope
3. Select a project directory
4. Verify it shows different servers than User scope
5. Add a server and verify it's saved to project config