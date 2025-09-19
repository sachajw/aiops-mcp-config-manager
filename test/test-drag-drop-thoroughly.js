const { chromium } = require('playwright');

async function testDragAndDrop() {
  console.log('🧪 Thorough Drag and Drop Test\n');
  console.log('================================\n');

  try {
    // Connect to the running Electron app
    const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
    console.log('✅ Connected to Electron app\n');

    const context = browser.contexts()[0];
    const page = context.pages()[0];

    await page.waitForLoadState('networkidle');

    // Navigate to Visual Workspace if not already there
    const visualBtn = page.locator('button:has-text("Visual")').first();
    if (await visualBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      console.log('📍 Navigating to Visual Workspace...');
      await visualBtn.click();
      await page.waitForTimeout(2000);
    }

    // Verify we're in Visual Workspace
    const workspace = page.locator('.visual-workspace');
    if (!await workspace.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('❌ Visual Workspace not loaded');
      return;
    }
    console.log('✅ Visual Workspace loaded\n');

    // Count initial state
    console.log('📊 Initial State:');
    const initialServerNodes = await page.locator('.server-node').count();
    console.log(`  • Server nodes on canvas: ${initialServerNodes}`);

    const serverCards = await page.locator('.server-card').count();
    console.log(`  • Server cards in library: ${serverCards}`);

    const canvas = page.locator('#react-flow-wrapper');
    const canvasVisible = await canvas.isVisible();
    console.log(`  • Canvas visible: ${canvasVisible}\n`);

    if (serverCards === 0) {
      console.log('❌ No server cards found in library');
      return;
    }

    // Test 1: Basic drag and drop
    console.log('🎯 Test 1: Basic Drag and Drop');
    console.log('--------------------------------');

    const firstServerCard = page.locator('.server-card').first();
    const serverName = await firstServerCard.locator('h3, .font-semibold').first().textContent();
    console.log(`  Dragging server: "${serverName}"`);

    // Get bounding boxes
    const serverBox = await firstServerCard.boundingBox();
    const canvasBox = await canvas.boundingBox();

    if (!serverBox || !canvasBox) {
      console.log('  ❌ Could not get element positions');
      return;
    }

    console.log(`  Server position: (${Math.round(serverBox.x)}, ${Math.round(serverBox.y)})`);
    console.log(`  Canvas center: (${Math.round(canvasBox.x + canvasBox.width/2)}, ${Math.round(canvasBox.y + canvasBox.height/2)})`);

    // Perform drag with detailed logging
    console.log('\n  Performing drag operation:');

    // Move to server card
    await page.mouse.move(serverBox.x + serverBox.width/2, serverBox.y + serverBox.height/2);
    console.log('    1. Moved to server card');

    // Press mouse down
    await page.mouse.down();
    console.log('    2. Mouse down');
    await page.waitForTimeout(100);

    // Check if drag started (drag overlay should appear)
    const dragOverlay = page.locator('[role="presentation"], .drag-overlay, div:has-text("Drop on canvas")');
    const isDragging = await dragOverlay.isVisible({ timeout: 500 }).catch(() => false);
    console.log(`    3. Drag started: ${isDragging ? 'YES' : 'NO'}`);

    // Move to canvas center slowly
    await page.mouse.move(
      canvasBox.x + canvasBox.width/2,
      canvasBox.y + canvasBox.height/2,
      { steps: 20 }
    );
    console.log('    4. Moved to canvas center');
    await page.waitForTimeout(100);

    // Release mouse
    await page.mouse.up();
    console.log('    5. Mouse up (dropped)');
    await page.waitForTimeout(1000);

    // Check results
    console.log('\n  Checking results:');
    const newServerNodes = await page.locator('.server-node').count();
    console.log(`    • Server nodes after drop: ${newServerNodes}`);
    console.log(`    • Nodes added: ${newServerNodes - initialServerNodes}`);

    if (newServerNodes > initialServerNodes) {
      console.log('  ✅ Drag and drop SUCCESSFUL - node was added to canvas');
    } else {
      console.log('  ❌ Drag and drop FAILED - no new nodes on canvas');

      // Debug: Check console for errors
      const logs = await page.evaluate(() => {
        const errors = [];
        // Try to get any console errors
        if (window.console && window.console.error) {
          // This won't get historical logs, but might catch current state
        }
        return errors;
      });
    }

    // Test 2: Drag to specific coordinates
    console.log('\n🎯 Test 2: Drag to Specific Position');
    console.log('-------------------------------------');

    if (serverCards > 1) {
      const secondServerCard = page.locator('.server-card').nth(1);
      const secondServerName = await secondServerCard.locator('h3, .font-semibold').first().textContent();
      console.log(`  Dragging server: "${secondServerName}"`);

      const serverBox2 = await secondServerCard.boundingBox();
      if (serverBox2) {
        // Drag to a specific position on canvas
        const targetX = canvasBox.x + 200;
        const targetY = canvasBox.y + 200;

        console.log(`  Target position: (${Math.round(targetX)}, ${Math.round(targetY)})`);

        await page.mouse.move(serverBox2.x + serverBox2.width/2, serverBox2.y + serverBox2.height/2);
        await page.mouse.down();
        await page.waitForTimeout(100);
        await page.mouse.move(targetX, targetY, { steps: 15 });
        await page.waitForTimeout(100);
        await page.mouse.up();
        await page.waitForTimeout(1000);

        const finalServerNodes = await page.locator('.server-node').count();
        console.log(`  • Server nodes after second drop: ${finalServerNodes}`);

        if (finalServerNodes > newServerNodes) {
          console.log('  ✅ Second drag and drop SUCCESSFUL');
        } else {
          console.log('  ❌ Second drag and drop FAILED');
        }
      }
    }

    // Test 3: Check if nodes are interactive
    console.log('\n🎯 Test 3: Node Interaction');
    console.log('----------------------------');

    const nodeCount = await page.locator('.server-node').count();
    if (nodeCount > 0) {
      const firstNode = page.locator('.server-node').first();

      // Try to click the node
      await firstNode.click();
      console.log('  • Clicked first server node');

      // Check if node is selected (might have different styling)
      const isSelected = await firstNode.evaluate(el => {
        return el.classList.contains('selected') ||
               el.classList.contains('active') ||
               window.getComputedStyle(el).border !== 'none';
      });
      console.log(`  • Node selected: ${isSelected ? 'YES' : 'NO'}`);
    }

    // Take screenshot
    await page.screenshot({ path: 'drag-drop-test-result.png', fullPage: true });
    console.log('\n📸 Screenshot saved: drag-drop-test-result.png');

    // Final summary
    console.log('\n📋 FINAL SUMMARY:');
    console.log('==================');
    const finalNodeCount = await page.locator('.server-node').count();
    console.log(`  Initial nodes: ${initialServerNodes}`);
    console.log(`  Final nodes: ${finalNodeCount}`);
    console.log(`  Nodes added: ${finalNodeCount - initialServerNodes}`);

    if (finalNodeCount > initialServerNodes) {
      console.log('\n  ✅✅✅ DRAG AND DROP IS WORKING ✅✅✅');
    } else {
      console.log('\n  ❌❌❌ DRAG AND DROP IS NOT WORKING ❌❌❌');
      console.log('\n  Possible issues:');
      console.log('  1. DnD Kit not properly initialized');
      console.log('  2. Drop zones not configured correctly');
      console.log('  3. Event handlers not firing');
      console.log('  4. Canvas not accepting drops');
    }

    console.log('\n✅ Test complete!');

    // Keep connection for inspection
    console.log('\nConnection remains open. Press Ctrl+C to exit.');
    await new Promise(() => {});

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

testDragAndDrop().catch(console.error);