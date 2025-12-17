const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.goto('http://localhost:5175');
  await page.waitForTimeout(2000);
  
  await page.screenshot({ path: 'app-screenshot.png', fullPage: true });
  console.log('Screenshot saved as app-screenshot.png');
  
  await browser.close();
})();