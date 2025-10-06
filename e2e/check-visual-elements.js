const { chromium } = require('playwright');

async function checkVisualElements() {
  try {
    console.log('Connecting to app...');
    const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
    const page = browser.contexts()[0].pages()[0];

    // Navigate to Visual Workspace
    const getStartedBtn = page.locator('button:has-text("Get Started")');
    if (await getStartedBtn.isVisible()) {
      await getStartedBtn.click();
      await page.waitForTimeout(2000);
    }

    const visualTab = page.locator('button:has-text("Visual")').first();
    if (await visualTab.isVisible()) {
      await visualTab.click();
      await page.waitForTimeout(2000);
    }

    // Take screenshot
    await page.screenshot({ path: '/tmp/visual-workspace-elements.png' });
    console.log('Screenshot saved to /tmp/visual-workspace-elements.png');

    // Look for all visible text elements
    console.log('\n=== Visible Text Elements in Visual Workspace ===');
    const allText = await page.locator('*:visible').allTextContents();
    const uniqueText = [...new Set(allText.filter(t => t.trim().length > 0 && t.trim().length < 50))];
    uniqueText.slice(0, 20).forEach(text => {
      if (!text.includes('{') && !text.includes('function')) {
        console.log(`- "${text.trim()}"`);
      }
    });

    await browser.close();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkVisualElements();