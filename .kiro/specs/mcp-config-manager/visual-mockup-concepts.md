# Visual Mockup Concepts - MCP Drag & Drop Interface

## Design Language

### Visual Metaphor: "Digital Workspace"
Think of it as a modern, digital version of a workspace where you connect different tools (servers) to your workstations (AI clients).

## Component Visual Designs

### 1. Server Library Cards

```
┌─────────────────────────────┐
│  ╭─────────────────────╮    │
│  │    📦                │    │
│  │                      │    │
│  ╰─────────────────────╯    │
│                              │
│  Filesystem Server           │
│  ─────────────────────       │
│  Access and manage files     │
│                              │
│  ┌─────────┬──────────┐      │
│  │ 15 tools│ 2.5k tok │      │
│  └─────────┴──────────┘      │
│                              │
│  ⭐⭐⭐⭐⭐ 4.8 (1.2k)         │
│                              │
│  [✓ Installed] [Configure]   │
└─────────────────────────────┘

Hover State:
┌─────────────────────────────┐
│  ╭─────────────────────╮    │ ← Glow effect
│  │    📦                │    │ ← Lift shadow
│  │   ⋮⋮⋮               │    │ ← Drag dots appear
│  ╰─────────────────────╯    │
│         ...                  │
│  [Drag to connect →]         │ ← Action hint
└─────────────────────────────┘
```

### 2. Client Docking Stations

```
Normal State:
╔═══════════════════════════╗
║  Claude Desktop           ║
║  ─────────────            ║
║                           ║
║  ┌───┐ ┌───┐ ┌───┐      ║
║  │ 📦 │ │ 🔍 │ │ + │      ║
║  └───┘ └───┘ └───┘      ║
║   File  Search  Add       ║
║                           ║
║  Status: ● Active         ║
║  Servers: 2/5             ║
╚═══════════════════════════╝

Drag Over State:
╔═══════════════════════════╗
║  Claude Desktop           ║ ← Pulse animation
║  ─────────────            ║
║  ╭───────────────────╮    ║
║  │                   │    ║ ← Drop zone appears
║  │   Drop Server     │    ║
║  │      Here         │    ║
║  │        ↓          │    ║
║  ╰───────────────────╯    ║
║                           ║
║  ✅ Compatible            ║ ← Compatibility check
╚═══════════════════════════╝
```

### 3. Connection Visualization

```
Active Connection:
    Server                     Client
   ┌──────┐                  ┌──────┐
   │  📦  │ ═══════════════> │  🤖  │
   └──────┘                  └──────┘
            Animated flow →

Connection Details (on hover):
   ┌──────┐    ┌─────────┐   ┌──────┐
   │  📦  │ ═> │ Active  │ > │  🤖  │
   └──────┘    │ 15 tools│   └──────┘
               │ 2.5k tok│
               │ 12ms lat│
               └─────────┘

Multiple Connections:
   ┌──────┐ ═══╗
   │  📦  │    ╠═> Claude
   └──────┘ ═══╬═> VS Code
               ╚═> Codex
```

### 4. Visual Workspace Canvas

```
┌────────────────────────────────────────────────┐
│  Grid Background (subtle dots)                 │
│                                                │
│    📦 ━━━━━━┓                                 │
│    Files    ┃                                 │
│             ┣━━━━> 🤖 Claude                  │
│    🔍 ━━━━━━┫                                 │
│    Search   ┃                                 │
│             ┗━━━━> 💻 VS Code                 │
│                                                │
│    🗃️ ━━━━━━━━━━> 🔷 Codex                   │
│    Database                                    │
│                                                │
└────────────────────────────────────────────────┘

Interactive Elements:
- Nodes are draggable
- Connections are selectable
- Right-click for context menu
- Double-click to edit
- Zoom in/out with scroll
```

### 5. Insights Dashboard

```
╭──────────────────────────────────────────────╮
│  📊 Performance Insights                     │
├──────────────────────────────────────────────┤
│                                              │
│  Token Usage          █████████░░░ 75%      │
│  Response Time        ██████░░░░░ 60ms      │
│  Active Connections   ███████████ 5/5       │
│                                              │
│  ┌─────────────────────────────────────┐    │
│  │  Token Distribution                 │    │
│  │                                     │    │
│  │  📦 Files      ████ 2.5k           │    │
│  │  🔍 Search     ██ 1.2k             │    │
│  │  🗃️ Database   ██████ 3.5k         │    │
│  └─────────────────────────────────────┘    │
│                                              │
│  💡 Tip: Database server using most tokens  │
╰──────────────────────────────────────────────╯
```

### 6. Quick Action Radial Menu

```
When right-clicking on a server:

           🔄 Restart
              ↑
    📊 Stats ← ● → ⚙️ Config
              ↓
           🗑️ Remove

Animated appearance with:
- Radial fade-in
- Icon rotation
- Hover highlight
```

## Color Palette

### Light Theme
```
Background:     #FFFFFF
Surface:        #F8FAFC
Border:         #E5E7EB
Primary:        #3B82F6 (Blue)
Success:        #10B981 (Green)
Warning:        #F59E0B (Amber)
Error:          #EF4444 (Red)
Text:           #1F2937
Muted:          #6B7280
```

### Dark Theme
```
Background:     #0F172A
Surface:        #1E293B
Border:         #334155
Primary:        #60A5FA (Light Blue)
Success:        #34D399 (Light Green)
Warning:        #FBBF24 (Light Amber)
Error:          #F87171 (Light Red)
Text:           #F1F5F9
Muted:          #94A3B8
```

## Animation Specifications

### Drag Animation
```css
/* Lift Effect */
@keyframes lift {
  0% { transform: scale(1) rotate(0deg); box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
  100% { transform: scale(1.05) rotate(2deg); box-shadow: 0 12px 24px rgba(0,0,0,0.15); }
}

/* Drop Effect */
@keyframes drop {
  0% { transform: scale(1.05); }
  50% { transform: scale(0.95); }
  100% { transform: scale(1); }
}

/* Connection Flow */
@keyframes flow {
  0% { stroke-dashoffset: 0; }
  100% { stroke-dashoffset: -20; }
}
```

### Hover Effects
- Scale: 1.02
- Transition: 200ms ease-out
- Shadow: increase by 50%
- Border: subtle glow

### Success Feedback
```
1. Flash green border (100ms)
2. Scale up to 1.1 (200ms)
3. Scale down to 1.0 (200ms)
4. Show checkmark (fade in 300ms)
5. Fade checkmark (after 2s)
```

## Responsive Breakpoints

### Desktop (1920px+)
- Full 3-panel layout
- Large cards (300px)
- Detailed insights

### Laptop (1366px - 1919px)
- Standard 3-panel layout
- Medium cards (250px)
- Condensed insights

### Tablet (768px - 1365px)
- Collapsible side panels
- Stacked layout option
- Touch-optimized controls

### Mobile (< 768px)
- Single column
- Swipeable panels
- Simplified connections

## Interaction States

### Server Card States
1. **Default**: Subtle shadow, normal colors
2. **Hover**: Lifted shadow, highlighted border
3. **Dragging**: Semi-transparent, following cursor
4. **Disabled**: Grayed out, no interactions
5. **Error**: Red border, error icon

### Connection States
1. **Active**: Solid line, animated flow
2. **Inactive**: Dashed line, muted color
3. **Error**: Red line, warning icon
4. **Pending**: Pulsing line
5. **Selected**: Thicker line, glow effect

## Iconography

### Server Categories
- 📦 File System
- 🔍 Search & Discovery
- 🗃️ Database
- 🌐 Web & APIs
- 🤖 AI & ML Tools
- 🛠️ Developer Tools
- 📊 Analytics
- 🔐 Security
- 📝 Documentation
- 🎨 Creative Tools

### Status Icons
- ✅ Active/Success
- ⚠️ Warning
- ❌ Error/Failed
- 🔄 Loading/Processing
- ⏸️ Paused
- 🔌 Disconnected
- 🔗 Connected
- 🚀 Launching
- 💤 Idle
- ⚡ Performance

## Micro-interactions

### Card Hover
- Cursor: pointer
- Card: slight lift (2px)
- Shadow: expand and soften
- Icons: subtle rotate (2deg)

### Button Press
- Scale: 0.98
- Shadow: inset
- Color: darken 10%
- Duration: 100ms

### Toggle Switch
- Track: color transition
- Thumb: slide with ease-out
- Label: fade transition
- Duration: 200ms

### Loading States
- Skeleton screens for cards
- Shimmer effect on placeholders
- Progressive reveal of content
- Smooth fade-in animations

## Typography

### Headings
- H1: 32px, Bold, -0.02em
- H2: 24px, Semibold, -0.01em
- H3: 20px, Medium, 0
- H4: 16px, Medium, 0

### Body Text
- Large: 16px, Regular, 0
- Normal: 14px, Regular, 0
- Small: 12px, Regular, 0.01em
- Micro: 10px, Regular, 0.02em

### Font Stack
```css
font-family: -apple-system, BlinkMacSystemFont, 'Inter',
             'Segoe UI', 'Roboto', 'Helvetica Neue',
             sans-serif;
```

## Accessibility Considerations

### Visual Indicators
- Never rely on color alone
- Include icons with color coding
- Provide text labels for all actions
- High contrast ratios (WCAG AAA)

### Focus States
- Visible focus rings
- Keyboard navigation order
- Skip links for screen readers
- ARIA labels for all interactions

### Motion Preferences
- Respect prefers-reduced-motion
- Provide static alternatives
- Allow animation disable option
- Instant feedback options

This visual design system creates an intuitive, modern interface that makes MCP configuration accessible to non-technical users while maintaining the power and flexibility needed by advanced users.