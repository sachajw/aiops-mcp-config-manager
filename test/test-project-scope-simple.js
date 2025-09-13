const puppeteer = require('puppeteer-core');

async function testProjectScope() {
  console.log('Starting Project Scope Test...\n');
  
  try {
    // Connect to the running Electron app's dev server
    const browser = await puppeteer.launch({
      headless: false,
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    });
    
    const page = await browser.newPage();
    await page.goto('http://localhost:5178');
    
    // Wait for app to load
    await page.waitForSelector('.min-h-screen', { timeout: 5000 });
    console.log('✓ App loaded');
    
    // Click Get Started button
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
    
    // Wait for select to appear
    await page.waitForSelector('select', { timeout: 5000 });
    const clients = await page.$$eval('select option', options => 
      options.map(opt => ({ value: opt.value, text: opt.textContent }))
    );
    console.log('Available clients:', clients.map(c => c.text).join(', '));
    
    const hasKiro = clients.some(c => c.value === 'kiro');
    if (hasKiro) {
      await page.select('select', 'kiro');
      console.log('✓ Selected Kiro client');
      await new Promise(r => setTimeout(r, 1000));
    } else {
      console.log('✗ Kiro not found in client list');
    }
    
    // Click Project scope
    const projectButtons = await page.$$('button.btn-sm');
    for (const button of projectButtons) {
      const text = await page.evaluate(el => el.textContent, button);
      if (text === 'Project') {
        await button.click();
        console.log('✓ Clicked Project scope');
        await new Promise(r => setTimeout(r, 1000));
        break;
      }
    }
    
    // Check if project directory section appears
    const projectDirVisible = await page.$eval('body', body => 
      body.textContent.includes('Project Directory:')
    );
    console.log(projectDirVisible ? '✓ Project directory section visible' : '✗ Project directory section NOT visible');
    
    // Get current project directory
    const projectDirCode = await page.$$('code.bg-base-100');
    for (const code of projectDirCode) {
      const text = await page.evaluate(el => el.textContent, code);
      if (text && text.includes('/')) {
        console.log(`  Project directory: ${text}`);
      }
    }
    
    // Check config file path in status bar
    const configPaths = await page.$$eval('code', codes => 
      codes.map(code => code.textContent).filter(t => t && t.includes('.json'))
    );
    
    if (configPaths.length > 0) {
      console.log(`✓ Config file: ${configPaths[0]}`);
      
      // Check if it's showing the correct scope
      if (configPaths[0].includes('/Users/briandawson/.kiro/settings/mcp.json')) {
        console.log('  ⚠️  Still showing USER config in PROJECT scope!');
        console.log('  Expected: project-specific path or "Not found"');
      } else if (configPaths[0].includes('.kiro/settings/mcp.json')) {
        console.log('  ✓ Showing project-specific config');
      } else if (configPaths[0] === 'Not found') {
        console.log('  ✓ Correctly showing "Not found" for project scope without directory');
      }
    }
    
    // Count servers
    const serverCount = await page.$$eval('tbody tr', rows => rows.length);
    console.log(`✓ Found ${serverCount} servers`);
    
    // Check localStorage for projectDirectory
    const projectDirFromStorage = await page.evaluate(() => {
      return localStorage.getItem('mcp-project-directory');
    });
    console.log(`\nLocalStorage project directory: ${projectDirFromStorage || 'Not set'}`);
    
    console.log('\n=== Test Complete ===');
    
    await new Promise(r => setTimeout(r, 5000));
    await browser.close();
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testProjectScope();