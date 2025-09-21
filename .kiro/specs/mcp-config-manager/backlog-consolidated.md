# Consolidated Backlog: Issues, Requirements, Stories & Tasks

*This file consolidates all items previously in /docs/ directory*
*Last Updated: 2025-09-20*

## 🐛 Issues (Bugs & Problems)

### ISSUE-001: No Console Output During Server Installation
**Status:** Open
**Priority:** Medium
**Task Reference:** Links to Task 127

#### Problem
When users click to install a server, there is no visible console output showing installation progress.

#### Current Behavior
- Installation happens silently in background
- No feedback on installation progress
- No visibility into errors during installation

#### Expected Behavior
- Modal displays auto-scrolling log pane
- Shows 5 lines of console-like output
- Real-time updates as installation progresses
- Clear indication of success or failure

#### Implementation Requirements
- Log pane in installation modal
- Console output displayed in real-time
- Log auto-scrolls to show latest output
- Maximum 5 lines visible at once
- Monospace font for console appearance

---

### ISSUE-002: External Links Open in Electron Window ✅ FIXED
**Status:** Fixed (inadvertently implemented)
**Priority:** High
**Task Reference:** Completed

#### Problem
Clicking website links in server cards opens in Electron window, forcing app restart.

#### Solution Applied
- Changed from `<a>` tags to `<button>` elements
- Added `e.preventDefault()`
- Uses `window.electronAPI.openExternal()`

---

## 📋 Requirements

### REQ-001: Mac App Store Compliance for File Operations
**Status:** Planning
**Priority:** Critical
**Task Reference:** Task 128

#### Description
All file operations must use Apple-approved APIs for Mac App Store distribution.

#### Key Requirements
1. **File System Operations**
   - Use Node.js `fs` module with proper error handling
   - Use `electron.shell` APIs for system integration
   - Use `electron.dialog` for file/folder selection

2. **Approved Electron APIs**
   - `app.getPath()` for standard directories
   - `dialog.showSaveDialog()` for save operations
   - `shell.openPath()` for opening files

3. **Security Requirements**
   - Request minimal necessary permissions
   - Use scoped file access
   - Implement proper entitlements

4. **Code Signing**
   - All native modules must be signed
   - Use hardened runtime with exceptions

---

### REQ-002: Three-Tier Server Management System
**Status:** In Progress
**Priority:** High
**Task Reference:** Task 57b

#### Description
Implement three-tier server classification: Discovered → Installed → Configured

#### Tier Definitions
1. **Tier 1: Discovered Servers**
   - Found from registry sources
   - NOT shown in Server Catalog
   - Available in Discovery view only

2. **Tier 2: Installed Servers**
   - Installed locally
   - Appear in Server Catalog
   - Available to add to any client

3. **Tier 3: Configured Servers**
   - Added to specific client configurations
   - Have client-specific settings
   - Actively used by the client

#### Display Rules
- **Catalog Selected:** Show Tier 2 only
- **Client Selected:** Show Tier 2 MINUS Tier 3 for that client
- **Discovery View:** Show all Tier 1 with install actions

---

### REQ-003: Integration Plan (Three-Tier Architecture)
**Status:** Planning
**Priority:** High
**Task Reference:** Task 57b

#### Components to Update

##### New Services
- `InstallationService.ts` - Handle npm/pip/cargo installations

##### Store Refactors
- Add three Maps for tier management
- Computed getters for filtering

##### Service Updates
- `McpDiscoveryService.ts` - Feed Tier 1
- `ServerCatalogService.ts` - Return Tier 2 only

##### Component Updates
- `ServerLibrary.tsx` - Fix filtering logic
- `DiscoveryPage.tsx` - Handle Tier 1→2 transitions
- `VisualWorkspace/index.tsx` - Handle Tier 2→3 transitions

---

## 📖 User Stories

### STORY-001: Configuration File Preview with Syntax Highlighting
**Status:** Backlog
**Priority:** Medium
**Task Reference:** Task 129

#### Story
As a user, I want to see the contents of my configuration file when I click on the filename in the status bar.

#### Acceptance Criteria
- [ ] Clicking filename opens inline preview
- [ ] JSON content has syntax highlighting
- [ ] Content is pretty-printed
- [ ] Preview can be dismissed (click outside/ESC)
- [ ] File is validated before display
- [ ] Invalid JSON shows error message

#### Technical Requirements
- Use existing Monaco Editor
- No custom syntax highlighting code
- Pretty-print with 2-space indentation
- Modal or popover display

---

### STORY-002: View Available Servers for Client
**Status:** In Progress
**Priority:** High
**Task Reference:** Task 51, Task 57b

#### Story
As a user, when I select a client, I want to see only servers that are installed but not yet configured for that client.

#### Current Problem
Server Library shows only configured servers instead of available ones.

#### Acceptance Criteria
- [ ] Client view shows installed but not configured servers
- [ ] Visual distinction between available and configured
- [ ] Dragging available server adds to configuration
- [ ] Deleting configured server returns to available

#### Example Scenario
- Given: 20 installed servers, Claude Desktop has 5 configured
- When: User selects Claude Desktop
- Then: Server Library shows 15 available servers

---

## ✅ Tasks (Detailed Implementation)

### TASK-001: Implement Server Filtering Logic
**Status:** In Progress
**Priority:** High
**Links to:** STORY-002, REQ-002

#### Current State
```typescript
// WRONG: Shows configured servers instead of available
if (activeClient && activeClient !== 'catalog' && clientServers) {
  serversToShow = clientServers.map(...);
}
```

#### Required Implementation
```typescript
// CORRECT: Shows available servers (catalog - configured)
if (activeClient && activeClient !== 'catalog') {
  const configured = new Set(clientServers);
  serversToShow = catalog.filter(s =>
    s.installed && !configured.has(s.name)
  );
}
```

#### Files to Modify
- `/src/renderer/components/VisualWorkspace/ServerLibrary.tsx`
- `/src/renderer/store/simplifiedStore.ts`

#### Test Cases
1. Catalog view shows all installed servers
2. Client view shows only non-configured servers
3. All servers configured shows empty available list

---

## 🔄 Migration to Main Tasks.md

### New Task Numbers Assignment

These items will be added to the main tasks.md file with the following numbering:

- **Task 127:** Installation Console Output (from ISSUE-001)
- **Task 128:** Mac App Store Compliance (from REQ-001)
- **Task 129:** Config File Preview (from STORY-001)
- **Task 130:** Consolidate Server Filtering (from TASK-001, merges with Task 51)

### Items Already in Tasks.md
- **Task 57b:** Three-Tier Server Management (covers REQ-002, REQ-003)
- **Task 51:** Server Library Filtering (covers STORY-002)
- **ISSUE-002:** Already fixed in code

---

## 📊 Priority Matrix

### Critical (Sprint 2 Week 1)
- Task 119: Fix Client Library Panel (BUG-009)
- Task 51/130: Server Filtering Logic
- Task 123-126: API Documentation

### High (Sprint 2 Week 2)
- Task 57b: Three-Tier Architecture
- Task 120: Prevent Duplicate Servers
- Task 121-122: Smart Stats Caching

### Medium (Sprint 3)
- Task 127: Installation Console Output
- Task 129: Config File Preview

### Long-term (Future Sprints)
- Task 128: Mac App Store Compliance

---

## 🗑️ Cleanup Actions

After this migration is approved, the following files can be deleted:
- `/docs/issues/ISSUE-001-installation-console-output.md`
- `/docs/issues/ISSUE-002-external-links-navigation.md`
- `/docs/requirements/REQ-001-apple-compliance.md`
- `/docs/requirements/REQ-002-three-tier-server-management.md`
- `/docs/requirements/REQ-003-integration-plan.md`
- `/docs/stories/STORY-001-config-file-preview.md`
- `/docs/stories/STORY-002-available-servers-view.md`
- `/docs/tasks/TASK-001-implement-server-filtering.md`

---

## 📝 Notes

- All items have been cross-referenced with existing tasks
- Some items (like REQ-002) are already partially covered by Task 57b
- ISSUE-002 was already fixed in the code
- Priority assignments based on user impact and dependencies