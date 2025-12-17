# Test Audit Report - E2E Test Issues

**Date**: 2025-10-06
**Auditor**: QA Instance
**Finding**: The failing tests are due to TEST ISSUES, not app bugs

## Summary
The E2E tests are failing due to outdated selectors and incorrect navigation assumptions, NOT because the app functionality is broken.

## Critical Test Issues Found

### 1. Invalid Playwright Selectors
**File**: `e2e/visual_workspace_save_test.e2e.ts`
**Lines**: 85, 230

**Issue**: Using invalid `text*=` syntax which doesn't exist in Playwright
```javascript
// INVALID - Line 85
const configPathElements = await page.locator('text*="/", text*=".json", text*="config"').all();

// INVALID - Line 230
const autoSaveElements = await page.locator('text*="auto", text*="Auto", .auto-save').all();
```

**Fix Required**: Should use valid Playwright selectors:
```javascript
// CORRECT
const configPathElements = await page.locator(':has-text("/"):has-text(".json"):has-text("config")').all();
// OR
const configPathElements = await page.locator('[class*="config"]').all();
```

### 2. Missing Navigation Step
**Files**: Both `visual_workspace_save_test.e2e.ts` and `qa_validation.e2e.ts`

**Issue**: Tests assume the app starts in Visual Workspace, but it actually starts on the landing page with a "Get Started" button.

**Current App Flow**:
1. App opens to landing page
2. User must click "Get Started" button
3. Then navigate to Visual Workspace

**Test Navigation Issues**:
- Tests try to find Visual Workspace elements immediately
- Tests timeout because they never click "Get Started" first
- Scope buttons don't exist on landing page

### 3. Incorrect Element Selectors
**File**: `qa_validation.e2e.ts`

**Issues Found**:
- Looking for `text=Visual Workspace` but this exact text may not exist as a clickable element
- Looking for scope buttons that aren't visible until in Visual Workspace
- Client selector assumes a specific HTML structure that may have changed

### 4. Test Setup Issues
Both test files use `test.beforeAll()` to connect to the app but don't properly navigate through the app's actual flow.

## Evidence from Live Testing

**Actual App State** (from screenshot):
- Title: "My MCP Manager"
- Landing page with "Get Started" button
- Three feature cards: "Manage Servers", "Sync Configurations", "Easy Setup"
- NO Visual Workspace elements visible initially

**Test Expectations**:
- Expects Visual Workspace to be immediately available
- Expects scope buttons to exist
- Expects server library to be visible

## Recommendations

### Immediate Fixes Needed:

1. **Fix Selector Syntax**:
   - Replace all `text*=` with valid Playwright selectors
   - Use `:has-text()` or `text=` for text matching

2. **Add Proper Navigation**:
   ```javascript
   // Navigate from landing page
   await page.click('button:has-text("Get Started")');
   await page.waitForLoadState('networkidle');

   // Then navigate to Visual Workspace
   await page.click('text=Visual').or(page.click('[data-testid="visual-tab"]'));
   ```

3. **Update Element Selectors**:
   - Use data-testid attributes where possible
   - Use more robust selectors that don't rely on exact text
   - Add fallback selectors

4. **Add Better Error Handling**:
   ```javascript
   const getStartedBtn = page.locator('button:has-text("Get Started")');
   if (await getStartedBtn.isVisible()) {
     await getStartedBtn.click();
   }
   ```

## Conclusion

The bugs reported as "FAILED" in the test results are actually **TEST FAILURES**, not app failures:

- **Bug-024 (Config Persistence)**: Test can't find save button because it never navigates to Visual Workspace
- **Bug-019 (Project Scope)**: Test can't find scope buttons because they're not on the landing page
- **Bug-031 (Backup Creation)**: Actually WORKING (verified manually)
- **Bug-028 (Code Signing)**: Partially working (signed but not notarized)
- **Bug-029 (App Icon)**: WORKING

## Next Steps

1. Update test navigation to handle landing page
2. Fix invalid selector syntax
3. Add more robust element selection
4. Re-run tests after fixes to get accurate results
5. Consider adding data-testid attributes to key UI elements for more reliable testing