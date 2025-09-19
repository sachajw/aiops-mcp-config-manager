# Release Notes - v0.1.6

## Release Date: September 2025

## Overview
This release focuses on critical bug fixes for the Visual Workspace, replacing all mock data with real MCP protocol implementations and fixing major usability issues reported by users.

## 🐛 Bug Fixes

### Visual Workspace - Critical Fixes

#### Server Library
- **Fixed**: Server Library showing "No servers found" - now properly displays available MCP servers
- **Fixed**: IPC handler name mismatch preventing catalog loading
- Added complete preload script mappings for server catalog access

#### Performance Insights
- **Fixed**: Metrics not displaying despite connected servers
- **Fixed**: Token count showing as percentage instead of actual numbers
- Implemented real-time metrics collection from actual MCP connections
- Metrics now show:
  - Actual token usage counts (not percentages)
  - Real response times from server connections
  - Live connection status updates

#### Client Management
- **Fixed**: Server counts showing random numbers - now displays actual configuration data
- **Fixed**: Misleading "Connected" status - now properly separates:
  - Client installation status
  - Number of configured servers
- Server counts auto-refresh every 5 seconds
- Clear visual distinction between installed clients and active servers

#### Configuration Management
- **Fixed**: Non-functional gear icon in client cards
- **New**: Client Configuration Dialog for managing file paths
  - Edit configuration file locations
  - Browse for directories
  - Save custom paths per client
  - Reset to defaults option

## 🚀 Improvements

### Real MCP Implementation
- All mock data replaced with real server connections
- Native MCP protocol client with JSON-RPC communication
- Live health monitoring and automatic reconnection
- Actual tool and resource counts from servers

### Visual Workspace Enhancements
- More accurate server status indicators
- Improved connection status clarity
- Better error handling and recovery
- Responsive metric updates

### Developer Experience
- Fixed all TypeScript compilation errors
- Improved build process reliability
- Better error messages for debugging

## 📊 Technical Details

### New Components
- `ClientConfigDialog`: Manage client configuration paths
- Enhanced IPC handlers for metrics and connections
- Real-time server monitoring implementation

### Updated Services
- `MetricsService`: Now collects real server metrics
- `ConnectionMonitor`: Active health checking
- `ServerCatalogService`: Proper catalog integration

### Files Modified
- `src/main/preload.ts`: Added catalog and metrics methods
- `src/main/ipc/handlers.ts`: Implemented missing handlers
- `src/renderer/components/VisualWorkspace/ClientDock.tsx`: Real server counts
- `src/renderer/components/VisualWorkspace/InsightsPanel.tsx`: Fixed token display
- `src/renderer/components/VisualWorkspace/ServerLibrary.tsx`: Catalog integration

## 🔄 Migration Notes

### For Users
- No action required - fixes are automatic
- Custom configuration paths (if set) are preserved
- All existing configurations remain compatible

### For Developers
- IPC handler names have changed - update any custom integrations
- Metrics now return real data structures instead of mock values
- Connection status format has been standardized

## 📝 Known Issues
- Task 117: Server count display format could be clearer (minor issue, will be addressed in next release)
- Client drag-and-drop temporarily disabled (Task 102 for reimplementation)

## 🙏 Acknowledgments
Thanks to our users for reporting these Visual Workspace issues with detailed screenshots and clear reproduction steps. Your feedback helps us improve the application.

## 📚 Documentation
- Updated BUGS.md with all fixed issues
- Updated task tracking with completed items
- New MCP_IMPLEMENTATION.md technical guide

## 🔜 Coming Next (v0.1.7)
- Reimplementation of client card drag-and-drop
- Enhanced server discovery features
- Performance optimizations for large configurations
- Additional keyboard shortcuts

---

For questions or issues, please visit our [GitHub repository](https://github.com/itsocialist/mcp-config-manager)