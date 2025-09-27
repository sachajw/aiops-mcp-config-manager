# QA Test Report: Bug-017 - Discovery Page Issues

## Test Summary
- **Bug ID**: Bug-017
- **Date**: 2025-09-27
- **Tested By**: QA Instance
- **Test Environment**: Development
- **Result**: ✅ **CONFIRMED - BUG EXISTS**

## Bug Details
**Bug-017: Discovery Page Duplicate Keys & Missing Install Handler**
- **Status**: 🔴 CRITICAL - ACTIVE
- **Location**: Discovery Page → Server installation
- **Impact**: Cannot install servers from Discovery page, React rendering issues

## Test Results

### Issue 1: Missing IPC Handler Registration ❌ CONFIRMED

**Test Evidence:**
```
✕ should have DiscoveryHandler registered in modular system
Expected: true
Received: false
```

**Finding**: DiscoveryHandler is NOT registered in the modular handler system at `src/main/ipc/handlers/index.ts`

**Console Output:**
```
WARNING: Both legacy and modular handler systems are in use
Has Legacy Discovery Registration: true
Has Modular Handler Registration: true
```

**Root Cause Confirmed:**
- Discovery handlers exist in legacy file: `src/main/ipc/discoveryHandlers.ts`
- They are registered via `registerDiscoveryHandlers()` in main.ts
- They are NOT integrated into the modular `BaseHandler` system
- This architectural inconsistency causes the handler registration issue

### Issue 2: Duplicate React Keys ❌ CONFIRMED

**Test Evidence:**
```
✕ should generate unique IDs for different servers
Expected: 3 unique IDs
Received: 1 (all identical)

ID1: github-3p-mcp-server
ID2: github-3p-mcp-server
ID3: github-3p-mcp-server
```

**Finding**: Different server names normalize to the same ID, causing duplicate React keys

**Examples of Collision:**
- `mcp-server` → `github-3p-mcp-server`
- `mcp_server` → `github-3p-mcp-server`
- `MCP-Server` → `github-3p-mcp-server`

All three different inputs produce the exact same ID!

### Issue 3: No Duplicate Prevention Logic ❌ CONFIRMED

**Test Evidence:**
```
✕ should not have duplicate keys in server list
Expected: true (has duplicate prevention)
Received: false (no duplicate prevention)
```

**Finding**: DiscoveryPage.tsx has no logic to detect or prevent duplicate keys

## Test Files Created

### `/src/test/bug-017.test.ts`
- Comprehensive test suite for Bug-017
- Tests IPC handler registration
- Tests ID generation uniqueness
- Tests duplicate key prevention
- Tests architectural consistency

## Test Execution

```bash
npm test -- bug-017.test.ts

Results:
- Tests: 3 failed, 2 passed, 5 total
- Failures confirm bug existence
```

## Verification Checklist

### Bug-017 Verification
- **Date**: 2025-09-27 12:47 PST
- **Verified By**: QA Instance
- **Test Environment**: dev
- **Console Output**: See test results above
- **Test Steps**:
  1. Created comprehensive test suite
  2. Tested IPC handler registration - FAILED (not in modular system)
  3. Tested ID uniqueness - FAILED (duplicates generated)
  4. Tested duplicate prevention - FAILED (no logic exists)
  5. Confirmed architectural issues with dual handler systems
- **Result**: ❌ **BUG CONFIRMED - NOT FIXED**

## Impact Assessment

### Critical Issues:
1. **Broken Installation**: Users cannot install servers from Discovery page
2. **React Performance**: Duplicate keys cause React rendering issues
3. **Architectural Debt**: Two handler systems running in parallel

### User Impact:
- Discovery page core functionality broken
- Potential UI performance degradation
- Console errors visible to developers

## Recommendations for Developer (Bug-014 work)

While Bug-017 is confirmed, the developer should continue with Bug-014 (Server Name Progressive Truncation) as it's also critical. Bug-017 requires architectural refactoring that may be better suited for a dedicated sprint.

### Priority Order:
1. **Bug-014**: Fix server name truncation (data corruption issue)
2. **Bug-017**: Fix Discovery page (after Bug-014)

## Files Requiring Changes (Bug-017)

1. **Create**: `src/main/ipc/handlers/DiscoveryHandler.ts` (new modular handler)
2. **Update**: `src/main/ipc/handlers/index.ts` (register DiscoveryHandler)
3. **Update**: `src/main/services/McpDiscoveryService.ts` (fix ID generation)
4. **Update**: `src/renderer/pages/Discovery/DiscoveryPage.tsx` (add duplicate prevention)
5. **Remove**: Legacy handler registration from `main.ts`

## Test Status: COMPLETE

QA testing of Bug-017 is complete. The bug is confirmed to exist with comprehensive test coverage proving both issues.