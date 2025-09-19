import { test, expect } from '@playwright/test';

test('check current app state', async ({ page }) => {
  console.log('🔍 Checking current app state...\n');

  await page.goto('http://localhost:5175');
  await page.waitForTimeout(2000);

  // Click Get Started if present
  const getStartedButton = page.locator('button:has-text("Get Started")');
  if (await getStartedButton.isVisible({ timeout: 1000 })) {
    console.log('Clicking Get Started...');
    await getStartedButton.click();
    await page.waitForTimeout(2000);
  }

  // Get page title
  const title = await page.title();
  console.log(`Page Title: "${title}"`);

  // Get all visible text on page
  const headings = await page.locator('h1, h2, h3').all();
  if (headings.length > 0) {
    console.log('\nHeadings found:');
    for (const h of headings) {
      const text = await h.textContent();
      console.log(`  - "${text}"`);
    }
  }

  // Check for tabs or navigation
  const tabs = await page.locator('.ant-tabs-tab, [role="tab"]').all();
  if (tabs.length > 0) {
    console.log('\nTabs found:');
    for (const tab of tabs) {
      const text = await tab.textContent();
      console.log(`  - "${text}"`);
    }
  }

  // Check for menu items
  const menuItems = await page.locator('.ant-menu-item, [role="menuitem"]').all();
  if (menuItems.length > 0) {
    console.log('\nMenu items found:');
    for (const item of menuItems) {
      const text = await item.textContent();
      console.log(`  - "${text}"`);
    }
  }

  // Check header area for navigation
  const header = page.locator('header, .ant-layout-header, .app-header').first();
  if (await header.isVisible({ timeout: 1000 })) {
    console.log('\nHeader content:');
    const headerButtons = await header.locator('button').all();
    for (const btn of headerButtons) {
      const text = await btn.textContent();
      if (text) console.log(`  Button: "${text}"`);
    }

    const headerLinks = await header.locator('a').all();
    for (const link of headerLinks) {
      const text = await link.textContent();
      if (text) console.log(`  Link: "${text}"`);
    }
  }

  // Take screenshot
  await page.screenshot({ path: 'test-results/current-state.png', fullPage: true });
  console.log('\n📸 Full page screenshot saved: test-results/current-state.png');

  // Look specifically for Visual in any element
  const visualElements = await page.locator('*:has-text("Visual")').all();
  if (visualElements.length > 0) {
    console.log(`\n✅ Found ${visualElements.length} elements containing "Visual"`);
    for (const el of visualElements.slice(0, 3)) {
      const tagName = await el.evaluate(e => e.tagName);
      const className = await el.getAttribute('class');
      console.log(`  ${tagName}${className ? `.${className.split(' ')[0]}` : ''}`);
    }
  } else {
    console.log('\n❌ No elements containing "Visual" found');
  }
});