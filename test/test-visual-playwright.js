const { _electron: electron } = require('playwright');
const path = require('path');

async function testVisualWorkspace() {
  console.log('🎭 Testing Visual Workspace with Playwright\n');

  let electronApp;
  let window;

  try {
    // Launch Electron app
    console.log('1. Launching Electron app...');
    electronApp = await electron.launch({
      args: [path.join(__dirname, '../dist/main/main.js'), '--dev'],
      env: {
        ...process.env,
        NODE_ENV: 'development'
      }
    });

    // Wait for the first window
    console.log('2. Waiting for window...');
    window = await electronApp.firstWindow();

    // Wait for app to load
    await window.waitForTimeout(3000);

    // Enable Visual Workspace in settings
    console.log('3. Enabling Visual Workspace...');
    await window.evaluate(() => {
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
    await window.reload();
    await window.waitForTimeout(2000);

    // Take initial screenshot
    await window.screenshot({ path: 'playwright-initial.png' });
    console.log('   Screenshot: playwright-initial.png');

    // Check if Get Started button exists and click it
    const getStartedBtn = await window.locator('button:has-text("Get Started")');
    if (await getStartedBtn.count() > 0) {
      console.log('4. Clicking Get Started...');
      await getStartedBtn.click();
      await window.waitForTimeout(1000);
    }

    // Look for Visual button
    console.log('5. Switching to Visual mode...');
    const visualBtn = await window.locator('button[title="Visual Workspace"]');
    if (await visualBtn.count() > 0) {
      await visualBtn.click();
      await window.waitForTimeout(2000);
      console.log('   Clicked Visual button');
    } else {
      console.log('   Visual button not found, trying alternate selector...');
      const altVisualBtn = await window.locator('button:has-text("Visual")');
      if (await altVisualBtn.count() > 0) {
        await altVisualBtn.click();
        await window.waitForTimeout(2000);
      }
    }

    // Check if Visual Workspace loaded
    console.log('\n6. Checking Visual Workspace components...');
    const components = {
      'Workspace': '.visual-workspace',
      'Server Library': '[class*="ServerLibrary"]',
      'Client Dock': '[class*="ClientDock"]',
      'Canvas': '#react-flow-wrapper',
      'Performance Panel': '[class*="InsightsPanel"]'
    };

    for (const [name, selector] of Object.entries(components)) {
      const element = await window.locator(selector);
      const count = await element.count();
      if (count > 0) {
        const box = await element.boundingBox();
        if (box) {
          console.log(`   ✓ ${name} - Size: ${Math.round(box.width)}x${Math.round(box.height)}`);
        } else {
          console.log(`   ✓ ${name} found but not visible`);
        }
      } else {
        console.log(`   ✗ ${name} not found`);
      }
    }

    // Test drag and drop
    console.log('\n7. Testing drag and drop...');

    // Find server cards
    const serverCards = await window.locator('.server-card');
    const serverCount = await serverCards.count();
    console.log(`   Found ${serverCount} server cards`);

    if (serverCount > 0) {
      const firstServer = serverCards.first();
      const canvas = await window.locator('#react-flow-wrapper');

      if (await canvas.count() > 0) {
        console.log('   Attempting to drag server to canvas...');

        // Get bounding boxes
        const serverBox = await firstServer.boundingBox();
        const canvasBox = await canvas.boundingBox();

        if (serverBox && canvasBox) {
          // Perform drag
          await window.mouse.move(serverBox.x + serverBox.width/2, serverBox.y + serverBox.height/2);
          await window.mouse.down();

          // Move to canvas
          await window.mouse.move(canvasBox.x + 300, canvasBox.y + 200, { steps: 10 });
          await window.mouse.up();

          await window.waitForTimeout(1000);

          // Check for server nodes
          const serverNodes = await window.locator('.server-node');
          const nodeCount = await serverNodes.count();
          console.log(`   Server nodes on canvas: ${nodeCount}`);

          if (nodeCount === 0) {
            console.log('   ⚠️  Drag did not create server node');

            // Check console for errors
            const logs = await window.evaluate(() => {
              const logs = [];
              const originalLog = console.log;
              console.log = (...args) => {
                logs.push(args.join(' '));
                originalLog.apply(console, args);
              };
              return logs;
            });

            if (logs.length > 0) {
              console.log('   Console logs:', logs.slice(-5));
            }
          } else {
            console.log('   ✓ Server node created successfully');
          }
        }
      }
    }

    // Test client selection
    console.log('\n8. Testing client selection...');
    const clientCards = await window.locator('.client-card');
    const clientCount = await clientCards.count();
    console.log(`   Found ${clientCount} client cards`);

    if (clientCount > 0) {
      const firstClient = clientCards.first();

      // Single click
      await firstClient.click();
      await window.waitForTimeout(300);

      // Check if selected
      const selectedAfterSingle = await window.locator('.client-card.ring-2.ring-primary').count() > 0;
      console.log(`   Single click selects: ${selectedAfterSingle} (should be false)`);

      // Double click
      await firstClient.dblclick();
      await window.waitForTimeout(300);

      const selectedAfterDouble = await window.locator('.client-card.ring-2.ring-primary').count() > 0;
      console.log(`   Double click selects: ${selectedAfterDouble} (should be true)`);
    }

    // Check for layout issues
    console.log('\n9. Checking for layout issues...');

    const perfPanel = await window.locator('[class*="InsightsPanel"]');
    const controls = await window.locator('.react-flow__controls');

    if (await perfPanel.count() > 0 && await controls.count() > 0) {
      const perfBox = await perfPanel.boundingBox();
      const controlsBox = await controls.boundingBox();

      if (perfBox && controlsBox) {
        const overlapping = (perfBox.y < controlsBox.y + controlsBox.height);
        if (overlapping) {
          console.log(`   ✗ Performance panel overlaps controls`);
        } else {
          console.log(`   ✓ No overlap detected`);
        }
      }
    }

    // Take final screenshot
    await window.screenshot({ path: 'playwright-visual-workspace.png', fullPage: true });
    console.log('\n10. Final screenshot: playwright-visual-workspace.png');

    // Summary
    console.log('\n✅ Test complete!');

    // Check for any issues
    const workspace = await window.locator('.visual-workspace');
    if (await workspace.count() === 0) {
      console.log('\n⚠️  Visual Workspace did not load properly');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);

    if (window) {
      await window.screenshot({ path: 'playwright-error.png' });
      console.log('Error screenshot: playwright-error.png');
    }
  } finally {
    // Close the app
    if (electronApp) {
      await electronApp.close();
    }
  }
}

// Run the test
testVisualWorkspace().catch(console.error);