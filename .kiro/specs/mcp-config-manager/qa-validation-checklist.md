# QA Validation Checklist - Sprint 4 Critical Fixes

**Date**: 2025-09-30
**Sprint**: Sprint 4
**Fixes to Validate**: Bug-021 (Retry Loop), Bug-027 (OAuth Loop)

## Test Environment Setup

- [ ] Clean test environment
- [ ] Latest build from main branch
- [ ] Console/Developer Tools open for monitoring
- [ ] Activity Monitor/Task Manager ready

## Bug-021: Infinite Retry Loop Validation

### Test Case 1: Failed Connection Retry Limiting
1. [ ] Add server with invalid port (localhost:99999)
2. [ ] Monitor console output
3. [ ] **Verify**: Exactly 5 retry attempts
4. [ ] **Verify**: Exponential delays (1s, 2s, 4s, 8s, 16s)
5. [ ] **Verify**: Server marked as 'unavailable' after 5th attempt
6. [ ] **Verify**: No further retry attempts after unavailable status

### Test Case 2: Multiple Failed Servers
1. [ ] Add 3 servers with invalid configurations
2. [ ] **Verify**: Each server independently retries 5 times
3. [ ] **Verify**: App remains responsive
4. [ ] **Verify**: CPU usage stable

### Test Case 3: ECONNREFUSED Handling
1. [ ] Add server pointing to closed port
2. [ ] **Verify**: ECONNREFUSED error properly logged
3. [ ] **Verify**: Clean retry behavior (no infinite loop)

## Bug-027: OAuth Loop Prevention Validation

### Test Case 1: OAuth Authentication Limiting
1. [ ] Add Fireflies server (or any OAuth server)
2. [ ] Let authentication trigger
3. [ ] **Verify**: Maximum 1 browser tab opens
4. [ ] **Verify**: No additional tabs after 30 seconds
5. [ ] **Verify**: Console shows "Max auth attempts reached"

### Test Case 2: Server Removal During Auth
1. [ ] Add OAuth server
2. [ ] Let auth attempt start
3. [ ] Delete server from Visual Workspace
4. [ ] **Verify**: Process terminated immediately
5. [ ] **Verify**: No new browser tabs open
6. [ ] **Verify**: Process not in `ps aux | grep mcp`

### Test Case 3: Config Save After Removal
1. [ ] Add OAuth server
2. [ ] Remove server
3. [ ] Save configuration
4. [ ] **Verify**: Server not in saved config
5. [ ] **Verify**: No zombie processes
6. [ ] Restart app
7. [ ] **Verify**: No auth attempts on startup

## Regression Testing

### Core Functionality
- [ ] Normal servers connect properly
- [ ] Valid OAuth flows still work
- [ ] Server metrics display correctly
- [ ] Visual Workspace drag/drop works
- [ ] Configuration saves/loads properly

### Performance
- [ ] Client switching < 2 seconds
- [ ] No memory leaks after 10 minutes
- [ ] CPU usage normal with 5+ servers

### Edge Cases
- [ ] Server that starts then crashes
- [ ] Network disconnection during retry
- [ ] Multiple OAuth servers simultaneously
- [ ] Rapid add/remove of servers

## Sign-off Criteria

### Bug-021 (Retry Loop) ✅ Requirements Met:
- [ ] Max 5 retries enforced
- [ ] Exponential backoff working
- [ ] Server marked unavailable
- [ ] No performance degradation

### Bug-027 (OAuth Loop) ✅ Requirements Met:
- [ ] Max 1 auth attempt
- [ ] 30s cooldown enforced
- [ ] Process cleanup on removal
- [ ] No browser hijacking

### Overall Quality:
- [ ] No new bugs introduced
- [ ] All test cases pass
- [ ] Performance acceptable
- [ ] User experience improved

## QA Notes
_Space for QA engineer to add observations_

---

## Approval

- [ ] QA Engineer Sign-off
- [ ] Developer Review
- [ ] PM Approval for Release

**QA Result**: [ ] PASS / [ ] FAIL

**Ready for Release**: [ ] YES / [ ] NO