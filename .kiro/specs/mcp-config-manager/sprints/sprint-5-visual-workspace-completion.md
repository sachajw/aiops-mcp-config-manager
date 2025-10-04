# Sprint 5: Visual Workspace Completion

**Sprint Duration**: February 3-7, 2025 (5 days)
**Sprint Goal**: Fix all Visual Workspace bugs to achieve production-ready save/load functionality

## Sprint Objectives

### 🎯 Primary Goal
Complete Visual Workspace functionality - all configurations must save, load, and persist correctly.

### 🔴 CRITICAL Tasks (Must Complete)

#### Task 170: Bug-016 - JSON Editor Hiding Visual Canvas
- **Problem**: When JSON editor opens, visual canvas disappears
- **Impact**: Users can't see both views simultaneously
- **Time**: 3 hours

#### Task 175: Bug-019 - Project Scope Config Loading
- **Problem**: Project scope canvas doesn't load project configs
- **Impact**: Users can't edit project-specific servers
- **Correct Paths** (per official docs):
  - Claude Code: `.mcp.json` (project root)
  - VS Code: `.vscode/mcp.json`
  - Cursor: `.cursor/mcp.json`
  - Claude Desktop: NOT SUPPORTED (user scope only)
- **Time**: 3 hours

#### Task 172: Bug-018 - Project Scope Layout & Save
- **Problem**: Project scope UI cuts off, save button inaccessible
- **Impact**: Can't save project configurations
- **Time**: 2 hours

#### Task 171: Bug-017 - Discovery Page Installation
- **Problem**: Install buttons broken, duplicate React keys
- **Impact**: Can't install new servers from catalog
- **Time**: 1.5 hours

#### Task 177: Bug-020 - Metrics Performance
- **Problem**: 30+ second freeze when switching clients
- **Impact**: App unusable with multiple servers
- **Time**: 2 hours (already has solution documented)

### 🟡 Secondary Tasks (If Time Permits)

#### Task 179: Bug-022 - Claude Desktop Auto-Launch
- **Problem**: Claude Desktop launches without user action
- **Impact**: User annoyance
- **Time**: 1 hour investigation

#### Task 173: Project Management System
- Design proper project creation/management UI
- Time: 4 hours

#### Task 174: Profile Support Polish
- Validate profile switching works correctly
- Time: 2 hours

## Success Criteria
- [ ] All 5 critical Visual Workspace bugs fixed
- [ ] Save button works in all scopes
- [ ] Configurations persist to disk correctly
- [ ] JSON editor and visual canvas both visible
- [ ] Discovery page installation functional
- [ ] Performance <2 seconds for all operations
- [ ] QA sign-off on all fixes

## Task Assignment

### Developer Tasks (Priority Order)
1. Task 177 (Bug-020) - Performance fix first (has documented solution)
2. Task 170 (Bug-016) - Fix split view layout
3. Task 175 (Bug-019) - Project scope loading
4. Task 172 (Bug-018) - Project scope save
5. Task 171 (Bug-017) - Discovery installation

### QA Tasks (Continuous)
1. Validate each bug fix as completed
2. Test save/load in all scopes
3. Performance benchmarking
4. Regression testing
5. Sign-off checklist

## Daily Plan

### Day 1 (Monday)
- Fix Task 177 (Performance) - 2 hours
- Fix Task 170 (Split view) - 3 hours
- QA validation

### Day 2 (Tuesday)
- Fix Task 175 (Project loading) - 3 hours
- Fix Task 172 (Project save) - 2 hours
- QA validation

### Day 3 (Wednesday)
- Fix Task 171 (Discovery) - 1.5 hours
- Begin Task 179 investigation - 1 hour
- Integration testing

### Day 4 (Thursday)
- Complete any remaining fixes
- Full regression testing
- Performance validation

### Day 5 (Friday)
- Final QA sign-off
- Documentation updates
- Release preparation

## Definition of Done
- All code changes committed
- Tests written and passing
- IPC contracts updated
- QA validation complete
- No regressions introduced
- Performance targets met (<2 seconds)

## Notes
- Sprint 4 achievements: Fixed Bug-021 (retry), Bug-027 (OAuth), completed packaging
- This sprint focuses solely on Visual Workspace stability
- All tasks are bug fixes - no new features
- Priority is save/load functionality working correctly