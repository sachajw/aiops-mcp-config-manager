const { chromium } = require('playwright');

async function testElectronApp() {
  console.log('🧪 Testing Electron App via CDP\n');
  console.log('================================\n');

  try {
    // Connect to the running Electron app
    console.log('Connecting to Electron at ws://localhost:9222...');
    const browser = await chromium.connectOverCDP('http://localhost:9222', {
      timeout: 5000
    });
    console.log('✅ Connected to Electron app\n');

    // Get the main context and page
    const contexts = browser.contexts();
    console.log(`Found ${contexts.length} context(s)\n`);

    if (contexts.length === 0) {
      console.log('❌ No contexts found');
      return;
    }

    const context = contexts[0];
    const pages = context.pages();
    console.log(`Found ${pages.length} page(s)\n`);

    if (pages.length === 0) {
      console.log('❌ No pages found');
      return;
    }

    const page = pages[0];
    console.log('📍 Testing page:', await page.url());

    // Wait for app to load
    console.log('\nWaiting for app to load...');
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Check for main layout
    const hasLayout = await page.locator('.ant-layout, .app-container, #root').count();
    console.log(`\n✓ Main layout elements found: ${hasLayout}`);

    // Check for navigation
    const visualButton = page.locator('button:has-text("Visual")');
    const hasVisualButton = await visualButton.isVisible({ timeout: 2000 }).catch(() => false);
    console.log(`✓ Visual button visible: ${hasVisualButton}`);

    // Take a screenshot
    await page.screenshot({ path: 'test-electron-app.png' });
    console.log('\n📸 Screenshot saved: test-electron-app.png');

    // Try clicking Visual button if it exists
    if (hasVisualButton) {
      console.log('\n🎯 Clicking Visual button...');
      await visualButton.click();
      await page.waitForTimeout(2000);

      // Check if Visual Workspace loaded
      const workspace = page.locator('.visual-workspace');
      const hasWorkspace = await workspace.isVisible({ timeout: 3000 }).catch(() => false);
      console.log(`✓ Visual Workspace loaded: ${hasWorkspace}`);

      if (hasWorkspace) {
        // Check for panels
        const serverLibrary = await page.locator('.server-library').count();
        const clientDock = await page.locator('.client-dock').count();
        const canvas = await page.locator('#react-flow-wrapper').count();

        console.log(`\n📊 Visual Workspace Components:`);
        console.log(`  • Server Library: ${serverLibrary > 0 ? '✅' : '❌'}`);
        console.log(`  • Client Dock: ${clientDock > 0 ? '✅' : '❌'}`);
        console.log(`  • Canvas: ${canvas > 0 ? '✅' : '❌'}`);

        // Test drag and drop
        console.log('\n🎯 Testing Drag and Drop...');
        const serverCards = await page.locator('.server-card').count();
        console.log(`  • Server cards found: ${serverCards}`);

        if (serverCards > 0) {
          const initialNodes = await page.locator('.server-node').count();
          console.log(`  • Initial nodes on canvas: ${initialNodes}`);

          // Try to drag first server
          const firstServer = page.locator('.server-card').first();
          const serverText = await firstServer.textContent();
          console.log(`  • Dragging: ${serverText?.split('\n')[0]}`);

          const serverBox = await firstServer.boundingBox();
          const canvasBox = await page.locator('#react-flow-wrapper').boundingBox();

          if (serverBox && canvasBox) {
            // Drag operation
            await page.mouse.move(serverBox.x + serverBox.width/2, serverBox.y + serverBox.height/2);
            await page.mouse.down();
            await page.waitForTimeout(100);
            await page.mouse.move(canvasBox.x + canvasBox.width/2, canvasBox.y + canvasBox.height/2, { steps: 10 });
            await page.waitForTimeout(100);
            await page.mouse.up();
            await page.waitForTimeout(1500);

            const finalNodes = await page.locator('.server-node').count();
            console.log(`  • Final nodes on canvas: ${finalNodes}`);
            console.log(`  • Drag result: ${finalNodes > initialNodes ? '✅ SUCCESS' : '❌ FAILED'}`);
          }
        }
      }
    }

    console.log('\n✅ Test complete!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

testElectronApp().catch(console.error);