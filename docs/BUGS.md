# Bug Tracking

## Critical Bugs (Blocking Core Functionality)

### BUG-001: Server Library Empty - IPC Handler Mismatch
- **Status**: Fixed
- **Priority**: Critical
- **Component**: ServerLibrary, IPC
- **Description**: Server Library shows "No servers found" due to frontend calling `getCatalogServers` but backend provides `catalog:getServers`
- **Impact**: Users cannot see or browse available MCP servers
- **Fix**: Task 110

### BUG-002: Performance Metrics Not Displaying
- **Status**: Fixed
- **Priority**: Critical
- **Component**: InsightsPanel, MetricsService
- **Description**: Despite servers being connected, no metrics show in Performance Insights
- **Root Cause**: Missing `getTotalMetrics` IPC handler, ConnectionMonitor not actively monitoring
- **Impact**: No visibility into server performance
- **Fix**: Task 111

### BUG-003: Client Server Counts Using Random Numbers
- **Status**: Fixed
- **Priority**: Critical
- **Component**: ClientDock
- **Description**: Server counts shown as random numbers: `Math.floor(Math.random() * 5)`
- **Impact**: Completely inaccurate server count information
- **Fix**: Task 113

## Major Bugs (Significant UX Issues)

### BUG-004: Tokens Displayed as Percentage
- **Status**: Fixed
- **Priority**: Major
- **Component**: InsightsPanel
- **File**: `src/renderer/components/VisualWorkspace/InsightsPanel.tsx:139`
- **Description**: Token count shows "75%" badge instead of actual number
- **Impact**: Users can't see actual token usage
- **Fix**: Task 112

### BUG-005: Misleading "Connected" Status
- **Status**: Fixed
- **Priority**: Major
- **Component**: ClientDock
- **Description**: Shows client installation status, not MCP server connections
- **Impact**: Users confused about what "Connected" means
- **Fix**: Task 114

### BUG-006: Non-Functional Gear Icon
- **Status**: Fixed
- **Priority**: Major
- **Component**: ClientDock
- **File**: `src/renderer/components/VisualWorkspace/ClientDock.tsx:86-90`
- **Description**: Gear icon clicks do nothing (TODO comment in code)
- **Impact**: Cannot access client configuration settings
- **Fix**: Task 115

## Minor Bugs (Polish/Clarity)

### BUG-007: Unclear Server Count Format
- **Status**: Fixed
- **Priority**: Minor
- **Component**: ClientDock
- **Description**: "14 servers, 8 active" format is unclear
- **Expected**: Should clearly indicate what each number means
- **Fix**: Task 117

### BUG-008: Missing Configuration Path UI
- **Status**: Fixed
- **Priority**: Major
- **Component**: Settings/ClientManagement
- **Description**: No UI to configure client file paths as requested in backlog
- **Impact**: Users cannot modify configuration file locations
- **Fix**: Task 116

## Fixed Bugs

### BUG-092: Server Drag-and-Drop Not Working
- **Status**: Fixed
- **Fixed In**: Previous session
- **Description**: Servers couldn't be dragged from library

### BUG-093: Client Selection Not Working
- **Status**: Fixed
- **Fixed In**: Previous session
- **Description**: Clicking clients didn't select them
- **Side Effect**: Removed client drag functionality (Task 102)

## Bug Statistics

- **Total Open Bugs**: 8
- **Critical**: 3
- **Major**: 4
- **Minor**: 1
- **Fixed**: 2