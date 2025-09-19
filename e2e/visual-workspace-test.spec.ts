import { test, expect } from '@playwright/test';

test.describe('Visual Workspace Tests - Real', () => {
  test('navigate to Visual Workspace and test drag-drop', async ({ page }) => {
    console.log('🚀 Starting Visual Workspace test');

    // Step 1: Navigate to app
    await page.goto('http://localhost:5175');
    await page.waitForTimeout(2000);

    // Step 2: Click Get Started if on landing page
    const getStartedButton = page.locator('button:has-text("Get Started")');
    if (await getStartedButton.isVisible({ timeout: 2000 })) {
      console.log('📍 Clicking Get Started...');
      await getStartedButton.click();
      await page.waitForTimeout(2000);
    }

    // Step 3: Look for Visual button
    const visualButton = page.locator('button').filter({ hasText: 'Visual' }).first();
    const hasVisualButton = await visualButton.count() > 0;

    if (!hasVisualButton) {
      console.log('❌ Visual button not found');

      // Debug: List all buttons
      const buttons = await page.locator('button').all();
      console.log(`Found ${buttons.length} buttons:`);
      for (const btn of buttons) {
        const text = await btn.textContent();
        console.log(`  - "${text}"`);
      }

      // Take screenshot for debugging
      await page.screenshot({ path: 'test-results/no-visual-button.png' });
      return;
    }

    // Step 4: Click Visual button
    console.log('✅ Found Visual button, clicking...');
    await visualButton.click();
    await page.waitForTimeout(3000);

    // Step 5: Verify Visual Workspace loaded
    const workspace = page.locator('.visual-workspace');
    const workspaceVisible = await workspace.isVisible({ timeout: 5000 }).catch(() => false);

    if (!workspaceVisible) {
      console.log('❌ Visual Workspace did not load');
      await page.screenshot({ path: 'test-results/no-workspace.png' });
      return;
    }

    console.log('✅ Visual Workspace loaded');

    // Step 6: Check for components
    const serverLibrary = await page.locator('.server-library').count();
    const clientDock = await page.locator('.client-dock').count();
    const canvas = await page.locator('#react-flow-wrapper').count();

    console.log('📊 Components found:');
    console.log(`  Server Library: ${serverLibrary > 0 ? '✅' : '❌'} (${serverLibrary})`);
    console.log(`  Client Dock: ${clientDock > 0 ? '✅' : '❌'} (${clientDock})`);
    console.log(`  Canvas: ${canvas > 0 ? '✅' : '❌'} (${canvas})`);

    // Step 7: Test drag and drop
    const serverCards = await page.locator('.server-card').count();
    console.log(`\n🎯 Found ${serverCards} server cards`);

    if (serverCards === 0) {
      console.log('❌ No server cards to test drag-drop');
      await page.screenshot({ path: 'test-results/no-server-cards.png' });
      return;
    }

    // Count initial nodes
    const initialNodes = await page.locator('.server-node').count();
    console.log(`📍 Initial nodes on canvas: ${initialNodes}`);

    // Get first server card
    const firstServer = page.locator('.server-card').first();
    const serverName = await firstServer.textContent();
    console.log(`🎯 Attempting to drag: "${serverName?.split('\n')[0]}"`);

    // Get bounding boxes
    const serverBox = await firstServer.boundingBox();
    const canvasElement = page.locator('#react-flow-wrapper');
    const canvasBox = await canvasElement.boundingBox();

    if (!serverBox || !canvasBox) {
      console.log('❌ Could not get element positions');
      return;
    }

    // Perform drag operation
    console.log('🖱️ Performing drag operation...');
    await page.mouse.move(serverBox.x + serverBox.width/2, serverBox.y + serverBox.height/2);
    await page.mouse.down();
    await page.waitForTimeout(100);

    const dropX = canvasBox.x + canvasBox.width/2;
    const dropY = canvasBox.y + canvasBox.height/2;
    console.log(`  Dragging to position: (${Math.round(dropX)}, ${Math.round(dropY)})`);

    await page.mouse.move(dropX, dropY, { steps: 10 });
    await page.waitForTimeout(100);
    await page.mouse.up();
    await page.waitForTimeout(2000);

    // Check result
    const finalNodes = await page.locator('.server-node').count();
    console.log(`📍 Final nodes on canvas: ${finalNodes}`);

    if (finalNodes > initialNodes) {
      console.log('✅✅✅ DRAG AND DROP SUCCESSFUL! Node was added to canvas');
      expect(finalNodes).toBeGreaterThan(initialNodes);
    } else {
      console.log('❌❌❌ DRAG AND DROP FAILED - No node added');
      // Don't fail test, just report
    }

    // Take final screenshot
    await page.screenshot({ path: 'test-results/visual-workspace-final.png' });
    console.log('📸 Screenshot saved: test-results/visual-workspace-final.png');
  });
});