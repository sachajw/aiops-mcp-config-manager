# AI Assistant Manager - UI Redesign Specification

## Overview

This document outlines the UI redesign for the AI Assistant Manager (formerly MCP Configuration Manager) to create a user-friendly interface for non-technical users to enhance their AI tools. The focus is on guided workflows, plain language, and safety-first design principles.

## Current Issues

- Left-to-right panel layout doesn't work well on narrow screens
- Navigation structure is not intuitive for different browser widths
- **Too technical for non-technical users** - uses jargon like "MCP servers", "configuration files"
- **Lacks guided workflows** - users don't know what to do or where to start
- **No safety mechanisms** - users afraid of breaking their setup
- **Missing plain language explanations** - assumes technical knowledge

## Design Requirements

### 1. User-Centered Design Principles

**Plain Language First**
- Replace "MCP Servers" with "Capabilities" or "Add-ons"
- Replace "Configuration" with "Settings" 
- Replace "Client Discovery" with "Find Your AI Apps"
- Use analogies: "Like adding apps to your phone"

**Guided Workflows**
- Every action starts with a wizard
- Show preview/explanation before changes
- Provide templates and presets
- Clear success/failure feedback

**Safety and Confidence**
- Automatic backups before changes
- Easy undo/restore options
- "What will this do?" explanations
- Test mode before applying changes

### 2. Responsive Layout Structure

**Header (Fixed Top)**
- Friendly app name: "AI Assistant Manager"
- Status indicator: "Everything is working great ✅"
- Help button: "?" with contextual assistance
- Settings: User preferences and backup options

**Left Navigation Menu (Collapsible)**
- User-friendly navigation with plain language
- Progress indicators for setup tasks
- Recently used items
- "Need Help?" always visible

**Main Content Area**
- Welcome dashboard with next steps
- Wizard-driven workflows
- Success celebrations and confirmations

### 3. Navigation Structure (User-Friendly)

**Primary Navigation (Left Menu)**
```
🏠 Home
   └── Your AI Setup Overview

🤖 Your AI Apps
   ├── Claude Desktop ✅ (3 capabilities)
   ├── VS Code ⚠️ (needs attention)
   └── + Find More Apps

⭐ Available Capabilities
   ├── 📁 File & Folder Access
   ├── 🌐 Web Search Tools
   ├── 📅 Calendar & Email
   ├── 💻 Developer Tools (Advanced)
   └── 🔍 Browse All Capabilities

🛠️ Maintenance
   ├── ❤️ Check Health Status
   ├── 💾 Backup & Restore
   ├── 📥 Import/Export Settings
   └── 📚 Get Help & Learn
```

### 4. Landing Page Features (User-Friendly)

**Hero Welcome**
```
🤖 Welcome to AI Assistant Manager

Make your AI tools more powerful with new capabilities.
No technical knowledge required - we'll guide you through everything.

[Current Status: ✅ Claude Desktop found and ready]
```

**Quick Actions (Large, Friendly Cards)**
1. **🚀 "Add New Powers to Your AI"**
   - "Give Claude access to your files, search the web, and more"
   - Shows popular options: File Access, Web Search, Calendar
   
2. **🔧 "Fix Issues"** 
   - "Something not working? We'll help you troubleshoot"
   - One-click diagnostics and repair
   
3. **📋 "See What You Have"**
   - "View all your AI apps and their current capabilities"
   - Clear overview of current setup
   
4. **📚 "Learn & Get Help"**
   - "New to this? Start with our beginner's guide"
   - Videos, tutorials, FAQs

**Your Current Setup**
- Visual dashboard showing AI apps and their capabilities
- Health status with friendly explanations
- "Last checked 2 minutes ago ✅"

### 4. Responsive Breakpoints

**Desktop (≥1200px)**
- Full sidebar visible
- Three-column layout possible
- All features accessible

**Tablet (768px - 1199px)**
- Collapsible sidebar
- Two-column layout
- Touch-friendly controls

**Mobile (≤767px)**
- Hidden sidebar (hamburger menu)
- Single-column layout
- Mobile-optimized forms

## Component Architecture

### Layout Components

**AppLayout.tsx**
```typescript
interface AppLayoutProps {
  children: React.ReactNode;
}

- Header component
- Collapsible sidebar
- Main content area
- Responsive behavior
```

**Header.tsx**
```typescript
interface HeaderProps {
  onMenuToggle: () => void;
  title: string;
}

- Application title/logo
- Global actions
- Menu toggle button
- User context
```

**Sidebar.tsx**
```typescript
interface SidebarProps {
  collapsed: boolean;
  selectedKey: string;
  onSelect: (key: string) => void;
}

- Entity navigation tree
- Quick actions
- Search functionality
- Collapse behavior
```

**LandingPage.tsx**
```typescript
interface LandingPageProps {
  clients: MCPClient[];
  onWizardStart: (wizard: WizardType) => void;
}

- Welcome section
- Quick action cards
- System status
- Getting started guide
```

### Page Components

**ClientsPage.tsx**
- Client list and management
- Client configuration editor
- Status monitoring

**ServersPage.tsx**
- Server catalog
- Server configuration
- Testing and validation

**ScopesPage.tsx**
- Scope hierarchy
- Configuration merging
- Conflict resolution

**DashboardPage.tsx**
- System overview
- Recent activity
- Health monitoring

### Wizard Components

**ServerWizard.tsx**
- Step-by-step server setup
- Template selection
- Configuration validation

**ClientConfigWizard.tsx**
- Client discovery
- Configuration import
- Initial setup

## Implementation Plan

### Phase 1: Layout Foundation
1. Create new layout components (AppLayout, Header, Sidebar)
2. Implement responsive behavior
3. Update routing structure

### Phase 2: Landing Page
1. Create LandingPage component with wizard cards
2. Implement getting started guide
3. Add system status overview

### Phase 3: Entity Pages
1. Refactor existing components into page structure
2. Update ClientsPage, ServersPage, ScopesPage
3. Implement navigation integration

### Phase 4: Wizards
1. Create wizard framework
2. Implement ServerWizard and ClientConfigWizard
3. Add guided workflows

### Phase 5: Mobile Optimization
1. Test responsive behavior
2. Optimize touch interactions
3. Performance tuning

## Technology Stack

**Layout & Navigation**
- Ant Design Layout, Menu, Breadcrumb
- CSS Grid and Flexbox
- React Router for navigation

**Responsive Design**
- Ant Design breakpoint system
- CSS media queries
- Mobile-first approach

**State Management**
- Zustand for global state
- React Context for layout state
- Local state for wizards

## File Structure

```
src/renderer/
├── layouts/
│   ├── AppLayout.tsx
│   ├── Header.tsx
│   └── Sidebar.tsx
├── pages/
│   ├── Dashboard/
│   │   ├── DashboardPage.tsx
│   │   └── LandingPage.tsx
│   ├── Clients/
│   │   └── ClientsPage.tsx
│   ├── Servers/
│   │   └── ServersPage.tsx
│   └── Scopes/
│       └── ScopesPage.tsx
├── wizards/
│   ├── WizardFramework.tsx
│   ├── ServerWizard.tsx
│   └── ClientConfigWizard.tsx
└── components/
    └── [existing components]
```

## Design Mockups

### Desktop Layout
```
┌─────────────────────────────────────────────────┐
│ Header: MCP Config Manager    [🔄] [⚙️] [❓]    │
├─────────────────────────────────────────────────┤
│ 📱 Dashboard  │ Landing Page                    │
│ 🔧 Clients    │                                 │
│ ⚙️ Servers    │ Welcome to MCP Config Manager   │
│ 🎯 Scopes     │                                 │
│ 🛠️ Tools      │ Quick Actions:                  │
│              │ [🚀 Add Server] [🔧 Configure]  │
│              │                                 │
│              │ Getting Started Guide           │
│              │ 1. Discover clients             │
│              │ 2. Add your first server        │
│              │ 3. Test configuration           │
└─────────────────────────────────────────────────┘
```

### Mobile Layout
```
┌─────────────────────┐
│ ☰ MCP Config   [⚙️] │
├─────────────────────┤
│ Welcome!            │
│                     │
│ Quick Actions:      │
│ [🚀 Add Server]     │
│ [🔧 Configure]      │
│                     │
│ System Status:      │
│ ✅ 2 Clients Found  │
│ ⚠️ 1 Config Issue   │
│                     │
│ Getting Started     │
│ [📖 View Guide]     │
└─────────────────────┘
```

This specification provides a comprehensive plan for redesigning the UI to be more responsive, intuitive, and user-friendly while maintaining all existing functionality.