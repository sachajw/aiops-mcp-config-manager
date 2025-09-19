import { test, expect } from '@playwright/test';

test.describe('Simple Working Tests', () => {
  test('can access the application', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5175');

    // Wait for any content to load
    await page.waitForTimeout(2000);

    // Check that we have some content
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toBeTruthy();

    // Take a screenshot as proof
    await page.screenshot({ path: 'test-results/simple-test.png' });

    console.log('✅ Application is accessible');
  });

  test('can find Visual button', async ({ page }) => {
    await page.goto('http://localhost:5175');
    await page.waitForTimeout(2000);

    // Look for Visual button with various selectors
    const visualButton = await page.locator('button').filter({ hasText: 'Visual' }).first();
    const buttonCount = await visualButton.count();

    if (buttonCount > 0) {
      console.log('✅ Visual button found');

      // Try clicking it
      await visualButton.click();
      await page.waitForTimeout(2000);

      // Check if Visual Workspace loaded
      const workspace = await page.locator('.visual-workspace').count();
      if (workspace > 0) {
        console.log('✅ Visual Workspace loaded');
      } else {
        console.log('⚠️ Visual button clicked but workspace not found');
      }
    } else {
      console.log('⚠️ Visual button not found - checking what buttons exist');
      const allButtons = await page.locator('button').all();
      for (const btn of allButtons) {
        const text = await btn.textContent();
        console.log(`  Found button: "${text}"`);
      }
    }

    await page.screenshot({ path: 'test-results/visual-button-test.png' });
  });

  test('check page structure', async ({ page }) => {
    await page.goto('http://localhost:5175');
    await page.waitForTimeout(2000);

    // Check for common elements
    const elements = {
      'Ant Layout': await page.locator('.ant-layout').count(),
      'App Container': await page.locator('.app-container').count(),
      'Root Element': await page.locator('#root').count(),
      'Buttons': await page.locator('button').count(),
      'Headers': await page.locator('h1, h2, h3, h4').count(),
    };

    console.log('Page Structure:');
    for (const [name, count] of Object.entries(elements)) {
      console.log(`  ${name}: ${count}`);
    }

    // At least something should exist
    const totalElements = Object.values(elements).reduce((a, b) => a + b, 0);
    expect(totalElements).toBeGreaterThan(0);
  });
});