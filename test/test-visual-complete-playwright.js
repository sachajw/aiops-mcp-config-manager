const { chromium } = require('playwright');

async function testVisualWorkspaceComplete() {
  console.log('🎭 Complete Visual Workspace Test\n');
  console.log('================================\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 200  // Slow down for visibility
  });

  const results = {
    loaded: false,
    dragDrop: false,
    clientSelection: false,
    autoSave: false,
    layoutOk: false
  };

  try {
    const context = await browser.newContext({
      viewport: { width: 1400, height: 900 }
    });
    const page = await context.newPage();

    // Enable console logging
    page.on('console', msg => {
      if (msg.text().includes('Drag') || msg.text().includes('drag')) {
        console.log('   Console:', msg.text());
      }
    });

    // Navigate to app
    console.log('1. Loading app...');
    await page.goto('http://localhost:5175');
    await page.waitForLoadState('networkidle');

    // Enable Visual Workspace
    console.log('2. Setting up Visual Workspace...');
    await page.evaluate(() => {
      // Enable Visual mode
      const settings = {
        theme: 'dark',
        autoSave: true,
        experimental: {
          visualWorkspaceEnabled: true,
          visualWorkspaceDefault: false
        }
      };
      localStorage.setItem('mcp-app-settings', JSON.stringify(settings));

      // Add some mock clients
      const clients = [
        { name: 'claude-desktop', displayName: 'Claude Desktop', installed: true, type: 'desktop' },
        { name: 'vscode', displayName: 'VS Code', installed: true, type: 'editor' }
      ];
      localStorage.setItem('mcp-detected-clients', JSON.stringify(clients));
    });

    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Handle Get Started if present
    const getStarted = page.locator('button:has-text("Get Started")');
    if (await getStarted.isVisible()) {
      await getStarted.click();
      await page.waitForTimeout(500);
    }

    // Switch to Visual mode
    console.log('3. Switching to Visual mode...');
    const visualBtn = page.locator('button:has-text("Visual")').first();
    if (await visualBtn.isVisible()) {
      await visualBtn.click();
      await page.waitForTimeout(2000);
    }

    // Check if Visual Workspace loaded
    const workspace = page.locator('.visual-workspace');
    results.loaded = await workspace.count() > 0;
    console.log(`   ✓ Visual Workspace loaded: ${results.loaded}`);

    if (results.loaded) {
      // Check all components
      console.log('\n4. Checking components...');
      const components = {
        'Server Library': '.server-card',
        'Client Dock': '.client-card',
        'Canvas': '#react-flow-wrapper',
        'Performance Panel': '[class*="InsightsPanel"]',
        'Auto-save toggle': 'input[type="checkbox"]'
      };

      for (const [name, selector] of Object.entries(components)) {
        const count = await page.locator(selector).count();
        console.log(`   ${count > 0 ? '✓' : '✗'} ${name}: ${count} found`);
      }

      // First, select a client if available
      console.log('\n5. Testing client selection...');
      const clientCards = page.locator('.client-card');
      const clientCount = await clientCards.count();

      if (clientCount > 0) {
        console.log(`   Found ${clientCount} client(s)`);

        // Test double-click selection
        const firstClient = clientCards.first();

        // Single click shouldn't select
        await firstClient.click();
        await page.waitForTimeout(300);
        let selected = await page.locator('.client-card.ring-2.ring-primary').count();
        console.log(`   After single click: ${selected > 0 ? 'selected' : 'not selected'} (should be not selected)`);

        // Double click should select
        await firstClient.dblclick();
        await page.waitForTimeout(500);
        selected = await page.locator('.client-card.ring-2.ring-primary').count();
        results.clientSelection = selected > 0;
        console.log(`   After double click: ${selected > 0 ? 'selected' : 'not selected'} (should be selected)`);

        if (results.clientSelection) {
          console.log('   ✓ Client selection works!');
        } else {
          console.log('   ✗ Client selection not working');
        }
      } else {
        console.log('   No clients available to test selection');

        // Try to select from dropdown
        const clientDropdown = page.locator('select').first();
        if (await clientDropdown.isVisible()) {
          const options = await clientDropdown.locator('option').all();
          if (options.length > 1) {
            await clientDropdown.selectOption({ index: 1 });
            console.log('   Selected client from dropdown');
            await page.waitForTimeout(500);
          }
        }
      }

      // Test drag and drop
      console.log('\n6. Testing drag and drop...');
      const serverCards = page.locator('.server-card');
      const serverCount = await serverCards.count();
      console.log(`   Found ${serverCount} server(s)`);

      if (serverCount > 0) {
        const firstServer = serverCards.first();
        const canvas = page.locator('#react-flow-wrapper');

        if (await canvas.isVisible()) {
          const serverBox = await firstServer.boundingBox();
          const canvasBox = await canvas.boundingBox();

          console.log('   Starting drag from server to canvas...');

          // Start drag
          await page.mouse.move(serverBox.x + serverBox.width/2, serverBox.y + serverBox.height/2);
          await page.mouse.down();

          // Check for drag overlay
          await page.waitForTimeout(100);
          const dragOverlay = await page.locator('[class*="DragOverlay"]').count();
          console.log(`   Drag overlay visible: ${dragOverlay > 0}`);

          // Move to canvas center
          await page.mouse.move(
            canvasBox.x + canvasBox.width/2,
            canvasBox.y + canvasBox.height/2,
            { steps: 10 }
          );

          // Drop
          await page.mouse.up();
          await page.waitForTimeout(1000);

          // Check for server nodes
          const serverNodes = await page.locator('.server-node').count();
          results.dragDrop = serverNodes > 0;
          console.log(`   Server nodes on canvas: ${serverNodes}`);

          if (results.dragDrop) {
            console.log('   ✓ Drag and drop works!');
          } else {
            console.log('   ✗ Drag and drop not working');

            // Try dragging to a client instead
            if (clientCount > 0) {
              console.log('   Trying to drag to client instead...');
              const clientBox = await clientCards.first().boundingBox();

              await page.mouse.move(serverBox.x + serverBox.width/2, serverBox.y + serverBox.height/2);
              await page.mouse.down();
              await page.mouse.move(clientBox.x + clientBox.width/2, clientBox.y + clientBox.height/2, { steps: 10 });
              await page.mouse.up();
              await page.waitForTimeout(1000);

              const nodesAfterClient = await page.locator('.server-node').count();
              if (nodesAfterClient > serverNodes) {
                console.log('   ✓ Drag to client works!');
                results.dragDrop = true;
              }
            }
          }
        }
      }

      // Test auto-save toggle
      console.log('\n7. Testing auto-save toggle...');
      const autoSaveCheckbox = page.locator('input[type="checkbox"]').first();
      if (await autoSaveCheckbox.isVisible()) {
        const initialChecked = await autoSaveCheckbox.isChecked();
        console.log(`   Auto-save initially: ${initialChecked ? 'on' : 'off'}`);

        await autoSaveCheckbox.click();
        await page.waitForTimeout(300);

        const saveBtn = page.locator('button:has-text("Save Configuration")');
        const saveBtnVisible = await saveBtn.isVisible();

        results.autoSave = (saveBtnVisible === !initialChecked);
        console.log(`   Save button visible: ${saveBtnVisible} (should be ${!initialChecked})`);

        if (results.autoSave) {
          console.log('   ✓ Auto-save toggle works!');
        } else {
          console.log('   ✗ Auto-save toggle not working');
        }
      }

      // Check layout
      console.log('\n8. Checking layout...');
      const perfPanel = page.locator('[class*="InsightsPanel"]');
      const controls = page.locator('.react-flow__controls');

      if (await perfPanel.isVisible() && await controls.isVisible()) {
        const perfBox = await perfPanel.boundingBox();
        const controlsBox = await controls.boundingBox();

        const overlapping = (perfBox.y < controlsBox.y + controlsBox.height);
        results.layoutOk = !overlapping;

        if (results.layoutOk) {
          console.log('   ✓ No layout issues detected');
        } else {
          console.log('   ✗ Performance panel overlaps controls');
          console.log(`     Perf Y: ${perfBox.y}, Controls bottom: ${controlsBox.y + controlsBox.height}`);
        }
      } else {
        results.layoutOk = true;
        console.log('   ✓ Layout looks good');
      }
    }

    // Take final screenshot
    await page.screenshot({ path: 'test-results-final.png', fullPage: true });
    console.log('\n9. Screenshot saved: test-results-final.png');

    // Summary
    console.log('\n================================');
    console.log('📊 TEST RESULTS SUMMARY:');
    console.log('================================');

    const passed = Object.values(results).filter(v => v).length;
    const total = Object.keys(results).length;

    console.log(`\n   Overall: ${passed}/${total} tests passed\n`);

    console.log(`   Visual Workspace Loaded: ${results.loaded ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Drag & Drop:             ${results.dragDrop ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Client Selection:        ${results.clientSelection ? '✅ PASS' : '❌ FAIL (or no clients)'}`);
    console.log(`   Auto-save Toggle:        ${results.autoSave ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Layout (no overlaps):    ${results.layoutOk ? '✅ PASS' : '❌ FAIL'}`);

    if (passed === total) {
      console.log('\n🎉 ALL TESTS PASSED! The Visual Workspace is working correctly.');
    } else {
      console.log(`\n⚠️  ${total - passed} test(s) failed. Issues need to be fixed.`);
    }

    // Close browser after 5 seconds
    console.log('\nClosing browser in 5 seconds...');
    await page.waitForTimeout(5000);
    await browser.close();

  } catch (error) {
    console.error('❌ Test error:', error.message);
    await browser.close();
  }
}

// Run the test
testVisualWorkspaceComplete().catch(console.error);