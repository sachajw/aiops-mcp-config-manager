const { chromium } = require('playwright');

/**
 * Bug-023 Re-Verification Test
 * Tests the three-layer drag detection system for save button activation
 */

(async () => {
  console.log('🔍 Bug-023 RE-VERIFICATION TEST');
  console.log('================================\n');

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
    await page.waitForTimeout(2000);

    // Navigate to Visual Workspace
    console.log('🎯 Step 1: Navigate to Visual Workspace');
    const visualTab = await page.locator('button:has-text("Visual")').first();
    await visualTab.click();
    await page.waitForTimeout(2000);
    console.log('✅ Navigated to Visual Workspace\n');

    // Verify React Flow canvas is present
    const reactFlowWrapper = await page.locator('.react-flow').first();
    await reactFlowWrapper.waitFor({ state: 'visible', timeout: 5000 });
    console.log('✅ React Flow canvas found\n');

    // Get initial save button state
    console.log('🔍 Step 2: Check initial save button state');
    const saveButton = await page.locator('button:has-text("Save Configuration")').first();
    await saveButton.waitFor({ state: 'visible', timeout: 5000 });

    const initialDisabled = await saveButton.isDisabled();
    const initialText = await saveButton.textContent();
    console.log(`   Initial state: disabled=${initialDisabled}, text="${initialText}"\n`);

    // TEST SCENARIO 1: Drag server from library
    console.log('🎯 TEST SCENARIO 1: Drag Server from Library to Canvas');
    const serverCards = await page.locator('.server-card, [data-testid="server-card"]').all();

    if (serverCards.length > 0) {
      console.log(`   Found ${serverCards.length} servers in library`);
      const firstServer = serverCards[0];
      const serverName = await firstServer.locator('.server-name, [data-testid="server-name"]').first().textContent().catch(() => 'Unknown');
      console.log(`   Attempting to drag server: ${serverName}`);

      // Get canvas bounds
      const canvasBounds = await reactFlowWrapper.boundingBox();
      if (canvasBounds) {
        const targetX = canvasBounds.x + canvasBounds.width / 2;
        const targetY = canvasBounds.y + canvasBounds.height / 2;

        // Perform drag operation
        await firstServer.dragTo(reactFlowWrapper, {
          targetPosition: { x: canvasBounds.width / 2, y: canvasBounds.height / 2 }
        });

        await page.waitForTimeout(1000);
        console.log('   ✅ Drag operation completed\n');
      }
    } else {
      console.log('   ⚠️  No servers found in library - trying alternative selector\n');
    }

    // Check save button state after drag from library
    const afterLibraryDragDisabled = await saveButton.isDisabled();
    const afterLibraryDragText = await saveButton.textContent();
    console.log(`   After library drag: disabled=${afterLibraryDragDisabled}, text="${afterLibraryDragText}"`);

    const hasAsterisk1 = afterLibraryDragText.includes('*');
    console.log(`   Asterisk (*) present: ${hasAsterisk1 ? '✅ YES' : '❌ NO'}\n`);

    // TEST SCENARIO 2: Move existing node on canvas
    console.log('🎯 TEST SCENARIO 2: Move Existing Node on Canvas');
    const nodes = await page.locator('.react-flow__node').all();
    console.log(`   Found ${nodes.length} nodes on canvas`);

    if (nodes.length > 0) {
      const nodeToMove = nodes[0];
      const nodeBounds = await nodeToMove.boundingBox();

      if (nodeBounds) {
        console.log(`   Moving node from (${nodeBounds.x}, ${nodeBounds.y})`);

        // Drag node to new position
        await nodeToMove.hover();
        await page.mouse.down();
        await page.mouse.move(nodeBounds.x + 100, nodeBounds.y + 100, { steps: 5 });
        await page.mouse.up();

        await page.waitForTimeout(1000);
        console.log('   ✅ Node moved\n');
      }
    }

    // Check save button state after moving node
    const afterNodeMoveDisabled = await saveButton.isDisabled();
    const afterNodeMoveText = await saveButton.textContent();
    console.log(`   After node move: disabled=${afterNodeMoveDisabled}, text="${afterNodeMoveText}"`);

    const hasAsterisk2 = afterNodeMoveText.includes('*');
    console.log(`   Asterisk (*) present: ${hasAsterisk2 ? '✅ YES' : '❌ NO'}\n`);

    // TEST SCENARIO 3: Check console logs for setDirty messages
    console.log('🎯 TEST SCENARIO 3: Console Log Analysis');
    const logs = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('[VisualWorkspace]') || text.includes('setDirty') || text.includes('Node change')) {
        logs.push(text);
      }
    });

    // Give it a moment to collect any delayed logs
    await page.waitForTimeout(1000);

    if (logs.length > 0) {
      console.log('   Found relevant console logs:');
      logs.forEach(log => console.log(`     ${log}`));
    } else {
      console.log('   ⚠️  No [VisualWorkspace] console logs detected');
    }
    console.log();

    // FINAL VERDICT
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 BUG-023 RE-VERIFICATION RESULTS');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('TEST RESULTS:');
    console.log(`  1️⃣  Drag from Library:`);
    console.log(`     Save button enabled: ${!afterLibraryDragDisabled ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`     Asterisk present: ${hasAsterisk1 ? '✅ PASS' : '❌ FAIL'}\n`);

    console.log(`  2️⃣  Move Node on Canvas:`);
    console.log(`     Save button enabled: ${!afterNodeMoveDisabled ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`     Asterisk present: ${hasAsterisk2 ? '✅ PASS' : '❌ FAIL'}\n`);

    // Determine overall verdict
    const dragFromLibraryWorks = !afterLibraryDragDisabled && hasAsterisk1;
    const moveNodeWorks = !afterNodeMoveDisabled && hasAsterisk2;
    const overallPass = dragFromLibraryWorks || moveNodeWorks;

    console.log('═══════════════════════════════════════════════════════════');
    if (overallPass) {
      console.log('✅ BUG-023 VERIFICATION: PASSED');
      console.log('   Save button activates on canvas changes');
    } else {
      console.log('❌ BUG-023 VERIFICATION: FAILED');
      console.log('   Save button does NOT activate on canvas changes');
    }
    console.log('═══════════════════════════════════════════════════════════\n');

    process.exit(overallPass ? 0 : 1);

  } catch (error) {
    console.error('❌ Test Error:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
})();