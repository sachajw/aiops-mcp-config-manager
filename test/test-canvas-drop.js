const { chromium } = require('playwright');

async function testCanvasDrop() {
  console.log('🧪 Testing Drag and Drop to Canvas\n');
  console.log('====================================\n');

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
    console.log(`  • Server cards in library: ${serverCards}\n`);

    if (serverCards === 0) {
      console.log('❌ No server cards found in library');
      return;
    }

    // Test drag to empty canvas area
    console.log('🎯 Test: Drag Server to Empty Canvas Area');
    console.log('-------------------------------------------');

    const firstServerCard = page.locator('.server-card').first();
    const serverName = await firstServerCard.locator('h3, .font-semibold').first().textContent();
    console.log(`  Dragging server: "${serverName}"`);

    // Get bounding boxes
    const serverBox = await firstServerCard.boundingBox();
    const canvas = page.locator('#react-flow-wrapper');
    const canvasBox = await canvas.boundingBox();

    if (!serverBox || !canvasBox) {
      console.log('  ❌ Could not get element positions');
      return;
    }

    // Find an empty area on the canvas (avoid existing nodes)
    const dropX = canvasBox.x + 400;
    const dropY = canvasBox.y + 300;
    console.log(`  Target drop position: (${Math.round(dropX)}, ${Math.round(dropY)})`);

    // Perform drag operation
    console.log('\n  Performing drag operation:');

    // Start drag
    await page.mouse.move(serverBox.x + serverBox.width/2, serverBox.y + serverBox.height/2);
    console.log('    1. Moved to server card');

    await page.mouse.down();
    console.log('    2. Mouse down');
    await page.waitForTimeout(100);

    // Move to canvas empty area
    await page.mouse.move(dropX, dropY, { steps: 10 });
    console.log('    3. Moved to canvas empty area');
    await page.waitForTimeout(100);

    // Drop
    await page.mouse.up();
    console.log('    4. Mouse up (dropped)');
    await page.waitForTimeout(1500);

    // Check results
    console.log('\n  Checking results:');
    const newServerNodes = await page.locator('.server-node').count();
    console.log(`    • Server nodes after drop: ${newServerNodes}`);
    console.log(`    • Nodes added: ${newServerNodes - initialServerNodes}`);

    let dropToCanvasWorking = false;
    if (newServerNodes > initialServerNodes) {
      console.log('  ✅ Drop to canvas SUCCESSFUL - node was added');
      dropToCanvasWorking = true;

      // Check if edge was created to active client
      const edges = await page.locator('.react-flow__edge').count();
      console.log(`    • Edges on canvas: ${edges}`);
      if (edges > 0) {
        console.log('  ✅ Edge automatically created to active client');
      }
    } else {
      console.log('  ❌ Drop to canvas FAILED - no new nodes');
    }

    // Test 2: Drag another server to canvas
    if (serverCards > 1 && dropToCanvasWorking) {
      console.log('\n🎯 Test 2: Drag Second Server to Canvas');
      console.log('----------------------------------------');

      const secondServerCard = page.locator('.server-card').nth(1);
      const secondServerName = await secondServerCard.locator('h3, .font-semibold').first().textContent();
      console.log(`  Dragging server: "${secondServerName}"`);

      const serverBox2 = await secondServerCard.boundingBox();
      if (serverBox2) {
        // Drop at different position
        const dropX2 = canvasBox.x + 250;
        const dropY2 = canvasBox.y + 400;

        await page.mouse.move(serverBox2.x + serverBox2.width/2, serverBox2.y + serverBox2.height/2);
        await page.mouse.down();
        await page.waitForTimeout(100);
        await page.mouse.move(dropX2, dropY2, { steps: 10 });
        await page.waitForTimeout(100);
        await page.mouse.up();
        await page.waitForTimeout(1500);

        const finalServerNodes = await page.locator('.server-node').count();
        console.log(`  • Server nodes after second drop: ${finalServerNodes}`);

        if (finalServerNodes > newServerNodes) {
          console.log('  ✅ Second drop to canvas SUCCESSFUL');
        } else {
          console.log('  ❌ Second drop to canvas FAILED');
        }
      }
    }

    // Take screenshot
    await page.screenshot({ path: 'canvas-drop-test.png', fullPage: true });
    console.log('\n📸 Screenshot saved: canvas-drop-test.png');

    // Final summary
    console.log('\n📋 FINAL SUMMARY:');
    console.log('==================');
    const finalNodeCount = await page.locator('.server-node').count();
    console.log(`  Initial nodes: ${initialServerNodes}`);
    console.log(`  Final nodes: ${finalNodeCount}`);
    console.log(`  Total nodes added: ${finalNodeCount - initialServerNodes}`);

    if (dropToCanvasWorking) {
      console.log('\n  ✅✅✅ DRAG AND DROP TO CANVAS IS WORKING ✅✅✅');
    } else {
      console.log('\n  ❌❌❌ DRAG AND DROP TO CANVAS IS NOT WORKING ❌❌❌');
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

testCanvasDrop().catch(console.error);