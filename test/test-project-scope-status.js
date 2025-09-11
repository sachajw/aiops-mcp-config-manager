const puppeteer = require('puppeteer-core');

async function testProjectScopeStatus() {
  console.log('Starting Project Scope Status Bar Test...\n');
  
  try {
    // Connect to Chrome
    const browser = await puppeteer.launch({
      headless: false,
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Find the correct port by checking multiple possibilities
    let port = 5175;
    let connected = false;
    
    for (let p of [5175, 5176, 5177, 5178]) {
      try {
        await page.goto(`http://localhost:${p}`, { waitUntil: 'networkidle0', timeout: 5000 });
        console.log(`✓ Connected to app on port ${p}`);
        port = p;
        connected = true;
        break;
      } catch (e) {
        console.log(`  Port ${p} failed, trying next...`);
      }
    }
    
    if (!connected) {
      throw new Error('Could not connect to app on any port');
    }
    
    // Wait for app to load
    await page.waitForSelector('.min-h-screen', { timeout: 5000 });
    console.log('✓ App loaded');
    
    // Check if we need to click Get Started
    const buttons = await page.$$('button');
    for (const button of buttons) {
      const text = await page.evaluate(el => el.textContent, button);
      if (text && text.includes('Get Started')) {
        await button.click();
        console.log('✓ Clicked Get Started');
        await new Promise(r => setTimeout(r, 2000));
        break;
      }
    }
    
    // Wait for and select Kiro client
    await page.waitForSelector('select', { timeout: 5000 });
    
    // Check available clients
    const clients = await page.$$eval('select option', options => 
      options.map(opt => ({ value: opt.value, text: opt.textContent }))
    );
    console.log('\n📋 Available clients:', clients.map(c => c.text).join(', '));
    
    // Select Kiro if available
    const hasKiro = clients.some(c => c.value === 'kiro');
    if (!hasKiro) {
      console.log('❌ Kiro not found in client list!');
      await browser.close();
      return;
    }
    
    await page.select('select', 'kiro');
    console.log('✓ Selected Kiro client');
    await new Promise(r => setTimeout(r, 1500));
    
    // STEP 1: Check User scope (default)
    console.log('\n=== TESTING USER SCOPE ===');
    
    // Get config path from status bar
    let configPath = await page.$$eval('code', codes => {
      const configCode = codes.find(code => {
        const text = code.textContent || '';
        return text.includes('.json') || text === 'Not found';
      });
      return configCode ? configCode.textContent : null;
    });
    console.log('📍 User scope config path:', configPath);
    
    // Count servers in User scope
    let serverRows = await page.$$('tbody tr');
    console.log(`📊 User scope servers: ${serverRows.length}`);
    
    // Get first few server names
    if (serverRows.length > 0) {
      const serverNames = await page.$$eval('tbody tr td:first-child', cells => 
        cells.slice(0, 3).map(cell => cell.textContent?.trim())
      );
      console.log('   First servers:', serverNames.join(', '));
    }
    
    // STEP 2: Switch to Project scope
    console.log('\n=== SWITCHING TO PROJECT SCOPE ===');
    
    // Find and click Project button
    const scopeButtons = await page.$$('button');
    let projectClicked = false;
    for (const button of scopeButtons) {
      const text = await page.evaluate(el => el.textContent?.trim(), button);
      if (text === 'Project') {
        await button.click();
        console.log('✓ Clicked Project scope button');
        projectClicked = true;
        await new Promise(r => setTimeout(r, 2000));
        break;
      }
    }
    
    if (!projectClicked) {
      console.log('❌ Could not find Project button!');
    }
    
    // STEP 3: Check Project scope WITHOUT directory
    console.log('\n=== PROJECT SCOPE (No Directory) ===');
    
    // Get config path
    configPath = await page.$$eval('code', codes => {
      const configCode = codes.find(code => {
        const text = code.textContent || '';
        return text.includes('.json') || text === 'Not found';
      });
      return configCode ? configCode.textContent : null;
    });
    console.log('📍 Project scope config path (no dir):', configPath);
    
    // Check if it's showing "Not found" or still showing user config
    if (configPath && configPath.includes('/Users/briandawson/.kiro/settings/mcp.json')) {
      console.log('   ⚠️  WARNING: Still showing USER config path in PROJECT scope!');
    } else if (configPath === 'Not found') {
      console.log('   ✓ Correctly showing "Not found" for project with no directory');
    }
    
    // Count servers
    serverRows = await page.$$('tbody tr');
    console.log(`📊 Project scope servers (no dir): ${serverRows.length}`);
    
    if (serverRows.length > 0) {
      console.log('   ⚠️  WARNING: Showing servers when none should be present!');
      const serverNames = await page.$$eval('tbody tr td:first-child', cells => 
        cells.slice(0, 3).map(cell => cell.textContent?.trim())
      );
      console.log('   Servers shown:', serverNames.join(', '));
    } else {
      console.log('   ✓ Correctly showing no servers');
    }
    
    // STEP 4: Check if project directory is shown
    const projectDirVisible = await page.$eval('body', body => 
      body.textContent?.includes('Project Directory:')
    );
    console.log('\n📁 Project directory section visible:', projectDirVisible ? 'Yes' : 'No');
    
    // Try to get current project directory
    const projectDirElements = await page.$$('code');
    for (const code of projectDirElements) {
      const text = await page.evaluate(el => el.textContent, code);
      if (text && text.includes('/Users/briandawson/workspace')) {
        console.log(`   Current directory: ${text}`);
      }
    }
    
    // STEP 5: Take screenshot for visual inspection
    await page.screenshot({ path: 'test-project-scope-status.png', fullPage: true });
    console.log('\n📸 Screenshot saved as test-project-scope-status.png');
    
    // STEP 6: Check localStorage
    const localStorageData = await page.evaluate(() => {
      return {
        projectDir: localStorage.getItem('mcp-project-directory'),
        activeScope: localStorage.getItem('mcp-active-scope')
      };
    });
    console.log('\n💾 LocalStorage:');
    console.log('   Project directory:', localStorageData.projectDir || 'Not set');
    console.log('   Active scope:', localStorageData.activeScope || 'Not set');
    
    console.log('\n=== Test Complete ===');
    console.log('\n⚠️  Issues to fix:');
    if (configPath && configPath.includes('/Users/briandawson/.kiro/settings/mcp.json')) {
      console.log('1. Status bar shows USER config path in PROJECT scope');
    }
    if (serverRows.length > 0 && !localStorageData.projectDir) {
      console.log('2. Servers from USER scope shown in PROJECT scope');
    }
    
    // Keep browser open for manual inspection
    console.log('\n🔍 Browser kept open for inspection. Close manually when done.');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testProjectScopeStatus();