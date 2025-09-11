const { app, BrowserWindow } = require('electron');
const pie = require('puppeteer-in-electron');
const puppeteer = require('puppeteer-core');
const path = require('path');

// Initialize the app for testing
async function testProjectScope() {
  await pie.initialize(app);
  const browser = await pie.connect(app, puppeteer);

  // Create test window
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../../dist/main/preload.js')
    }
  });

  // Load the app
  const isDev = process.argv.includes('--dev');
  if (isDev) {
    await window.loadURL('http://localhost:5177');
  } else {
    await window.loadFile(path.join(__dirname, '../../dist/renderer/index.html'));
  }

  // Get Puppeteer page
  const page = await pie.getPage(browser, window);
  
  // Wait for app to load
  await page.waitForSelector('[data-theme="corporate"]', { timeout: 10000 });
  console.log('✓ App loaded successfully');

  // Test 1: Check if Kiro appears in client list
  await page.click('select.select-bordered');
  await page.waitForTimeout(500);
  
  const kiroOption = await page.$('option[value="kiro"]');
  if (kiroOption) {
    console.log('✓ Kiro found in client list');
    await page.select('select.select-bordered', 'kiro');
    await page.waitForTimeout(1000);
  } else {
    console.log('✗ Kiro NOT found in client list');
  }

  // Test 2: Switch to Project scope
  const projectButton = await page.$('button:has-text("Project")');
  if (projectButton) {
    await projectButton.click();
    console.log('✓ Switched to Project scope');
    await page.waitForTimeout(1000);
  }

  // Test 3: Check if project directory selector appears
  const projectDirSection = await page.$('text=/Project Directory/');
  if (projectDirSection) {
    console.log('✓ Project directory section visible');
    
    // Check current project directory
    const projectDirElement = await page.$('code.bg-base-100');
    if (projectDirElement) {
      const projectDir = await projectDirElement.innerText();
      console.log(`  Current project directory: ${projectDir || 'Not set'}`);
    }
  }

  // Test 4: Check config file path in status bar
  const configPathElement = await page.$('code.bg-base-100.px-2.py-1.rounded.text-xs');
  if (configPathElement) {
    const configPath = await configPathElement.innerText();
    console.log(`✓ Config file path: ${configPath}`);
    
    // Verify it's a project path when in project scope
    if (configPath.includes('.kiro/settings/mcp.json')) {
      console.log('  ✓ Showing project-specific config path');
    } else if (configPath.includes('/Users/briandawson/.kiro/settings/mcp.json')) {
      console.log('  ✗ Still showing user config path in project scope!');
    }
  }

  // Test 5: Check server list
  const serverRows = await page.$$('tbody tr');
  console.log(`✓ Found ${serverRows.length} servers`);

  // Test 6: Simulate selecting a project directory
  const selectDirButton = await page.$('button:has-text("Select Directory")');
  if (!selectDirButton) {
    const changeDirButton = await page.$('button:has-text("Change Directory")');
    if (changeDirButton) {
      console.log('✓ Change Directory button found (directory already selected)');
    }
  } else {
    console.log('✓ Select Directory button found');
  }

  // Print final state
  console.log('\n=== Test Summary ===');
  console.log('Project Scope Testing Complete');
  
  // Keep window open for manual inspection if needed
  if (process.argv.includes('--keep-open')) {
    console.log('Window kept open for inspection. Close manually to exit.');
  } else {
    await page.waitForTimeout(3000);
    window.close();
  }
}

// Run test when app is ready
app.whenReady().then(testProjectScope);

app.on('window-all-closed', () => {
  app.quit();
});