const { chromium } = require('playwright');

async function testBug023SaveButton() {
  console.log('🔍 Bug-023 Save Button Web Test Starting...\n');

  let browser;
  let page;

  try {
    // Launch a regular browser and go to the app URL
    console.log('🌐 Opening browser to test Visual Workspace...');
    browser = await chromium.launch({ headless: true }); // Run in headless mode
    page = await browser.newPage();

    // Go to the app running on port 5175
    await page.goto('http://localhost:5175');
    await page.waitForLoadState('networkidle');
    console.log('✅ Loaded app at http://localhost:5175\n');

    // Take initial screenshot
    await page.screenshot({ path: '/tmp/bug023_web_1_initial.png' });

    // Navigate to Visual Workspace
    console.log('📍 Step 1: Navigate to Visual Workspace');

    // Try clicking Visual Workspace in the menu
    const visualLink = page.locator('a[href*="visual"], [data-menu-id*="visual"], :text("Visual Workspace")').first();
    if (await visualLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('   - Found Visual Workspace link, clicking...');
      await visualLink.click();
      await page.waitForTimeout(2000);
    } else {
      // Try direct navigation
      console.log('   - Navigating directly to #/visual-workspace');
      await page.goto('http://localhost:5175/#/visual-workspace');
      await page.waitForTimeout(2000);
    }

    await page.screenshot({ path: '/tmp/bug023_web_2_visual_workspace.png' });
    console.log('   ✅ In Visual Workspace\n');

    // Test 1: Check initial save button state
    console.log('🧪 Test 1: Initial Save Button State');

    // Look for save button with various possible selectors
    const saveButton = page.locator(`
      button:has-text("Save Workspace"),
      button:has-text("Save"),
      [data-testid="save-workspace"],
      .save-workspace-btn
    `).first();

    let saveButtonFound = false;
    let initialState = 'not found';

    if (await saveButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      saveButtonFound = true;
      const isDisabled = await saveButton.isDisabled();
      const buttonText = await saveButton.textContent();
      const buttonClasses = await saveButton.getAttribute('class');
      initialState = isDisabled ? 'disabled' : 'enabled';

      console.log(`   - Save button found: "${buttonText}"`);
      console.log(`   - Button classes: ${buttonClasses}`);
      console.log(`   - Initial state: ${initialState}`);
      console.log(`   - Expected: disabled (no changes)`);
      console.log(`   - Result: ${initialState === 'disabled' ? '✅ PASS' : '❌ FAIL'}\n`);
    } else {
      console.log('   ❌ Save button not found');
      console.log('   - Looking for any button with "save" text...');
      const allButtons = await page.locator('button').all();
      for (const btn of allButtons) {
        const text = await btn.textContent();
        if (text && text.toLowerCase().includes('save')) {
          console.log(`   - Found button: "${text}"`);
        }
      }
      console.log('\n');
    }

    // Test 2: Find and drag a server
    console.log('🧪 Test 2: Drag Server to Canvas');

    // Look for draggable servers in the library
    const serverLibrary = page.locator('.server-library, [data-testid="server-library"]').first();
    let serverFound = false;

    if (await serverLibrary.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('   - Server library found');

      // Find a draggable server
      const draggableServer = serverLibrary.locator('[draggable="true"], .draggable-server').first();

      if (await draggableServer.isVisible({ timeout: 3000 }).catch(() => false)) {
        serverFound = true;
        const serverText = await draggableServer.textContent();
        console.log(`   - Found draggable server: "${serverText}"`);

        // Find the canvas
        const canvas = page.locator('.react-flow__viewport, .visual-workspace-canvas, [data-testid="canvas"]').first();

        if (await canvas.isVisible({ timeout: 3000 }).catch(() => false)) {
          console.log('   - Canvas found');

          // Get bounding boxes for drag and drop
          const serverBox = await draggableServer.boundingBox();
          const canvasBox = await canvas.boundingBox();

          if (serverBox && canvasBox) {
            console.log('   - Performing drag and drop...');

            // Drag from server to canvas
            await page.mouse.move(serverBox.x + serverBox.width / 2, serverBox.y + serverBox.height / 2);
            await page.mouse.down();
            await page.waitForTimeout(100);

            await page.mouse.move(
              canvasBox.x + canvasBox.width / 2,
              canvasBox.y + canvasBox.height / 2,
              { steps: 10 }
            );
            await page.waitForTimeout(100);

            await page.mouse.up();
            await page.waitForTimeout(1000);

            console.log('   ✅ Drag and drop completed\n');
            await page.screenshot({ path: '/tmp/bug023_web_3_after_drag.png' });
          }
        } else {
          console.log('   ❌ Canvas not found\n');
        }
      } else {
        console.log('   ❌ No draggable servers found in library\n');
      }
    } else {
      console.log('   ❌ Server library not found\n');
    }

    // Test 3: Check save button after drag
    console.log('🧪 Test 3: Save Button After Drag');
    if (saveButtonFound) {
      const afterDragDisabled = await saveButton.isDisabled();
      const afterDragText = await saveButton.textContent();
      const afterDragState = afterDragDisabled ? 'disabled' : 'enabled';

      console.log(`   - Button text: "${afterDragText}"`);
      console.log(`   - Current state: ${afterDragState}`);
      console.log(`   - Has asterisk (*): ${afterDragText.includes('*') ? 'Yes' : 'No'}`);
      console.log(`   - Expected: enabled with unsaved indicator`);
      console.log(`   - Result: ${afterDragState === 'enabled' ? '✅ PASS' : '❌ FAIL'}\n`);
    }

    // Test 4: Check for nodes on canvas
    console.log('🧪 Test 4: Verify Nodes on Canvas');
    const canvasNodes = page.locator('.react-flow__node, .server-node, [data-testid*="node"]');
    const nodeCount = await canvasNodes.count();
    console.log(`   - Nodes found on canvas: ${nodeCount}`);
    console.log(`   - Expected: > 0`);
    console.log(`   - Result: ${nodeCount > 0 ? '✅ PASS' : '❌ FAIL'}\n`);

    // Test 5: Additional state checks
    console.log('🧪 Test 5: Additional Checks');

    // Check if there's any unsaved indicator
    const unsavedIndicators = page.locator(':text("unsaved"), :text("*"), .unsaved-indicator');
    const hasUnsavedIndicator = await unsavedIndicators.count() > 0;
    console.log(`   - Unsaved indicators visible: ${hasUnsavedIndicator ? 'Yes' : 'No'}`);

    // Check localStorage for workspace data
    const localStorageData = await page.evaluate(() => {
      const keys = Object.keys(localStorage);
      return keys.filter(key => key.includes('workspace') || key.includes('visual'));
    });
    console.log(`   - LocalStorage workspace keys: ${localStorageData.join(', ') || 'none'}`);

    await page.screenshot({ path: '/tmp/bug023_web_4_final.png' });

    // Summary
    console.log('\n' + '=' .repeat(50));
    console.log('📊 TEST SUMMARY\n');
    console.log('Bug-023: Save Button Not Activating After Drag');
    console.log('Test URL: http://localhost:5175');
    console.log('Screenshots saved to /tmp/bug023_web_*.png');
    console.log('\nKey Findings:');
    console.log(`- Save button found: ${saveButtonFound ? 'Yes' : 'No'}`);
    console.log(`- Initial state: ${initialState}`);
    console.log(`- Server dragged: ${serverFound ? 'Yes' : 'No'}`);
    console.log(`- Nodes on canvas: ${nodeCount}`);
    console.log('=' .repeat(50));

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    if (page) {
      await page.screenshot({ path: '/tmp/bug023_web_error.png' });
    }
  } finally {
    if (browser) {
      await browser.close();
    }
    console.log('\n✨ Test completed');
  }
}

// Run the test
testBug023SaveButton();