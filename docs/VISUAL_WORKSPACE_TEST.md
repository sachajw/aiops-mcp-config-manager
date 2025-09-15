# Visual Workspace Testing Guide

## How to Enable and Test the Visual Workspace

### Step 1: Open the Application
```bash
npm run electron:dev
```

### Step 2: Enable Visual Workspace Feature
1. Click the **Settings** button (gear icon) in the top right
2. Navigate to the **Advanced** tab
3. Scroll down to **Experimental Features**
4. Toggle ON **"🎯 Visual Workspace Mode"**
5. Optional: Toggle "Set as default view" if you want it to open in visual mode by default
6. Click **Save Settings**

### Step 3: Access Visual Workspace
After enabling the feature, you'll see a new toggle in the header:
- **Classic** view (list/table mode)
- **Visual** view (drag-and-drop canvas)

Click on **Visual** to switch to the visual workspace.

### Step 4: Visual Workspace Features

#### Left Panel - Server Library
- **Browse Servers**: See available MCP servers with icons
- **Search**: Filter servers by name
- **Categories**: Filter by server type (Core, Data, Web, AI)
- **Server Cards** show:
  - Icon and name
  - Description
  - Tool count
  - Token usage estimate
  - Rating (if available)
  - Installation status

#### Center - Visual Canvas
- **Drag & Drop Area**: Main workspace for connections
- **Nodes**: Visual representations of servers and clients
- **Cable Connections**: Animated wires between servers and clients
- **Controls**:
  - Zoom in/out
  - Pan around canvas
  - Mini-map for navigation
  - Grid background

#### Right Panel - Client Dock
- **Active Clients**: Shows installed AI clients
- **Drop Zones**: Drag servers here to connect
- **Client Cards** show:
  - Client icon and name
  - Active/Inactive status
  - Server capacity bar
  - Auto-save indicator
  - Config path

#### Bottom Panel - Insights
- **Performance Metrics**:
  - Token usage
  - Response time
  - Active connections
- **Token Distribution**: See which servers use most tokens
- **Tips**: Helpful hints for using the interface

### Step 5: Creating Connections

1. **Drag a Server**:
   - Click and hold on a server card in the left panel
   - Drag it to the canvas or directly to a client

2. **Connect to Client**:
   - Drag the server over a client card
   - The client will highlight when ready to accept
   - Drop to create connection

3. **Visual Feedback**:
   - Cables animate with flowing particles
   - Connection plugs at endpoints
   - Cables have realistic physics (sag and sway)

### Step 6: Managing Connections

- **Select Connection**: Click on a cable to select it
- **Delete Connection**: Press Delete key when selected
- **Rearrange Nodes**: Drag nodes to reorganize layout
- **Save Configuration**: Changes are marked but need explicit save

### Current Implementation Status

✅ **Completed**:
- Feature toggle in settings
- View mode switcher
- Basic visual workspace structure
- Server library with drag sources
- Client dock with drop targets
- Cable/wire edge rendering with physics
- Node components for servers and clients
- Insights panel
- React Flow canvas integration
- DnD Kit drag and drop

🚧 **In Progress**:
- Actual configuration synchronization
- Save/load visual layouts
- Snapshot system
- Performance optimizations

⚠️ **Known Issues**:
- Some TypeScript errors (non-blocking)
- Configuration changes not yet persisted
- Mock data for some features

### Testing Checklist

- [ ] Settings toggle appears in Advanced tab
- [ ] Visual/Classic mode switcher appears after enabling
- [ ] Can switch between Classic and Visual modes
- [ ] Server library shows server cards
- [ ] Can drag server cards
- [ ] Client dock shows installed clients
- [ ] Canvas renders with grid background
- [ ] Mini-map appears and works
- [ ] Zoom controls work
- [ ] Can create visual connections (cables)
- [ ] Cables animate with particles
- [ ] Insights panel shows metrics

### Troubleshooting

**Visual mode toggle not appearing:**
- Ensure you saved settings after enabling the feature
- Refresh the page (Cmd/Ctrl + R)

**Drag and drop not working:**
- Check browser console for errors (F12)
- Ensure you're dragging from the server card area

**Canvas is blank:**
- Wait for clients to load (check console for detection)
- Try refreshing the page

**Performance issues:**
- Reduce animation level in settings
- Switch canvas renderer from Auto to Canvas

### Next Steps

This is an experimental feature in active development. Future updates will include:
- Full configuration persistence
- Visual layout saving
- Snapshot management
- AI-powered configuration assistance
- Template library
- Collaboration features

## Feedback

Please report any issues or suggestions for the visual workspace feature!