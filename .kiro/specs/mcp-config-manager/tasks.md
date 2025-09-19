# Implementation Plan

## ⚠️ CRITICAL: UI Elements Currently Using Mock/Hardcoded Data

The following UI features are currently displaying mock or hardcoded data and need backend implementation:

### Visual Workspace
- **Token usage** (hardcoded as 2500) - Task 50
- **Tools count** (hardcoded as 15) - Task 50
- **Connection status** (always shows as connected) - Task 52
- **Performance metrics** (not collected) - Task 55
- **Drag-and-drop** (doesn't modify actual configs) - Task 57

### Server Library
- **Server list** (partially hardcoded categories) - Task 51
- **Server availability** (not checked) - Task 51
- **Drag to add** (doesn't add to real config) - Task 57

### Discovery Page
- **Install button** (doesn't actually install) - Task 53
- **Update notifications** (not implemented) - Task 58
- **Ratings/reviews** (mock data) - Task 58
- **Installation status** (not tracked) - Task 53

### Insights Panel
- **All metrics** (completely mock data) - Task 55
- **Performance graphs** (static placeholders) - Task 55
- **Connection health** (not monitored) - Task 52

### Server Management
- **Test Connection** (partial implementation) - Task 56
- **Enable/Disable toggle** (UI only, no backend) - Task 54
- **Server status indicators** (not real-time) - Task 52

### Other Features
- **Backup count** (may not reflect actual backups) - Task 60
- **Client running status** (not checked) - Task 61
- **Scope conflict detection** (partial) - Task 62
- **Bulk operations progress** (UI only) - Task 64

## Implementation Plan

- [x] 1. Set up project structure and development environment
  - Initialize Electron + React + TypeScript project with proper build configuration
  - Configure development tools (ESLint, Prettier, Jest)
  - Set up Electron main and renderer process structure
  - _Requirements: Foundation for all subsequent development_

- [x] 2. Implement core data models and TypeScript interfaces
  - Define TypeScript interfaces for MCPClient, MCPServer, Configuration, and related types
  - Create enums for ClientType, ConfigScope, and status types
  - Implement data validation schemas using Zod or similar
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1_

- [x] 3. Create file system utilities and path resolution
  - Implement macOS-specific path resolution for different MCP clients
  - Create file system utilities for reading/writing JSON configurations
  - Add error handling for file permission and access issues
  - _Requirements: 5.1, 5.2, 5.3, 6.4_

- [x] 4. Build configuration parsing and validation engine
  - Implement JSON5 parser for flexible configuration reading
  - Create configuration validation logic with detailed error reporting
  - Add schema validation for different client configuration formats
  - _Requirements: 7.1, 7.2, 7.3, 5.4_

- [x] 5. Implement MCP client discovery system
  - Create client detection logic for Claude Desktop, Claude Code, Codex, VS Code, Gemini Desktop, and Gemini CLI
  - Implement client status checking (active/inactive detection) 
  - Add client version detection and compatibility checking
  - _Requirements: 1.1, 1.2, 1.5, 5.4_

- [x] 6. Develop configuration scope management
  - Implement scope hierarchy resolution (project > local > user > global)
  - Create scope conflict detection and resolution logic
  - Add configuration merging across different scopes
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 7. Build configuration manager core functionality
  - Implement ConfigurationManager class with CRUD operations
  - Add configuration loading and saving for different clients and scopes
  - Create configuration export/import functionality
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 8. Implement file monitoring and change detection
  - Set up chokidar-based file system monitoring for configuration files
  - Create external change detection and conflict resolution
  - Add real-time configuration refresh when files change externally
  - _Requirements: 6.1, 6.2, 6.3, 6.5_

- [x] 9. Create backup and recovery system
  - Implement automatic backup creation before configuration changes
  - Build backup listing and restoration functionality
  - Add backup cleanup and retention policies
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 10. Build server configuration and testing functionality
  - Implement MCP server configuration form validation
  - Create server connection testing with timeout and error handling
  - Add command path validation and executable checking
  - _Requirements: 3.1, 3.2, 3.3, 3.5, 7.3_

- [x] 11. Develop React UI component library
  - Create reusable UI components using Ant Design
  - Implement ClientListPanel with tree view and status indicators
  - Build ServerManagementPanel with CRUD operations
  - _Requirements: 1.2, 1.3, 3.1, 4.3_

- [x] 12. Implement main application layout and navigation
  - Create main window layout with three-panel design
  - Implement tabbed configuration editor interface
  - Add status bar with real-time indicators
  - _Requirements: 1.2, 4.3, 6.2_

- [x] 13. Build configuration editor with dual modes
  - Implement form-based configuration editor for user-friendly editing
  - Integrate Monaco Editor for advanced JSON editing with syntax highlighting
  - Add real-time validation feedback in both editor modes
  - _Requirements: 1.4, 3.1, 7.1, 7.2_

- [x] 14. Create server configuration dialog
  - Build modal dialog for adding/editing MCP servers
  - Implement form fields for all server properties (command, args, env, cwd)
  - Add server testing functionality within the dialog
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 15. Implement scope management UI
  - Create scope selector dropdown with visual hierarchy
  - Build scope conflict resolution dialog
  - Add scope migration functionality between different levels
  - _Requirements: 4.1, 4.3, 4.4, 4.5_

- [x] 16. Develop bulk operations and synchronization
  - Implement multi-client server addition/removal
  - Create configuration synchronization between clients
  - Add diff view for comparing configurations before sync
  - _Requirements: 2.1, 2.4, 2.5_

- [x] 17. Build error handling and user feedback system
  - Implement centralized error handling with user-friendly messages
  - Create error recovery suggestions and auto-fix capabilities
  - Add validation error highlighting in forms and editors
  - _Requirements: 7.2, 7.3, 7.4, 7.5_

- [x] 18. Implement application state management
  - Set up Zustand store for application state
  - Create state management for configurations, clients, and UI state
  - Add persistence for user preferences and window state
  - _Requirements: 1.2, 6.2, 6.3_

- [x] 19. Add settings and preferences system
  - Create settings dialog for application preferences
  - Implement backup settings and retention policies
  - Add theme selection and UI customization options
  - _Requirements: 8.4, user experience enhancement_

- [x] 20. Implement Electron main process integration
  - Set up IPC communication between main and renderer processes
  - Implement file system operations in main process for security
  - Add native menu bar and application lifecycle management
  - _Requirements: Security and platform integration_

- [x] 21. Create comprehensive test suite
  - Write unit tests for all core business logic components
  - Implement integration tests for file operations and configuration management
  - Add UI component tests using React Testing Library
  - _Requirements: Quality assurance for all implemented features_

- [x] 22. Build application packaging and distribution
  - Configure Electron Builder for macOS app bundle creation
  - Set up code signing and notarization for macOS distribution
  - Create DMG installer with proper application setup
  - _Requirements: Deployment and distribution readiness_

- [ ] 23. Implement error reporting and logging
  - Add comprehensive logging throughout the application
  - Create error reporting mechanism for debugging
  - Implement crash recovery and state restoration
  - _Requirements: Production readiness and maintenance_

- [ ] 24. Add performance optimizations
  - Implement lazy loading for configuration data
  - Add caching for frequently accessed configurations
  - Optimize React rendering with memoization
  - _Requirements: Performance and user experience_

- [x] 25. Create user onboarding and help system
  - Implement first-run setup wizard
  - Add contextual help and tooltips throughout the UI
  - Create documentation and user guide integration
  - _Requirements: User adoption and ease of use_

## New Feature Tasks (High Priority - September 2025)

- [x] 26. Implement landing page with loading state
  - Create LandingPage component that displays immediately on launch
  - Add loading progress indicators while detecting clients/servers
  - Implement "Get Started" button to enter main interface
  - Smooth transition animation from landing to main app
  - _Requirements: Improved perceived performance, better first impression_

- [ ] 27. Fix UI responsiveness - sticky server name column
  - Make server name column always visible with horizontal scrolling
  - Implement sticky column headers
  - Add responsive table layout for different screen sizes
  - Ensure proper scrolling behavior on all platforms
  - _Requirements: Core usability improvement for users with many servers_

- [ ] 28. Add server enable/disable toggle
  - Implement toggle switch UI component for each server
  - Store enabled/disabled state in configuration (where supported)
  - Visual indication of disabled servers (grayed out appearance)
  - Bulk enable/disable operations for multiple servers
  - _Requirements: Improved workflow for testing and debugging_

- [ ] 29. Add Cursor client support
  - Research Cursor configuration file location and format
  - Implement Cursor client detector and configuration handler
  - Add Cursor to client type enum and interfaces
  - Full feature parity with existing VS Code implementation
  - _Requirements: Expand support to popular AI-powered IDE_

- [ ] 30. Add Windsurf and Kiro client support
  - Research Windsurf configuration location and MCP support
  - Research Kiro platform MCP integration capabilities
  - Implement client detectors for both platforms
  - Add to client discovery system
  - _Requirements: Broader platform support_

- [ ] 31. Implement featured servers section
  - Create 2x2 grid component for landing page
  - Curate list of popular, stable MCP servers
  - Implement one-click installation flow
  - Add server cards with icons, descriptions, and install buttons
  - _Requirements: Help new users get started quickly_

- [X] 32. Create user guide with screenshots
  - Build comprehensive help documentation system
  - Create step-by-step tutorials with screenshots
  - Document common use cases and workflows
  - Add troubleshooting section
  - _Requirements: Improve user onboarding and reduce support burden_

- [X] 33. Implement custom client support
  - Create UI for defining custom clients
  - Allow specification of name, config path, and format
  - Store custom client definitions in app settings
  - Ensure full feature parity with built-in clients
  - _Requirements: Support for proprietary or custom AI tools_

- [!] 34. Add client management in settings
  - Create settings page for enabling/disabling client detection
  - Implement UI to show/hide specific clients
  - Performance optimization by skipping disabled clients
  - Persist client preferences across app restarts
  - _Requirements: User control over client discovery_

## MCP Discovery Feature (Experimental)

- [x] 40. Add experimental feature flag for MCP discovery
  - Update AppSettings interface with experimental features
  - Add UI toggle in Advanced Settings > Experimental section
  - Persist feature flag state to local storage
  - _Requirements: Feature flag control, experimental features_

- [x] 41. Create MCP Discovery service
  - Implement catalog fetching logic with API integration
  - Add local caching mechanism for offline browsing
  - Handle API errors and network failures gracefully
  - _Requirements: Server catalog access, data fetching_

- [x] 42. Design catalog data models
  - Define TypeScript interfaces for McpServerEntry, Catalog
  - Create Zustand store for catalog state management
  - Implement data validation and sanitization
  - _Requirements: Type safety, state management_

- [x] 43. Build Discovery UI components
  - Create Discovery tab/page component (conditionally rendered)
  - Design server card components with visual appeal
  - Implement server details modal with full information
  - _Requirements: User interface, server browsing_

- [x] 44. Integrate Discovery with main navigation
  - Add Discovery option to navigation when feature enabled
  - Handle routing and page transitions
  - Update menu items dynamically based on feature flag
  - _Requirements: Navigation integration, conditional rendering_

- [ ] 45. Implement server browsing functionality
  - Display paginated server catalog with lazy loading
  - Show server metadata (author, version, downloads)
  - Add category-based organization
  - _Requirements: Browse and discover servers_

- [ ] 46. Add search and filtering capabilities
  - Implement text-based server search
  - Add category and tag filters
  - Sort by popularity, name, or date
  - _Requirements: Find specific servers quickly_

- [ ] 47. Create installation workflow
  - Download server packages from registry
  - Extract and place files in correct locations
  - Update client configurations automatically
  - _Requirements: One-click installation_

- [ ] 48. Add installation progress tracking
  - Show real-time download progress
  - Display installation steps and status
  - Handle cancellation and cleanup
  - _Requirements: User feedback, progress visibility_

- [ ] 49. Implement comprehensive error handling
  - Network error recovery with retry logic
  - Installation failure rollback
  - User-friendly error messages and recovery paths
  - _Requirements: Reliability, error recovery_

## Backend Reality Tasks (CRITICAL - Ensure UI Data is Real)

- [ ] 50. Implement real metrics collection for Visual Workspace
  - Create metrics service to track actual token usage per server
  - Implement tool counting from actual MCP server manifests
  - Add connection status monitoring (real health checks)
  - Store and aggregate performance data over time
  - _Requirements: Visual Workspace shows real data, not hardcoded values_

- [ ] 51. Connect Server Library to actual data sources
  - Populate Server Library from actual discovered MCP servers
  - Implement real categorization based on server metadata
  - Add actual server availability checking
  - Remove hardcoded server lists and categories
  - _Requirements: Server Library shows real available servers_

- [ ] 52. Implement real connection status monitoring
  - Create WebSocket or IPC connections to MCP servers
  - Monitor actual connection health and latency
  - Implement reconnection logic and error states
  - Update Visual Workspace cables based on real status
  - _Requirements: Connection status reflects actual server state_

- [ ] 53. Build actual server installation backend
  - Implement NPM package installation for MCP servers
  - Handle GitHub repository cloning and setup
  - Manage Python/pip installations for Python-based servers
  - Track installation progress and handle failures
  - _Requirements: Discovery "Install" button actually installs servers_

- [ ] 54. Implement real server enable/disable functionality
  - Modify actual configuration files to enable/disable servers
  - Handle client-specific enable/disable mechanisms
  - Persist state across application restarts
  - Update UI to reflect actual enabled state
  - _Requirements: Toggle switches actually enable/disable servers_

- [ ] 55. Create real performance metrics tracking
  - Implement actual response time measurement
  - Track real memory and CPU usage per server
  - Count actual API calls and tool invocations
  - Store metrics data for historical analysis
  - _Requirements: Insights Panel shows real performance data_

- [ ] 56. Build actual server testing functionality
  - Implement real connection testing with timeouts
  - Execute actual server commands to verify functionality
  - Parse and validate server responses
  - Report detailed error messages from actual failures
  - _Requirements: "Test Connection" performs real server tests_

- [ ] 57. Implement real drag-and-drop configuration
  - Actually add servers to configuration when dropped
  - Update real configuration files on canvas changes
  - Persist node positions and connections
  - Handle drag-and-drop validation and conflicts
  - _Requirements: Visual Workspace drag-and-drop modifies real configs_

- [ ] 58. Connect Discovery to real MCP registries
  - Implement actual API calls to MCP registry
  - Parse and cache real server catalog data
  - Handle pagination and lazy loading of real data
  - Implement real search against actual server metadata
  - _Requirements: Discovery shows real servers from actual sources_

- [ ] 59. Implement real configuration validation
  - Validate actual command paths and executables
  - Check real environment variable requirements
  - Verify actual port availability for servers
  - Test actual file permissions and access rights
  - _Requirements: Validation reflects actual system state_

- [ ] 60. Build real backup and restore functionality
  - Create actual backup files with timestamps
  - Implement real restoration of configuration files
  - Handle actual file system operations and permissions
  - Manage real backup retention and cleanup
  - _Requirements: Backup/restore actually saves and restores configs_

- [ ] 61. Implement real client detection and status
  - Check actual process lists for running clients
  - Monitor real client configuration file changes
  - Detect actual client version numbers
  - Track real client installation/uninstallation
  - _Requirements: Client status reflects actual system state_

- [ ] 62. Create real scope resolution system
  - Implement actual file system hierarchy traversal
  - Merge real configurations from multiple scopes
  - Handle actual scope conflicts and precedence
  - Apply real scope-specific settings to clients
  - _Requirements: Scope system actually resolves configurations_

- [ ] 63. Build real export/import functionality
  - Generate actual export packages with all dependencies
  - Implement real import with validation and conflict resolution
  - Handle actual file format conversions between clients
  - Create real shareable configuration bundles
  - _Requirements: Export/import actually transfers configurations_

- [ ] 64. Implement real bulk operations backend
  - Execute actual bulk configuration changes
  - Handle real transaction rollback on failures
  - Process actual batch server installations
  - Apply real bulk enable/disable operations
  - _Requirements: Bulk operations actually modify multiple configs_

## AI-Powered Code Review Tasks (HIGH PRIORITY - External Audit)

- [ ] 94. Conduct architecture review with ChatGPT
  - Export project structure and key architectural decisions
  - Submit to ChatGPT for architectural analysis
  - Focus on scalability, maintainability, and design patterns
  - Document recommended architectural improvements
  - Create action plan for architectural refactoring
  - _Requirements: External AI review for architecture validation_

- [ ] 95. Perform code quality review with ChatGPT
  - Submit core components for code review
  - Focus on React patterns, TypeScript usage, and best practices
  - Identify code smells and anti-patterns
  - Get recommendations for performance optimizations
  - Document refactoring priorities
  - _Requirements: External AI review for code quality_

- [ ] 96. Execute security audit with ChatGPT
  - Submit security-critical code for review
  - Focus on Electron security, IPC safety, file system access
  - Identify potential vulnerabilities
  - Get recommendations for security hardening
  - Create security improvement checklist
  - _Requirements: External AI security audit_

- [ ] 97. Conduct architecture review with Gemini
  - Submit same architecture for second opinion
  - Compare recommendations with ChatGPT review
  - Focus on different perspectives and approaches
  - Identify consensus areas and conflicts
  - Merge best recommendations from both
  - _Requirements: Second AI opinion on architecture_

- [ ] 98. Perform code quality review with Gemini
  - Submit same code for alternative review
  - Focus on different aspects than ChatGPT review
  - Get fresh perspective on improvements
  - Compare and contrast recommendations
  - Create unified improvement plan
  - _Requirements: Second AI opinion on code quality_

- [ ] 99. Execute security audit with Gemini
  - Submit security code for additional review
  - Cross-reference with ChatGPT findings
  - Identify any missed vulnerabilities
  - Get alternative security solutions
  - Create comprehensive security plan
  - _Requirements: Second AI security audit_

- [ ] 100. Create unified improvement plan from AI reviews
  - Synthesize all AI recommendations
  - Prioritize improvements by impact and effort
  - Create detailed implementation roadmap
  - Assign tasks to specific components
  - Set measurable success criteria
  - _Requirements: Consolidated action plan from all AI reviews_

## Bug Fix Tasks (CRITICAL - User-Reported Issues)

- [ ] 92. Diagnose and fix client drag-and-drop issues
  - Review Visual Workspace drag-and-drop implementation with user
  - Debug DndContext and drop zone configuration
  - Fix server library to canvas drop functionality
  - Test drag-and-drop across different browsers/environments
  - Ensure proper state updates when servers are dropped
  - _Requirements: User-reported bug - drag-and-drop not working properly_

- [ ] 93. Diagnose and fix client selection issues
  - Review ClientSelector component implementation with user
  - Debug client switching functionality
  - Fix state synchronization when changing clients
  - Ensure server list updates correctly on client change
  - Test client persistence across app restarts
  - _Requirements: User-reported bug - client selection not working properly_

## First-Use Onboarding Tour Tasks (High Priority)

- [ ] 75. Design and implement tour framework
  - Select tour library (Intro.js, Shepherd.js, or custom)
  - Create tour service for managing tour state
  - Implement tour overlay and highlighting system
  - Add keyboard navigation support
  - _Requirements: Requirement 9 - Interactive onboarding tour framework_

- [ ] 76. Create tour content and steps
  - Write copy for each tour step (8 steps total)
  - Design tooltip styling to match app theme
  - Create smooth transitions between steps
  - Add progress indicator showing current step
  - _Requirements: Requirement 9 - Tour content requirements_

- [ ] 77. Implement tour persistence and settings
  - Store tour completion state in local storage
  - Add first-launch detection logic
  - Create "Show Tour" option in Settings
  - Implement tour reset functionality
  - _Requirements: Requirement 9 - Tour state persistence_

- [ ] 78. Build tour UI components
  - Create tour overlay component
  - Build Next/Previous/Skip button controls
  - Implement spotlight effect for highlighted elements
  - Add tooltip positioning logic
  - _Requirements: Requirement 9 - Tour UI elements_

- [ ] 79. Add smart tour progression
  - Detect when user completes described action
  - Auto-advance on action completion
  - Handle missing UI elements gracefully
  - Save progress if app closes mid-tour
  - _Requirements: Requirement 9 - Smart tour behavior_

- [ ] 80. Create tour accessibility features
  - Add ARIA labels and roles
  - Implement keyboard navigation (Tab, Enter, Escape)
  - Ensure screen reader compatibility
  - Test with accessibility tools
  - _Requirements: Requirement 9 - Accessibility requirements_

- [ ] 81. Add tour analytics and improvement
  - Track where users skip the tour
  - Log which steps users spend most time on
  - Identify common drop-off points
  - Create metrics for tour effectiveness
  - _Requirements: Tour improvement and optimization_

## Promised Features Not Yet Tasked (From Documentation)

- [ ] 82. Develop AI-Powered Suggestions
  - Integrate AI model for recommendations
  - Analyze usage patterns for suggestions
  - Create suggestion UI components
  - Implement learning from user feedback
  - _Requirements: README promise - Smart server recommendations_

- [ ] 83. Create Advanced Analytics Dashboard
  - Build comprehensive metrics visualization
  - Implement historical data analysis
  - Add performance trend charts
  - Create usage reports and exports
  - _Requirements: README promise - Detailed usage insights_

- [ ] 84. Implement Configuration Templates
  - Create template library system
  - Build pre-configured templates for common use cases
  - Add template import/export functionality
  - Implement template customization UI
  - _Requirements: Feature mentioned but not implemented_

- [ ] 85. Add Server Ratings and Reviews
  - Build rating system backend
  - Create review submission interface
  - Implement community moderation
  - Add rating display in Discovery
  - _Requirements: Server Marketplace feature completion_

- [ ] 86. Implement Configuration Version Control
  - Create git-like versioning system
  - Build diff viewer for changes
  - Implement rollback functionality
  - Add commit messages for changes
  - _Requirements: Configuration history with rollback_

- [ ] 87. Build Auto-Reconnection System
  - Implement connection health monitoring
  - Create reconnection logic with exponential backoff
  - Add connection status notifications
  - Build connection retry configuration
  - _Requirements: Connection health monitoring feature_

- [ ] 88. Implement Configuration Merge on Import
  - Build intelligent merge algorithm
  - Create conflict detection system
  - Implement conflict resolution UI
  - Add preview before merge
  - _Requirements: Requirement 2.4 from requirements.md_

- [ ] 89. Create Auto-Recovery System
  - Implement automatic error detection
  - Build recovery strategies for common issues
  - Create recovery action queue
  - Add recovery status reporting
  - _Requirements: Requirement 7 - Auto-fix capabilities_

- [ ] 90. Build Configuration Repair Tool
  - Implement JSON repair algorithms
  - Create schema-based validation and fixing
  - Add backup before repair
  - Build repair report generation
  - _Requirements: Requirement 5.5 - Auto-repair corrupted configs_

- [ ] 91. Optimize External Change Detection
  - Implement efficient file watching (5-second target)
  - Add intelligent polling for network drives
  - Create change batching system
  - Optimize performance for many files
  - _Requirements: Requirement 6.1 - 5-second detection target_

## UI Redesign Tasks (Phase 3 - Lower Priority)

- [ ] 35. Implement responsive layout foundation
  - Create AppLayout component with header + sidebar + content structure
  - Implement Header component with branding and global actions
  - Create responsive Sidebar component with entity navigation
  - Update routing structure for page-based navigation
  - _Requirements: Mobile-responsive design, browser width compatibility_

- [ ] 36. Create dashboard components
  - Build LandingPage component with welcome and guidance
  - Implement quick action cards for launching wizards
  - Add system status overview and health monitoring
  - Create getting started guide for new users
  - _Requirements: User onboarding, common operations access_

- [ ] 37. Refactor entity pages
  - Convert existing panels to page-based structure (Clients, Servers, Scopes)
  - Create dedicated Tools page for utilities
  - Implement page-specific navigation and actions
  - Ensure all existing functionality is preserved
  - _Requirements: Entity type navigation, detail views_

- [ ] 38. Implement wizard framework
  - Create reusable wizard framework with step navigation
  - Build ServerSetupWizard for guided server configuration
  - Implement ClientConfigWizard for initial client setup
  - Add ImportExportWizard for configuration migration
  - _Requirements: Common operations wizards, guided workflows_

## New Tasks (Added During Development)

- [ ] 101. Implement Multi-Server Configuration Saving
  - Add visible auto-save toggle for Visual Workspace
  - Implement manual save functionality for multi-server configs
  - Show which servers are being added/modified
  - Add confirmation dialog for bulk changes
  - Store multi-client configurations properly
  - _Related to: Visual Workspace drag-and-drop functionality_

- [ ] 102. Reimplement Client Card Drag-and-Drop (Without Breaking Selection)
  - Make client cards draggable to canvas for multi-client setups
  - Ensure single-click still selects the client
  - Use drag activation distance (e.g., 10px) before drag starts
  - Keep drop functionality to receive servers
  - Test that both selection and dragging work properly
  - _Note: Previously removed to fix selection bug - needs proper implementation_

## Visual Workspace Bug Fixes (Critical)

- [x] 110. Fix Server Library Display (BUG-001)
  - Fix IPC handler name mismatch (getCatalogServers → catalog:getServers)
  - Update preload script with proper method mapping
  - Test server catalog loading from backend
  - Verify both discovery and installed servers appear
  - _Priority: Critical - Blocks core functionality_

- [x] 111. Implement Real Metrics Collection (BUG-002)
  - Create getTotalMetrics IPC handler in main process
  - Connect MetricsService to aggregate MCPClient metrics
  - Ensure ConnectionMonitor actively monitors configured servers
  - Update InsightsPanel to display real metrics
  - Test with actual MCP server connections
  - _Priority: Critical - Core feature not working_

- [x] 112. Fix Token Display Format (BUG-004)
  - Remove hardcoded "75%" badge from InsightsPanel
  - Display actual token count from metrics
  - Keep percentage only for progress bar visualization
  - Format large numbers with commas
  - _Priority: Major - Misleading information_

- [x] 113. Fix Client Server Counts (BUG-003)
  - Replace Math.floor(Math.random() * 5) with real data
  - Get actual server count from client configuration
  - Show active connections from ConnectionMonitor
  - Update counts when servers are added/removed
  - _Priority: Major - Completely inaccurate data_

- [x] 114. Clarify Connection Status Indicators (BUG-005)
  - Separate "Client Installed" from "Servers Connected"
  - Add two distinct status indicators
  - Show number of active server connections
  - Update status in real-time as connections change
  - _Priority: Major - Confusing UX_

- [x] 115. Implement Gear Icon Functionality (BUG-006)
  - Create client configuration dialog component
  - Display configuration file paths
  - Allow path editing with validation
  - Add file picker for path selection
  - Connect to UnifiedConfigService for saving
  - _Priority: Major - Missing functionality_

- [x] 116. Add Configuration Path UI to Settings (BUG-008)
  - Add new section in Client Management tab
  - Display current configuration file paths for each client
  - Implement inline path editor with validation
  - Add "Browse" button for file picker
  - Save path changes to app settings
  - Show same UI as gear icon (reuse component)
  - _Priority: Major - Requested feature missing_

- [ ] 117. Improve Server Count Display Format (BUG-007)
  - Change from "14 servers, 8 active" to clearer format
  - Options: "8/14 active" or separate lines
  - Add tooltips explaining what each number means
  - Consider using badges for better visibility
  - _Priority: Minor - Polish improvement_

