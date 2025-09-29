const { chromium } = require('playwright');

async function comprehensiveBug023Test() {
  console.log('🔍 COMPREHENSIVE Bug-023 Verification Test\n');
  console.log('=' .repeat(50));

  let browser;
  let page;

  try {
    // STEP 1: Verify app is running
    console.log('✅ STEP 1: App Verification');
    console.log('   - Testing URL: http://localhost:5175');

    // Launch browser in visible mode to see what's happening
    browser = await chromium.launch({
      headless: true,  // Set to false to watch the test
      slowMo: 100      // Slow down actions to see them
    });

    page = await browser.newPage();

    // Try to load the app
    const response = await page.goto('http://localhost:5175', {
      waitUntil: 'networkidle',
      timeout: 10000
    });

    console.log(`   - Response status: ${response.status()}`);
    console.log(`   - Page title: ${await page.title()}`);
    console.log('   ✅ App is running!\n');

    // Take screenshot of initial state
    await page.screenshot({ path: '/tmp/bug023_step1_app_loaded.png' });

    // STEP 2: Navigate through the app to Visual Workspace
    console.log('📍 STEP 2: Navigate to Visual Workspace');

    // Check if we're on landing page
    const getStartedBtn = page.locator('button:has-text("Get Started")');
    if (await getStartedBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('   - Found "Get Started" button, clicking...');
      await getStartedBtn.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: '/tmp/bug023_step2_after_get_started.png' });
    }

    // Look for Visual Workspace in menu
    console.log('   - Looking for Visual Workspace in menu...');

    // Try different selectors for Visual Workspace
    const selectors = [
      'a:has-text("Visual Workspace")',
      'button:has-text("Visual Workspace")',
      'text=Visual Workspace',
      '[href*="visual"]',
      'a[href="#/visual-workspace"]',
      '.ant-menu-item:has-text("Visual")',
      'li:has-text("Visual")'
    ];

    let foundVisualWorkspace = false;
    for (const selector of selectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log(`   - Found Visual Workspace with selector: ${selector}`);
        await element.click();
        foundVisualWorkspace = true;
        await page.waitForTimeout(2000);
        break;
      }
    }

    if (!foundVisualWorkspace) {
      console.log('   - Visual Workspace not in menu, trying direct navigation...');
      await page.goto('http://localhost:5175/#/visual-workspace');
      await page.waitForTimeout(2000);
    }

    await page.screenshot({ path: '/tmp/bug023_step3_visual_workspace_attempt.png' });

    // STEP 3: Verify we're in Visual Workspace
    console.log('\n🔍 STEP 3: Verify Visual Workspace Components');

    // Check current URL
    const currentUrl = page.url();
    console.log(`   - Current URL: ${currentUrl}`);
    console.log(`   - Contains "visual": ${currentUrl.includes('visual') ? 'Yes' : 'No'}`);

    // Look for Visual Workspace specific elements
    const visualWorkspaceIndicators = {
      'Canvas': '.react-flow, .visual-workspace-canvas, [data-testid="canvas"]',
      'Server Library': '.server-library, [data-testid="server-library"]',
      'Client Dock': '.client-dock, [data-testid="client-dock"]',
      'Save Button': 'button:has-text("Save"), button:has-text("Save Workspace")',
      'React Flow': '.react-flow__viewport',
      'Toolbar': '.toolbar, .visual-workspace-toolbar'
    };

    console.log('\n   Components Found:');
    for (const [name, selector] of Object.entries(visualWorkspaceIndicators)) {
      const element = page.locator(selector).first();
      const isVisible = await element.isVisible({ timeout: 1000 }).catch(() => false);
      console.log(`   - ${name}: ${isVisible ? '✅' : '❌'}`);
    }

    // STEP 4: Test Save Button Specifically
    console.log('\n🧪 STEP 4: Save Button Test');

    // Search for any button with "save" text
    const allButtons = await page.locator('button').all();
    console.log(`   - Total buttons on page: ${allButtons.length}`);

    let saveButtonFound = false;
    let saveButton = null;

    for (const btn of allButtons) {
      const text = await btn.textContent().catch(() => '');
      if (text && text.toLowerCase().includes('save')) {
        console.log(`   - Found button with text: "${text}"`);
        saveButton = btn;
        saveButtonFound = true;

        // Check button state
        const isDisabled = await btn.isDisabled();
        const classes = await btn.getAttribute('class') || '';

        console.log(`     • Disabled: ${isDisabled}`);
        console.log(`     • Classes: ${classes}`);
      }
    }

    if (!saveButtonFound) {
      console.log('   ❌ NO SAVE BUTTON FOUND');
    }

    // STEP 5: Try drag and drop if we have components
    console.log('\n🧪 STEP 5: Drag and Drop Test');

    // Look for draggable servers
    const draggableServers = await page.locator('[draggable="true"]').all();
    console.log(`   - Draggable elements found: ${draggableServers.length}`);

    if (draggableServers.length > 0) {
      console.log('   - Attempting drag and drop...');

      const firstServer = draggableServers[0];
      const serverText = await firstServer.textContent();
      console.log(`   - Dragging: "${serverText}"`);

      // Find canvas
      const canvas = page.locator('.react-flow__viewport, [data-testid="canvas"]').first();
      if (await canvas.isVisible({ timeout: 1000 }).catch(() => false)) {
        // Perform drag
        const serverBox = await firstServer.boundingBox();
        const canvasBox = await canvas.boundingBox();

        if (serverBox && canvasBox) {
          await page.mouse.move(serverBox.x + serverBox.width/2, serverBox.y + serverBox.height/2);
          await page.mouse.down();
          await page.mouse.move(canvasBox.x + canvasBox.width/2, canvasBox.y + canvasBox.height/2, {steps: 5});
          await page.mouse.up();
          await page.waitForTimeout(1000);

          console.log('   ✅ Drag and drop completed');

          // Check save button state after drag
          if (saveButton) {
            const afterDragDisabled = await saveButton.isDisabled();
            const afterDragText = await saveButton.textContent();
            console.log(`\n   After drag:`);
            console.log(`   - Button text: "${afterDragText}"`);
            console.log(`   - Disabled: ${afterDragDisabled}`);
            console.log(`   - Has asterisk: ${afterDragText.includes('*')}`);
          }
        }
      }
    }

    await page.screenshot({ path: '/tmp/bug023_step5_after_drag.png' });

    // STEP 6: Check page content for debugging
    console.log('\n📋 STEP 6: Page Content Analysis');

    // Get all visible text on page
    const pageText = await page.locator('body').textContent();
    const textSnippet = pageText.substring(0, 200).replace(/\s+/g, ' ');
    console.log(`   - Page text snippet: "${textSnippet}..."`);

    // Check for error messages
    const errorElements = await page.locator('.error, .ant-alert-error, [role="alert"]').all();
    if (errorElements.length > 0) {
      console.log(`   - ⚠️ Found ${errorElements.length} error elements`);
    }

    // Final screenshot
    await page.screenshot({ path: '/tmp/bug023_final_state.png' });

    // SUMMARY
    console.log('\n' + '=' .repeat(50));
    console.log('📊 TEST SUMMARY\n');
    console.log('App Status: ✅ RUNNING on port 5175');
    console.log(`Visual Workspace Reached: ${currentUrl.includes('visual') ? '✅' : '❌'}`);
    console.log(`Save Button Found: ${saveButtonFound ? '✅' : '❌'}`);

    console.log('\nBug-023 Status:');
    if (!saveButtonFound) {
      console.log('❌ FAILED - Save button does not exist');
    } else if (saveButton && !await saveButton.isDisabled()) {
      console.log('⚠️ PARTIAL - Save button exists but may not track changes properly');
    } else {
      console.log('🔍 NEEDS MANUAL VERIFICATION - Button found but state unclear');
    }

    console.log('\nScreenshots saved:');
    console.log('  - /tmp/bug023_step1_app_loaded.png');
    console.log('  - /tmp/bug023_step2_after_get_started.png');
    console.log('  - /tmp/bug023_step3_visual_workspace_attempt.png');
    console.log('  - /tmp/bug023_step5_after_drag.png');
    console.log('  - /tmp/bug023_final_state.png');

  } catch (error) {
    console.error('\n❌ TEST FAILED WITH ERROR:');
    console.error(`   ${error.message}`);

    if (page) {
      await page.screenshot({ path: '/tmp/bug023_error_state.png' });
      console.log('   Error screenshot saved: /tmp/bug023_error_state.png');
    }

    throw error;

  } finally {
    if (browser) {
      await browser.close();
    }
    console.log('\n✨ Test execution completed');
    console.log('=' .repeat(50));
  }
}

// Run the comprehensive test
comprehensiveBug023Test()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));