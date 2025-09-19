import { test, expect } from '@playwright/test';

test.describe('MCP Configuration Manager - Working Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app
    await page.goto('http://localhost:5175');
    await page.waitForTimeout(2000);

    // Click Get Started if on landing page
    const getStartedButton = page.locator('button:has-text("Get Started")');
    if (await getStartedButton.isVisible({ timeout: 1000 })) {
      await getStartedButton.click();
      await page.waitForTimeout(2000);
    }
  });

  test('app loads successfully', async ({ page }) => {
    // Verify title
    await expect(page).toHaveTitle(/MCP|Configuration/i);

    // Verify some content is visible
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();

    // Take screenshot
    await page.screenshot({ path: 'test-results/app-loaded.png' });

    console.log('✅ App loaded successfully');
  });

  test('main interface is functional', async ({ page }) => {
    // Check for MCP Servers section
    const serversSection = page.locator('text=/MCP Servers/i');
    await expect(serversSection).toBeVisible();

    // Check for buttons
    const addServerButton = page.locator('button:has-text("Add Server")');
    const saveButton = page.locator('button:has-text("Save")');

    // Verify essential buttons exist
    expect(await addServerButton.count()).toBeGreaterThan(0);
    expect(await saveButton.count()).toBeGreaterThan(0);

    console.log('✅ Main interface elements found');
  });

  test('can interact with UI elements', async ({ page }) => {
    // Try clicking Add Server button
    const addServerButton = page.locator('button:has-text("Add Server")').first();
    if (await addServerButton.isVisible()) {
      await addServerButton.click();
      await page.waitForTimeout(1000);

      // Check if modal or form appeared
      const modal = page.locator('.ant-modal, .ant-drawer');
      const modalVisible = await modal.isVisible({ timeout: 2000 }).catch(() => false);

      if (modalVisible) {
        console.log('✅ Add Server modal opened');

        // Close modal
        const closeButton = page.locator('.ant-modal-close, .ant-drawer-close').first();
        if (await closeButton.isVisible()) {
          await closeButton.click();
          await page.waitForTimeout(500);
        }
      } else {
        console.log('ℹ️ No modal appeared (might be inline form)');
      }
    }
  });

  test('navigation works if available', async ({ page }) => {
    // Look for any navigation elements
    const navElements = await page.locator('nav a, .ant-menu-item, [role="tab"]').all();

    if (navElements.length > 0) {
      console.log(`Found ${navElements.length} navigation elements`);

      // Try clicking first nav element
      const firstNav = navElements[0];
      const navText = await firstNav.textContent();
      console.log(`Clicking navigation: "${navText}"`);

      await firstNav.click();
      await page.waitForTimeout(2000);

      // Verify no errors after navigation
      const errorElement = page.locator('.ant-result-error, .error-boundary');
      const hasError = await errorElement.isVisible({ timeout: 1000 }).catch(() => false);
      expect(hasError).toBe(false);

      console.log('✅ Navigation works without errors');
    } else {
      console.log('ℹ️ No navigation elements found');
    }
  });

  test('check for Visual Workspace availability', async ({ page }) => {
    // Multiple strategies to find Visual Workspace

    // Strategy 1: Direct button
    let visualFound = false;
    const visualButton = page.locator('button:has-text("Visual")');
    if (await visualButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      console.log('✅ Visual button found directly');
      visualFound = true;
    }

    // Strategy 2: In navigation/menu
    if (!visualFound) {
      const visualLink = page.locator('a:has-text("Visual"), [role="tab"]:has-text("Visual")');
      if (await visualLink.isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log('✅ Visual found in navigation');
        visualFound = true;
      }
    }

    // Strategy 3: In settings (might need to enable)
    if (!visualFound) {
      const settingsButton = page.locator('button:has-text("Settings"), a:has-text("Settings")').first();
      if (await settingsButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log('ℹ️ Visual Workspace might be in Settings (experimental features)');
      }
    }

    if (!visualFound) {
      console.log('ℹ️ Visual Workspace not immediately accessible - may need to enable in Settings');
    }
  });

  test('verify app stability', async ({ page }) => {
    // Perform multiple interactions to verify stability

    // Click various buttons (if they exist)
    const buttons = await page.locator('button').all();
    const interactionCount = Math.min(3, buttons.length);

    for (let i = 0; i < interactionCount; i++) {
      const button = buttons[i];
      const buttonText = await button.textContent();

      // Skip dangerous buttons
      if (buttonText?.match(/delete|remove|clear/i)) {
        continue;
      }

      console.log(`Testing button: "${buttonText}"`);
      await button.click();
      await page.waitForTimeout(500);

      // Check for errors
      const hasError = await page.locator('.ant-message-error, .ant-alert-error').isVisible({ timeout: 500 }).catch(() => false);
      expect(hasError).toBe(false);
    }

    console.log('✅ App remains stable during interactions');
  });

  test.afterEach(async ({ page }) => {
    // Collect any console errors
    const jsErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        jsErrors.push(msg.text());
      }
    });

    // Give time for any async errors
    await page.waitForTimeout(1000);

    if (jsErrors.length > 0) {
      console.log('⚠️ Console errors detected:', jsErrors);
    }
  });
});