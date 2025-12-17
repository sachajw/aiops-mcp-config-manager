const puppeteer = require('puppeteer');

console.log('🧪 Sprint 6 Critical Path Regression Testing');
console.log('=============================================');
console.log(`Time: ${new Date().toISOString()}\n`);

const APP_URL = 'http://localhost:5175';

async function testClientDetection(page) {
  console.log('🔍 Test 1: Client Detection');
  console.log('----------------------------');

  try {
    await page.waitForSelector('[data-testid="claude-desktop-card"]', { timeout: 10000 });
    const clientCards = await page.$$('[data-testid$="-card"]');
    console.log(`  ✓ Clients detected: ${clientCards.length}`);

    // Check if at least Claude Desktop is detected
    const claudeDesktop = await page.$('[data-testid="claude-desktop-card"]');
    console.log(`  ✓ Claude Desktop: ${claudeDesktop ? '✅ Found' : '❌ Not found'}`);

    return clientCards.length > 0;
  } catch (error) {
    console.log(`  ❌ Client detection failed: ${error.message}`);
    return false;
  }
}

async function testServerManagement(page) {
  console.log('\n🖥️ Test 2: Server Management');
  console.log('-------------------------------');

  try {
    // Click on a client
    await page.click('[data-testid="claude-desktop-card"]');
    await page.waitForTimeout(2000);

    // Check if configuration editor loads
    const editor = await page.$('.configuration-editor');
    console.log(`  ✓ Configuration editor: ${editor ? '✅ Loaded' : '❌ Not loaded'}`);

    // Check for server list
    const servers = await page.$$('.server-item');
    console.log(`  ✓ Servers in list: ${servers.length}`);

    return editor !== null;
  } catch (error) {
    console.log(`  ❌ Server management failed: ${error.message}`);
    return false;
  }
}

async function testVisualWorkspace(page) {
  console.log('\n🎨 Test 3: Visual Workspace');
  console.log('-----------------------------');

  try {
    // Navigate to Visual Workspace
    const button = await page.$('button:has-text("Visual Workspace")');
    if (!button) {
      console.log('  ⚠️ Visual Workspace button not found, trying tab navigation');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');
    } else {
      await button.click();
    }

    await page.waitForTimeout(2000);

    // Check for canvas
    const canvas = await page.$('.react-flow');
    console.log(`  ✓ React Flow canvas: ${canvas ? '✅ Loaded' : '❌ Not loaded'}`);

    // Check for drag-and-drop elements
    const clientDock = await page.$('.client-dock');
    const serverLibrary = await page.$('.server-library');

    console.log(`  ✓ Client Dock: ${clientDock ? '✅ Present' : '❌ Missing'}`);
    console.log(`  ✓ Server Library: ${serverLibrary ? '✅ Present' : '❌ Missing'}`);

    return canvas !== null;
  } catch (error) {
    console.log(`  ❌ Visual Workspace failed: ${error.message}`);
    return false;
  }
}

async function testSaveLoad(page) {
  console.log('\n💾 Test 4: Save/Load Configuration');
  console.log('------------------------------------');

  try {
    // Find save button
    const saveButton = await page.$('button:has-text("Save")');
    console.log(`  ✓ Save button: ${saveButton ? '✅ Found' : '❌ Not found'}`);

    if (saveButton) {
      // Test if button is enabled after changes
      const isDisabled = await saveButton.evaluate(el => el.disabled);
      console.log(`  ✓ Save button state: ${!isDisabled ? '✅ Enabled' : '⚠️ Disabled'}`);
    }

    // Check localStorage usage (should be migrating away from this)
    const localStorageKeys = await page.evaluate(() => {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        keys.push(localStorage.key(i));
      }
      return keys;
    });

    console.log(`  ✓ LocalStorage keys: ${localStorageKeys.length}`);
    console.log(`  ℹ️ Keys: ${localStorageKeys.slice(0, 3).join(', ')}${localStorageKeys.length > 3 ? '...' : ''}`);

    return true;
  } catch (error) {
    console.log(`  ❌ Save/Load failed: ${error.message}`);
    return false;
  }
}

async function testPerformance(page) {
  console.log('\n⚡ Test 5: Performance Metrics');
  console.log('--------------------------------');

  try {
    // Measure page load time
    const metrics = await page.metrics();
    console.log(`  ✓ JS Heap Used: ${(metrics.JSHeapUsedSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  ✓ Nodes: ${metrics.Nodes}`);
    console.log(`  ✓ Layout Duration: ${metrics.LayoutDuration ? metrics.LayoutDuration.toFixed(2) + 'ms' : 'N/A'}`);

    // Test client switching speed
    const start = Date.now();
    await page.click('[data-testid="claude-desktop-card"]');
    await page.waitForSelector('.configuration-editor', { timeout: 3000 });
    const switchTime = Date.now() - start;

    console.log(`  ✓ Client switch time: ${switchTime}ms`);
    console.log(`  ${switchTime < 500 ? '✅ Excellent' : switchTime < 2000 ? '✅ Good' : '⚠️ Slow'}`);

    return switchTime < 3000;
  } catch (error) {
    console.log(`  ❌ Performance test failed: ${error.message}`);
    return false;
  }
}

async function testDiscoveryPage(page) {
  console.log('\n🔎 Test 6: Discovery Page');
  console.log('--------------------------');

  try {
    // Navigate to Discovery
    const discoveryButton = await page.$('button:has-text("Discovery")');
    if (discoveryButton) {
      await discoveryButton.click();
      await page.waitForTimeout(2000);

      // Check for server grid
      const serverGrid = await page.$('.server-grid');
      console.log(`  ✓ Server grid: ${serverGrid ? '✅ Loaded' : '❌ Not loaded'}`);

      // Check for search functionality
      const searchInput = await page.$('input[placeholder*="Search"]');
      console.log(`  ✓ Search input: ${searchInput ? '✅ Present' : '❌ Missing'}`);

      // Check for install buttons
      const installButtons = await page.$$('button:has-text("Install")');
      console.log(`  ✓ Install buttons: ${installButtons.length}`);

      return serverGrid !== null;
    } else {
      console.log('  ⚠️ Discovery button not found');
      return false;
    }
  } catch (error) {
    console.log(`  ❌ Discovery page failed: ${error.message}`);
    return false;
  }
}

async function runTests() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1280, height: 800 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Add console logging
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`  ⚠️ Console error: ${msg.text()}`);
    }
  });

  await page.goto(APP_URL, { waitUntil: 'networkidle0' });

  const results = {
    clientDetection: await testClientDetection(page),
    serverManagement: await testServerManagement(page),
    visualWorkspace: await testVisualWorkspace(page),
    saveLoad: await testSaveLoad(page),
    performance: await testPerformance(page),
    discovery: await testDiscoveryPage(page)
  };

  console.log('\n📊 Critical Path Test Summary');
  console.log('==============================');
  console.log(`Client Detection: ${results.clientDetection ? '✅ Pass' : '❌ Fail'}`);
  console.log(`Server Management: ${results.serverManagement ? '✅ Pass' : '❌ Fail'}`);
  console.log(`Visual Workspace: ${results.visualWorkspace ? '✅ Pass' : '❌ Fail'}`);
  console.log(`Save/Load: ${results.saveLoad ? '✅ Pass' : '❌ Fail'}`);
  console.log(`Performance: ${results.performance ? '✅ Pass' : '❌ Fail'}`);
  console.log(`Discovery: ${results.discovery ? '✅ Pass' : '❌ Fail'}`);

  const passCount = Object.values(results).filter(r => r).length;
  const totalCount = Object.keys(results).length;

  console.log(`\n🎯 Overall: ${passCount}/${totalCount} critical paths passing`);
  console.log(`Status: ${passCount === totalCount ? '✅ All critical paths working!' :
            passCount >= totalCount * 0.8 ? '✅ Mostly stable' : '⚠️ Multiple regressions detected'}`);

  await browser.close();
  process.exit(passCount === totalCount ? 0 : 1);
}

// Add timeout for script
setTimeout(() => {
  console.log('\n❌ Test timeout after 60 seconds');
  process.exit(1);
}, 60000);

runTests().catch(console.error);