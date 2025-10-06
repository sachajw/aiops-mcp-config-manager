# Sprint 6: Architecture & Infrastructure

**Sprint Duration**: February 3-7, 2025 (5 days)
**Sprint Goal**: Improve reliability, observability, and portability
**Current Status**: Day 3 - 40% Complete

## 📊 Progress Update (February 6, 2025)

### ✅ Day 1-2 Completed:
- **Bug-032**: Save race condition - FIXED (no delay)
- **Bug-033**: Metrics performance - FIXED (36ms load)
- **Bug-034**: Performance panel - FIXED (updates properly)
- **Persistence Foundation**: Created and tested
  - PersistenceService.ts implemented
  - IPC handlers created
  - React hooks ready
  - Database.json working
  - 19 unit tests + 25 E2E tests passing

### 🔄 In Progress:
- **Task 203**: localStorage migration (1 of 7 files done)
- **Task 207**: Import Profile performance (identified, not started)

## 🎯 Sprint Objectives

Transform the app from "working" to "production-grade" by fixing architectural issues and adding enterprise features.

## 📋 Sprint Backlog

### 🔴 Critical Bugs (Day 1)

#### Task 200: Bug-032 - Save Race Condition
- **Problem**: 100ms setTimeout hack causing delayed/double saves
- **Solution**: Pass data directly to saveConfig instead of relying on async state
- **Files**:
  - `src/renderer/store/simplifiedStore.ts:387`
  - `src/renderer/components/VisualWorkspace/index.tsx:1103-1107`
- **Time**: 2 hours

#### Task 201: Bug-033 - Metrics Loading Performance
- **Problem**: Fetching fresh metrics every load despite cache
- **Solution**: Use allowStale flag, load from cache first
- **Files**:
  - `src/renderer/components/VisualWorkspace/index.tsx`
  - `src/main/services/MetricsService.ts`
- **Time**: 2 hours

#### Task 202: Bug-034 - Performance Insights Panel
- **Problem**: Panel doesn't update when switching clients
- **Solution**: Remove fallback to old servers, clear on client change
- **Files**:
  - `src/renderer/components/VisualWorkspace/InsightsPanel.tsx:38-45`
- **Time**: 1 hour

### 🏗️ Architecture Stories (Days 2-4)

#### Task 203: Story-001 - Unified Persistence Layer
**Problem**: Fragmented storage across localStorage, files, and memory
**Current Issues**:
- localStorage (15 calls across 7 files) - unreliable, browser-specific
- Metrics in file cache - not integrated
- Canvas state in localStorage - lost on clear
- No single source of truth

**Solution**: Create PersistenceService with JSON database
**Implementation**:
```typescript
// New database structure at ~/Library/Application Support/MCP Configuration Manager/database.json
{
  "version": 2,
  "configs": {},      // Server configurations
  "canvas": {},       // Visual workspace states
  "metrics": {},      // Cached server metrics
  "preferences": {},  // User settings
  "clients": {},      // Detected clients
  "lastModified": timestamp
}
```

**Tasks**:
1. Create `src/main/services/PersistenceService.ts`
2. Add IPC handlers for persistence operations
3. Replace ALL localStorage calls (7 files)
4. Migrate existing data
5. Add automatic backups

**Time**: 8 hours

#### Task 204: Story-002 - File-based Logging System
**Problem**: No persistent logs for debugging production issues
**Requirements**:
- Rotate after 10 files or 10 days
- Different log levels (error, warn, info, debug)
- Structured JSON logs
- Crash reports

**Implementation**:
```typescript
// src/main/services/LoggingService.ts
- Use winston or bunyan
- Log to: ~/Library/Logs/MCP Configuration Manager/
- Format: app-2025-02-03.log
- Auto-rotation and compression
```

**Files to Create**:
- `src/main/services/LoggingService.ts`
- `src/shared/utils/logger.ts`

**Time**: 4 hours

#### Task 205: Story-003 - Remove Hardcoded System Paths

#### Task 207: Story-004 - Import Profile Performance Fix
**Problem**: Import Profile button unresponsive/slow
**Current Issues**:
- Synchronous JSON.parse() blocks UI thread
- Synchronous localStorage writes
- No loading indicator during import
- O(n) duplicate name checking

**Solution**: Make import async with progress indication
**Implementation**:
```typescript
// Make async with Web Worker or chunks
async importProfile(profileData: string) {
  set({ isImporting: true });

  // Parse in chunks or worker
  const profile = await parseAsync(profileData);

  // Use PersistenceService instead of localStorage
  await persistenceService.saveProfile(profile);

  set({ isImporting: false });
}
```

**Time**: 2 hours

#### Task 206: Story-005 - Remove Dangerous Fallbacks
**Problem**: App behaves differently on different systems
**Current Hardcoded Values Found**:
- User paths: `/Users/briandawson/`
- Client paths: Hardcoded Claude Desktop locations
- System assumptions: macOS-specific paths

**Solution**:
1. Use Electron's app.getPath() for all system paths
2. Dynamic client detection based on OS
3. Configuration for path overrides
4. Environment variable support

**Files to Audit**:
```bash
# Find hardcoded paths:
grep -r "/Users/" src/
grep -r "~/Library" src/
grep -r "Application Support" src/
```

**Time**: 4 hours

## 📊 Success Criteria

### Bugs Fixed:
- [x] Save works instantly (no delay) ✅ Bug-032 fixed
- [x] Metrics load from cache ✅ Bug-033 fixed
- [x] Performance panel updates properly ✅ Bug-034 fixed

### Architecture Improvements:
- [ ] All data persists reliably
- [ ] Logs available for debugging
- [ ] Works on any macOS system
- [ ] No hardcoded paths

### Quality Metrics:
- [ ] 0 localStorage calls
- [ ] All data in unified database
- [ ] Logs rotating properly
- [ ] Portable to other systems

## 📅 Daily Plan

### Day 1 (Monday) - Bug Fixes
- Morning: Fix save race condition (Task 200)
- Afternoon: Fix metrics & panel (Tasks 201, 202)
- QA: Verify all fixes

### Day 2 (Tuesday) - Persistence Layer
- Design PersistenceService
- Implement core functionality
- Begin localStorage migration

### Day 3 (Wednesday) - Persistence & Logging
- Complete persistence migration
- Implement logging system
- Add log rotation

### Day 4 (Thursday) - Portability
- Remove hardcoded paths
- Test on different systems
- Add configuration options

### Day 5 (Friday) - Testing & Polish
- Integration testing
- Performance testing
- Documentation
- Release preparation

## 🧪 QA Test Plan

### Persistence Tests:
1. Clear browser data → Settings persist
2. Kill app → Restart → Canvas state preserved
3. Check database.json exists and is valid

### Logging Tests:
1. Generate 10MB of logs → Rotation occurs
2. Run for 10 days → Old logs deleted
3. Crash app → Crash report generated

### Portability Tests:
1. Install on fresh Mac → Works immediately
2. Different user account → Paths resolve correctly
3. No "briandawson" in any file

## 📝 Documentation Required

1. **Persistence Migration Guide**
2. **Logging Configuration**
3. **System Requirements**
4. **Troubleshooting Guide**

## Definition of Done

- All bugs verified fixed
- Persistence layer fully migrated
- Logging system operational
- No hardcoded paths remain
- Tests passing
- Documentation complete