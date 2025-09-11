# MCP Server Enable/Disable Feature Analysis

## Research Findings

### 1. No Native Support in MCP Specification
- The official MCP specification does not define a standard `enabled` or `disabled` field
- Clients (Claude Desktop, VS Code, etc.) don't have built-in support for disabling servers
- Each client implementation handles configuration differently

### 2. Current Client Behaviors
- **Claude Desktop**: Reads all servers in `mcpServers` object and attempts to start them
- **VS Code**: Has `chat.mcp.access` setting to disable ALL MCP support, but no per-server control
- **JetBrains**: Has UI checkboxes to enable/disable servers (managed internally)
- **Cursor**: Uses VS Code settings format, no native disable support

### 3. Implementation Options

#### Option A: Custom `enabled` Field (RECOMMENDED)
```json
{
  "mcpServers": {
    "my_server": {
      "command": "node",
      "args": ["server.js"],
      "enabled": false  // Our custom field
    }
  }
}
```
**Pros:**
- Clean, intuitive API
- Preserves server configuration
- Easy to toggle on/off
- Won't break existing clients (they'll ignore unknown fields)

**Cons:**
- Not standard MCP - clients won't respect it natively
- We'd need to filter servers when saving back to client configs

#### Option B: Separate Disabled Section
```json
{
  "mcpServers": { /* active servers */ },
  "_disabledServers": { /* disabled servers */ }
}
```
**Pros:**
- Clean separation
- Easy to move servers between sections
- Clients won't see disabled servers

**Cons:**
- More complex state management
- Risk of losing server config if not careful

#### Option C: Prefix Convention
```json
{
  "mcpServers": {
    "_disabled_my_server": { /* config */ }
  }
}
```
**Pros:**
- Simple implementation
- Visible in config files

**Cons:**
- Ugly naming convention
- Could confuse users

## Recommended Implementation

### Phase 1: Internal State Management
1. Add `enabled?: boolean` field to our `MCPServer` interface
2. Default to `enabled: true` if not specified
3. Show visual indication in UI (gray out, toggle switch)
4. Store enabled state in our app's internal storage

### Phase 2: Config File Handling
When **reading** configs:
- Accept `enabled` field if present
- Default to `true` if missing

When **writing** configs:
- **Option 1**: Strip disabled servers entirely (clean but loses config)
- **Option 2**: Write with `enabled: false` (preserves config but non-standard)
- **Option 3**: Move to comment or separate section

### Phase 3: UI Implementation
```typescript
interface MCPServer {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  enabled?: boolean;  // New field
}

// In UI component
<Switch 
  checked={server.enabled !== false}
  onChange={(checked) => updateServer({ ...server, enabled: checked })}
/>
```

### Phase 4: Saving Strategy
```typescript
function saveConfig(servers: Record<string, MCPServer>) {
  // Filter out disabled servers when saving to client
  const activeServers = Object.entries(servers)
    .filter(([_, server]) => server.enabled !== false)
    .reduce((acc, [name, server]) => {
      // Remove our custom 'enabled' field
      const { enabled, ...cleanServer } = server;
      acc[name] = cleanServer;
      return acc;
    }, {});
    
  return { mcpServers: activeServers };
}
```

## Decision

**Implement Option A with Internal State Management:**
1. Add `enabled` field to our data model
2. Show toggle in UI
3. When saving to client configs, filter out disabled servers
4. Store full config (including disabled) in our app's settings for persistence

This approach:
- Provides the feature users want
- Doesn't break client compatibility
- Preserves configuration for re-enabling
- Is intuitive and clean

## Alternative for Advanced Users
Offer a "preserve disabled" option in settings that writes the `enabled: false` field to configs. Power users can choose this if they want the disabled state visible in their config files, understanding that clients will ignore it.