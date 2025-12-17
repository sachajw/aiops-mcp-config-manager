# Critical Platform-Specific Issues Found

## Summary
The application contains numerous **macOS-specific hardcoded paths** that will cause failures on Windows and Linux systems. This explains why the app behaves differently on other systems.

## Critical Issues

### 1. Hardcoded macOS Paths Throughout
The following files contain macOS-specific paths without platform conditionals:

#### `src/main/services/ClientDetector.ts`
- **Lines 45, 76, 91, 107, 122-123, 154, 169**: All use `~/Library/Application Support/` paths
- **Example**: `'~/Library/Application Support/Claude/claude_desktop_config.json'`
- **Problem**: Windows uses `%APPDATA%`, Linux uses `~/.config/`

#### `src/main/services/UnifiedConfigService.ts`
- **Lines 99, 107, 112, 114**: Hardcoded macOS paths for Cursor, Kiro, Windsurf
- **Only Claude Desktop** has Windows support (line 63 with `APPDATA`)
- Other clients lack Windows/Linux paths entirely

#### `src/shared/constants/index.ts`
- **Lines 34, 42, 45, 49, 54, 57, 61**: All hardcoded to macOS paths
- No platform detection or conditionals

#### `src/renderer/components/ClientConfigDialog.tsx`
- **Lines 19-20, 33-34, 37-38**: Frontend showing macOS paths to all users
- Will display incorrect paths on Windows/Linux

### 2. macOS-Only Executable Paths
#### `src/main/services/ClientDetector.ts`
- `/Applications/*.app` paths (won't exist on Windows/Linux)
- `/opt/homebrew/bin/*` (Homebrew is macOS-specific)
- No `C:\Program Files\` paths for Windows
- No `/usr/bin/` variations for Linux

### 3. Platform Detection Issues
- Platform detection exists (`process.platform`) but **not used consistently**
- Only `claude-desktop` has proper Windows support
- Most paths are hardcoded without checking the platform

### 4. Path Resolution Problems
#### `src/main/services/MCPClient.ts`
- **Lines 105, 108-109, 119-123, 217-221**: Hardcoded Unix paths
- `/opt/homebrew/bin` and `/opt/homebrew/opt/node/bin` are macOS-only
- No Windows PATH handling (should use `;` separator, not `:`)

## Impact on Other Systems

### On Windows:
- ❌ Config files will try to save to non-existent `~/Library/` paths
- ❌ Executable detection will fail (looking for `.app` files)
- ❌ PATH separator issues (uses `:` instead of `;`)
- ❌ Home directory resolution (`~`) may not work

### On Linux:
- ❌ Will look in macOS directories instead of XDG paths
- ❌ Won't find configs in `~/.config/` or `~/.local/share/`
- ❌ Homebrew paths won't exist

## Required Fixes

### 1. Add Platform-Specific Path Resolution
```typescript
function getConfigPath(client: string): string {
  switch (process.platform) {
    case 'darwin':
      return `~/Library/Application Support/${client}/config.json`;
    case 'win32':
      return path.join(process.env.APPDATA || '', client, 'config.json');
    case 'linux':
      return `~/.config/${client}/config.json`;
  }
}
```

### 2. Update ClientDetector with Platform Conditionals
```typescript
const CLIENT_PATTERNS = {
  'claude-desktop': {
    darwin: {
      configPaths: ['~/Library/Application Support/Claude/claude_desktop_config.json'],
      executablePaths: ['/Applications/Claude.app/Contents/MacOS/Claude']
    },
    win32: {
      configPaths: [path.join(process.env.APPDATA, 'Claude', 'claude_desktop_config.json')],
      executablePaths: ['C:\\Program Files\\Claude\\Claude.exe']
    },
    linux: {
      configPaths: ['~/.config/claude/claude_desktop_config.json'],
      executablePaths: ['/usr/bin/claude', '/opt/claude/claude']
    }
  }
  // ... other clients
};
```

### 3. Fix PATH Handling
```typescript
const PATH_SEPARATOR = process.platform === 'win32' ? ';' : ':';
const paths = process.env.PATH?.split(PATH_SEPARATOR) || [];
```

### 4. Update Frontend Display
The frontend should receive platform-appropriate paths from the backend, not hardcoded macOS paths.

## Files Requiring Updates
1. `src/main/services/ClientDetector.ts` - Add platform conditionals
2. `src/main/services/ClientDetectorV2.ts` - Add platform conditionals
3. `src/main/services/UnifiedConfigService.ts` - Add Windows/Linux paths
4. `src/shared/constants/index.ts` - Make platform-aware
5. `src/main/services/MCPClient.ts` - Fix PATH handling
6. `src/renderer/components/ClientConfigDialog.tsx` - Get paths from backend

## Testing Required
- Test on Windows 10/11
- Test on Ubuntu/Debian Linux
- Test on other Linux distributions
- Verify config file locations
- Verify executable detection
- Verify PATH resolution

## Conclusion
The application is currently **macOS-only** in practice due to extensive hardcoding. This is a **critical issue** that prevents cross-platform compatibility and explains why the app behaves differently on other systems.