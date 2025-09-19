# Real Metrics & Server Catalog Test Checklist

## Prerequisites
- [ ] Electron app running with `npm run electron:dev`
- [ ] Visual Workspace enabled in Settings > Experimental Features
- [ ] Navigate to Visual tab

## Task 50: Real Metrics Collection Tests

### Server Metrics Display
- [ ] Open Visual Workspace
- [ ] Check Server Library cards show realistic tool counts:
  - [ ] Filesystem: ~8 tools (not 15)
  - [ ] PostgreSQL: ~12 tools
  - [ ] Search: ~5 tools
  - [ ] GitHub: ~15 tools
  - [ ] Docker: ~20 tools
- [ ] Verify token usage varies by server type:
  - [ ] AI servers show higher token usage (5000+)
  - [ ] Database servers show moderate usage (2000+)
  - [ ] Core servers show lower usage (800-1200)

### Performance Panel Metrics
- [ ] Open Performance Insights panel at bottom
- [ ] Verify total tokens reflect sum of actual server metrics
- [ ] Check response time shows realistic values (10-500ms)
- [ ] Verify active connections counter matches actual connected servers
- [ ] Expand details view:
  - [ ] Token distribution shows per-server values
  - [ ] Values should NOT all be 2500 (old hardcoded value)

### Dynamic Updates
- [ ] Add a server to canvas
- [ ] Performance metrics should update immediately
- [ ] Remove a server
- [ ] Metrics should decrease accordingly

## Task 51: Real Server Library Tests

### Server Catalog Loading
- [ ] Server Library should show 16+ servers (not just 5)
- [ ] Each server should display:
  - [ ] Proper name (PostgreSQL, GitHub, Docker, etc.)
  - [ ] Accurate description
  - [ ] Author information (Anthropic, Community, etc.)
  - [ ] Repository/website links
  - [ ] Realistic tool/token counts

### Category Filtering
- [ ] Click "Core" filter:
  - [ ] Should show Filesystem, Search servers
- [ ] Click "Data" filter:
  - [ ] Should show PostgreSQL, SQLite, MongoDB, Redis
- [ ] Click "Web" filter:
  - [ ] Should show Web Browser, Slack, AWS
- [ ] Click "AI" filter:
  - [ ] Should show OpenAI, Anthropic servers
- [ ] Click "Tools" filter:
  - [ ] Should show GitHub, Google Drive, Python, Node.js, Docker

### Search Functionality
- [ ] Search for "database":
  - [ ] Should find PostgreSQL, SQLite, MongoDB
- [ ] Search for "anthropic":
  - [ ] Should find Anthropic-authored servers
- [ ] Search for "python":
  - [ ] Should find Python execution server
- [ ] Clear search:
  - [ ] All servers should reappear

### Server Details
- [ ] Click info button on any server card
- [ ] Expanded view should show:
  - [ ] Full description
  - [ ] Author with icon
  - [ ] Repository link (clickable)
  - [ ] Website link (if available)
  - [ ] Config and Add buttons

## Task 52: Real Connection Monitoring Tests

### Connection Status Indicators
- [ ] Server cards should show realistic connection status:
  - [ ] Some marked as "Active" (green badge)
  - [ ] Others unmarked (not installed/inactive)
- [ ] Connection status should vary (not all connected)

### Response Time Monitoring
- [ ] Performance panel should show varying response times
- [ ] Response times should be realistic:
  - [ ] Local servers: 10-50ms
  - [ ] Network servers: 50-200ms
  - [ ] Cloud services: 100-500ms

### Connection Health Tracking
- [ ] In Performance panel details view:
  - [ ] Uptime should show realistic percentage
  - [ ] Error count should be low but non-zero
  - [ ] Warning count should vary
  - [ ] Queue should typically be 0

## Console Validation

Open browser DevTools and verify:
- [ ] No errors when loading server catalog
- [ ] Console shows "Loaded X servers from catalog"
- [ ] Metrics fetching doesn't produce errors
- [ ] No "undefined" or "null" warnings

## Regression Tests

Ensure existing features still work:
- [ ] Server drag-and-drop to canvas still functional
- [ ] Client selection still works
- [ ] Canvas nodes and edges render correctly
- [ ] Auto-save toggle functions properly
- [ ] Settings persistence works

## Performance Tests

### Load Testing
- [ ] Add 10+ servers to canvas
- [ ] UI remains responsive
- [ ] Metrics update without lag
- [ ] No memory leaks in console

### Stress Testing
- [ ] Rapidly switch between category filters
- [ ] Perform multiple searches quickly
- [ ] Add/remove servers repeatedly
- [ ] Check for performance degradation

## Error Handling

### Network Simulation
- [ ] Disconnect network (airplane mode)
- [ ] Server catalog should still show cached data
- [ ] Metrics should gracefully handle missing data
- [ ] No crash or white screen

### Invalid Data
- [ ] If catalog fails to load:
  - [ ] Should show meaningful error message
  - [ ] Should not break the UI
  - [ ] Should allow retry

## Expected vs Previous Behavior

| Feature | Old (Mock) | New (Real) |
|---------|-----------|------------|
| Server Count | 5 hardcoded | 16+ from catalog |
| Tool Counts | All 15 | Varies by type (5-25) |
| Token Usage | All 2500 | Varies (800-5000) |
| Response Time | Fixed 45ms | Varies (10-500ms) |
| Categories | Basic | Core, Data, Web, AI, Tools |
| Authors | Not shown | Anthropic, Community, etc. |
| Connections | All connected | Mixed status |

## Bug Report Template

When reporting issues:
1. **Feature Area**: (Metrics/Catalog/Monitoring)
2. **Expected**: What should happen
3. **Actual**: What actually happened
4. **Steps to Reproduce**: Exact steps
5. **Console Errors**: Copy any errors
6. **Screenshots**: Include if visual issue
7. **Environment**: OS, Electron version

---

*Last Updated: 2025-01-19*
*Testing Tasks 50-52: Real Metrics Implementation*