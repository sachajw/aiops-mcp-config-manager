# Changelog

All notable changes to MCP Configuration Manager will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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