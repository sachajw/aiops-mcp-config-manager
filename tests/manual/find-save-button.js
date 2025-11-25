const { chromium } = require('playwright');

(async () => {
  console.log('🔍 FINDING SAVE BUTTON');
  console.log('======================\n');

  try {
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    const page = browser.contexts()[0].pages()[0];

    // Navigate to Visual
    try {
      await page.locator('button:has-text("Visual")').first().click({ timeout: 5000 });
      await page.waitForTimeout(2000);
    } catch (e) {
      // Already there
    }

    console.log('🔍 Searching for save-related buttons...\n');

    // Find all buttons
    const allButtons = await page.locator('button').all();
    console.log(`Found ${allButtons.length} buttons total\n`);

    console.log('Button texts:');
    for (let i = 0; i < Math.min(allButtons.length, 30); i++) {
      const text = await allButtons[i].textContent().catch(() => '');
      if (text && text.trim()) {
        console.log(`  [${i + 1}] "${text.trim()}"`);
      }
    }

    console.log('\n🔍 Searching specifically for save-related text...\n');

    const saveSelectors = [
      'button:has-text("Save")',
      'button:has-text("save")',
      '[data-testid="save-button"]',
      'button[class*="save"]',
      'button[aria-label*="save"]',
      'button[title*="save"]'
    ];

    for (const selector of saveSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        console.log(`✅ Found with selector: ${selector} (${count} matches)`);
        const elements = await page.locator(selector).all();
        for (let i = 0; i < elements.length; i++) {
          const text = await elements[i].textContent();
          console.log(`     [${i + 1}] "${text}"`);
        }
      } else {
        console.log(`❌ Not found: ${selector}`);
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
})();