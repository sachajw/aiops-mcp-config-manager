const { chromium } = require('playwright');

async function testAppState() {
  try {
    console.log('Connecting to app on port 9222...');
    const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
    const contexts = browser.contexts();

    if (contexts.length === 0) {
      console.log('No contexts found');
      return;
    }

    const page = contexts[0].pages()[0];
    await page.screenshot({ path: '/tmp/actual-app-state.png' });
    console.log('Screenshot saved to /tmp/actual-app-state.png');

    // Get page title
    const title = await page.title();
    console.log('Page title:', title);

    // Look for main navigation elements
    console.log('\n=== Looking for navigation elements ===');
    const navButtons = await page.locator('button').all();
    console.log(`Found ${navButtons.length} buttons`);

    // Print first 10 button texts
    for (let i = 0; i < Math.min(10, navButtons.length); i++) {
      const text = await navButtons[i].textContent();
      if (text && text.trim()) {
        console.log(`Button ${i}: "${text.trim()}"`);
      }
    }

    // Look for Visual Workspace specific elements
    console.log('\n=== Looking for Visual Workspace elements ===');
    const hasVisualTab = await page.locator('text="Visual"').count();
    console.log('Has Visual tab:', hasVisualTab > 0);

    const hasWorkspaceTab = await page.locator('text="Workspace"').count();
    console.log('Has Workspace text:', hasWorkspaceTab > 0);

    // Check for scope buttons
    console.log('\n=== Looking for scope buttons ===');
    const systemBtn = await page.locator('button:has-text("System")').count();
    const userBtn = await page.locator('button:has-text("User")').count();
    const projectBtn = await page.locator('button:has-text("Project")').count();
    console.log('System button:', systemBtn > 0);
    console.log('User button:', userBtn > 0);
    console.log('Project button:', projectBtn > 0);

    await browser.close();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testAppState();