# Edge Cases & Validation Scenarios

## Visual Workspace Save/Load Edge Cases

### 1. Data Corruption Scenarios

#### Scenario A: Partial JSON Corruption
**Setup**: Manually inject malformed JSON into localStorage
```javascript
// Corruption patterns to test
const corruptionTests = [
  { name: 'truncated', data: '{"nodes":[{"id":"1","type":"serv' },
  { name: 'invalid-escape', data: '{"nodes":[{"data":"\invalid"}]}' },
  { name: 'circular-ref', data: '{"nodes":[{"id":"1","ref":"$nodes[0]"}]}' },
  { name: 'null-bytes', data: '{"nodes":\0[]}' },
  { name: 'mixed-encoding', data: '{"nodes":[{"name":"test\u0000"}]}' }
];
```
**Expected Behavior**:
- Error caught gracefully
- User notified with actionable message
- Offer to restore from backup
- No application crash

#### Scenario B: Type Mismatches
**Setup**: Save workspace with incorrect data types
```javascript
const invalidTypes = {
  nodes: "should-be-array",  // String instead of array
  edges: null,                // Null instead of array
  position: "100,200",        // String instead of object
  metadata: 123               // Number instead of object
};
```
**Validation Required**:
- Type checking before save
- Schema validation on load
- Type coercion where safe
- Rejection with clear error

### 2. Boundary Conditions

#### Scenario C: localStorage Quota Exceeded
**Setup**: Fill localStorage to near capacity
```javascript
// Fill localStorage to 99% capacity
const fillStorage = () => {
  const size = 5 * 1024 * 1024; // 5MB
  const data = 'x'.repeat(size);
  try {
    localStorage.setItem('filler', data);
  } catch (e) {
    // QuotaExceededError
  }
};
```
**Test Cases**:
1. Save small workspace (should succeed with cleanup)
2. Save large workspace (should fail gracefully)
3. Automatic cleanup of old workspaces
4. User prompted to free space

#### Scenario D: Maximum Node/Edge Limits
**Test Matrix**:
| Element | Count | Expected Result |
|---------|-------|----------------|
| Nodes | 1000 | Should save/load |
| Nodes | 10000 | Performance warning |
| Nodes | 100000 | Rejected with error |
| Edges | 5000 | Should save/load |
| Edges | 50000 | Performance warning |
| Edges | 500000 | Rejected with error |

### 3. Concurrent Operations

#### Scenario E: Simultaneous Save Operations
**Setup**: Trigger multiple saves simultaneously
```javascript
// Race condition test
Promise.all([
  saveWorkspace('workspace1'),
  saveWorkspace('workspace2'),
  saveWorkspace('workspace3')
]);
```
**Expected**:
- Mutex lock prevents corruption
- Queue saves sequentially
- All saves complete successfully
- No data interleaving

#### Scenario F: Save During Load
**Setup**: Initiate save while load in progress
```javascript
const loadPromise = loadWorkspace('large-workspace');
setTimeout(() => saveWorkspace('interrupt-test'), 10);
```
**Expected**:
- Operations queued properly
- No state corruption
- Both operations complete
- User notified of conflicts

### 4. Special Characters & Encoding

#### Scenario G: Unicode & Emoji in Names
**Test Data**:
```javascript
const specialNames = [
  '测试工作区',           // Chinese
  'ワークスペース',       // Japanese
  '🚀🎯🔥 Workspace',    // Emojis
  'Work\nSpace',         // Newline
  'Work\tSpace',         // Tab
  'Work\\Space',         // Backslash
  'Work"Space"',         // Quotes
  '<script>alert()</script>', // XSS attempt
  '../../../etc/passwd',     // Path traversal
  'Work Space ',         // Trailing spaces
];
```
**Validation**:
- Proper encoding/decoding
- XSS prevention
- Path traversal protection
- Trimming/normalization

### 5. State Inconsistencies

#### Scenario H: Orphaned Edges
**Setup**: Edges referencing non-existent nodes
```javascript
const inconsistentState = {
  nodes: [{ id: 'node1' }],
  edges: [
    { source: 'node1', target: 'node2' }, // node2 doesn't exist
    { source: 'node3', target: 'node1' }  // node3 doesn't exist
  ]
};
```
**Expected Behavior**:
- Orphaned edges detected
- Auto-cleanup on load
- Warning shown to user
- Option to restore or fix

#### Scenario I: Duplicate Node IDs
**Setup**: Multiple nodes with same ID
```javascript
const duplicateNodes = {
  nodes: [
    { id: 'node1', type: 'server' },
    { id: 'node1', type: 'client' }, // Duplicate ID
  ]
};
```
**Resolution**:
- ID uniqueness enforced
- Auto-generate new IDs
- Maintain edge integrity
- Log conflict resolution

### 6. Browser-Specific Issues

#### Scenario J: Cross-Browser Compatibility
**Test Browsers**:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers

**Test Cases**:
1. localStorage API differences
2. JSON parsing variations
3. Memory limits
4. Performance characteristics
5. Event handling differences

#### Scenario K: Private/Incognito Mode
**Setup**: Run app in private browsing
**Expected**:
- Detect private mode
- Use memory storage fallback
- Warn user about persistence
- Session-only workspaces

### 7. Data Migration Scenarios

#### Scenario L: Version Migration
**Setup**: Load workspace from older version
```javascript
// v1 format (old)
const v1Workspace = {
  version: 1,
  servers: [],  // Old property name
};

// v2 format (new)
const v2Workspace = {
  version: 2,
  nodes: [],    // New property name
  edges: [],
};
```
**Migration Path**:
- Detect version
- Apply migration
- Backup original
- Update version

### 8. Performance Edge Cases

#### Scenario M: Rapid Save/Load Cycles
**Test**: Save and load repeatedly
```javascript
for (let i = 0; i < 100; i++) {
  await saveWorkspace(`stress-${i}`);
  await loadWorkspace(`stress-${i}`);
}
```
**Monitoring**:
- Memory leaks
- Performance degradation
- localStorage fragmentation
- UI responsiveness

#### Scenario N: Large Individual Nodes
**Setup**: Nodes with extensive metadata
```javascript
const largeNode = {
  id: 'large1',
  data: {
    metadata: {
      logs: Array(10000).fill('log entry'),
      config: { /* 1MB of config */ },
      history: [ /* 1000 state changes */ ]
    }
  }
};
```
**Validation**:
- Serialization time
- Storage efficiency
- Load performance
- Memory usage

### 9. Recovery Mechanisms

#### Scenario O: Backup Recovery
**Test Cases**:
1. Auto-backup before overwrite
2. Manual backup creation
3. Restore from backup
4. Backup rotation (keep last 5)
5. Backup corruption handling

#### Scenario P: Crash Recovery
**Setup**: Simulate app crash during save
**Expected**:
- Temp file created during save
- Atomic write operation
- Recovery on next launch
- No partial writes

### 10. Security Considerations

#### Scenario Q: XSS Prevention
**Attack Vectors**:
```javascript
const xssTests = [
  '<img src=x onerror=alert(1)>',
  'javascript:alert(1)',
  '<script>alert(1)</script>',
  '"><script>alert(1)</script>',
  'onclick="alert(1)"'
];
```
**Validation**:
- Input sanitization
- Output encoding
- CSP headers
- No eval() usage

#### Scenario R: Data Tampering
**Setup**: Modify localStorage externally
**Detection**:
- Checksum validation
- Schema validation
- Signature verification
- Tamper notifications

---

## Validation Implementation Guide

### Pre-Save Validation
```typescript
interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

function validateWorkspace(workspace: Workspace): ValidationResult {
  const errors = [];
  const warnings = [];

  // Size checks
  if (workspace.nodes.length > 10000) {
    errors.push('Too many nodes (max 10000)');
  }
  if (workspace.nodes.length > 1000) {
    warnings.push('Large workspace may affect performance');
  }

  // Type validation
  if (!Array.isArray(workspace.nodes)) {
    errors.push('Nodes must be an array');
  }

  // ID uniqueness
  const ids = new Set();
  workspace.nodes.forEach(node => {
    if (ids.has(node.id)) {
      errors.push(`Duplicate node ID: ${node.id}`);
    }
    ids.add(node.id);
  });

  // Edge validation
  workspace.edges.forEach(edge => {
    if (!ids.has(edge.source) || !ids.has(edge.target)) {
      warnings.push(`Edge references missing node`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}
```

### Error Recovery Strategy
```typescript
async function recoverFromError(error: Error, workspace: string): Promise<void> {
  console.error('Workspace operation failed:', error);

  // Attempt recovery strategies
  const strategies = [
    () => restoreFromBackup(workspace),
    () => repairCorruptedData(workspace),
    () => loadDefaultWorkspace(),
    () => createEmptyWorkspace()
  ];

  for (const strategy of strategies) {
    try {
      await strategy();
      break;
    } catch (e) {
      continue;
    }
  }
}
```

---

## Testing Checklist

### Manual Testing Required
- [ ] Test with 100+ nodes
- [ ] Test with complex nested data
- [ ] Test with 5MB+ workspace
- [ ] Test rapid save/load cycles
- [ ] Test browser refresh during save
- [ ] Test with localStorage disabled
- [ ] Test in private browsing mode
- [ ] Test with devtools open
- [ ] Test keyboard interrupts
- [ ] Test with slow network

### Automated Testing Coverage
- [ ] Unit tests for validation functions
- [ ] Integration tests for save/load flow
- [ ] E2E tests for user workflows
- [ ] Performance benchmarks
- [ ] Memory leak detection
- [ ] Cross-browser testing
- [ ] Stress testing
- [ ] Security scanning
- [ ] Accessibility testing
- [ ] Data migration tests