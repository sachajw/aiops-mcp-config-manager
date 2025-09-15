const { chromium } = require('playwright');

async function testElectronApp() {
  console.log('🎭 Testing Electron App via Remote Debugging\n');
  console.log('================================\n');

  try {
    // Connect to the running Electron app via debugging port
    const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
    console.log('✅ Connected to Electron app on port 9222\n');

    // Get the first context (Electron window)
    const contexts = browser.contexts();
    if (contexts.length === 0) {
      console.error('No contexts found');
      return;
    }

    const context = contexts[0];
    const pages = context.pages();

    if (pages.length === 0) {
      console.error('No pages found');
      return;
    }

    const page = pages[0];
    console.log('Found Electron window\n');

    // Wait for the page to be ready
    await page.waitForLoadState('networkidle');

    // Enable Visual Workspace in settings
    console.log('1. Setting up Visual Workspace...');
    await page.evaluate(() => {
      const settings = {
        theme: 'dark',
        autoSave: true,
        experimental: {
          visualWorkspaceEnabled: true,
          visualWorkspaceDefault: false
        }
      };
      localStorage.setItem('mcp-app-settings', JSON.stringify(settings));
      console.log('Visual Workspace enabled in settings');
    });

    // Check current page
    const title = await page.title();
    console.log(`   Page title: ${title}`);

    // Look for Get Started button
    const getStartedBtn = page.locator('button:has-text("Get Started")');
    if (await getStartedBtn.isVisible()) {
      console.log('\n2. Clicking Get Started...');
      await getStartedBtn.click();
      await page.waitForTimeout(1000);
    }

    // Look for Visual button
    console.log('\n3. Switching to Visual mode...');
    const visualBtn = page.locator('button:has-text("Visual")').first();
    if (await visualBtn.isVisible()) {
      await visualBtn.click();
      await page.waitForTimeout(2000);
      console.log('   Clicked Visual button');
    } else {
      console.log('   Visual button not found');
    }

    // Check if Visual Workspace loaded
    console.log('\n4. Checking Visual Workspace...');
    const workspace = page.locator('.visual-workspace');
    const workspaceVisible = await workspace.isVisible();
    console.log(`   Visual Workspace visible: ${workspaceVisible}`);

    if (workspaceVisible) {
      // Check components
      const components = {
        'Server Library': '.server-card',
        'Client Dock': '.client-card',
        'Canvas': '#react-flow-wrapper',
        'Performance Panel': '[class*="InsightsPanel"]'
      };

      for (const [name, selector] of Object.entries(components)) {
        const count = await page.locator(selector).count();
        console.log(`   ${count > 0 ? '✓' : '✗'} ${name}: ${count} found`);
      }

      // Test drag and drop
      console.log('\n5. Testing drag and drop...');
      const serverCards = page.locator('.server-card');
      const serverCount = await serverCards.count();
      console.log(`   Found ${serverCount} server(s)`);

      if (serverCount > 0) {
        const firstServer = serverCards.first();
        const canvas = page.locator('#react-flow-wrapper');

        if (await canvas.isVisible()) {
          const serverBox = await firstServer.boundingBox();
          const canvasBox = await canvas.boundingBox();

          console.log('   Dragging server to canvas...');
          await page.mouse.move(serverBox.x + serverBox.width/2, serverBox.y + serverBox.height/2);
          await page.mouse.down();
          await page.mouse.move(canvasBox.x + canvasBox.width/2, canvasBox.y + canvasBox.height/2, { steps: 10 });
          await page.mouse.up();
          await page.waitForTimeout(1000);

          // Check console logs
          const logs = await page.evaluate(() => {
            // Get any console logs about drag
            return window.consoleLogs || [];
          });

          // Check for server nodes
          const serverNodes = await page.locator('.server-node').count();
          console.log(`   Server nodes on canvas: ${serverNodes}`);

          if (serverNodes > 0) {
            console.log('   ✅ Drag and drop working!');
          } else {
            console.log('   ❌ Drag and drop not working');
          }
        }
      }

      // Test client selection
      console.log('\n6. Testing client selection...');
      const clientCards = page.locator('.client-card');
      const clientCount = await clientCards.count();
      console.log(`   Found ${clientCount} client(s)`);

      if (clientCount > 0) {
        const firstClient = clientCards.first();

        // Test double-click
        await firstClient.dblclick();
        await page.waitForTimeout(500);

        const selected = await page.locator('.client-card.ring-2.ring-primary').count();
        console.log(`   Client selected after double-click: ${selected > 0}`);
      }
    }

    // Take screenshot
    await page.screenshot({ path: 'electron-test-screenshot.png', fullPage: true });
    console.log('\n7. Screenshot saved: electron-test-screenshot.png');

    console.log('\n✅ Test complete!');

    // Don't close - keep connection for manual testing
    console.log('\nConnection remains open for manual testing...');
    console.log('Press Ctrl+C to exit.');

    // Keep alive
    await new Promise(() => {});

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('\nMake sure:');
    console.error('1. Electron app is running with: npm run electron:dev');
    console.error('2. Remote debugging is enabled on port 9222');
    console.error('3. The app window is open and loaded');
  }
}

testElectronApp().catch(console.error);