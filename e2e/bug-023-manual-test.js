const { chromium } = require('playwright');

async function testBug023SaveButton() {
  console.log('🔍 Bug-023 Save Button Test Starting...\n');

  let browser;
  let page;

  try {
    // Connect to the running Electron app
    console.log('📱 Connecting to Electron app on CDP port 9222...');
    browser = await chromium.connectOverCDP('http://127.0.0.1:9222');

    const contexts = browser.contexts();
    if (contexts.length === 0) {
      throw new Error('No Electron app contexts found. Make sure app is running with --remote-debugging-port=9222');
    }

    const context = contexts[0];
    const pages = context.pages();
    page = pages[0];

    await page.waitForLoadState('networkidle');
    console.log('✅ Connected to Electron app\n');

    // Take initial screenshot
    await page.screenshot({ path: '/tmp/bug023_1_initial.png' });

    // Navigate to Visual Workspace
    console.log('📍 Step 1: Navigate to Visual Workspace');

    // Check if we need to click "Get Started" first
    const getStartedButton = page.locator('button:has-text("Get Started")');
    if (await getStartedButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('   - Clicking Get Started button');
      await getStartedButton.click();
      await page.waitForTimeout(1000);
    }

    // Look for Visual tab
    const visualTab = page.locator('button:has-text("Visual")');
    if (await visualTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('   - Clicking Visual tab');
      await visualTab.click();
      await page.waitForTimeout(2000);
    } else {
      // Try direct navigation
      console.log('   - Navigating directly to Visual Workspace');
      await page.goto('http://localhost:5176/#/visual-workspace');
      await page.waitForTimeout(2000);
    }

    await page.screenshot({ path: '/tmp/bug023_2_visual_workspace.png' });
    console.log('   ✅ In Visual Workspace\n');

    // Test 1: Check initial save button state
    console.log('🧪 Test 1: Initial Save Button State');
    const saveButton = page.locator('button:has-text("Save Workspace"), button:has-text("Save")').first();

    let saveButtonFound = false;
    let initialState = 'not found';

    if (await saveButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      saveButtonFound = true;
      const isDisabled = await saveButton.isDisabled();
      const buttonText = await saveButton.textContent();
      initialState = isDisabled ? 'disabled' : 'enabled';

      console.log(`   - Save button found: "${buttonText}"`);
      console.log(`   - Initial state: ${initialState}`);
      console.log(`   - Expected: disabled (no changes)`);
      console.log(`   - Result: ${initialState === 'disabled' ? '✅ PASS' : '❌ FAIL'}\n`);
    } else {
      console.log('   ❌ Save button not found\n');
    }

    // Test 2: Drag a server to canvas
    console.log('🧪 Test 2: Drag Server to Canvas');

    // Find draggable server
    const serverInLibrary = page.locator('[draggable="true"]').first();
    const serverFound = await serverInLibrary.isVisible({ timeout: 3000 }).catch(() => false);

    if (serverFound) {
      const serverText = await serverInLibrary.textContent();
      console.log(`   - Found draggable server: "${serverText}"`);

      // Find canvas
      const canvas = page.locator('.react-flow__viewport, [data-testid="canvas"]').first();
      const canvasFound = await canvas.isVisible({ timeout: 3000 }).catch(() => false);

      if (canvasFound) {
        console.log('   - Canvas found');

        // Perform drag and drop
        const serverBox = await serverInLibrary.boundingBox();
        const canvasBox = await canvas.boundingBox();

        if (serverBox && canvasBox) {
          console.log('   - Performing drag and drop...');

          // Start drag
          await page.mouse.move(serverBox.x + serverBox.width / 2, serverBox.y + serverBox.height / 2);
          await page.mouse.down();
          await page.waitForTimeout(100);

          // Move to canvas
          await page.mouse.move(
            canvasBox.x + canvasBox.width / 2,
            canvasBox.y + canvasBox.height / 2,
            { steps: 10 }
          );
          await page.waitForTimeout(100);

          // Drop
          await page.mouse.up();
          await page.waitForTimeout(1000);

          console.log('   ✅ Drag and drop completed\n');
          await page.screenshot({ path: '/tmp/bug023_3_after_drag.png' });
        } else {
          console.log('   ❌ Could not get bounding boxes\n');
        }
      } else {
        console.log('   ❌ Canvas not found\n');
      }
    } else {
      console.log('   ❌ No draggable servers found\n');
    }

    // Test 3: Check save button after drag
    console.log('🧪 Test 3: Save Button After Drag');
    if (saveButtonFound) {
      const afterDragDisabled = await saveButton.isDisabled();
      const afterDragText = await saveButton.textContent();
      const afterDragState = afterDragDisabled ? 'disabled' : 'enabled';

      console.log(`   - Button text: "${afterDragText}"`);
      console.log(`   - Current state: ${afterDragState}`);
      console.log(`   - Expected: enabled (has changes)`);
      console.log(`   - Has asterisk (*): ${afterDragText.includes('*') ? 'Yes' : 'No'}`);
      console.log(`   - Result: ${afterDragState === 'enabled' ? '✅ PASS' : '❌ FAIL'}\n`);
    }

    // Test 4: Check for nodes on canvas
    console.log('🧪 Test 4: Verify Node on Canvas');
    const canvasNodes = page.locator('.react-flow__node');
    const nodeCount = await canvasNodes.count();
    console.log(`   - Nodes on canvas: ${nodeCount}`);
    console.log(`   - Expected: > 0`);
    console.log(`   - Result: ${nodeCount > 0 ? '✅ PASS' : '❌ FAIL'}\n`);

    // Test 5: Try to save
    if (saveButtonFound && !await saveButton.isDisabled()) {
      console.log('🧪 Test 5: Save Functionality');
      await saveButton.click();
      await page.waitForTimeout(1000);

      // Check for save dialog
      const saveDialog = page.locator('[role="dialog"], .ant-modal').first();
      if (await saveDialog.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('   - Save dialog appeared');

        // Enter workspace name
        const nameInput = page.locator('input[type="text"]').first();
        await nameInput.fill('test-workspace-bug023');
        console.log('   - Entered workspace name');

        // Click confirm
        const confirmButton = page.locator('button:has-text("Save"):not(:has-text("Cancel"))').last();
        await confirmButton.click();
        await page.waitForTimeout(1000);

        console.log('   ✅ Save completed\n');
      } else {
        console.log('   - No save dialog appeared\n');
      }

      await page.screenshot({ path: '/tmp/bug023_4_after_save.png' });
    }

    // Test 6: Check save button after save
    console.log('🧪 Test 6: Save Button After Save');
    if (saveButtonFound) {
      const afterSaveDisabled = await saveButton.isDisabled();
      const afterSaveText = await saveButton.textContent();
      const afterSaveState = afterSaveDisabled ? 'disabled' : 'enabled';

      console.log(`   - Button text: "${afterSaveText}"`);
      console.log(`   - Current state: ${afterSaveState}`);
      console.log(`   - Expected: disabled (no unsaved changes)`);
      console.log(`   - Result: ${afterSaveState === 'disabled' ? '✅ PASS' : '❌ FAIL'}\n`);
    }

    // Summary
    console.log('=' .repeat(50));
    console.log('📊 TEST SUMMARY\n');
    console.log('Bug-023: Save Button Not Activating After Drag');
    console.log('Screenshots saved to /tmp/bug023_*.png');
    console.log('=' .repeat(50));

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    if (page) {
      await page.screenshot({ path: '/tmp/bug023_error.png' });
    }
  } finally {
    // Don't close the browser as it's the actual app
    console.log('\n✨ Test completed');
  }
}

// Run the test
testBug023SaveButton();