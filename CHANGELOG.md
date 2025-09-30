# Changelog

All notable changes to MCP Configuration Manager will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.8] - 2025-01-27

### FIXED - All Visual Workspace Save/Load Issues
**All critical bugs from v0.1.7-beta have been resolved**

#### Visual Workspace Save System - Fully Functional
- FIXED: Save button now activates correctly after dragging nodes (Bug-023)
- FIXED: Configuration changes persist to disk properly (Bug-024)
- FIXED: Auto-save functionality implemented with 30-second debounce (Bug-025)
- FIXED: Canvas state persists across page refresh and app restart (Bug-026)

#### System Stability Improvements
- FIXED: Infinite retry loops eliminated with max 5 attempts and exponential backoff (Bug-021)
- FIXED: Claude Desktop no longer launches unexpectedly during app/test runs (Bug-022)

#### Save Architecture Enhancements
- Delete operations now persist correctly to disk
- JSON editor saves now write to disk (not just store)
- Unified save logic across all save paths
- Comprehensive logging for debugging
- Canvas and JSON view stay synchronized

#### Technical Improvements
- localStorage persistence for canvas layout
- Client-specific storage keys for multi-client support
- Proper dirty state management throughout application
- Enhanced IPC handlers for config operations
- Robust error handling and user feedback

### Release Status
**Production Ready** - All release blockers from v0.1.7-beta have been cleared. Visual Workspace save/load functionality is fully operational and verified by QA.

---

## [0.1.7-beta] - 2025-01-27

### 🔥 Major Performance Improvements
- **FIXED**: Critical metrics performance issue - client switching now <200ms (was 30+ seconds)
- Implemented cache-first strategy with 5-minute TTL
- Smart background refresh with exponential backoff
- Connection pooling (max 3 concurrent connections)
- Failed servers no longer block UI operations

### 🛠️ Configuration Management
- **FIXED**: Claude Code project config path to match specification (`.claude/mcp.json`)
- Updated path resolution for proper project scope detection
- Enhanced configuration service architecture
- Improved IPC handler reliability

### 📋 Bug Fixes & Testing Infrastructure
- Fixed 12 bugs during Sprint 3 Week 2 (exceptional achievement)
- Added comprehensive debugging framework for save/load operations
- Implemented real-time file monitoring for testing
- Enhanced Visual Workspace change detection

### 📚 Documentation & QA
- Created comprehensive Sprint 4 work items documentation
- Updated bug audit tracking with verification protocols
- Added detailed testing procedures for all critical paths
- Enhanced developer debugging tools

### ⚠️ **Known Issues (Release Blockers)**
The following critical issues prevent full production use:

#### 🔴 Visual Workspace Save/Load System
- **Bug-023**: Save button does not activate after dragging nodes on canvas
- **Bug-024**: Configuration changes not persisting to disk
- **Bug-025**: Auto-save functionality not implemented
- **Bug-026**: Canvas state lost on page refresh

#### 🟡 System Stability
- **Bug-021**: Infinite retry loops for failed server connections
- **Bug-022**: Claude Desktop launches unexpectedly during app/test runs

#### 🟡 UI Polish (8 remaining issues)
- Various Visual Workspace layout and interaction improvements needed
- Project scope display issues
- Discovery page installation errors

### 🚧 **Beta Release Notes**
This release significantly improves performance but **Visual Workspace save/load is non-functional**.
Recommended for testing performance improvements only. Production use should wait for v0.1.8
when all save/load issues are resolved.

### 🎯 **Next Release (v0.1.8 - Target: Feb 2, 2025)**
- Fix all Visual Workspace save/load issues (Bug-023 through Bug-026)
- Implement proper retry limiting for failed connections
- Complete UI polish for production readiness

---

## [0.1.6] - 2025-09-19

### Fixed
- Server Library now properly displays available MCP servers (was showing "No servers found")
- Performance Insights panel displays real metrics instead of mock data
- Token usage shows actual counts instead of hardcoded 75% percentage
- Client server counts display real configuration data instead of random numbers
- Connection status properly separated into "Client Installed" and "Servers Configured"
- Gear icon on client cards now opens configuration path dialog
- Server count format improved for clarity

### Added
- Client Configuration Dialog for managing file paths
- Real-time metrics collection from MCP servers
- Automatic refresh of server counts (every 5 seconds)
- Browse functionality for configuration paths
- Custom path storage in localStorage

### Changed
- All mock data replaced with real MCP protocol implementations
- IPC handler names standardized for consistency
- Improved visual distinction between client and server status
- Enhanced error messages for better debugging

### Technical
- Fixed TypeScript compilation errors in service layer
- Proper integration of MetricsService and ConnectionMonitor
- Added missing IPC handlers for catalog and metrics
- Corrected method signatures for service calls

## [0.1.5] - 2025-09-18

### Added
- Native MCP Protocol implementation
- Real server connections with JSON-RPC
- Live server metrics and monitoring
- Connection health checks with auto-reconnect
- Visual Workspace with React Flow
- Server Discovery with 100+ MCP servers
- Kiro and Windsurf client support

### Changed
- Replaced simulated connections with real MCP protocol
- Updated to Electron 28
- Enhanced drag-and-drop functionality

## [0.1.4] - 2025-09-17

### Added
- Visual Workspace interface
- Server Library panel
- Client dock for switching
- Performance insights panel
- Drag-and-drop server configuration

### Fixed
- Configuration validation issues
- Backup system reliability
- External change detection

## [0.1.3] - 2025-09-16

### Added
- Multi-client synchronization
- Bulk operations support
- Import/Export functionality
- Configuration templates

### Changed
- Improved UI responsiveness
- Enhanced error messages
- Better validation feedback

### Fixed
- JSON parsing errors with comments
- File permission issues on macOS
- Memory leaks in file monitoring

## [0.1.2] - 2025-09-15

### Added
- Backup and restore functionality
- External change monitoring
- Configuration scope management
- Auto-save functionality

### Changed
- Improved Monaco editor performance
- Enhanced dark theme support
- Better client detection logic

### Fixed
- Client path resolution on Windows
- JSON syntax highlighting
- Configuration merge conflicts

## [0.1.1] - 2025-09-14

### Added
- Support for Claude Code
- Support for Gemini clients
- Advanced JSON validation
- Keyboard shortcuts

### Fixed
- Initial load performance
- Client detection on Linux
- Configuration save errors

## [0.1.0] - 2025-09-13

### Added
- Initial release
- Support for Claude Desktop
- Support for VS Code
- Form-based configuration editor
- JSON editor with Monaco
- Automatic client detection
- Basic validation