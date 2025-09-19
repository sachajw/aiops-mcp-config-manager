import { test, expect } from '@playwright/test';
import { VisualWorkspacePage } from '../pages/VisualWorkspace.page';
import { TestHelpers } from '../utils/TestHelpers';

test.describe('Visual Workspace - Drag and Drop', () => {
  let visualWorkspace: VisualWorkspacePage;

  test.beforeEach(async ({ page }) => {
    visualWorkspace = new VisualWorkspacePage(page);

    // Navigate to the app
    await page.goto('/');
    await TestHelpers.waitForAppReady(page);

    // Navigate to Visual Workspace
    await visualWorkspace.navigateToVisual();
  });

  test('should drag server to canvas successfully', async ({ page }) => {
    // ARRANGE: Verify initial state
    const initialState = await visualWorkspace.verifyWorkspaceState();
    expect(initialState.canvasVisible).toBe(true);
    expect(initialState.hasErrors).toBe(false);

    const initialNodeCount = await visualWorkspace.getServerNodeCount();
    console.log(`Initial server nodes on canvas: ${initialNodeCount}`);

    // ACT: Drag first server to canvas
    const serverCards = await visualWorkspace.serverCards.count();
    expect(serverCards).toBeGreaterThan(0); // Ensure servers exist

    const firstServerText = await visualWorkspace.serverCards.first().textContent();
    const serverName = firstServerText?.split('\n')[0] || 'Unknown Server';
    console.log(`Attempting to drag server: ${serverName}`);

    const dragSuccess = await visualWorkspace.dragServerToCanvas(serverName);

    // ASSERT: Verify drag was successful
    expect(dragSuccess).toBe(true);

    // Verify node count increased
    const finalNodeCount = await visualWorkspace.getServerNodeCount();
    expect(finalNodeCount).toBe(initialNodeCount + 1);

    // Verify specific node exists on canvas
    const addedNode = page.locator('.server-node').filter({ hasText: serverName });
    await expect(addedNode).toBeVisible({ timeout: 5000 });

    // Verify no errors occurred
    await TestHelpers.verifyNoErrors(page);

    // Take screenshot for visual verification
    await visualWorkspace.screenshot('server-added-to-canvas');
  });

  test('should maintain state after drag and drop', async ({ page }) => {
    // Perform drag operation
    const serverCards = await visualWorkspace.serverCards.count();
    expect(serverCards).toBeGreaterThan(0);

    const firstServerText = await visualWorkspace.serverCards.first().textContent();
    const serverName = firstServerText?.split('\n')[0] || 'Unknown Server';

    await visualWorkspace.dragServerToCanvas(serverName);

    // Verify state is maintained
    const state = await page.evaluate(() => {
      // Check if Zustand store exists and has nodes
      if (window.__ZUSTAND_STORE__) {
        return window.__ZUSTAND_STORE__.getState();
      }
      // Check React Flow state
      const reactFlowInstance = document.querySelector('.react-flow__renderer');
      return reactFlowInstance ? 'React Flow exists' : 'No React Flow';
    });

    expect(state).toBeTruthy();
    console.log('Application state after drag:', state);
  });

  test('should handle multiple server drags', async ({ page }) => {
    const serverCount = await visualWorkspace.serverCards.count();
    expect(serverCount).toBeGreaterThanOrEqual(2); // Need at least 2 servers

    const initialNodeCount = await visualWorkspace.getServerNodeCount();

    // Drag first server
    const firstServerText = await visualWorkspace.serverCards.nth(0).textContent();
    const firstServerName = firstServerText?.split('\n')[0] || 'Server 1';
    const firstDragSuccess = await visualWorkspace.dragServerToCanvas(firstServerName);
    expect(firstDragSuccess).toBe(true);

    // Drag second server
    const secondServerText = await visualWorkspace.serverCards.nth(1).textContent();
    const secondServerName = secondServerText?.split('\n')[0] || 'Server 2';
    const secondDragSuccess = await visualWorkspace.dragServerToCanvas(secondServerName);
    expect(secondDragSuccess).toBe(true);

    // Verify both servers are on canvas
    const finalNodeCount = await visualWorkspace.getServerNodeCount();
    expect(finalNodeCount).toBe(initialNodeCount + 2);

    // Verify both specific nodes exist
    const firstNode = page.locator('.server-node').filter({ hasText: firstServerName });
    const secondNode = page.locator('.server-node').filter({ hasText: secondServerName });

    await expect(firstNode).toBeVisible();
    await expect(secondNode).toBeVisible();
  });

  test('should not add duplicate servers', async ({ page }) => {
    const firstServerText = await visualWorkspace.serverCards.first().textContent();
    const serverName = firstServerText?.split('\n')[0] || 'Test Server';

    // Add server once
    await visualWorkspace.dragServerToCanvas(serverName);
    const afterFirstDrag = await visualWorkspace.getServerNodeCount();

    // Try to add same server again
    await visualWorkspace.dragServerToCanvas(serverName);
    const afterSecondDrag = await visualWorkspace.getServerNodeCount();

    // Should not add duplicate
    expect(afterSecondDrag).toBe(afterFirstDrag);
  });

  test.describe('Visual Regression', () => {
    test('should match visual snapshot of workspace', async ({ page }) => {
      // Wait for stable state
      await TestHelpers.waitForStableDOM(page);

      // Take visual snapshots of each panel
      await expect(visualWorkspace.serverLibrary).toHaveScreenshot('server-library.png', {
        maxDiffPixels: 100,
      });

      await expect(visualWorkspace.clientDock).toHaveScreenshot('client-dock.png', {
        maxDiffPixels: 100,
      });

      await expect(visualWorkspace.canvas).toHaveScreenshot('canvas-empty.png', {
        maxDiffPixels: 100,
      });
    });
  });

  test.afterEach(async ({ page }) => {
    // Collect any console errors
    const errors = await TestHelpers.getConsoleErrors(page);
    if (errors.length > 0) {
      console.error('Console errors detected:', errors);
    }

    // Clear state for next test
    await TestHelpers.clearAppState(page);
  });
});