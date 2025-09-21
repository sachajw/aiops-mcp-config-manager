# Visual Workspace Context

## Active Issues
- Task 119: Client Library shows only Claude Code servers (CRITICAL)
- ✅ Task 131: FIXED - React Flow CableEdge type constraints resolved

## Key Files
- `src/renderer/components/VisualWorkspace/index.tsx` - Main component
- `src/renderer/components/VisualWorkspace/ServerLibrary.tsx` - Server filtering logic
- `src/renderer/store/simplifiedStore.ts` - State management

## Current Problems to Fix

### Server Library Filtering (Lines 225-249)
```typescript
// WRONG: Shows configured servers
if (activeClient && activeClient !== 'catalog' && clientServers) {
  serversToShow = clientServers.map(...);
}

// CORRECT: Should show available (catalog - configured)
if (activeClient && activeClient !== 'catalog') {
  const configured = new Set(clientServers);
  serversToShow = catalog.filter(s =>
    s.installed && !configured.has(s.name)
  );
}
```

### Props Not Passed
- ServerLibrary needs `activeClient` and `clientServers` props
- Currently missing from parent component

## Commands
```bash
npm run electron:dev  # Start app
npm test -- VisualWorkspace  # Test component
```