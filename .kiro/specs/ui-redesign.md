# My MCP Manager - UI Feature Specification

## Overview

This document outlines the UI features and improvements for My MCP Manager, focusing on enhanced functionality, better user experience, and expanded platform support.

## Current Issues to Address

- Server name column not always visible with many servers
- No loading feedback on app startup
- Cannot temporarily disable servers for testing
- Limited client platform support
- No quick-start options for new users

## New Feature Requirements

### 1. Server Enable/Disable Toggle
- Add toggle switch to enable/disable servers without removing configuration
- Store enabled state in configuration files (where supported by client spec)
- Visual indication of disabled servers (grayed out)
- Bulk enable/disable operations

### 2. Additional Client Support
- **Cursor**: Popular AI-powered IDE based on VS Code
- **Windsurf**: AI development environment
- **Kiro**: AI-assisted coding platform
- Configuration paths to be determined during implementation

### 3. Custom Client Support
- Allow users to define custom clients with:
  - Client name
  - Configuration file path
  - Configuration format (JSON/JSON5/TOML)
- Store custom client definitions in app settings
- Full feature parity with built-in clients

### 4. Client Management in Settings
- Settings page to enable/disable client detection
- Hide disabled clients from UI
- Performance optimization by skipping disabled clients
- Persist client preferences

### 5. UI Responsiveness Fixes
- Server name column should always be visible
- Implement horizontal scrolling for additional columns
- Sticky column headers
- Responsive table layout for different screen sizes

### 6. Landing Page with Loading State
- Display landing page immediately on app launch
- Show loading progress while detecting clients/servers
- "Get Started" button to enter main interface
- Smooth transition from landing to main app

### 7. Featured Servers Section
- 2x2 grid of popular MCP servers on landing page
- One-click installation for featured servers
- Server cards with:
  - Icon and name
  - Brief description
  - "Install" button
  - GitHub stars/popularity indicator
- Curated list of beginner-friendly servers

### 8. User Guide with Screenshots
- Comprehensive user guide accessible from help menu
- Step-by-step tutorials with screenshots
- Common use cases and workflows
- Troubleshooting section
- Embedded in app or link to web documentation

## Component Architecture

### New Components

**LandingPage.tsx**
```typescript
interface LandingPageProps {
  onGetStarted: () => void;
  loadingProgress: LoadingState;
  featuredServers: FeaturedServer[];
}
```

**ServerToggle.tsx**
```typescript
interface ServerToggleProps {
  server: MCPServer;
  enabled: boolean;
  onToggle: (serverId: string, enabled: boolean) => void;
}
```

**CustomClientDialog.tsx**
```typescript
interface CustomClientDialogProps {
  onSave: (client: CustomClientConfig) => void;
  onCancel: () => void;
}
```

**FeaturedServerCard.tsx**
```typescript
interface FeaturedServerCardProps {
  server: FeaturedServer;
  onInstall: (server: FeaturedServer) => void;
  installed: boolean;
}
```

### Updated Components

**ServerListTable.tsx**
- Add sticky positioning for name column
- Implement horizontal scrolling container
- Add enable/disable toggle column

**ClientDetector.tsx**
- Add support for Cursor, Windsurf, Kiro
- Implement custom client detection
- Add client enable/disable logic

**SettingsPage.tsx**
- Add client management tab
- Custom client configuration UI
- Performance settings

## Prioritized Implementation Plan

### Priority 1: Critical User Experience (Do First)

**1. Landing Page with Loading State** (1-2 days)
- Improves perceived performance
- Better first impression
- No dependencies

**2. UI Responsiveness Fix** (0.5-1 day)
- Critical usability issue
- High user impact
- Quick implementation

### Priority 2: Core Features (Do Second)

**3. Server Enable/Disable Toggle** (2-3 days)
- Highly requested feature
- Improves testing workflow
- Medium complexity

**4. Additional Client Support** (3-4 days total)
- Cursor: 4 hours (VS Code based)
- Windsurf: 1-2 days
- Kiro: 1-2 days

### Priority 3: User Engagement (Do Third)

**5. Featured Servers Section** (2-3 days)
- Helps new users start quickly
- Requires server curation
- Depends on landing page

**6. User Guide** (3-4 days)
- Reduces support burden
- Content-heavy effort
- Can iterate over time

### Priority 4: Advanced Features (Do Last)

**7. Custom Client Support** (3-4 days)
- Power user feature
- High complexity
- Full feature parity needed

**8. Client Management Settings** (1-2 days)
- Optimization feature
- Lower priority
- Nice-to-have

## Technical Considerations

### Server Enable/Disable Implementation
```typescript
interface MCPServer {
  name: string;
  command: string;
  enabled?: boolean; // New field
  // ... other fields
}
```

### Client Configuration Paths

**Cursor** (to be verified):
- macOS: `~/Library/Application Support/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`
- Windows: `%APPDATA%/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings/`
- Linux: `~/.config/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings/`

**Windsurf** (to be researched):
- Configuration location TBD
- MCP support verification needed

**Kiro** (to be researched):
- Configuration location TBD
- API/format documentation needed

### Featured Servers List
Recommended servers for featured section:
1. **@modelcontextprotocol/server-filesystem** - File system access
2. **@modelcontextprotocol/server-fetch** - Web fetching
3. **@modelcontextprotocol/server-brave-search** - Web search
4. **@modelcontextprotocol/server-memory** - Conversation memory

### Landing Page Loading States
```typescript
enum LoadingState {
  INITIAL = 'initial',
  DETECTING_CLIENTS = 'detecting_clients',
  LOADING_CONFIGS = 'loading_configs',
  READY = 'ready',
  ERROR = 'error'
}
```

## File Structure Updates

```
src/renderer/
├── pages/
│   ├── Landing/
│   │   ├── LandingPage.tsx
│   │   ├── FeaturedServers.tsx
│   │   └── LoadingProgress.tsx
│   └── Settings/
│       ├── ClientManagement.tsx
│       └── CustomClients.tsx
├── components/
│   ├── ServerToggle/
│   │   └── ServerToggle.tsx
│   └── Tables/
│       └── StickyColumnTable.tsx
└── services/
    ├── CustomClientService.ts
    └── FeaturedServersService.ts
```

## Implementation Timeline

### Week 1: Foundation
- Day 1-2: Landing page with loading state
- Day 2-3: UI responsiveness fix
- Day 3-5: Server enable/disable toggle

### Week 2: Expansion
- Day 6-7: Cursor client support
- Day 7-8: Windsurf and Kiro support
- Day 9-10: Featured servers section

### Week 3: Polish
- Day 11-13: User guide with screenshots
- Day 14-15: Custom client support
- Day 15: Client management settings

## Success Metrics

- App loads with visual feedback in < 100ms
- Server list remains usable with 50+ servers
- New users can install first server in < 2 minutes
- Support for 3+ additional AI platforms
- 90% of users can complete setup without documentation