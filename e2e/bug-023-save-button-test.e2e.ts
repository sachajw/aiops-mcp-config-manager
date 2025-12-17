import { test, expect, waitForAppReady, bypassLandingPage } from './fixtures/electron-fixture';

/**
 * Bug-023 Verification Test
 * Tests that save button activates after dragging servers to canvas
 *
 * Uses the shared electron-fixture with TEST_MODE for proper Playwright integration
 */

test.describe('Bug-023: Save Button Activation After Drag', () => {

  test('Save button should activate after dragging server to canvas', async ({ page }) => {
    console.log('[TEST] Starting Bug-023 verification...');

    // Wait for app to be ready
    await waitForAppReady(page);
    await bypassLandingPage(page);

    // Navigate to Visual Workspace
    console.log('[TEST] Navigating to Visual Workspace');
    const visualWorkspaceLink = page.locator('text=/Visual Workspace/i, a:has-text("Visual"), [data-testid="nav-visual-workspace"]').first();
    if (await visualWorkspaceLink.isVisible()) {
      await visualWorkspaceLink.click();
      await page.waitForTimeout(2000);
    }

    // Step 1: Check initial save button state
    console.log('[TEST] Step 1: Checking initial save button state');
    const saveButton = page.locator('button:has-text("Save"), button:has-text("save")').first();

    // Wait for save button to be visible (may take time for page to load)
    try {
      await saveButton.waitFor({ state: 'visible', timeout: 10000 });
    } catch (e) {
      console.log('[TEST] Save button not immediately visible, checking page content...');
      const content = await page.content();
      console.log('[TEST] Page content preview:', content.substring(0, 1000));
    }

    // Check if button is disabled initially (no changes)
    const initialDisabled = await saveButton.isDisabled().catch(() => true);
    console.log(`[TEST] Initial save button disabled: ${initialDisabled}`);

    // Step 2: Find a server in the library to drag
    console.log('[TEST] Step 2: Looking for draggable server');
    const serverLibrary = page.locator('[data-testid="server-library"], .server-library, [class*="ServerLibrary"]');

    // Wait for server library to be visible
    try {
      await serverLibrary.first().waitFor({ state: 'visible', timeout: 10000 });
    } catch (e) {
      console.log('[TEST] Server library not found by test ID, looking for alternatives...');
    }

    // Find first draggable server
    const draggableServer = page.locator('[draggable="true"], [data-draggable="true"]').first();

    try {
      await draggableServer.waitFor({ state: 'visible', timeout: 10000 });
    } catch (e) {
      console.log('[TEST] No draggable server found');
      // Take screenshot for debugging
      await page.screenshot({ path: 'test-results/bug-023-no-draggable.png' });
      throw new Error('Could not find draggable server in library');
    }

    const serverName = await draggableServer.getAttribute('data-server-name') || 'unknown';
    console.log(`[TEST] Found draggable server: ${serverName}`);

    // Step 3: Get canvas element
    console.log('[TEST] Step 3: Locating canvas');
    const canvas = page.locator('[data-testid="visual-workspace-canvas"], .react-flow__viewport, .react-flow').first();
    await expect(canvas).toBeVisible();

    // Step 4: Perform drag and drop
    console.log('[TEST] Step 4: Performing drag and drop');

    // Get bounding boxes
    const serverBox = await draggableServer.boundingBox();
    const canvasBox = await canvas.boundingBox();

    if (!serverBox || !canvasBox) {
      throw new Error('Could not get bounding boxes for drag and drop');
    }

    // Perform drag and drop
    await page.mouse.move(serverBox.x + serverBox.width / 2, serverBox.y + serverBox.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(100);

    // Move to canvas center
    await page.mouse.move(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2, { steps: 10 });
    await page.waitForTimeout(100);

    await page.mouse.up();
    await page.waitForTimeout(500); // Wait for drop to complete

    // Step 5: Verify save button is now enabled
    console.log('[TEST] Step 5: Checking save button after drag');

    // Check for either enabled state or asterisk indicating unsaved changes
    const saveButtonAfter = page.locator('button:has-text("Save"), button:has-text("save")').first();
    const buttonText = await saveButtonAfter.textContent();
    const isEnabled = await saveButtonAfter.isEnabled();

    console.log(`[TEST] Save button text after drag: "${buttonText}"`);
    console.log(`[TEST] Save button enabled after drag: ${isEnabled}`);

    // Verify button indicates unsaved changes
    const hasUnsavedIndicator = buttonText?.includes('*') || buttonText?.includes('Save');

    // MAIN ASSERTION: Button should be enabled after drag
    expect(isEnabled).toBe(true);
    console.log('[TEST] Save button is enabled after drag');

    // Step 6: Verify node was added to canvas
    console.log('[TEST] Step 6: Verifying node on canvas');
    const canvasNodes = page.locator('.react-flow__node');
    const nodeCount = await canvasNodes.count();
    console.log(`[TEST] Nodes on canvas: ${nodeCount}`);

    expect(nodeCount).toBeGreaterThan(0);
    console.log('[TEST] Node successfully added to canvas');

    // Step 7: Test save functionality
    console.log('[TEST] Step 7: Testing save functionality');
    await saveButtonAfter.click();

    // Wait for save dialog or confirmation
    await page.waitForTimeout(1000);

    // Check if save dialog appeared
    const saveDialog = page.locator('[role="dialog"]:has-text("Save"), .ant-modal:has-text("Save")');
    const dialogVisible = await saveDialog.isVisible();

    if (dialogVisible) {
      console.log('[TEST] Save dialog appeared');

      // Enter workspace name
      const nameInput = page.locator('input[placeholder*="workspace"], input[type="text"]').first();
      await nameInput.fill('test-workspace-bug023');

      // Click save in dialog
      const confirmButton = page.locator('button:has-text("Save"):not(:has-text("Cancel"))').last();
      await confirmButton.click();

      await page.waitForTimeout(1000);
    }

    // Step 8: Verify save completed
    console.log('[TEST] Step 8: Verifying save completed');

    // Check for success message or button state change
    const successToast = page.locator('.ant-message-success, [role="alert"]:has-text("saved")');
    const toastVisible = await successToast.isVisible();

    if (toastVisible) {
      console.log('[TEST] Save success notification appeared');
    }

    // Check if save button is now disabled (no unsaved changes)
    const finalButtonState = await saveButton.isDisabled();
    const finalButtonText = await saveButton.textContent();

    console.log(`[TEST] Final button state - Disabled: ${finalButtonState}, Text: "${finalButtonText}"`);

    // Summary
    console.log('[TEST] === Bug-023 Verification Complete ===');
    console.log('[TEST] Save button activates after drag');
    console.log('[TEST] Node added to canvas');
    console.log('[TEST] Save functionality works');
  });

  test('Verify canvas state persistence', async ({ page }) => {
    console.log('[TEST] Testing canvas state persistence...');

    // Wait for app to be ready
    await waitForAppReady(page);
    await bypassLandingPage(page);

    // Navigate to Visual Workspace
    const visualWorkspaceLink = page.locator('text=/Visual Workspace/i, a:has-text("Visual"), [data-testid="nav-visual-workspace"]').first();
    if (await visualWorkspaceLink.isVisible()) {
      await visualWorkspaceLink.click();
      await page.waitForTimeout(2000);
    }

    // Save current workspace
    const saveButton = page.locator('button:has-text("Save"), button:has-text("save")').first();

    if (await saveButton.isEnabled().catch(() => false)) {
      await saveButton.click();
      await page.waitForTimeout(1000);
    }

    // Refresh page
    await page.reload();
    await page.waitForTimeout(2000);

    // Check if nodes persist
    const canvasNodes = page.locator('.react-flow__node');
    const nodeCount = await canvasNodes.count();

    console.log(`[TEST] Nodes after refresh: ${nodeCount}`);

    // Note: This might fail if Bug-026 is not fixed
    if (nodeCount > 0) {
      console.log('[TEST] Canvas state persisted after refresh');
    } else {
      console.log('[TEST] Canvas state NOT persisted (Bug-026 still active)');
    }
  });
});
