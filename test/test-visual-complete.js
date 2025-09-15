const puppeteer = require('puppeteer');

async function testVisualWorkspace() {
  console.log('🔧 Complete Visual Workspace Test\n');

  const browser = await puppeteer.launch({
    headless: false,  // Show browser for debugging
    devtools: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1400, height: 900 }
  });

  try {
    const page = await browser.newPage();

    // Navigate to app
    console.log('1. Loading app...');
    await page.goto('http://localhost:5175', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));

    // Enable Visual Workspace in settings
    console.log('2. Enabling Visual Workspace in settings...');
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
    await page.reload({ waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1500));

    // Click Get Started if present
    const getStartedBtn = await page.$('button:has-text("Get Started")');
    if (getStartedBtn) {
      console.log('3. Clicking Get Started...');
      await getStartedBtn.click();
      await new Promise(r => setTimeout(r, 1000));
    }

    // Look for Visual button
    console.log('4. Looking for Visual button...');
    const visualBtn = await page.evaluateHandle(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(b => b.title === 'Visual Workspace' || b.textContent.includes('Visual'));
    });

    if (visualBtn && visualBtn.asElement()) {
      console.log('   Found Visual button, clicking...');
      await visualBtn.click();
      await new Promise(r => setTimeout(r, 2000));
    } else {
      console.log('   Visual button not found');
    }

    // Check if Visual Workspace loaded
    console.log('\n5. Checking Visual Workspace components...');
    const components = {
      'Workspace Container': '.visual-workspace',
      'Server Library': '[class*="ServerLibrary"]',
      'Client Dock': '[class*="ClientDock"]',
      'Canvas': '#react-flow-wrapper',
      'Performance Panel': '[class*="InsightsPanel"]'
    };

    for (const [name, selector] of Object.entries(components)) {
      const element = await page.$(selector);
      if (element) {
        const box = await element.boundingBox();
        console.log(`   ✓ ${name} - Position: (${Math.round(box.x)}, ${Math.round(box.y)}), Size: ${Math.round(box.width)}x${Math.round(box.height)}`);
      } else {
        console.log(`   ✗ ${name} not found`);
      }
    }

    // Test drag functionality
    console.log('\n6. Testing drag and drop...');

    // Find server cards
    const serverCards = await page.$$('.server-card');
    console.log(`   Found ${serverCards.length} server cards`);

    if (serverCards.length > 0) {
      const serverCard = serverCards[0];
      const serverBox = await serverCard.boundingBox();

      // Find canvas
      const canvas = await page.$('#react-flow-wrapper');
      if (canvas) {
        const canvasBox = await canvas.boundingBox();

        console.log(`   Dragging server from (${Math.round(serverBox.x)}, ${Math.round(serverBox.y)})`);
        console.log(`   To canvas at (${Math.round(canvasBox.x + 300)}, ${Math.round(canvasBox.y + 200)})`);

        // Perform drag
        await page.mouse.move(serverBox.x + serverBox.width/2, serverBox.y + serverBox.height/2);
        await page.mouse.down();

        // Move slowly to trigger drag
        for (let i = 0; i <= 10; i++) {
          const x = serverBox.x + serverBox.width/2 + (canvasBox.x + 300 - serverBox.x - serverBox.width/2) * i / 10;
          const y = serverBox.y + serverBox.height/2 + (canvasBox.y + 200 - serverBox.y - serverBox.height/2) * i / 10;
          await page.mouse.move(x, y);
          await new Promise(r => setTimeout(r, 50));
        }

        await page.mouse.up();
        await new Promise(r => setTimeout(r, 1000));

        // Check if node was added
        const serverNodes = await page.$$('.server-node');
        console.log(`   Server nodes on canvas: ${serverNodes.length}`);

        if (serverNodes.length === 0) {
          console.log('   ⚠️  Drag did not create server node - checking for issues...');

          // Check if drag overlay appeared
          const hadOverlay = await page.evaluate(() => {
            return document.querySelector('[class*="DragOverlay"]') !== null;
          });
          console.log(`   Drag overlay appeared: ${hadOverlay}`);
        }
      }
    }

    // Test client selection
    console.log('\n7. Testing client selection...');
    const clientCards = await page.$$('.client-card');
    console.log(`   Found ${clientCards.length} client cards`);

    if (clientCards.length > 0) {
      const clientCard = clientCards[0];
      const box = await clientCard.boundingBox();

      // Test single click
      await page.mouse.click(box.x + box.width/2, box.y + box.height/2);
      await new Promise(r => setTimeout(r, 300));

      const selectedAfterSingle = await page.evaluate(() => {
        const cards = document.querySelectorAll('.client-card');
        return Array.from(cards).some(c => c.classList.contains('ring-2') && c.classList.contains('ring-primary'));
      });
      console.log(`   Single click selects: ${selectedAfterSingle} (should be false)`);

      // Test double click
      await page.mouse.click(box.x + box.width/2, box.y + box.height/2, { clickCount: 2 });
      await new Promise(r => setTimeout(r, 300));

      const selectedAfterDouble = await page.evaluate(() => {
        const cards = document.querySelectorAll('.client-card');
        return Array.from(cards).some(c => c.classList.contains('ring-2') && c.classList.contains('ring-primary'));
      });
      console.log(`   Double click selects: ${selectedAfterDouble} (should be true)`);
    }

    // Check for layout issues
    console.log('\n8. Checking for layout issues...');

    const perfPanel = await page.$('[class*="InsightsPanel"]');
    const controls = await page.$('.react-flow__controls');

    if (perfPanel && controls) {
      const perfBox = await perfPanel.boundingBox();
      const controlsBox = await controls.boundingBox();

      const overlapping = (perfBox.y < controlsBox.y + controlsBox.height) &&
                          (perfBox.x < controlsBox.x + controlsBox.width) &&
                          (perfBox.x + perfBox.width > controlsBox.x);

      if (overlapping) {
        console.log(`   ✗ Performance panel overlaps controls`);
        console.log(`     Performance Y: ${Math.round(perfBox.y)}, Controls Y+Height: ${Math.round(controlsBox.y + controlsBox.height)}`);
      } else {
        console.log(`   ✓ No overlap between panels`);
      }
    }

    // Check auto-save toggle
    console.log('\n9. Testing auto-save toggle...');
    const autoSaveCheckbox = await page.$('input[type="checkbox"]');
    if (autoSaveCheckbox) {
      const checked = await page.evaluate(el => el.checked, autoSaveCheckbox);
      console.log(`   Auto-save is ${checked ? 'enabled' : 'disabled'}`);

      await autoSaveCheckbox.click();
      await new Promise(r => setTimeout(r, 300));

      const saveBtn = await page.$('button:has-text("Save Configuration")');
      console.log(`   Save button visible: ${saveBtn !== null}`);
    }

    // Take screenshot
    console.log('\n10. Taking screenshot...');
    await page.screenshot({ path: 'visual-workspace-complete.png', fullPage: true });
    console.log('    Screenshot saved as visual-workspace-complete.png');

    console.log('\n✅ Test complete!');
    console.log('\n🔍 Summary of Issues Found:');

    // Summarize issues
    const issues = [];
    if (serverCards.length > 0) {
      const nodes = await page.$$('.server-node');
      if (nodes.length === 0) {
        issues.push('- Server drag and drop not creating nodes on canvas');
      }
    }

    if (issues.length > 0) {
      issues.forEach(issue => console.log(issue));
    } else {
      console.log('   No critical issues found');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }

  console.log('\nBrowser will remain open for manual inspection. Press Ctrl+C to close.');
  // Don't close browser for manual inspection
}

testVisualWorkspace().catch(console.error);