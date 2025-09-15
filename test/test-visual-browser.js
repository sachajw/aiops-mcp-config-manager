const { chromium } = require('playwright');

async function testVisualWorkspace() {
  console.log('🎭 Testing Visual Workspace in Browser\n');

  const browser = await chromium.launch({
    headless: false,  // Show browser for visual debugging
    slowMo: 100       // Slow down actions for visibility
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1400, height: 900 }
    });
    const page = await context.newPage();

    // Navigate to dev server
    console.log('1. Navigating to app...');
    await page.goto('http://localhost:5175');
    await page.waitForLoadState('networkidle');

    // Enable Visual Workspace in settings
    console.log('2. Enabling Visual Workspace...');
    await page.evaluate(() => {
      const settings = {
        theme: 'dark',
        autoSave: true,
        notifications: { enabled: true, sound: false, position: 'bottom-right' },
        experimental: {
          visualWorkspaceEnabled: true,
          visualWorkspaceDefault: false
        },
        enabledClients: {
          'Claude Desktop': true,
          'VS Code': true
        }
      };
      localStorage.setItem('mcp-app-settings', JSON.stringify(settings));
    });

    // Reload to apply settings
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Check for Get Started button
    const getStartedBtn = page.locator('button:has-text("Get Started")');
    if (await getStartedBtn.isVisible()) {
      console.log('3. Clicking Get Started...');
      await getStartedBtn.click();
      await page.waitForTimeout(1000);
    }

    // Look for Visual button
    console.log('4. Looking for Visual button...');

    // Try multiple selectors
    const visualSelectors = [
      'button[title="Visual Workspace"]',
      'button:has-text("Visual")',
      '.btn:has-text("Visual")'
    ];

    let visualClicked = false;
    for (const selector of visualSelectors) {
      const btn = page.locator(selector);
      if (await btn.count() > 0) {
        console.log(`   Found Visual button with selector: ${selector}`);
        await btn.first().click();
        visualClicked = true;
        await page.waitForTimeout(2000);
        break;
      }
    }

    if (!visualClicked) {
      console.log('   ⚠️  Visual button not found');

      // Log all buttons for debugging
      const buttons = await page.locator('button').all();
      console.log(`   Found ${buttons.length} buttons total`);
      for (let i = 0; i < Math.min(buttons.length, 10); i++) {
        const text = await buttons[i].textContent();
        const title = await buttons[i].getAttribute('title');
        console.log(`     Button ${i}: text="${text}", title="${title}"`);
      }
    }

    // Check if Visual Workspace loaded
    console.log('\n5. Checking Visual Workspace components...');
    const workspace = page.locator('.visual-workspace');

    if (await workspace.count() > 0) {
      console.log('   ✓ Visual Workspace loaded!');

      // Check components
      const components = {
        'Server Library': '.server-card',
        'Client Dock': '.client-card',
        'Canvas': '#react-flow-wrapper',
        'Performance Panel': '[class*="InsightsPanel"]'
      };

      for (const [name, selector] of Object.entries(components)) {
        const element = page.locator(selector);
        const count = await element.count();
        console.log(`   ${count > 0 ? '✓' : '✗'} ${name}: ${count} found`);
      }

      // Test drag and drop
      console.log('\n6. Testing drag and drop...');
      const serverCards = page.locator('.server-card');
      const serverCount = await serverCards.count();
      console.log(`   Found ${serverCount} server cards`);

      if (serverCount > 0) {
        const firstServer = serverCards.first();
        const canvas = page.locator('#react-flow-wrapper');

        if (await canvas.count() > 0) {
          console.log('   Dragging server to canvas...');

          // Get bounding boxes
          const serverBox = await firstServer.boundingBox();
          const canvasBox = await canvas.boundingBox();

          if (serverBox && canvasBox) {
            // Start drag
            await page.mouse.move(serverBox.x + serverBox.width/2, serverBox.y + serverBox.height/2);
            await page.mouse.down();

            // Check if drag started
            const dragOverlay = page.locator('[class*="DragOverlay"]');
            const overlayVisible = await dragOverlay.isVisible();
            console.log(`   Drag overlay visible: ${overlayVisible}`);

            // Move to canvas
            await page.mouse.move(
              canvasBox.x + canvasBox.width/2,
              canvasBox.y + canvasBox.height/2,
              { steps: 10 }
            );

            // Drop
            await page.mouse.up();
            await page.waitForTimeout(1000);

            // Check for server nodes
            const serverNodes = page.locator('.server-node');
            const nodeCount = await serverNodes.count();
            console.log(`   Server nodes on canvas: ${nodeCount}`);

            if (nodeCount > 0) {
              console.log('   ✓ Drag and drop successful!');
            } else {
              console.log('   ✗ Drag and drop failed - no nodes created');

              // Check console for errors
              const consoleLogs = [];
              page.on('console', msg => consoleLogs.push(msg.text()));
              await page.waitForTimeout(100);

              if (consoleLogs.length > 0) {
                console.log('   Recent console logs:');
                consoleLogs.slice(-5).forEach(log => console.log(`     ${log}`));
              }
            }
          }
        }
      }

      // Test client selection
      console.log('\n7. Testing client selection...');
      const clientCards = page.locator('.client-card');
      const clientCount = await clientCards.count();
      console.log(`   Found ${clientCount} client cards`);

      if (clientCount > 0) {
        const firstClient = clientCards.first();

        // Single click
        await firstClient.click();
        await page.waitForTimeout(300);

        const selectedAfterSingle = await page.locator('.client-card.ring-2.ring-primary').count() > 0;
        console.log(`   Single click selects: ${selectedAfterSingle} (should be false)`);

        // Double click
        await firstClient.dblclick();
        await page.waitForTimeout(300);

        const selectedAfterDouble = await page.locator('.client-card.ring-2.ring-primary').count() > 0;
        console.log(`   Double click selects: ${selectedAfterDouble} (should be true)`);

        if (selectedAfterDouble) {
          console.log('   ✓ Double-click selection works!');
        } else {
          console.log('   ✗ Double-click selection not working');
        }
      }

      // Check auto-save toggle
      console.log('\n8. Testing auto-save toggle...');
      const autoSaveCheckbox = page.locator('input[type="checkbox"]');
      if (await autoSaveCheckbox.count() > 0) {
        const isChecked = await autoSaveCheckbox.isChecked();
        console.log(`   Auto-save initially: ${isChecked ? 'enabled' : 'disabled'}`);

        await autoSaveCheckbox.click();
        await page.waitForTimeout(300);

        const saveBtn = page.locator('button:has-text("Save Configuration")');
        const saveBtnVisible = await saveBtn.isVisible();
        console.log(`   Save button visible after toggle: ${saveBtnVisible}`);

        if (saveBtnVisible === !isChecked) {
          console.log('   ✓ Auto-save toggle works correctly');
        } else {
          console.log('   ✗ Auto-save toggle not working properly');
        }
      }

      // Check for layout issues
      console.log('\n9. Checking for layout issues...');
      const perfPanel = page.locator('[class*="InsightsPanel"]');
      const controls = page.locator('.react-flow__controls');

      if (await perfPanel.count() > 0 && await controls.count() > 0) {
        const perfBox = await perfPanel.boundingBox();
        const controlsBox = await controls.boundingBox();

        if (perfBox && controlsBox) {
          const overlapping = (perfBox.y < controlsBox.y + controlsBox.height) &&
                            (perfBox.x < controlsBox.x + controlsBox.width);

          if (overlapping) {
            console.log(`   ✗ Performance panel overlaps controls`);
            console.log(`     Perf Y: ${perfBox.y}, Controls Y+H: ${controlsBox.y + controlsBox.height}`);
          } else {
            console.log(`   ✓ No overlap between panels`);
          }
        }
      }

    } else {
      console.log('   ✗ Visual Workspace did not load');

      // Check what's on the page
      const pageTitle = await page.title();
      const headerText = await page.locator('h1').first().textContent().catch(() => 'No header');
      console.log(`   Page title: ${pageTitle}`);
      console.log(`   Header: ${headerText}`);
    }

    // Take final screenshot
    await page.screenshot({ path: 'playwright-browser-test.png', fullPage: true });
    console.log('\n10. Screenshot saved: playwright-browser-test.png');

    // Summary
    console.log('\n📊 Test Summary:');
    const issues = [];

    if (await workspace.count() === 0) {
      issues.push('Visual Workspace did not load');
    } else {
      const serverNodes = await page.locator('.server-node').count();
      if (serverCount > 0 && serverNodes === 0) {
        issues.push('Drag and drop not creating nodes');
      }

      const clientCards = await page.locator('.client-card').count();
      if (clientCards > 0) {
        const selected = await page.locator('.client-card.ring-2.ring-primary').count();
        if (selected === 0) {
          issues.push('Client double-click selection not working');
        }
      }
    }

    if (issues.length > 0) {
      console.log('   Issues found:');
      issues.forEach(issue => console.log(`   - ${issue}`));
    } else {
      console.log('   ✅ All tests passed!');
    }

    // Keep browser open for manual inspection
    console.log('\n🔍 Browser will stay open for manual inspection. Press Ctrl+C to close.');
    await new Promise(() => {}); // Keep running

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: 'playwright-error.png' });
  }
}

// Run the test
testVisualWorkspace().catch(console.error);