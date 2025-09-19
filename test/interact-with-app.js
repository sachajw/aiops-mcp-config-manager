const { chromium } = require('playwright');

async function interactWithApp() {
  console.log('🎭 Connecting to running Electron app...\n');

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
    console.log('📄 Found Electron window\n');

    // Wait for the page to be ready
    await page.waitForLoadState('networkidle');

    // Check current URL
    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}\n`);

    // Check if we're on the landing page or main app
    const getStartedBtn = page.locator('button:has-text("Get Started")');
    if (await getStartedBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      console.log('📍 On landing page, clicking Get Started...');
      await getStartedBtn.click();
      await page.waitForTimeout(1000);
    }

    // Check for Visual button in header
    console.log('\n🔍 Looking for Visual button...');
    const visualBtn = page.locator('button:has-text("Visual")').first();

    if (await visualBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('✅ Found Visual button, clicking to enter Visual Workspace...');
      await visualBtn.click();
      await page.waitForTimeout(2000);

      // Check if Visual Workspace loaded
      const workspace = page.locator('.visual-workspace');
      if (await workspace.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('✅ Visual Workspace loaded!\n');

        // Check for the three panels
        console.log('📊 Checking Visual Workspace components:');

        // Server Library (left panel)
        const serverLibrary = page.locator('.server-card').first();
        const serverCount = await page.locator('.server-card').count();
        console.log(`  • Server Library: ${serverCount} servers found`);

        // Canvas (center)
        const canvas = page.locator('#react-flow-wrapper');
        const canvasVisible = await canvas.isVisible();
        console.log(`  • Canvas: ${canvasVisible ? 'Visible' : 'Not visible'}`);

        // Client Dock (right panel)
        const clientCards = page.locator('.client-card');
        const clientCount = await clientCards.count();
        console.log(`  • Client Dock: ${clientCount} clients found`);

        // Test drag and drop
        console.log('\n🎯 Testing drag and drop functionality...');
        if (serverCount > 0 && canvasVisible) {
          const firstServer = page.locator('.server-card').first();
          const serverBox = await firstServer.boundingBox();
          const canvasBox = await canvas.boundingBox();

          if (serverBox && canvasBox) {
            console.log('  Attempting to drag server to canvas...');

            // Perform drag and drop
            await page.mouse.move(serverBox.x + serverBox.width/2, serverBox.y + serverBox.height/2);
            await page.mouse.down();
            await page.waitForTimeout(100);
            await page.mouse.move(canvasBox.x + canvasBox.width/2, canvasBox.y + canvasBox.height/2, { steps: 10 });
            await page.waitForTimeout(100);
            await page.mouse.up();
            await page.waitForTimeout(1000);

            // Check if a server node was added to canvas
            const serverNodes = await page.locator('.server-node').count();
            console.log(`  • Server nodes on canvas: ${serverNodes}`);

            if (serverNodes > 0) {
              console.log('  ✅ Drag and drop successful!');
            } else {
              console.log('  ⚠️ Server was not added to canvas');
            }
          }
        }

        // Test client selection
        console.log('\n👤 Testing client selection...');
        if (clientCount > 0) {
          const firstClient = clientCards.first();
          console.log('  Double-clicking first client...');
          await firstClient.dblclick();
          await page.waitForTimeout(500);

          // Check if client is selected (has ring highlight)
          const selectedClient = await page.locator('.client-card.ring-2').count();
          console.log(`  • Selected clients: ${selectedClient}`);

          if (selectedClient > 0) {
            console.log('  ✅ Client selection working!');
          } else {
            console.log('  ⚠️ Client not selected');
          }
        }

        // Check auto-save toggle
        console.log('\n💾 Checking auto-save toggle...');
        const autoSaveCheckbox = page.locator('input[type="checkbox"]').first();
        if (await autoSaveCheckbox.isVisible()) {
          const isChecked = await autoSaveCheckbox.isChecked();
          console.log(`  • Auto-save is: ${isChecked ? 'ON' : 'OFF'}`);

          // Toggle it
          await autoSaveCheckbox.click();
          await page.waitForTimeout(500);
          const newState = await autoSaveCheckbox.isChecked();
          console.log(`  • Toggled to: ${newState ? 'ON' : 'OFF'}`);

          // Check if Save button appears when auto-save is OFF
          if (!newState) {
            const saveBtn = page.locator('button:has-text("Save Configuration")');
            const saveBtnVisible = await saveBtn.isVisible();
            console.log(`  • Save button visible: ${saveBtnVisible}`);
          }
        }

        // Take a screenshot
        await page.screenshot({ path: 'visual-workspace-interaction.png', fullPage: true });
        console.log('\n📸 Screenshot saved: visual-workspace-interaction.png');

      } else {
        console.log('❌ Visual Workspace did not load');
      }
    } else {
      console.log('❌ Visual button not found in header');

      // Take a screenshot to see current state
      await page.screenshot({ path: 'current-state.png', fullPage: true });
      console.log('📸 Screenshot of current state saved: current-state.png');
    }

    console.log('\n✅ Interaction test complete!');

    // Keep connection open for manual inspection
    console.log('\nKeeping connection open. Press Ctrl+C to exit.');
    await new Promise(() => {}); // Keep alive

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nMake sure:');
    console.error('1. Electron app is running with remote debugging enabled');
    console.error('2. The app is loaded and responsive');

    // Check if we need to enable remote debugging
    if (error.message.includes('ECONNREFUSED')) {
      console.error('\n💡 Remote debugging may not be enabled.');
      console.error('Restart the app with remote debugging by adding this to main.ts:');
      console.error(`
if (isDev()) {
  app.commandLine.appendSwitch('remote-debugging-port', '9222');
}
      `);
    }
  }
}

interactWithApp().catch(console.error);