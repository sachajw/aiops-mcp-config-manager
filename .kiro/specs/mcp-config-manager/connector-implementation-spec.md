# Connector Implementation Specification

## Cable/Wire Animation System

### Visual Design - Realistic Cable Physics

```typescript
// Cable connector with physics-based animation
interface CableConnector {
  id: string;
  sourceNode: string;
  targetNode: string;
  path: CablePath;
  state: 'connecting' | 'connected' | 'disconnecting' | 'error';
  thickness: number;
  color: string;
  tension: number;      // Cable tightness
  sag: number;          // Gravity effect
  swing: number;        // Wind/movement effect
  pulseRate: number;    // Data flow visualization
}

interface CablePath {
  controlPoints: Point[];
  segments: CableSegment[];
  length: number;
}
```

### Cable Rendering with React Flow + Custom SVG

```typescript
// Custom edge component for cable visualization
const CableEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
  markerEnd,
}) => {
  const [cablePath, setCablePath] = useState<string>('');
  const [particles, setParticles] = useState<Particle[]>([]);

  // Calculate cable physics
  useEffect(() => {
    const cable = calculateCablePath({
      start: { x: sourceX, y: sourceY },
      end: { x: targetX, y: targetY },
      tension: data?.tension || 0.5,
      sag: data?.sag || 20,
      segments: 20  // Smooth curve
    });
    setCablePath(cable);
  }, [sourceX, sourceY, targetX, targetY, data]);

  // Animate data flow particles
  useAnimationFrame(() => {
    setParticles(prev => updateParticles(prev, cablePath));
  });

  return (
    <g className="cable-group">
      {/* Cable shadow */}
      <path
        d={cablePath}
        stroke="rgba(0,0,0,0.2)"
        strokeWidth={8}
        fill="none"
        filter="blur(4px)"
        transform="translate(2, 4)"
      />

      {/* Main cable */}
      <defs>
        <linearGradient id={`cable-gradient-${id}`}>
          <stop offset="0%" stopColor="#4F46E5" />
          <stop offset="50%" stopColor="#7C3AED" />
          <stop offset="100%" stopColor="#4F46E5" />
        </linearGradient>
      </defs>

      <path
        id={`cable-${id}`}
        d={cablePath}
        stroke={`url(#cable-gradient-${id})`}
        strokeWidth={6}
        fill="none"
        strokeLinecap="round"
        className="cable-wire"
      />

      {/* Inner wire (highlights) */}
      <path
        d={cablePath}
        stroke="rgba(255,255,255,0.3)"
        strokeWidth={2}
        fill="none"
        strokeDasharray="10 20"
        className="cable-highlight"
      >
        <animate
          attributeName="stroke-dashoffset"
          from="0"
          to="-30"
          dur="2s"
          repeatCount="indefinite"
        />
      </path>

      {/* Data flow particles */}
      {particles.map((particle, i) => (
        <motion.circle
          key={i}
          r={3}
          fill="#60A5FA"
          filter="url(#glow)"
          initial={{ offsetDistance: "0%" }}
          animate={{
            offsetDistance: "100%",
            transition: {
              duration: 2,
              repeat: Infinity,
              ease: "linear",
              delay: i * 0.2
            }
          }}
        >
          <animateMotion dur="2s" repeatCount="indefinite">
            <mpath href={`#cable-${id}`} />
          </animateMotion>
        </motion.circle>
      ))}

      {/* Connection points (plugs) */}
      <circle
        cx={sourceX}
        cy={sourceY}
        r={8}
        fill="#4F46E5"
        stroke="#fff"
        strokeWidth={2}
        className="cable-plug"
      />
      <circle
        cx={targetX}
        cy={targetY}
        r={8}
        fill="#4F46E5"
        stroke="#fff"
        strokeWidth={2}
        className="cable-plug"
      />
    </g>
  );
};
```

### Cable Physics Calculation

```typescript
// Catenary curve for realistic cable sag
function calculateCablePath({
  start,
  end,
  tension,
  sag,
  segments
}: CableParams): string {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Catenary equation for cable sag
  const a = distance / (2 * Math.sinh(tension));
  const points: Point[] = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = start.x + dx * t;

    // Add sag based on distance from endpoints
    const sagAmount = sag * Math.sin(Math.PI * t);
    const y = start.y + dy * t + sagAmount;

    // Add slight swing for movement
    const swing = Math.sin(Date.now() * 0.001 + i * 0.1) * 2;

    points.push({ x: x + swing, y });
  }

  // Convert to SVG path
  return points.reduce((path, point, i) => {
    if (i === 0) return `M ${point.x} ${point.y}`;
    const prev = points[i - 1];
    const cp1 = { x: prev.x + (point.x - prev.x) / 3, y: prev.y };
    const cp2 = { x: prev.x + (point.x - prev.x) * 2 / 3, y: point.y };
    return `${path} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${point.x} ${point.y}`;
  }, '');
}
```

## Connection State Management

### 1. Visual State to Configuration Mapping

```typescript
// Bridge between visual representation and actual config
interface VisualConnectionManager {
  // Visual state (in Zustand)
  visualConnections: Map<string, VisualConnection>;

  // Convert visual to config
  toConfiguration(): MCPConfiguration {
    const config: MCPConfiguration = {};

    this.visualConnections.forEach((connection, id) => {
      const { sourceNode, targetNode } = connection;
      const server = this.nodes.get(sourceNode);
      const client = this.nodes.get(targetNode);

      if (server && client) {
        if (!config[client.name]) {
          config[client.name] = { mcpServers: {} };
        }

        config[client.name].mcpServers[server.name] = {
          command: server.data.command,
          args: server.data.args,
          env: server.data.env,
          enabled: connection.enabled
        };
      }
    });

    return config;
  }

  // Apply config changes to visual
  fromConfiguration(config: MCPConfiguration): void {
    // Clear existing connections
    this.visualConnections.clear();

    // Create visual connections from config
    Object.entries(config).forEach(([clientName, clientConfig]) => {
      Object.entries(clientConfig.mcpServers || {}).forEach(([serverName, serverConfig]) => {
        const connection = this.createConnection(serverName, clientName, serverConfig);
        this.visualConnections.set(connection.id, connection);
      });
    });

    // Trigger re-render
    this.updateCanvas();
  }
}
```

### 2. Real-time Connection Updates

```typescript
// Connection lifecycle management
class ConnectionLifecycle {
  // User drags server to client
  async onDrop(serverId: string, clientId: string) {
    // 1. Visual feedback - immediate
    this.showConnectingAnimation(serverId, clientId);

    // 2. Validate connection
    const validation = await this.validateConnection(serverId, clientId);
    if (!validation.valid) {
      this.showError(validation.error);
      this.removeConnection(serverId, clientId);
      return;
    }

    // 3. Create connection in visual state
    const connection = this.createConnection(serverId, clientId);

    // 4. Update configuration state
    this.updateConfiguration(connection);

    // 5. Mark as dirty (unsaved)
    this.setDirty(true);

    // 6. Show success animation
    this.showSuccessAnimation(connection);
  }

  // User clicks save
  async onSave() {
    // 1. Convert visual to config
    const config = this.visualManager.toConfiguration();

    // 2. Save via existing Electron IPC
    const result = await window.electronAPI.saveConfig(
      this.activeClient,
      config
    );

    if (result.success) {
      // 3. Clear dirty flag
      this.setDirty(false);

      // 4. Show save animation on all cables
      this.animateCablesSaved();

      // 5. Create automatic snapshot
      if (this.settings.autoSnapshot) {
        await this.createSnapshot(`auto-${Date.now()}`);
      }
    }
  }
}
```

### 3. Configuration Persistence Flow

```typescript
// How connections are saved and loaded
interface PersistenceFlow {
  // SAVE FLOW:
  // 1. User makes visual changes (drag & drop)
  // 2. Changes tracked in visualConnections state
  // 3. User clicks Save button
  // 4. Visual state → Configuration format
  // 5. IPC call to main process
  // 6. Main writes to client config file

  async save(): Promise<void> {
    const visualState = this.getVisualState();
    const config = this.convertToConfig(visualState);

    // Use existing ConfigurationService
    await window.electronAPI.saveConfiguration({
      client: this.activeClient,
      scope: this.activeScope,
      servers: config.servers,
      backup: true  // Auto-backup on save
    });
  }

  // LOAD FLOW:
  // 1. User selects client or opens app
  // 2. IPC call to read config file
  // 3. Configuration format → Visual state
  // 4. Render nodes and connections
  // 5. Apply saved layout if exists

  async load(): Promise<void> {
    const result = await window.electronAPI.readConfig(
      this.activeClient,
      this.activeScope
    );

    if (result.success && result.data) {
      this.visualManager.fromConfiguration(result.data);

      // Load saved layout if exists
      const layout = await this.loadLayout(this.activeClient);
      if (layout) {
        this.applyLayout(layout);
      }
    }
  }
}
```

## Snapshot & Profile System

### 1. Named Snapshots

```typescript
interface Snapshot {
  id: string;
  name: string;
  description?: string;
  timestamp: Date;
  configuration: MCPConfiguration;
  visualLayout: VisualLayout;
  metadata: {
    clientsCount: number;
    serversCount: number;
    connectionsCount: number;
    author?: string;
    tags?: string[];
  };
}

class SnapshotManager {
  // Create snapshot from current state
  async createSnapshot(name: string, description?: string): Promise<Snapshot> {
    const snapshot: Snapshot = {
      id: generateId(),
      name,
      description,
      timestamp: new Date(),
      configuration: this.visualManager.toConfiguration(),
      visualLayout: this.captureLayout(),
      metadata: this.gatherMetadata()
    };

    // Save to localStorage (or IndexedDB for larger data)
    await this.saveSnapshot(snapshot);

    // Show confirmation
    this.showToast(`Snapshot "${name}" created`);

    return snapshot;
  }

  // Restore from snapshot
  async restoreSnapshot(snapshotId: string): Promise<void> {
    const snapshot = await this.loadSnapshot(snapshotId);

    if (snapshot) {
      // Show confirmation dialog
      const confirmed = await this.confirmRestore(snapshot);

      if (confirmed) {
        // Apply configuration
        this.visualManager.fromConfiguration(snapshot.configuration);

        // Apply visual layout
        this.restoreLayout(snapshot.visualLayout);

        // Show success
        this.showToast(`Restored from "${snapshot.name}"`);
      }
    }
  }

  // Snapshot UI component
  renderSnapshotPanel(): JSX.Element {
    return (
      <div className="snapshot-panel glass-morphism">
        <div className="snapshot-header">
          <h3>Snapshots</h3>
          <button onClick={() => this.showCreateDialog()}>
            <CameraIcon /> Create Snapshot
          </button>
        </div>

        <div className="snapshot-list">
          {this.snapshots.map(snapshot => (
            <SnapshotCard
              key={snapshot.id}
              snapshot={snapshot}
              onRestore={() => this.restoreSnapshot(snapshot.id)}
              onDelete={() => this.deleteSnapshot(snapshot.id)}
              onExport={() => this.exportSnapshot(snapshot.id)}
            />
          ))}
        </div>
      </div>
    );
  }
}
```

### 2. Profile Integration

```typescript
// Extend existing profile system to work with visual mode
interface VisualProfile extends ConfigProfile {
  visualLayout?: {
    nodes: NodePosition[];
    zoom: number;
    pan: { x: number; y: number };
  };
  thumbnail?: string;  // Base64 canvas screenshot
}

class VisualProfileManager {
  // Save current visual configuration as profile
  async saveAsProfile(name: string): Promise<void> {
    const profile: VisualProfile = {
      name,
      servers: this.visualManager.toConfiguration(),
      visualLayout: this.captureLayout(),
      thumbnail: await this.captureScreenshot(),
      createdAt: new Date()
    };

    // Use existing profile store
    this.profileStore.saveProfile(profile);
  }

  // Load profile into visual workspace
  async loadProfile(profileName: string): Promise<void> {
    const profile = this.profileStore.getProfile(profileName);

    if (profile) {
      // Apply configuration
      this.visualManager.fromConfiguration(profile.servers);

      // Apply visual layout if available
      if (profile.visualLayout) {
        this.restoreLayout(profile.visualLayout);
      }

      // Animate the transition
      this.animateProfileLoad();
    }
  }

  // Profile selector with thumbnails
  renderProfileSelector(): JSX.Element {
    return (
      <div className="profile-gallery">
        {this.profiles.map(profile => (
          <div
            key={profile.name}
            className="profile-card"
            onClick={() => this.loadProfile(profile.name)}
          >
            {profile.thumbnail ? (
              <img src={profile.thumbnail} alt={profile.name} />
            ) : (
              <div className="profile-placeholder">
                <ProfileIcon />
              </div>
            )}
            <h4>{profile.name}</h4>
            <p>{profile.servers ? Object.keys(profile.servers).length : 0} servers</p>
          </div>
        ))}
      </div>
    );
  }
}
```

## AI-Powered Configuration Assistant (Future)

### Natural Language Interface

```typescript
interface AIConfigurationAssistant {
  // Parse user intent
  async processRequest(input: string): Promise<ConfigurationIntent> {
    // Example: "I need to work with files and search through code"
    const intent = await this.llm.analyze(input);

    return {
      suggestedServers: ['filesystem', 'ripgrep', 'git'],
      suggestedConnections: [
        { server: 'filesystem', clients: ['claude', 'vscode'] },
        { server: 'ripgrep', clients: ['claude'] },
        { server: 'git', clients: ['vscode'] }
      ],
      reasoning: "Based on your needs for file management and code search..."
    };
  }

  // Generate configuration
  async generateConfiguration(intent: ConfigurationIntent): Promise<void> {
    // Show preview with explanation
    const preview = this.createPreview(intent);

    const confirmed = await this.showAIPreview({
      title: "Suggested Configuration",
      preview,
      reasoning: intent.reasoning,
      actions: [
        { label: "Apply", primary: true },
        { label: "Modify", secondary: true },
        { label: "Cancel" }
      ]
    });

    if (confirmed === 'Apply') {
      await this.applyAIConfiguration(intent);
    }
  }

  // UI Component
  renderAIAssistant(): JSX.Element {
    return (
      <div className="ai-assistant-panel">
        <div className="ai-input">
          <SparklesIcon />
          <input
            type="text"
            placeholder="Describe what you want to do..."
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                this.processRequest(e.target.value);
              }
            }}
          />
        </div>

        {this.suggestion && (
          <div className="ai-suggestion">
            <h4>Suggested Setup</h4>
            <VisualPreview configuration={this.suggestion} />
            <div className="ai-reasoning">
              <InfoIcon />
              {this.suggestion.reasoning}
            </div>
            <div className="ai-actions">
              <button onClick={this.applySuggestion}>Apply</button>
              <button onClick={this.modifySuggestion}>Modify</button>
            </div>
          </div>
        )}
      </div>
    );
  }
}
```

## Implementation Priority

### MVP (Weeks 1-2)
1. ✅ Cable/wire rendering with basic physics
2. ✅ Drag & drop connection creation
3. ✅ Save/load with existing config system
4. ✅ Basic visual feedback

### Enhanced (Weeks 3-4)
1. ✅ Named snapshots
2. ✅ Profile integration
3. ✅ Advanced cable animations
4. ✅ Performance optimizations

### Future (Post-MVP)
1. 🔮 AI configuration assistant
2. 🔮 Natural language interface
3. 🔮 Smart recommendations
4. 🔮 Collaborative editing

## Performance Considerations

```typescript
// Optimize cable rendering for many connections
const CableRenderer = () => {
  // Use React.memo for cable components
  const MemoizedCable = React.memo(CableEdge, (prev, next) => {
    return prev.sourceX === next.sourceX &&
           prev.sourceY === next.sourceY &&
           prev.targetX === next.targetX &&
           prev.targetY === next.targetY;
  });

  // Batch cable updates
  const updateCables = useMemo(() =>
    throttle((cables) => {
      requestAnimationFrame(() => {
        setCables(cables);
      });
    }, 16), // 60fps
  []);

  // Use CSS transforms for cable animation
  return (
    <svg className="cable-layer">
      <style>
        {`
          .cable-wire {
            will-change: d;
            transform: translateZ(0);
          }
          .cable-highlight {
            animation: flow 2s linear infinite;
          }
          @keyframes flow {
            to { stroke-dashoffset: -30px; }
          }
        `}
      </style>
      {cables.map(cable => (
        <MemoizedCable key={cable.id} {...cable} />
      ))}
    </svg>
  );
};
```