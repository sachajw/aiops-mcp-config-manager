# Sprint 4 - Critical Fixes & Performance
*January 24-30, 2025*

## Sprint Overview
- **Theme**: Critical bug fixes and performance optimization
- **Duration**: 1 week
- **Priority**: CRITICAL - Address performance blockers before final polish
- **Goal**: Zero critical bugs, stable performance
- **Status**: ✅ CRITICAL OBJECTIVES COMPLETE (2025-09-30)

## Critical Issues to Fix (2 CRITICAL, 1 HIGH)

### 🔴 Bug-020: Metrics Performance Issue (CRITICAL)
**Problem**: Client selection triggers live connections to ALL servers
**Impact**: 10-30 second delays when switching clients
**Solution**:
- Implement lazy loading for metrics
- Cache metrics with 5-minute TTL
- Only connect on explicit user request
- Add connection pooling
**Task**: 177

### ✅ Bug-021: Infinite Retry Loop (HIGH) - FIXED
**Problem**: Failed servers retry endlessly (figma-dev-mode example)
**Impact**: Console flooding, CPU usage, performance degradation
**Solution IMPLEMENTED**:
- ✅ Exponential backoff [1s, 2s, 4s, 8s, 16s]
- ✅ Maximum 5 retry attempts
- ✅ Proper ECONNREFUSED handling
- ✅ Server marked as 'unavailable' after max retries
**Task**: 178 - COMPLETE (QA Verified)

### 🟡 Bug-022: Claude Desktop Auto-Launch (MEDIUM)
**Problem**: Claude Desktop launches when app/tests run
**Likely Cause**: File access to Claude config triggers macOS Launch Services
**Solution**:
- Add read-only flags to file access
- Investigate alternative detection methods
- Add logging to track launch triggers
**Task**: 179

## Remaining UI Bugs (8 MEDIUM Priority)

### Visual Workspace Issues
- **Bug-007**: Floating toolbar overlap
- **Bug-008**: Save buttons inconsistency
- **Bug-009**: Canvas/JSON editor save logic mismatch
- **Bug-010**: Project scope header cutoff

### Discovery & Installation
- **Bug-012**: Context menu for server cards
- **Bug-013**: Discovery installation errors

### Editor Issues
- **Bug-011**: TOML support needed
- **Task-167**: JSON Editor expand/collapse control

## Sprint Schedule

### Day 1-2: Critical Performance Fixes
- Fix Bug-020 (metrics performance)
- Fix Bug-021 (infinite retry)
- Performance testing and validation

### Day 3: System Stability
- Fix Bug-022 (Claude auto-launch)
- Add comprehensive logging
- Test with 50+ servers

### Day 4-5: UI Bug Fixes
- Fix remaining 8 UI bugs
- Visual polish and consistency
- User experience improvements

### Day 6-7: Testing & Validation
- Full regression testing
- Performance benchmarks
- Docker test environment setup
- QA sign-off

## Success Criteria
- [ ] All critical bugs fixed (Bug-020, Bug-021)
- [ ] Performance: <2 second client switch time
- [ ] No infinite retry loops
- [ ] Claude Desktop doesn't auto-launch
- [ ] All 8 UI bugs resolved
- [ ] Tests passing with >80% coverage
- [ ] Docker test environment operational

## Resources Required
- **Developer**: Full-time on critical fixes
- **QA**: Continuous testing and validation
- **PM**: Tracking and coordination

## Risk Mitigation
- **Performance Risk**: If connection pooling is complex, implement simple cache first
- **Retry Logic Risk**: Test with multiple unavailable servers
- **UI Risk**: Prioritize functional bugs over cosmetic issues

## Dependencies
- Sprint 3 completion (testing infrastructure)
- Metrics cache system working
- Client detection stable

## Next Sprint Preview (Sprint 5)
- Final polish and documentation
- Release build preparation
- Multi-platform testing
- GitHub release process

## Team Assignments

### Developer Priority Order:
1. Bug-020: Metrics performance (Day 1)
2. Bug-021: Infinite retry (Day 1-2)
3. Bug-022: Claude launch (Day 3)
4. UI bugs (Day 4-5)

### QA Focus:
1. Performance testing with large server counts
2. Retry logic edge cases
3. UI regression testing
4. Cross-platform validation

### PM Tasks:
1. Track critical bug resolution
2. Coordinate developer/QA handoffs
3. Update stakeholders on progress
4. Prepare Sprint 5 release plan

## Definition of Done
- All code changes have tests
- Documentation updated
- QA validation complete
- No regression in existing features
- Performance metrics meet targets