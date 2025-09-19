# Visual Workspace Test Checklist

## Setup
- [ ] Restart Electron app with `npm run electron:dev` to enable remote debugging on port 9222
- [ ] Click "Get Started" button on landing page
- [ ] Navigate to Settings and enable "Visual Workspace" under Experimental Features
- [ ] Return to main view

## Basic Navigation
- [ ] Click "Visual" button in the header
- [ ] Verify Visual Workspace loads with three panels:
  - [ ] Left: Server Library with server cards
  - [ ] Center: Canvas area
  - [ ] Right: Client Dock

## Server Library (Left Panel)
- [ ] Verify server cards are visible (Filesystem, Search, Database, Web APIs, AI Tools)
- [ ] Each server card should show:
  - [ ] Name and description
  - [ ] Tool count and token usage
  - [ ] Rating (if available)
  - [ ] Active/Inactive badge
- [ ] Search box filters servers correctly
- [ ] Category buttons (All, Core, Data, Web, AI, Community) filter servers

## Client Dock (Right Panel)
- [ ] Check if clients are displayed:
  - [ ] Installed clients should appear under "INSTALLED" section
  - [ ] Each client card shows name and connection status
  - [ ] Active/Servers counter displays correctly
- [ ] Double-click on a client card
  - [ ] Client should be selected (ring highlight)
  - [ ] Canvas header should update to show "[Client Name] Configuration"
- [ ] Single-click on a client card
  - [ ] Should NOT select the client (no ring highlight)

## Canvas (Center Panel)
- [ ] Canvas shows React Flow grid background
- [ ] Controls (zoom, fit view, etc.) are visible in bottom-left
- [ ] MiniMap is visible in bottom-right
- [ ] Auto-save toggle is visible in top bar
- [ ] When auto-save is OFF, "Save Configuration" button appears
- [ ] When auto-save is ON, save button is hidden

## Drag and Drop Testing

### Server to Canvas
- [ ] Drag a server card from the library
- [ ] While dragging, drag overlay should appear with server name
- [ ] Drop on empty canvas area
- [ ] Server node should appear on canvas
- [ ] Check browser console for any errors

### Server to Client
- [ ] Select a client first (double-click in Client Dock)
- [ ] Drag a server card from library
- [ ] Drop directly on the client node (if visible on canvas)
- [ ] Connection line should appear between server and client

### Client to Canvas (Multi-client Setup)
**⚠️ Note: Temporarily disabled - See [Task 102](../BUG_TRACKING.md#issue-3-client-drag-and-drop-removed)**
- [ ] ~~Drag a non-active client from the Client Dock~~ (Feature removed to fix selection bug)
- [ ] ~~Drop on canvas~~ (Feature removed to fix selection bug)
- [ ] ~~Additional client node should appear for multi-client configuration~~ (To be reimplemented)

## Performance Panel (Bottom)
- [ ] Performance Insights panel is visible at bottom
- [ ] Can resize panel by dragging the top edge
- [ ] Can minimize panel with down arrow button
- [ ] When minimized, can restore with click
- [ ] Panel shows:
  - [ ] Token usage with progress bar
  - [ ] Response time metrics
  - [ ] Active connections counter
- [ ] Panel should NOT overlap with React Flow controls

## Configuration Saving
- [ ] With auto-save ON:
  - [ ] Make changes (add server to canvas)
  - [ ] Configuration should save automatically
- [ ] With auto-save OFF:
  - [ ] Make changes (add server to canvas)
  - [ ] Click "Save Configuration" button
  - [ ] Verify configuration is saved

## Console Checks
Open browser DevTools console and check for:
- [ ] No React errors or warnings
- [ ] Drag events log properly (if console.log enabled)
- [ ] No "Cannot read property of undefined" errors
- [ ] No failed network requests

## Known Issues to Verify

### Issue 1: Drag and Drop
- [ ] When dragging server to canvas, check console for:
  - `Drag ended {activeId: server-xxx, overId: ???}`
  - If `overId` is `undefined`, drop zone is not working
  - If `overId` is `react-flow-wrapper`, drop zone is working

### Issue 2: Client Cards
- [ ] If no clients appear in dock:
  - Check if clients are detected in regular Classic view
  - Check localStorage for `mcp-detected-clients` key
  - Verify UnifiedConfigService is running (check terminal)

### Issue 3: Layout Issues
- [ ] Performance panel should not overlap controls
- [ ] No empty space at bottom of viewport
- [ ] All panels should fit within window without scrolling

## Automated Testing (Optional)
To run automated tests after remote debugging is enabled:
```bash
# Connect to running Electron app
node test/test-electron-remote.js
```

## Reporting Issues
When reporting issues, please include:
1. Screenshot of the Visual Workspace
2. Browser console errors (if any)
3. Terminal output from the Electron process
4. Steps to reproduce the issue
5. Expected vs actual behavior