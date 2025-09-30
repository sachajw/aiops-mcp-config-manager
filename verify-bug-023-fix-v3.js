const { chromium } = require('playwright');

/**
 * Bug-023 Re-Verification Test v3
 * Tests the three-layer drag detection system for save button activation
 */

(async () => {
  console.log('🔍 Bug-023 RE-VERIFICATION TEST v3');
  console.log('====================================\n');

  let browser;
  let context;
  let page;

  try {
    // Connect to running Electron app via CDP
    console.log('📡 Connecting to Electron app on port 9222...');
    browser = await chromium.connectOverCDP('http://localhost:9222');

    const contexts = browser.contexts();
    context = contexts[0];
    page = context.pages()[0];
    console.log('✅ Connected to Electron app\n');

    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);

    // Click "Get Started" button if on landing page
    console.log('🎯 Step 0: Navigate past landing page');
    const getStartedButton = page.locator('button:has-text("Get Started")');
    const getStartedExists = await getStartedButton.count() > 0;

    if (getStartedExists) {
      console.log('   Found "Get Started" button - clicking...');
      await getStartedButton.click();
      await page.waitForTimeout(2000);
      console.log('   ✅ Clicked Get Started\n');
    } else {
      console.log('   Already past landing page\n');
    }

    // Navigate to Visual Workspace
    console.log('🎯 Step 1: Navigate to Visual Workspace');
    const visualTab = page.locator('button:has-text("Visual")').first();
    await visualTab.click();
    await page.waitForTimeout(2000);
    console.log('✅ Navigated to Visual Workspace\n');

    // Verify React Flow canvas
    const reactFlowWrapper = page.locator('.react-flow').first();
    await reactFlowWrapper.waitFor({ state: 'visible', timeout: 5000 });
    const nodesCount = await page.locator('.react-flow__node').count();
    console.log(`   Canvas has ${nodesCount} nodes\n`);

    // Find save button
    console.log('🔍 Step 2: Locating Save Configuration button');
    const saveButton = page.locator('button:has-text("Save Configuration")').first();
    await saveButton.waitFor({ state: 'visible', timeout: 5000 });

    const initialDisabled = await saveButton.isDisabled();
    const initialText = await saveButton.textContent();
    console.log(`   Initial state: disabled=${initialDisabled}, text="${initialText}"\n`);

    // TEST SCENARIO 1: Move node on canvas
    console.log('🎯 TEST SCENARIO 1: Move Existing Node on Canvas');

    if (nodesCount > 0) {
      // Get canvas bounds for proper positioning
      const canvasBounds = await reactFlowWrapper.boundingBox();

      // Use the canvas center for dragging
      const startX = canvasBounds.x + canvasBounds.width * 0.3;
      const startY = canvasBounds.y + canvasBounds.height * 0.3;
      const endX = canvasBounds.x + canvasBounds.width * 0.6;
      const endY = canvasBounds.y + canvasBounds.height * 0.6;

      console.log(`   Dragging node within canvas bounds`);
      console.log(`     From: (${Math.round(startX)}, ${Math.round(startY)})`);
      console.log(`     To: (${Math.round(endX)}, ${Math.round(endY)})`);

      // Perform drag operation on canvas
      await page.mouse.move(startX, startY);
      await page.waitForTimeout(300);
      await page.mouse.down();
      await page.waitForTimeout(300);
      await page.mouse.move(endX, endY, { steps: 10 });
      await page.waitForTimeout(300);
      await page.mouse.up();
      await page.waitForTimeout(1500);

      console.log('   ✅ Drag operation completed\n');
    }

    // Check save button state after drag
    const afterDragDisabled = await saveButton.isDisabled();
    const afterDragText = await saveButton.textContent();
    console.log(`   After drag:`);
    console.log(`     disabled=${afterDragDisabled}, text="${afterDragText}"`);

    const hasAsterisk = afterDragText.includes('*');
    const stateChanged = (afterDragDisabled !== initialDisabled) || (afterDragText !== initialText);

    console.log(`     Asterisk (*) present: ${hasAsterisk ? '✅ YES' : '❌ NO'}`);
    console.log(`     State changed from initial: ${stateChanged ? '✅ YES' : '❌ NO'}\n`);

    // Take screenshot
    await page.screenshot({ path: 'bug-023-test-result.png' });
    console.log('📸 Screenshot saved: bug-023-test-result.png\n');

    // FINAL VERDICT
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 BUG-023 RE-VERIFICATION RESULTS');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('INITIAL STATE:');
    console.log(`  Button disabled: ${initialDisabled}`);
    console.log(`  Button text: "${initialText}"\n`);

    console.log('AFTER DRAG STATE:');
    console.log(`  Button disabled: ${afterDragDisabled}`);
    console.log(`  Button text: "${afterDragText}"\n`);

    console.log('PASS CONDITIONS:');
    const buttonEnabled = !afterDragDisabled;
    console.log(`  ✓ Save button enabled: ${buttonEnabled ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  ✓ Asterisk indicator present: ${hasAsterisk ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  ✓ Button state changed: ${stateChanged ? '✅ PASS' : '❌ FAIL'}\n`);

    const overallPass = buttonEnabled && hasAsterisk;

    console.log('═══════════════════════════════════════════════════════════');
    if (overallPass) {
      console.log('✅✅✅ BUG-023 VERIFICATION: **PASSED** ✅✅✅');
      console.log('');
      console.log('   Three-layer drag detection IS WORKING!');
      console.log('   ✓ Save button activates on canvas changes');
      console.log('   ✓ Asterisk indicator appears for unsaved changes');
      console.log('   ✓ Developer\'s fix is CONFIRMED');
    } else {
      console.log('❌❌❌ BUG-023 VERIFICATION: **FAILED** ❌❌❌');
      console.log('');
      console.log('   Save button does NOT activate properly.');
      if (!buttonEnabled) {
        console.log('   ❌ Issue: Button remains disabled after drag');
      }
      if (!hasAsterisk) {
        console.log('   ❌ Issue: No asterisk indicator for unsaved changes');
      }
      if (!stateChanged) {
        console.log('   ❌ Issue: Button state did not change at all');
      }
    }
    console.log('═══════════════════════════════════════════════════════════\n');

    process.exit(overallPass ? 0 : 1);

  } catch (error) {
    console.error('\n❌ Test Error:', error.message);
    if (page) {
      await page.screenshot({ path: 'bug-023-error.png' }).catch(() => {});
    }
    process.exit(1);
  }
})();