# Monaco Editor Integration Test Plan
*Created: 2025-01-22*
*Purpose: Comprehensive testing strategy for integrating the existing JsonEditor component*

## Executive Summary

The Monaco Editor component (`JsonEditor.tsx`) exists and is fully implemented (297 lines) but is NOT integrated into the UI. This test plan covers the integration process and comprehensive testing requirements.

## Current State Analysis

### Components Already Built:
1. **JsonEditor.tsx** (297 lines) - Complete Monaco editor implementation
   - Syntax highlighting for JSON
   - Error validation
   - Format/minify capabilities
   - Schema validation support
   - Read-only mode support

2. **ConfigurationEditor.tsx** (242 lines) - Config management wrapper
   - Tab-based interface (Form/JSON views)
   - Imports and uses JsonEditor
   - Validation feedback
   - Import/export capabilities

### Missing Integration:
- ConfigurationEditor is NOT imported anywhere in the app
- No routes or navigation to the JSON editing functionality
- Users cannot access this advertised feature

## Integration Requirements

### Phase 1: Wire Up Components

#### Integration Points:
1. **Main App Router** (`App.tsx` or `SimplifiedApp.tsx`)
   ```typescript
   import ConfigurationEditor from './components/editor/ConfigurationEditor';
   // Add route: <Route path="/editor" element={<ConfigurationEditor />} />
   ```

2. **Navigation Menu** (`AppLayout.tsx` or navigation component)
   ```typescript
   // Add menu item for JSON Editor
   { key: 'editor', label: 'JSON Editor', icon: <CodeOutlined /> }
   ```

3. **Server Configuration Dialogs**
   - Add "Edit JSON" button to server config dialogs
   - Open JsonEditor in modal or side panel

4. **Client Configuration Pages**
   - Add "Advanced Editor" toggle to switch between form and JSON views

### Phase 2: Testing Requirements

## Test Cases

### 1. Component Rendering Tests

#### Test 1.1: JsonEditor Renders
**Steps:**
1. Navigate to JSON Editor page/modal
2. Verify Monaco Editor loads
3. Check for syntax highlighting

**Expected:**
- Editor visible with Monaco theme
- JSON syntax highlighted
- No console errors

#### Test 1.2: ConfigurationEditor Tab Switching
**Steps:**
1. Open ConfigurationEditor
2. Click "Form" tab
3. Click "JSON" tab
4. Switch back and forth

**Expected:**
- Smooth transitions
- State preserved between switches
- No data loss

### 2. Functionality Tests

#### Test 2.1: JSON Syntax Highlighting
**Input:**
```json
{
  "servers": {
    "test-server": {
      "command": "npx",
      "args": ["-y", "test-mcp"]
    }
  }
}
```

**Expected:**
- Keywords highlighted (blue)
- Strings highlighted (green/red)
- Numbers highlighted (orange)
- Proper indentation

#### Test 2.2: Error Validation
**Input:** Invalid JSON
```json
{
  "servers": {
    "test": "value",  // Missing closing brace
}
```

**Expected:**
- Red squiggly underlines on errors
- Error message in gutter
- Error count displayed
- Cannot save with errors

#### Test 2.3: Format Button
**Input:** Minified JSON
```json
{"servers":{"test":{"command":"npx","args":["test"]}}}
```

**Action:** Click "Format" button

**Expected:**
```json
{
  "servers": {
    "test": {
      "command": "npx",
      "args": ["test"]
    }
  }
}
```

#### Test 2.4: Minify Button
**Input:** Formatted JSON (from 2.3)
**Action:** Click "Minify" button
**Expected:** Single line output (as in 2.3 input)

### 3. Schema Validation Tests

#### Test 3.1: Valid MCP Configuration
**Input:**
```json
{
  "servers": {
    "valid-server": {
      "command": "node",
      "args": ["server.js"],
      "env": {
        "API_KEY": "test-key"
      }
    }
  }
}
```

**Expected:**
- No validation errors
- Green checkmark indicator
- Can save successfully

#### Test 3.2: Invalid MCP Configuration
**Input:**
```json
{
  "servers": {
    "invalid-server": {
      "invalidField": "test"  // Not in MCP schema
    }
  }
}
```

**Expected:**
- Schema validation error
- Warning about unknown field
- Yellow/orange warning indicator

### 4. Integration Tests

#### Test 4.1: Save to Client Config
**Steps:**
1. Select client (e.g., "claude-desktop")
2. Edit configuration in JSON editor
3. Click "Save"
4. Verify file updated

**Expected:**
- File saved to correct path
- Backup created
- Success notification
- Changes reflected in UI

#### Test 4.2: Load Existing Config
**Steps:**
1. Open editor for client with existing config
2. Verify JSON loads correctly
3. Make changes
4. Save and reload

**Expected:**
- Current config loaded
- Formatting preserved
- Comments preserved (if JSON5)
- Changes persist

#### Test 4.3: Read-Only Mode
**Steps:**
1. Open config without write permissions
2. Try to edit
3. Try to save

**Expected:**
- Editor in read-only mode
- Cannot type or modify
- Save button disabled
- Clear indication of read-only status

### 5. Performance Tests

#### Test 5.1: Large File Handling
**Input:** Config with 50+ servers
**Expected:**
- Editor remains responsive
- Syntax highlighting works
- No lag when typing
- Format/minify completes < 2 seconds

#### Test 5.2: Real-Time Validation
**Action:** Type rapidly, introduce/fix errors
**Expected:**
- Validation updates in real-time
- No blocking of typing
- Smooth error highlighting

### 6. Accessibility Tests

#### Test 6.1: Keyboard Navigation
**Actions:**
- Tab through controls
- Use keyboard shortcuts (Cmd+S to save)
- Navigate with arrow keys

**Expected:**
- All controls keyboard accessible
- Focus indicators visible
- Shortcuts work as expected

#### Test 6.2: Screen Reader Support
**Expected:**
- Error messages announced
- Button labels read correctly
- Editor content accessible

### 7. Error Handling Tests

#### Test 7.1: Network Error During Save
**Setup:** Disconnect network or block file access
**Action:** Try to save
**Expected:**
- Clear error message
- Retry option
- Data not lost

#### Test 7.2: Concurrent Editing
**Setup:** Edit same file in two windows
**Action:** Save from both
**Expected:**
- Conflict detection
- Merge or overwrite options
- No data corruption

## Integration Checklist

### Pre-Integration:
- [ ] Verify JsonEditor.tsx exists and compiles
- [ ] Verify ConfigurationEditor.tsx exists and compiles
- [ ] Check Monaco Editor package installed
- [ ] Review existing routing structure

### Integration Steps:
- [ ] Add route for ConfigurationEditor
- [ ] Add navigation menu item
- [ ] Wire up to at least one entry point
- [ ] Add "Edit JSON" buttons where appropriate
- [ ] Implement save/load functionality
- [ ] Connect to IPC handlers

### Post-Integration:
- [ ] All test cases pass
- [ ] No console errors
- [ ] Performance acceptable
- [ ] Accessibility verified
- [ ] Documentation updated

## Success Criteria

### Must Have:
1. JSON editor accessible from UI
2. Can edit and save configurations
3. Syntax highlighting works
4. Error validation works
5. Changes persist to disk

### Should Have:
1. Format/minify buttons functional
2. Schema validation
3. Tab switching between form/JSON
4. Keyboard shortcuts

### Nice to Have:
1. Diff view for changes
2. Multiple file tabs
3. Search and replace
4. Code folding

## Risk Mitigation

### Risk 1: Monaco Bundle Size
**Impact:** Large JS bundle
**Mitigation:**
- Use dynamic imports
- Load Monaco only when needed
- Consider Monaco CDN option

### Risk 2: File Permission Issues
**Impact:** Cannot save changes
**Mitigation:**
- Check permissions before edit
- Show read-only mode clearly
- Provide copy-to-clipboard option

### Risk 3: JSON5/JSONC Compatibility
**Impact:** Comments lost when saving
**Mitigation:**
- Detect file format
- Preserve comments in JSON5
- Warn user if comments will be lost

## Test Execution Timeline

### Day 1: Integration
- Wire up components (2 hours)
- Basic navigation working (1 hour)
- Initial testing (1 hour)

### Day 2: Core Functionality
- Test cases 1-3 (2 hours)
- Fix issues found (2 hours)

### Day 3: Advanced Features
- Test cases 4-7 (3 hours)
- Performance optimization (1 hour)

### Day 4: Polish
- Accessibility testing (2 hours)
- Documentation (1 hour)
- Final verification (1 hour)

## Automated Testing

### Unit Tests Required:
```typescript
describe('JsonEditor', () => {
  test('renders without crashing');
  test('highlights JSON syntax');
  test('validates JSON errors');
  test('formats JSON correctly');
  test('minifies JSON correctly');
});
```

### Integration Tests Required:
```typescript
describe('ConfigurationEditor Integration', () => {
  test('loads existing configuration');
  test('saves configuration to correct path');
  test('handles concurrent edits');
  test('preserves JSON5 comments');
  test('validates against MCP schema');
});
```

### E2E Tests Required:
```typescript
describe('JSON Editor E2E', () => {
  test('user can navigate to editor');
  test('user can edit and save config');
  test('changes reflect in application');
  test('error handling works correctly');
});
```

## Documentation Requirements

### User Documentation:
1. How to access JSON editor
2. Keyboard shortcuts reference
3. Schema validation rules
4. Troubleshooting guide

### Developer Documentation:
1. Integration points
2. IPC handler updates
3. Schema definition location
4. Extension points for customization

## Monitoring & Metrics

### Track After Launch:
- Usage frequency
- Error rates
- Save success/failure ratio
- Performance metrics (load time, save time)
- User feedback

### Success Metrics:
- 80% of power users use JSON editor
- < 2% error rate on saves
- < 500ms load time
- 95% user satisfaction

---

*End of Monaco Editor Integration Test Plan*