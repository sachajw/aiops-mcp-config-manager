# Component Design Specifications - User-Friendly Version

## Overview
Detailed design specifications for the new UI components in the AI Assistant Manager, focused on non-technical users who need a friendly, guided experience to enhance their AI tools.

## Layout Components

### AppLayout Component

**Purpose:** Main application shell with responsive header, sidebar, and content area.

**Props:**
```typescript
interface AppLayoutProps {
  children: React.ReactNode;
}
```

**Features:**
- Responsive sidebar collapse/expand
- Mobile hamburger menu
- Breadcrumb navigation
- Loading states
- Error boundaries

**Layout Structure:**
```
┌─────────────────────────────────────┐
│ Header                              │
├──────────┬──────────────────────────┤
│ Sidebar  │ Main Content             │
│          │                          │
│          │                          │
│          │                          │
│          │                          │
└──────────┴──────────────────────────┘
```

**Responsive Behavior:**
- Desktop (≥1200px): Full sidebar visible
- Tablet (768-1199px): Collapsible sidebar
- Mobile (≤767px): Hidden sidebar with overlay

---

### Header Component

**Purpose:** Top navigation bar with branding and global actions.

**Props:**
```typescript
interface HeaderProps {
  onMenuToggle: () => void;
  sidebarCollapsed: boolean;
}
```

**Elements:**
- **Logo/Title:** "MCP Configuration Manager"
- **Menu Toggle:** Hamburger button for mobile
- **Global Actions:** Refresh, Settings, Help
- **Status Indicators:** Connection status, sync status
- **User Context:** Current user/session info

**Actions:**
```typescript
// Global action buttons
const headerActions = [
  {
    key: 'refresh',
    icon: <ReloadOutlined />,
    tooltip: 'Refresh All Data',
    onClick: () => refreshAllData()
  },
  {
    key: 'settings',
    icon: <SettingOutlined />,
    tooltip: 'Application Settings',
    onClick: () => openSettings()
  },
  {
    key: 'help',
    icon: <QuestionCircleOutlined />,
    tooltip: 'Help & Documentation',
    onClick: () => openHelp()
  }
];
```

---

### Sidebar Component

**Purpose:** Left navigation menu with entity types and quick actions.

**Props:**
```typescript
interface SidebarProps {
  collapsed: boolean;
  selectedKey: string;
  onSelect: (key: string) => void;
  onCollapse: (collapsed: boolean) => void;
}
```

**Menu Structure:**
```typescript
const menuItems = [
  {
    key: 'dashboard',
    icon: <DashboardOutlined />,
    label: 'Dashboard',
    children: [
      { key: 'home', label: 'Home' },
      { key: 'overview', label: 'Overview' }
    ]
  },
  {
    key: 'clients',
    icon: <LaptopOutlined />,
    label: 'Clients',
    badge: clientCount,
    children: [
      { key: 'claude-desktop', label: 'Claude Desktop' },
      { key: 'claude-code', label: 'Claude Code' },
      { key: 'vs-code', label: 'VS Code' },
      { key: 'add-client', label: 'Add Client', icon: <PlusOutlined /> }
    ]
  },
  {
    key: 'servers',
    icon: <ServerOutlined />,
    label: 'Servers',
    badge: serverCount,
    children: [
      { key: 'filesystem', label: 'Filesystem' },
      { key: 'git', label: 'Git' },
      { key: 'memory', label: 'Memory' },
      { key: 'add-server', label: 'Add Server', icon: <PlusOutlined /> }
    ]
  },
  {
    key: 'scopes',
    icon: <ApartmentOutlined />,
    label: 'Scopes',
    children: [
      { key: 'global', label: 'Global' },
      { key: 'user', label: 'User' },
      { key: 'local', label: 'Local' },
      { key: 'project', label: 'Project' }
    ]
  },
  {
    key: 'tools',
    icon: <ToolOutlined />,
    label: 'Tools',
    children: [
      { key: 'validate', label: 'Validate Configs' },
      { key: 'import-export', label: 'Import/Export' },
      { key: 'sync', label: 'Sync Settings' },
      { key: 'test', label: 'Test Connections' }
    ]
  }
];
```

**Search Functionality:**
- Filter menu items by name
- Show recent/favorite items
- Quick navigation shortcuts

---

## Page Components

### LandingPage Component

**Purpose:** Welcome page with guidance and quick actions.

**Props:**
```typescript
interface LandingPageProps {
  clients: MCPClient[];
  onWizardStart: (wizard: WizardType) => void;
}
```

**Sections:**

1. **Welcome Hero**
   ```typescript
   <Card className="welcome-hero">
     <Title level={2}>Welcome to MCP Configuration Manager</Title>
     <Text>
       Centrally manage your Model Context Protocol server configurations 
       across all AI client applications.
     </Text>
   </Card>
   ```

2. **Quick Actions Grid**
   ```typescript
   const quickActions = [
     {
       title: 'Add Your First Server',
       description: 'Set up an MCP server in minutes',
       icon: <PlusCircleOutlined />,
       color: '#1890ff',
       action: () => onWizardStart('server-setup')
     },
     {
       title: 'Configure Client',
       description: 'Connect your AI applications',
       icon: <SettingOutlined />,
       color: '#52c41a',
       action: () => onWizardStart('client-config')
     },
     {
       title: 'Import Configuration',
       description: 'Migrate existing settings',
       icon: <ImportOutlined />,
       color: '#faad14',
       action: () => onWizardStart('import-config')
     },
     {
       title: 'Troubleshoot Issues',
       description: 'Diagnose and fix problems',
       icon: <BugOutlined />,
       color: '#ff4d4f',
       action: () => onWizardStart('troubleshoot')
     }
   ];
   ```

3. **System Status Overview**
   ```typescript
   <Card title="System Status">
     <Statistic 
       title="Clients Discovered" 
       value={clients.length} 
       prefix={<LaptopOutlined />}
     />
     <Statistic 
       title="Servers Configured" 
       value={serverCount} 
       prefix={<ServerOutlined />}
     />
     <Statistic 
       title="Last Sync" 
       value={lastSyncTime} 
       prefix={<SyncOutlined />}
     />
   </Card>
   ```

4. **Getting Started Guide**
   ```typescript
   const gettingStartedSteps = [
     {
       title: 'Discover Clients',
       description: 'We automatically scan for AI applications',
       status: clients.length > 0 ? 'completed' : 'pending'
     },
     {
       title: 'Add Your First Server',
       description: 'Choose from our server catalog or add custom',
       status: serverCount > 0 ? 'completed' : 'active'
     },
     {
       title: 'Test Configuration',
       description: 'Verify your setup works correctly',
       status: 'pending'
     }
   ];
   ```

---

### ClientsPage Component

**Purpose:** Client management and configuration.

**Features:**
- Client discovery and status
- Configuration editing per client
- Health monitoring
- Connection testing

**Layout:**
```typescript
<Row gutter={16}>
  <Col span={8}>
    <ClientListPanel 
      clients={clients}
      selectedClient={selectedClient}
      onClientSelect={setSelectedClient}
    />
  </Col>
  <Col span={16}>
    {selectedClient ? (
      <ConfigurationEditor 
        client={selectedClient}
        configuration={configurations[selectedClient.id]}
        onSave={handleSave}
      />
    ) : (
      <ClientSelectionPrompt />
    )}
  </Col>
</Row>
```

---

### ServersPage Component

**Purpose:** Server catalog and management.

**Features:**
- Server marketplace/catalog
- Custom server creation
- Configuration templates
- Installation guides

**Layout:**
```typescript
<Tabs>
  <TabPane key="catalog" tab="Server Catalog">
    <ServerCatalog onServerSelect={handleServerSelect} />
  </TabPane>
  <TabPane key="installed" tab="Installed Servers">
    <InstalledServersList />
  </TabPane>
  <TabPane key="custom" tab="Custom Servers">
    <CustomServerEditor />
  </TabPane>
</Tabs>
```

---

## Wizard Components

### WizardFramework Component

**Purpose:** Reusable wizard container with step navigation.

**Props:**
```typescript
interface WizardFrameworkProps {
  title: string;
  steps: WizardStep[];
  currentStep: number;
  onNext: () => void;
  onBack: () => void;
  onCancel: () => void;
  onFinish: () => void;
}

interface WizardStep {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  content: React.ReactNode;
  validation?: () => boolean;
}
```

**Features:**
- Progress indicator
- Step validation
- Navigation controls
- Save draft functionality
- Cancel confirmation

---

### ServerSetupWizard Component

**Steps:**

1. **Server Type Selection**
   - Popular servers (Filesystem, Git, Memory)
   - Custom server option
   - Template preview

2. **Configuration**
   - Server-specific parameters
   - Environment variables
   - Command arguments

3. **Client Assignment**
   - Select target clients
   - Scope selection (Global, User, Local, Project)
   - Conflict resolution

4. **Validation & Testing**
   - Configuration validation
   - Connection testing
   - Error resolution

5. **Completion**
   - Summary of changes
   - Installation confirmation
   - Next steps suggestions

---

## Responsive Design Specifications

### Breakpoints
```scss
$breakpoint-mobile: 768px;
$breakpoint-tablet: 1024px;
$breakpoint-desktop: 1200px;
```

### Mobile Adaptations

**Sidebar:**
- Convert to overlay menu
- Touch-friendly menu items
- Swipe gestures for navigation

**Content Areas:**
- Single column layout
- Larger touch targets
- Simplified forms

**Tables:**
- Horizontal scrolling
- Collapsible columns
- Mobile-optimized cells

### Touch Interactions
- Minimum 44px touch targets
- Swipe navigation
- Pull-to-refresh
- Long press context menus

---

## Theme and Styling

### Color Palette
```scss
// Primary colors
$primary-blue: #1890ff;
$success-green: #52c41a;
$warning-yellow: #faad14;
$error-red: #ff4d4f;

// Neutral colors
$text-primary: rgba(0, 0, 0, 0.85);
$text-secondary: rgba(0, 0, 0, 0.65);
$background-light: #fafafa;
$border-color: #d9d9d9;
```

### Typography
```scss
// Headings
.heading-1 { font-size: 32px; font-weight: 600; }
.heading-2 { font-size: 24px; font-weight: 600; }
.heading-3 { font-size: 18px; font-weight: 600; }

// Body text
.text-large { font-size: 16px; line-height: 1.5; }
.text-normal { font-size: 14px; line-height: 1.5; }
.text-small { font-size: 12px; line-height: 1.4; }
```

### Component Spacing
```scss
// Margins and padding
$spacing-xs: 4px;
$spacing-sm: 8px;
$spacing-md: 16px;
$spacing-lg: 24px;
$spacing-xl: 32px;
```

---

## Accessibility Features

### Keyboard Navigation
- Tab order optimization
- Focus indicators
- Keyboard shortcuts
- Skip links

### Screen Reader Support
- ARIA labels and descriptions
- Semantic HTML structure
- Live region updates
- Role attributes

### High Contrast Mode
- Alternative color schemes
- Enhanced focus indicators
- Pattern-based differentiation
- Scalable icons

This comprehensive design specification provides the foundation for implementing the new responsive UI for the MCP Configuration Manager.