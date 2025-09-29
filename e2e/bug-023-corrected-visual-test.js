const { chromium } = require('playwright');

async function testActualBug023() {
  console.log('🔍 CORRECTED Bug-023 Test - Testing Visual Workspace Save Button\n');
  console.log('=' .repeat(60));

  let browser;
  let page;

  try {
    // Connect to the running Electron app
    console.log('🔌 STEP 1: Connect to Electron app');
    browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
    const contexts = browser.contexts();

    if (contexts.length === 0) {
      throw new Error('No Electron contexts found');
    }

    const context = contexts[0];
    const pages = context.pages();
    page = pages[0];
    await page.waitForLoadState('networkidle');

    console.log('   ✅ Connected to Electron app');
    console.log(`   - Title: "${await page.title()}"`);

    await page.screenshot({ path: '/tmp/bug023_corrected_initial.png' });

    // STEP 2: Navigate to Visual Workspace
    console.log('\n📍 STEP 2: Access Visual Workspace');

    // Look for the Visual tab/button
    const visualTab = page.locator('button:has-text("Visual"), [data-tab="visual"], .visual-tab').first();

    if (await visualTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('   - Found Visual tab, clicking...');
      await visualTab.click();
      await page.waitForTimeout(2000);
    } else {
      console.log('   - Visual tab not found, checking if already in Visual mode...');
    }

    await page.screenshot({ path: '/tmp/bug023_corrected_visual_mode.png' });

    // STEP 3: Verify we're in Visual Workspace
    console.log('\n🔍 STEP 3: Verify Visual Workspace Components');

    const componentChecks = {
      'React Flow Viewport': '.react-flow__viewport',
      'React Flow Canvas': '.react-flow',
      'Server Nodes': '.react-flow__node',
      'Connection Edges': '.react-flow__edge',
      'Save Configuration Button': 'button:has-text("Save Configuration")',
      'Save Button (generic)': 'button:has-text("Save")',
      'Client Selector': '[data-testid="client-selector"], .client-selector',
      'Server List/Library': '.server-list, .server-library'
    };

    console.log('\n   Component Status:');
    const foundComponents = {};

    for (const [name, selector] of Object.entries(componentChecks)) {
      const elements = page.locator(selector);
      const count = await elements.count();
      const isVisible = count > 0 && await elements.first().isVisible().catch(() => false);
      foundComponents[name] = { count, isVisible };

      console.log(`   - ${name}: ${count} found, ${isVisible ? 'visible ✅' : 'not visible ❌'}`);
    }

    // STEP 4: Test Save Configuration Button
    console.log('\n🧪 STEP 4: Test Save Configuration Button');

    const saveButton = page.locator('button:has-text("Save Configuration")').first();

    if (await saveButton.isVisible().catch(() => false)) {
      console.log('   ✅ Save Configuration button found!');

      // Check initial state
      const initialDisabled = await saveButton.isDisabled();
      const initialText = await saveButton.textContent();
      console.log(`   - Initial text: "${initialText}"`);
      console.log(`   - Initial disabled: ${initialDisabled}`);

      // STEP 5: Test drag operation to see if save button changes
      console.log('\n🧪 STEP 5: Test Drag Operation');

      const serverNodes = page.locator('.react-flow__node');
      const nodeCount = await serverNodes.count();

      if (nodeCount > 0) {
        console.log(`   - Found ${nodeCount} server nodes`);

        // Try to drag the first node to see if save button changes
        const firstNode = serverNodes.first();
        const nodeBox = await firstNode.boundingBox();

        if (nodeBox) {
          console.log('   - Attempting to drag a server node...');

          // Drag the node to a new position
          const startX = nodeBox.x + nodeBox.width / 2;
          const startY = nodeBox.y + nodeBox.height / 2;
          const endX = startX + 100; // Move 100px to the right
          const endY = startY + 50;  // Move 50px down

          await page.mouse.move(startX, startY);
          await page.mouse.down();
          await page.waitForTimeout(100);

          await page.mouse.move(endX, endY, { steps: 10 });
          await page.waitForTimeout(100);

          await page.mouse.up();
          await page.waitForTimeout(1000); // Wait for any state updates

          console.log('   ✅ Drag operation completed');

          // Check save button state after drag
          const afterDragDisabled = await saveButton.isDisabled();
          const afterDragText = await saveButton.textContent();

          console.log(`\n   Save Button After Drag:`);
          console.log(`   - Text: "${afterDragText}"`);
          console.log(`   - Disabled: ${afterDragDisabled}`);
          console.log(`   - Has unsaved indicator (*): ${afterDragText.includes('*')}`);

          // THE ACTUAL BUG TEST
          console.log(`\n🎯 BUG-023 VERIFICATION:`);
          console.log(`   - Before drag: disabled=${initialDisabled}, text="${initialText}"`);
          console.log(`   - After drag:  disabled=${afterDragDisabled}, text="${afterDragText}"`);

          if (initialDisabled === afterDragDisabled && initialText === afterDragText) {
            console.log('   ❌ BUG CONFIRMED: Save button state did NOT change after drag');
            console.log('   ❌ This is exactly Bug-023: Save button not activating after changes');
          } else {
            console.log('   ✅ Save button state DID change after drag');
            console.log('   ✅ Bug-023 appears to be fixed');
          }

        } else {
          console.log('   ❌ Could not get node bounding box for drag operation');
        }
      } else {
        console.log('   ❌ No server nodes found for drag testing');
      }

    } else {
      console.log('   ❌ Save Configuration button not found');
    }

    await page.screenshot({ path: '/tmp/bug023_corrected_final.png' });

    // FINAL SUMMARY
    console.log('\n' + '=' .repeat(60));
    console.log('📊 CORRECTED TEST RESULTS\n');

    const hasVisualWorkspace = foundComponents['React Flow Viewport']?.isVisible || false;
    const hasSaveButton = foundComponents['Save Configuration Button']?.isVisible || false;
    const hasNodes = foundComponents['Server Nodes']?.count > 0;

    console.log(`Visual Workspace Found: ${hasVisualWorkspace ? '✅' : '❌'}`);
    console.log(`Save Button Found: ${hasSaveButton ? '✅' : '❌'}`);
    console.log(`Server Nodes Found: ${hasNodes ? '✅' : '❌'}`);

    if (hasVisualWorkspace && hasSaveButton && hasNodes) {
      console.log('\n🎯 Bug-023 Test Status: COMPLETED');
      console.log('   The save button state change behavior was tested');
    } else {
      console.log('\n❌ Bug-023 Test Status: INCOMPLETE');
      console.log('   Missing required components for testing');
    }

    console.log('\nScreenshots:');
    console.log('  - /tmp/bug023_corrected_initial.png');
    console.log('  - /tmp/bug023_corrected_visual_mode.png');
    console.log('  - /tmp/bug023_corrected_final.png');

  } catch (error) {
    console.error('\n❌ TEST ERROR:');
    console.error(`   ${error.message}`);

    if (page) {
      await page.screenshot({ path: '/tmp/bug023_corrected_error.png' });
    }

  } finally {
    // Don't close browser - it's the actual Electron app
    console.log('\n✨ Test completed');
    console.log('=' .repeat(60));
  }
}

// Run the corrected test
testActualBug023()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));