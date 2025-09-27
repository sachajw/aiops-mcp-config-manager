# Developer Fixes Test Protocol
## Prepared: 2025-01-22 23:45 PST

### Issues Under Development
1. **React Flow Container Dimensions** - Needs explicit height
2. **JSON Editor Theme Detection** - Not working in dark mode
3. **Servers Not Displaying** - Visual workspace empty
4. **Duplicate Key Warnings** - Multiple "ship-ape" servers
5. **Metrics Loading Inefficiency** - Should use persistent cache

---

## 📋 Testing Checklist

### 1. React Flow Container Dimensions ⏳
**Issue**: Container needs explicit height for proper rendering
**Test Steps**:
```bash
# Check the Visual Workspace component
grep -n "height" src/renderer/components/VisualWorkspace/index.tsx
grep -n "100vh\|100%" src/renderer/components/VisualWorkspace/index.tsx
```

**Verification**:
- [ ] React Flow container has explicit height (e.g., `height: calc(100vh - 200px)`)
- [ ] No overflow issues in Visual Workspace
- [ ] Drag and drop area fully visible
- [ ] No console errors about container dimensions

**Visual Check**:
- [ ] Open Visual Workspace tab
- [ ] Verify full canvas is visible
- [ ] Test drag/drop functionality
- [ ] Check responsive behavior on window resize

---

### 2. JSON Editor Theme Detection ⏳
**Issue**: Theme not switching in dark mode
**Test Steps**:
```bash
# Check theme prop usage
grep -n "theme" src/renderer/components/editor/JsonEditor.tsx
grep -n "vs-dark\|vs-light" src/renderer/components/editor/JsonEditor.tsx

# Check if theme is passed from parent
grep -n "JsonEditor" src/renderer/components/
```

**Verification**:
- [ ] Theme prop correctly detects system/app theme
- [ ] Monaco Editor switches between vs-light and vs-dark
- [ ] No hardcoded theme values

**Visual Check**:
- [ ] Toggle app to dark mode
- [ ] Open JSON Editor
- [ ] Verify editor background is dark
- [ ] Verify syntax highlighting is visible in dark mode

---

### 3. Servers Not Displaying ⏳
**Issue**: Visual Workspace shows empty despite servers in cache
**Test Steps**:
```bash
# Check metrics cache
cat ~/Library/Application\ Support/Electron/metrics-cache.json | head -20

# Verify ServerLibrary loading
grep -n "useMetricsStore\|metricsState" src/renderer/components/VisualWorkspace/ServerLibrary.tsx

# Check server data flow
grep -n "serverMetrics" src/renderer/components/VisualWorkspace/ServerLibrary.tsx
```

**Verification**:
- [ ] Servers from cache appear in Server Library
- [ ] Server cards show real data (not fallback)
- [ ] Drag from library to canvas works

**Expected Servers** (from cache):
- desktop_mcp (24 tools, 10,771 tokens)
- iterm_mcp (3 tools, 206 tokens)
- peekaboo (3 tools, 1,943 tokens)
- ship-ape (25 tools, 2,842 tokens)
- playwright (21 tools, 2,344 tokens)

---

### 4. Duplicate Key Warnings ⏳
**Issue**: Multiple servers with same key causing React warnings
**Test Steps**:
```bash
# Check for duplicate handling
grep -n "key=" src/renderer/components/VisualWorkspace/ServerLibrary.tsx
grep -n "serverName\|id" src/renderer/components/VisualWorkspace/ServerLibrary.tsx

# Verify unique key generation
npm run dev:renderer 2>&1 | grep -i "duplicate key"
```

**Verification**:
- [ ] No console warnings about duplicate keys
- [ ] Each server has unique React key
- [ ] Multiple instances of same server handled correctly

**Console Check**:
```javascript
// Should see NO warnings like:
// Warning: Encountered two children with the same key, `ship-ape`
```

---

### 5. Metrics Loading from Persistent Cache ⏳
**Issue**: Should use persistent cache instead of re-fetching
**Test Steps**:
```bash
# Check cache loading implementation
grep -n "loadCachedMetrics\|metrics-cache" src/main/services/MetricsService.ts

# Verify IPC endpoint
grep -n "metrics:loadCached" src/main/ipc/handlers/MetricsHandler.ts

# Check frontend cache usage
grep -n "loadCachedMetrics" src/renderer/store/metricsStore.ts
```

**Verification**:
- [ ] Metrics load instantly from cache on app start
- [ ] No unnecessary server connections on startup
- [ ] Cache file is read and parsed correctly
- [ ] Metrics display immediately in Visual Workspace

**Performance Check**:
- [ ] Visual Workspace loads < 1 second
- [ ] No loading spinners for cached data
- [ ] Server metrics show immediately

---

## 🔄 Regression Tests

### After All Fixes Applied:
```bash
# Run type checking
npm run type-check

# Run affected component tests
npm test -- --testNamePattern="ServerLibrary|VisualWorkspace|JsonEditor"

# Check for any new violations
grep -r "|| 0\||| false\||| \"\"\||| \[\]" src/renderer --include="*.tsx" --include="*.ts"
```

### Visual Regression Checklist:
- [ ] Dashboard displays metrics correctly
- [ ] Configuration page loads without errors
- [ ] Settings page theme toggle works
- [ ] Visual Workspace shows all servers
- [ ] JSON Editor opens and formats properly
- [ ] No console errors in any view

---

## 📊 Success Criteria

### All fixes are complete when:
1. **Zero console errors** in browser DevTools
2. **Zero React warnings** about keys or props
3. **All servers visible** in Visual Workspace (13+ from cache)
4. **Theme switching works** in JSON Editor
5. **Metrics load instantly** from cache
6. **React Flow renders** with proper dimensions

---

## 🚦 Testing Commands

```bash
# Quick health check
npm run type-check && echo "✅ Types OK"

# Test specific components
npm test -- --testNamePattern="Visual" --no-coverage

# Check for regressions
grep -r "|| 0" src/renderer --include="*.tsx" | wc -l
# Expected: 0

# Monitor console for warnings
npm run electron:dev 2>&1 | grep -i "warning\|error"
```

---

## 📝 Notes for Developer

**Priority Order**:
1. Fix React Flow dimensions first (blocks visual testing)
2. Fix server display (needed to verify other fixes)
3. Fix duplicate keys (console noise blocks other debugging)
4. Fix theme detection (UX issue)
5. Optimize cache loading (performance)

**Testing Available**: QA ready to verify each fix as completed. Report each fix completion for immediate verification.