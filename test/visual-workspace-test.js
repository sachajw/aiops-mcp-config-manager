const { app, BrowserWindow } = require('electron');
const path = require('path');
const puppeteer = require('puppeteer-core');

// Wait for app to be ready
let mainWindow;
let browser;
let page;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    }
  });

  // Load the app
  await mainWindow.loadURL('http://localhost:5173');

  // Wait for window to be ready
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Connect Puppeteer to the Electron app
  const port = process.env.PUPPETEER_DEBUG_PORT || '9222';
  browser = await puppeteer.connect({
    browserURL: `http://localhost:${port}`,
    defaultViewport: null
  });

  // Get the page
  const pages = await browser.pages();
  page = pages[0] || await browser.newPage();

  // Navigate to visual workspace
  await testVisualWorkspace();
}

async function testVisualWorkspace() {
  console.log('🧪 Starting Visual Workspace Tests...\n');

  try {
    // 1. Navigate to Visual Workspace
    console.log('1. Navigating to Visual Workspace...');
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(1000);

    // Check if we need to switch to visual mode
    const visualButton = await page.$('button:has-text("Visual")');
    if (visualButton) {
      await visualButton.click();
      console.log('   ✓ Switched to Visual mode');
    }

    // 2. Check for main components
    console.log('\n2. Checking main components...');
    const components = {
      'Server Library': '.visual-workspace .server-card',
      'Client Dock': '.visual-workspace .client-card',
      'Canvas': '#react-flow-wrapper',
      'Performance Panel': '.visual-workspace [class*="InsightsPanel"]'
    };

    for (const [name, selector] of Object.entries(components)) {
      const element = await page.$(selector);
      if (element) {
        console.log(`   ✓ ${name} found`);
      } else {
        console.log(`   ✗ ${name} NOT FOUND - Selector: ${selector}`);
      }
    }

    // 3. Test Server Drag and Drop
    console.log('\n3. Testing Server Drag and Drop...');
    const serverCard = await page.$('.server-card');
    if (serverCard) {
      const serverBox = await serverCard.boundingBox();
      const canvas = await page.$('#react-flow-wrapper');
      const canvasBox = await canvas.boundingBox();

      console.log(`   Server position: x=${serverBox.x}, y=${serverBox.y}`);
      console.log(`   Canvas position: x=${canvasBox.x}, y=${canvasBox.y}`);

      // Simulate drag
      await page.mouse.move(serverBox.x + serverBox.width / 2, serverBox.y + serverBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2, { steps: 10 });
      await page.mouse.up();
      await page.waitForTimeout(500);

      // Check if node was added
      const serverNode = await page.$('.server-node');
      if (serverNode) {
        console.log('   ✓ Server node added to canvas');
      } else {
        console.log('   ✗ Server node NOT added to canvas');
      }
    } else {
      console.log('   ✗ No server cards found to test drag');
    }

    // 4. Test Client Selection
    console.log('\n4. Testing Client Selection...');
    const clientCards = await page.$$('.client-card');
    console.log(`   Found ${clientCards.length} client cards`);

    if (clientCards.length > 0) {
      const firstClient = clientCards[0];
      const clientBox = await firstClient.boundingBox();

      // Test single click (should not select)
      await page.mouse.click(clientBox.x + clientBox.width / 2, clientBox.y + clientBox.height / 2);
      await page.waitForTimeout(200);
      const activeAfterSingle = await page.$('.client-card.ring-2.ring-primary');
      if (!activeAfterSingle) {
        console.log('   ✓ Single click does not select client');
      } else {
        console.log('   ✗ Single click incorrectly selects client');
      }

      // Test double click (should select)
      await page.mouse.click(clientBox.x + clientBox.width / 2, clientBox.y + clientBox.height / 2, { clickCount: 2 });
      await page.waitForTimeout(200);
      const activeAfterDouble = await page.$('.client-card.ring-2.ring-primary');
      if (activeAfterDouble) {
        console.log('   ✓ Double click selects client');
      } else {
        console.log('   ✗ Double click does not select client');
      }
    }

    // 5. Check Layout Issues
    console.log('\n5. Checking for Layout Issues...');

    // Check for overlapping elements
    const performancePanel = await page.$('[class*="InsightsPanel"]');
    const controls = await page.$('.react-flow__controls');

    if (performancePanel && controls) {
      const perfBox = await performancePanel.boundingBox();
      const controlsBox = await controls.boundingBox();

      const overlapping = perfBox.y < (controlsBox.y + controlsBox.height);
      if (overlapping) {
        console.log(`   ✗ Performance panel overlaps controls`);
      } else {
        console.log(`   ✓ No overlap between performance panel and controls`);
      }
    }

    // Check for proper spacing
    const workspace = await page.$('.visual-workspace');
    const workspaceBox = await workspace.boundingBox();
    const viewport = await page.viewport();

    if (workspaceBox.height > viewport.height) {
      console.log(`   ✗ Workspace height (${workspaceBox.height}px) exceeds viewport (${viewport.height}px)`);
    } else {
      console.log(`   ✓ Workspace fits within viewport`);
    }

    // 6. Test Auto-save Toggle
    console.log('\n6. Testing Auto-save Toggle...');
    const autoSaveCheckbox = await page.$('input[type="checkbox"]');
    if (autoSaveCheckbox) {
      const isChecked = await page.$eval('input[type="checkbox"]', el => el.checked);
      console.log(`   Auto-save is ${isChecked ? 'enabled' : 'disabled'}`);

      await autoSaveCheckbox.click();
      await page.waitForTimeout(200);

      const saveButton = await page.$('button:has-text("Save Configuration")');
      if (saveButton && !isChecked) {
        console.log('   ✓ Save button appears when auto-save is disabled');
      } else if (!saveButton && isChecked) {
        console.log('   ✓ Save button hidden when auto-save is enabled');
      } else {
        console.log('   ✗ Save button visibility incorrect');
      }
    }

    // 7. Check for Console Errors
    console.log('\n7. Checking for Console Errors...');
    const logs = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        logs.push(msg.text());
      }
    });

    await page.reload();
    await page.waitForTimeout(2000);

    if (logs.length > 0) {
      console.log('   ✗ Console errors found:');
      logs.forEach(log => console.log(`     - ${log}`));
    } else {
      console.log('   ✓ No console errors');
    }

    // 8. Test Drag Overlay
    console.log('\n8. Testing Drag Overlay...');
    const serverForDrag = await page.$('.server-card');
    if (serverForDrag) {
      const box = await serverForDrag.boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + 100, box.y + 100, { steps: 5 });

      // Check for drag overlay
      const dragOverlay = await page.$('[class*="DragOverlay"]');
      if (dragOverlay) {
        const overlayText = await page.$eval('[class*="DragOverlay"]', el => el.textContent);
        console.log(`   ✓ Drag overlay shown with text: "${overlayText}"`);
      } else {
        console.log('   ✗ Drag overlay not visible during drag');
      }

      await page.mouse.up();
    }

    console.log('\n✅ Visual Workspace Testing Complete!\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }

  // Take a screenshot for review
  await page.screenshot({ path: 'visual-workspace-test.png', fullPage: true });
  console.log('📸 Screenshot saved as visual-workspace-test.png');
}

// Start the app
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});