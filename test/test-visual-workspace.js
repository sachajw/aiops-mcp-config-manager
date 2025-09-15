// Test Visual Workspace functionality
// Run this script while the app is running on localhost:5173

const puppeteer = require('puppeteer');

async function testVisualWorkspace() {
  console.log('🧪 Starting Visual Workspace Tests...\n');

  const browser = await puppeteer.launch({
    headless: false, // Show browser for debugging
    devtools: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  try {
    // Navigate to the app
    console.log('1. Navigating to app...');
    await page.goto('http://localhost:5175', { waitUntil: 'networkidle2' });
    await page.waitForTimeout(2000);

    // Switch to Visual mode if needed
    console.log('2. Checking for Visual mode...');
    try {
      // Look for Visual button and click it
      const visualButton = await page.waitForSelector('button:has-text("Visual")', { timeout: 5000 });
      if (visualButton) {
        await visualButton.click();
        console.log('   ✓ Switched to Visual mode');
        await page.waitForTimeout(1000);
      }
    } catch (e) {
      // Try alternate selector
      const buttons = await page.$$('button');
      for (const button of buttons) {
        const text = await page.evaluate(el => el.textContent, button);
        if (text && text.includes('Visual')) {
          await button.click();
          console.log('   ✓ Switched to Visual mode');
          await page.waitForTimeout(1000);
          break;
        }
      }
    }

    // Check main components exist
    console.log('\n3. Checking main components...');
    const selectors = {
      'Visual Workspace': '.visual-workspace',
      'Server Library': '[class*="ServerLibrary"]',
      'Client Dock': '[class*="ClientDock"]',
      'Canvas': '#react-flow-wrapper',
      'Performance Panel': '[class*="InsightsPanel"]'
    };

    for (const [name, selector] of Object.entries(selectors)) {
      try {
        const element = await page.$(selector);
        if (element) {
          console.log(`   ✓ ${name} found`);

          // Get element details
          const box = await element.boundingBox();
          if (box) {
            console.log(`     Position: x=${Math.round(box.x)}, y=${Math.round(box.y)}, w=${Math.round(box.width)}, h=${Math.round(box.height)}`);
          }
        } else {
          console.log(`   ✗ ${name} NOT FOUND`);
        }
      } catch (e) {
        console.log(`   ✗ ${name} NOT FOUND - Error: ${e.message}`);
      }
    }

    // Look for server and client cards
    console.log('\n4. Checking for cards...');

    // Check server cards
    const serverCards = await page.$$('.server-card');
    console.log(`   Found ${serverCards.length} server cards`);

    if (serverCards.length > 0) {
      const firstServer = await serverCards[0].boundingBox();
      console.log(`     First server card at: x=${Math.round(firstServer.x)}, y=${Math.round(firstServer.y)}`);
    }

    // Check client cards
    const clientCards = await page.$$('.client-card');
    console.log(`   Found ${clientCards.length} client cards`);

    if (clientCards.length > 0) {
      const firstClient = await clientCards[0].boundingBox();
      console.log(`     First client card at: x=${Math.round(firstClient.x)}, y=${Math.round(firstClient.y)}`);
    }

    // Test drag functionality
    console.log('\n5. Testing drag and drop...');
    if (serverCards.length > 0) {
      const serverCard = serverCards[0];
      const serverBox = await serverCard.boundingBox();

      // Find canvas
      const canvas = await page.$('#react-flow-wrapper');
      if (canvas) {
        const canvasBox = await canvas.boundingBox();

        console.log(`   Dragging from (${Math.round(serverBox.x + serverBox.width/2)}, ${Math.round(serverBox.y + serverBox.height/2)})`);
        console.log(`   To canvas at (${Math.round(canvasBox.x + canvasBox.width/2)}, ${Math.round(canvasBox.y + canvasBox.height/2)})`);

        // Perform drag
        await page.mouse.move(serverBox.x + serverBox.width/2, serverBox.y + serverBox.height/2);
        await page.mouse.down();
        await page.waitForTimeout(100);

        // Move in steps
        const steps = 10;
        const deltaX = (canvasBox.x + canvasBox.width/2 - serverBox.x - serverBox.width/2) / steps;
        const deltaY = (canvasBox.y + canvasBox.height/2 - serverBox.y - serverBox.height/2) / steps;

        for (let i = 1; i <= steps; i++) {
          await page.mouse.move(
            serverBox.x + serverBox.width/2 + deltaX * i,
            serverBox.y + serverBox.height/2 + deltaY * i
          );
          await page.waitForTimeout(50);
        }

        await page.mouse.up();
        await page.waitForTimeout(500);

        // Check if drag overlay appeared
        const dragOverlay = await page.$('[class*="DragOverlay"]');
        if (dragOverlay) {
          console.log('   ✓ Drag overlay detected');
        } else {
          console.log('   ✗ No drag overlay detected');
        }

        // Check for server nodes on canvas
        const serverNodes = await page.$$('.server-node');
        console.log(`   ${serverNodes.length} server nodes on canvas after drag`);
      }
    }

    // Test client selection
    console.log('\n6. Testing client selection...');
    if (clientCards.length > 0) {
      const clientCard = clientCards[0];
      const box = await clientCard.boundingBox();

      // Single click
      await page.mouse.click(box.x + box.width/2, box.y + box.height/2);
      await page.waitForTimeout(200);

      // Check if selected (should not be)
      const isSelectedSingle = await page.evaluate((card) => {
        return card.classList.contains('ring-2') && card.classList.contains('ring-primary');
      }, clientCard);

      console.log(`   Single click: ${isSelectedSingle ? '✗ Selected (incorrect)' : '✓ Not selected (correct)'}`);

      // Double click
      await page.mouse.click(box.x + box.width/2, box.y + box.height/2, { clickCount: 2 });
      await page.waitForTimeout(200);

      // Check if selected (should be)
      const isSelectedDouble = await page.evaluate((card) => {
        return card.classList.contains('ring-2') && card.classList.contains('ring-primary');
      }, clientCard);

      console.log(`   Double click: ${isSelectedDouble ? '✓ Selected (correct)' : '✗ Not selected (incorrect)'}`);
    }

    // Check for layout issues
    console.log('\n7. Checking for layout issues...');

    // Check viewport usage
    const viewport = await page.viewport();
    const workspace = await page.$('.visual-workspace');
    if (workspace) {
      const workspaceBox = await workspace.boundingBox();
      console.log(`   Viewport: ${viewport.width}x${viewport.height}`);
      console.log(`   Workspace: ${Math.round(workspaceBox.width)}x${Math.round(workspaceBox.height)}`);

      if (workspaceBox.height > viewport.height + 10) {
        console.log(`   ✗ Workspace exceeds viewport height`);
      } else {
        console.log(`   ✓ Workspace fits in viewport`);
      }
    }

    // Check for overlapping elements
    const performancePanel = await page.$('[class*="InsightsPanel"]');
    const controls = await page.$('.react-flow__controls');

    if (performancePanel && controls) {
      const perfBox = await performancePanel.boundingBox();
      const controlsBox = await controls.boundingBox();

      // Check if performance panel overlaps controls
      if (perfBox.y < controlsBox.y + controlsBox.height &&
          perfBox.x < controlsBox.x + controlsBox.width &&
          perfBox.x + perfBox.width > controlsBox.x) {
        console.log(`   ✗ Performance panel overlaps with controls`);
        console.log(`     Performance: y=${Math.round(perfBox.y)}`);
        console.log(`     Controls: y=${Math.round(controlsBox.y)}, height=${Math.round(controlsBox.height)}`);
      } else {
        console.log(`   ✓ No overlap detected`);
      }
    }

    // Check console for errors
    console.log('\n8. Checking for console errors...');
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Reload to catch any errors
    await page.reload({ waitUntil: 'networkidle2' });
    await page.waitForTimeout(2000);

    if (errors.length > 0) {
      console.log('   ✗ Console errors found:');
      errors.forEach(err => console.log(`     - ${err}`));
    } else {
      console.log('   ✓ No console errors');
    }

    // Take screenshot
    console.log('\n9. Taking screenshot...');
    await page.screenshot({
      path: 'visual-workspace-test.png',
      fullPage: true
    });
    console.log('   ✓ Screenshot saved as visual-workspace-test.png');

    console.log('\n✅ Testing complete!\n');

  } catch (error) {
    console.error('❌ Test failed:', error);

    // Take error screenshot
    await page.screenshot({
      path: 'visual-workspace-error.png',
      fullPage: true
    });
    console.log('📸 Error screenshot saved as visual-workspace-error.png');
  }

  // Keep browser open for manual inspection
  console.log('Browser will remain open for manual inspection. Press Ctrl+C to exit.');
  // await browser.close();
}

// Run the test
testVisualWorkspace().catch(console.error);