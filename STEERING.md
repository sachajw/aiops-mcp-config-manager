# Development Steering Guidelines

## Critical Development Rules

### 1. **Always Verify App Runs Before Claiming Completion**
- MUST check browser console for errors after any UI changes
- MUST verify app loads and renders without JavaScript errors
- MUST test basic functionality before marking tasks complete
- If there are runtime errors, fix them before proceeding

### 2. **Error Handling Standards**
- Check browser console after every significant change
- Fix runtime errors immediately, don't defer them
- Test in the actual browser, not just TypeScript compilation
- Add error boundaries where appropriate

### 3. **Testing Workflow**
- Make changes
- Check browser console for errors
- Verify UI renders correctly
- Test basic interactions work
- Only then commit and mark complete

### 4. **Router/Navigation Requirements**  
- Any component using React Router hooks must be wrapped in Router context
- Test navigation flows work end-to-end
- Verify routing doesn't break on page refresh

### 5. **User Experience Validation**
- Test responsive design on different screen sizes
- Verify user flows work as intended
- Check that error states display user-friendly messages
- Ensure loading states provide appropriate feedback

## Common Pitfalls to Avoid

- ❌ Claiming completion without browser testing
- ❌ Ignoring console errors as "minor issues"  
- ❌ Using Router hooks without Router context
- ❌ Not testing responsive design
- ❌ Forgetting to verify user-facing functionality

## Success Criteria

- ✅ App loads without console errors
- ✅ UI renders as expected
- ✅ Basic user interactions work
- ✅ Responsive design functions correctly
- ✅ Error states are handled gracefully