const { chromium } = require('playwright');

async function correctBug023Test() {
  console.log('🔍 CORRECT Bug-023 Test - Using CDP to connect to Electron\n');
  console.log('=' .repeat(60));

  let browser;
  let page;

  try {
    // CONNECT TO ELECTRON VIA CDP (Chrome DevTools Protocol)
    console.log('🔌 STEP 1: Connect to Electron app via CDP');
    console.log('   - Connecting to remote debugging port 9222...');

    browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
    const contexts = browser.contexts();

    if (contexts.length === 0) {
      throw new Error('No Electron contexts found. Make sure Electron is running with --remote-debugging-port=9222');
    }

    console.log(`   - Found ${contexts.length} context(s)`);
    const context = contexts[0];
    const pages = context.pages();

    if (pages.length === 0) {
      throw new Error('No pages found in Electron context');
    }

    page = pages[0];
    await page.waitForLoadState('networkidle');

    console.log(`   - Connected to Electron app successfully`);
    console.log(`   - Page title: "${await page.title()}"`);
    console.log(`   - Page URL: ${page.url()}`);
    console.log('   ✅ Connection established!\n');

    // Take initial screenshot of Electron app
    await page.screenshot({ path: '/tmp/bug023_electron_initial.png' });

    // STEP 2: Navigate to Visual Workspace
    console.log('📍 STEP 2: Navigate to Visual Workspace');

    // Check what's currently visible
    const bodyText = await page.locator('body').textContent();
    console.log(`   - Current page contains: "${bodyText.substring(0, 100)}..."`);

    // Look for navigation to Visual Workspace
    const navigationOptions = [
      'button:has-text("Visual Workspace")',
      'a:has-text("Visual Workspace")',
      'text=Visual Workspace',
      '[href*="visual"]',
      '.visual-workspace-link',
      'nav button:has-text("Visual")',
      'li:has-text("Visual")'
    ];

    let navigatedToVisual = false;
    for (const selector of navigationOptions) {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log(`   - Found Visual Workspace navigation: ${selector}`);
        await element.click();
        await page.waitForTimeout(2000);
        navigatedToVisual = true;
        break;
      }
    }

    if (!navigatedToVisual) {
      console.log('   - No Visual Workspace navigation found, checking if already there...');
    }

    await page.screenshot({ path: '/tmp/bug023_electron_after_nav.png' });

    // STEP 3: Identify Visual Workspace Components
    console.log('\n🔍 STEP 3: Identify Visual Workspace Components');

    const componentChecks = {
      'React Flow Canvas': '.react-flow, .react-flow__viewport',
      'Server Library Panel': '.server-library, [data-testid="server-library"]',
      'Client Dock': '.client-dock, [data-testid="client-dock"]',
      'Visual Workspace Save Button': 'button:has-text("Save Workspace")',
      'Any Save Button': 'button:has-text("Save")',
      'Draggable Servers': '[draggable="true"]',
      'Canvas Nodes': '.react-flow__node',
      'Toolbar': '.toolbar, .react-flow__controls'
    };

    console.log('\n   Component Analysis:');
    const foundComponents = {};

    for (const [name, selector] of Object.entries(componentChecks)) {
      const elements = page.locator(selector);
      const count = await elements.count();
      const isVisible = count > 0 && await elements.first().isVisible().catch(() => false);
      foundComponents[name] = { count, isVisible };

      console.log(`   - ${name}: ${count} found, ${isVisible ? 'visible' : 'not visible'}`);

      if (name === 'Any Save Button' && count > 0) {
        // Get details about save buttons
        const buttons = await elements.all();
        for (let i = 0; i < Math.min(buttons.length, 3); i++) {
          const text = await buttons[i].textContent().catch(() => 'N/A');
          const disabled = await buttons[i].isDisabled().catch(() => 'unknown');
          console.log(`     • Button ${i+1}: "${text}" (disabled: ${disabled})`);
        }
      }
    }

    // STEP 4: Test Save Button Functionality (if found)
    console.log('\n🧪 STEP 4: Test Save Button Functionality');

    const saveButtons = page.locator('button:has-text("Save")');
    const saveButtonCount = await saveButtons.count();

    if (saveButtonCount > 0) {
      console.log(`   - Found ${saveButtonCount} save button(s)`);

      // Focus on workspace-specific save button
      const workspaceSaveBtn = page.locator('button:has-text("Save Workspace")').first();
      const regularSaveBtn = saveButtons.first();

      let targetButton = null;
      if (await workspaceSaveBtn.isVisible().catch(() => false)) {
        targetButton = workspaceSaveBtn;
        console.log('   - Using "Save Workspace" button for testing');
      } else {
        targetButton = regularSaveBtn;
        console.log('   - Using first "Save" button for testing');
      }

      // Test initial state
      const initialDisabled = await targetButton.isDisabled();
      const initialText = await targetButton.textContent();
      console.log(`   - Initial state: "${initialText}" (disabled: ${initialDisabled})`);

      // STEP 5: Test Drag and Drop (if components exist)
      console.log('\n🧪 STEP 5: Test Drag and Drop');

      const draggableElements = page.locator('[draggable="true"]');
      const draggableCount = await draggableElements.count();

      if (draggableCount > 0) {
        console.log(`   - Found ${draggableCount} draggable element(s)`);

        const canvas = page.locator('.react-flow__viewport, .canvas, [data-testid="canvas"]').first();
        if (await canvas.isVisible().catch(() => false)) {
          console.log('   - Canvas found, attempting drag and drop...');

          const firstDraggable = draggableElements.first();
          const draggableText = await firstDraggable.textContent();
          console.log(`   - Dragging: "${draggableText}"`);

          // Perform drag operation
          const sourceBox = await firstDraggable.boundingBox();
          const canvasBox = await canvas.boundingBox();

          if (sourceBox && canvasBox) {
            // Drag from source to canvas center
            await page.mouse.move(sourceBox.x + sourceBox.width/2, sourceBox.y + sourceBox.height/2);
            await page.mouse.down();
            await page.waitForTimeout(100);

            await page.mouse.move(canvasBox.x + canvasBox.width/2, canvasBox.y + canvasBox.height/2, {steps: 10});
            await page.waitForTimeout(100);

            await page.mouse.up();
            await page.waitForTimeout(1000);

            console.log('   ✅ Drag and drop completed');

            // Check save button state after drag
            const afterDragDisabled = await targetButton.isDisabled();
            const afterDragText = await targetButton.textContent();

            console.log(`\n   Save Button After Drag:`);
            console.log(`   - Text: "${afterDragText}"`);
            console.log(`   - Disabled: ${afterDragDisabled}`);
            console.log(`   - Has unsaved indicator (*): ${afterDragText.includes('*')}`);
            console.log(`   - Expected: Should be enabled after adding content`);

            if (initialDisabled && !afterDragDisabled) {
              console.log('   ✅ PASS: Save button enabled after drag');
            } else if (!initialDisabled && !afterDragDisabled) {
              console.log('   ⚠️ UNCLEAR: Button was already enabled');
            } else {
              console.log('   ❌ FAIL: Save button did not enable after drag');
            }

          } else {
            console.log('   ❌ Could not get bounding boxes for drag operation');
          }
        } else {
          console.log('   ❌ No canvas found for drag target');
        }
      } else {
        console.log('   ❌ No draggable elements found');
      }

    } else {
      console.log('   ❌ No save buttons found');
    }

    await page.screenshot({ path: '/tmp/bug023_electron_final.png' });

    // FINAL VERDICT
    console.log('\n' + '=' .repeat(60));
    console.log('📊 FINAL TEST RESULTS\n');

    console.log('Connection: ✅ Successfully connected to Electron app');
    console.log(`Visual Workspace Components Found: ${Object.values(foundComponents).filter(c => c.isVisible).length}`);
    console.log(`Save Buttons Found: ${saveButtonCount}`);
    console.log(`Draggable Elements: ${foundComponents['Draggable Servers']?.count || 0}`);

    console.log('\nBug-023 Assessment:');
    if (saveButtonCount === 0) {
      console.log('❌ FAILED: No save buttons found');
    } else if (!foundComponents['Draggable Servers']?.count) {
      console.log('❌ FAILED: No draggable servers for testing');
    } else if (!foundComponents['React Flow Canvas']?.isVisible) {
      console.log('❌ FAILED: Visual Workspace canvas not found');
    } else {
      console.log('🔍 MANUAL VERIFICATION NEEDED: Components found, drag test completed');
    }

    console.log('\nScreenshots saved:');
    console.log('  - /tmp/bug023_electron_initial.png');
    console.log('  - /tmp/bug023_electron_after_nav.png');
    console.log('  - /tmp/bug023_electron_final.png');

  } catch (error) {
    console.error('\n❌ TEST FAILED:');
    console.error(`   Error: ${error.message}`);

    if (page) {
      await page.screenshot({ path: '/tmp/bug023_electron_error.png' });
      console.log('   Error screenshot: /tmp/bug023_electron_error.png');
    }

    throw error;

  } finally {
    // Don't close the browser as it's the actual Electron app
    console.log('\n✨ Test completed - Electron app left running');
    console.log('=' .repeat(60));
  }
}

// Run the test
correctBug023Test()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));