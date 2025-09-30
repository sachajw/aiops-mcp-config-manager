const { chromium } = require('playwright');

/**
 * Bug-023 Re-Verification Test v2
 * Tests the three-layer drag detection system for save button activation
 */

(async () => {
  console.log('🔍 Bug-023 RE-VERIFICATION TEST v2');
  console.log('====================================\n');

  let browser;
  let context;
  let page;

  try {
    // Connect to running Electron app via CDP
    console.log('📡 Connecting to Electron app on port 9222...');
    browser = await chromium.connectOverCDP('http://localhost:9222');

    const contexts = browser.contexts();
    if (contexts.length === 0) {
      throw new Error('No browser contexts found');
    }

    context = contexts[0];
    const pages = context.pages();

    if (pages.length === 0) {
      throw new Error('No pages found');
    }

    page = pages[0];
    console.log('✅ Connected to Electron app\n');

    // Wait for app to be ready
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    // Check current URL and page structure
    const url = page.url();
    console.log('📍 Current URL:', url);

    // Take a screenshot to see what's on the page
    console.log('📸 Taking screenshot for debugging...');
    await page.screenshot({ path: 'debug-current-page.png' });

    // Try to find Visual Workspace - check multiple possible selectors
    console.log('\n🔍 Searching for Visual Workspace navigation...');

    // Try different possible selectors
    const possibleSelectors = [
      'button:has-text("Visual")',
      'a:has-text("Visual")',
      '[href*="visual"]',
      'button:has-text("Visual Workspace")',
      'a:has-text("Visual Workspace")',
      '.visual-tab',
      '[data-tab="visual"]',
      'nav button, nav a'  // Get all nav buttons/links
    ];

    let visualButton = null;
    for (const selector of possibleSelectors) {
      const elements = await page.locator(selector).all();
      if (elements.length > 0) {
        console.log(`   Found ${elements.length} element(s) with selector: ${selector}`);
        for (let i = 0; i < elements.length; i++) {
          const text = await elements[i].textContent().catch(() => '');
          console.log(`     [${i}] Text: "${text}"`);
        }
        if (selector.includes('Visual')) {
          visualButton = elements[0];
          break;
        }
      }
    }

    // If we're not on Visual Workspace, navigate to it
    if (visualButton) {
      console.log('\n🎯 Step 1: Navigating to Visual Workspace');
      await visualButton.click();
      await page.waitForTimeout(2000);
      console.log('✅ Clicked Visual Workspace navigation\n');
    } else {
      console.log('\n⚠️  Could not find Visual Workspace navigation');
      console.log('   Assuming already on Visual Workspace or checking current page...\n');
    }

    // Check if React Flow canvas exists
    console.log('🔍 Checking for React Flow canvas...');
    const reactFlowExists = await page.locator('.react-flow').count() > 0;

    if (!reactFlowExists) {
      console.log('❌ React Flow canvas not found!');
      console.log('   Available page structure:');
      const bodyHtml = await page.locator('body').innerHTML();
      console.log(bodyHtml.substring(0, 500) + '...\n');
      throw new Error('Visual Workspace not accessible - React Flow canvas not found');
    }

    console.log('✅ React Flow canvas found\n');

    // Get canvas nodes count
    const nodesCount = await page.locator('.react-flow__node').count();
    console.log(`   Canvas has ${nodesCount} nodes\n`);

    // Find save button - try multiple selectors
    console.log('🔍 Step 2: Locating Save Configuration button');

    const saveButtonSelectors = [
      'button:has-text("Save Configuration")',
      'button:has-text("Save")',
      '[data-testid="save-button"]',
      'button[class*="save"]'
    ];

    let saveButton = null;
    for (const selector of saveButtonSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        console.log(`   Found save button with selector: ${selector}`);
        saveButton = page.locator(selector).first();
        break;
      }
    }

    if (!saveButton) {
      console.log('❌ Save button not found! Available buttons:');
      const buttons = await page.locator('button').all();
      for (let i = 0; i < Math.min(buttons.length, 10); i++) {
        const text = await buttons[i].textContent().catch(() => '');
        console.log(`     Button ${i}: "${text}"`);
      }
      throw new Error('Save Configuration button not found');
    }

    const initialDisabled = await saveButton.isDisabled();
    const initialText = await saveButton.textContent();
    console.log(`   Initial state: disabled=${initialDisabled}, text="${initialText}"\n`);

    // TEST SCENARIO 1: Move existing node on canvas
    console.log('🎯 TEST SCENARIO 1: Move Existing Node on Canvas');

    if (nodesCount > 0) {
      const nodes = await page.locator('.react-flow__node').all();
      const nodeToMove = nodes[0];

      // Get node position
      const nodeBounds = await nodeToMove.boundingBox();
      if (nodeBounds) {
        console.log(`   Moving node from position (${Math.round(nodeBounds.x)}, ${Math.round(nodeBounds.y)})`);

        // Perform drag operation
        await nodeToMove.hover();
        await page.mouse.down();
        await page.mouse.move(nodeBounds.x + 150, nodeBounds.y + 150, { steps: 10 });
        await page.mouse.up();

        await page.waitForTimeout(1500);
        console.log('   ✅ Node drag completed\n');
      }
    } else {
      console.log('   ⚠️  No nodes on canvas to move\n');
    }

    // Check save button state after moving node
    const afterMoveDisabled = await saveButton.isDisabled();
    const afterMoveText = await saveButton.textContent();
    console.log(`   After node move:`);
    console.log(`     disabled=${afterMoveDisabled}, text="${afterMoveText}"`);

    const hasAsterisk = afterMoveText.includes('*');
    console.log(`     Asterisk (*) present: ${hasAsterisk ? '✅ YES' : '❌ NO'}\n`);

    // TEST SCENARIO 2: Check if save button is enabled
    console.log('🎯 TEST SCENARIO 2: Save Button State Analysis');
    const buttonEnabled = !afterMoveDisabled;
    console.log(`   Save button enabled: ${buttonEnabled ? '✅ YES' : '❌ NO'}`);
    console.log(`   Visual indicator (asterisk): ${hasAsterisk ? '✅ YES' : '❌ NO'}\n`);

    // Take final screenshot
    await page.screenshot({ path: 'debug-after-drag.png' });
    console.log('📸 Screenshot saved: debug-after-drag.png\n');

    // FINAL VERDICT
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 BUG-023 RE-VERIFICATION RESULTS');
    console.log('═══════════════════════════════════════════════════════════\n');

    const passConditions = {
      buttonEnabled: buttonEnabled,
      hasAsterisk: hasAsterisk,
      stateChanged: afterMoveDisabled !== initialDisabled || afterMoveText !== initialText
    };

    console.log('PASS CONDITIONS:');
    console.log(`  ✓ Save button enabled after drag: ${passConditions.buttonEnabled ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  ✓ Asterisk indicator present: ${passConditions.hasAsterisk ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  ✓ Button state changed: ${passConditions.stateChanged ? '✅ PASS' : '❌ FAIL'}\n`);

    const overallPass = passConditions.buttonEnabled && passConditions.hasAsterisk;

    console.log('═══════════════════════════════════════════════════════════');
    if (overallPass) {
      console.log('✅ BUG-023 VERIFICATION: **PASSED**');
      console.log('   Three-layer drag detection is working!');
      console.log('   Save button activates on canvas changes.');
    } else {
      console.log('❌ BUG-023 VERIFICATION: **FAILED**');
      console.log('   Save button does NOT activate properly.');
      if (!passConditions.buttonEnabled) {
        console.log('   Issue: Button remains disabled after drag');
      }
      if (!passConditions.hasAsterisk) {
        console.log('   Issue: No asterisk indicator for unsaved changes');
      }
    }
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('Evidence saved:');
    console.log('  - debug-current-page.png (before test)');
    console.log('  - debug-after-drag.png (after drag operation)\n');

    process.exit(overallPass ? 0 : 1);

  } catch (error) {
    console.error('\n❌ Test Error:', error.message);
    if (page) {
      await page.screenshot({ path: 'debug-error.png' }).catch(() => {});
      console.log('📸 Error screenshot saved: debug-error.png');
    }
    process.exit(1);
  }
})();