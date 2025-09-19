import { test, expect } from '@playwright/test';
import { TestHelpers } from '../utils/TestHelpers';

test.describe('Smoke Tests - App Launch', () => {
  test('application should launch successfully', async ({ page }) => {
    // Navigate to app
    await page.goto('/');

    // Wait for app to be ready
    await TestHelpers.waitForAppReady(page);

    // Verify title
    await expect(page).toHaveTitle(/MCP Configuration Manager/i);

    // Verify main layout exists
    const mainLayout = page.locator('.ant-layout, .app-container');
    await expect(mainLayout).toBeVisible({ timeout: 10000 });

    // Verify no errors
    await TestHelpers.verifyNoErrors(page);

    // Take screenshot for reference
    await TestHelpers.screenshot(page, 'app-launch');
  });

  test('main navigation should be accessible', async ({ page }) => {
    await page.goto('/');
    await TestHelpers.waitForAppReady(page);

    // Check for main navigation elements
    const classicButton = page.locator('button:has-text("Classic")');
    const visualButton = page.locator('button:has-text("Visual")');
    const settingsButton = page.locator('button:has-text("Settings")');

    // Verify navigation exists
    await expect(classicButton.or(visualButton).or(settingsButton)).toBeVisible({ timeout: 10000 });

    // If Visual button exists, it should be clickable
    if (await visualButton.isVisible()) {
      await visualButton.click();
      // Should navigate without errors
      await TestHelpers.verifyNoErrors(page);
    }
  });

  test('should handle page refresh', async ({ page }) => {
    await page.goto('/');
    await TestHelpers.waitForAppReady(page);

    // Navigate to a specific view
    const visualButton = page.locator('button:has-text("Visual")');
    if (await visualButton.isVisible()) {
      await visualButton.click();
      await page.waitForTimeout(1000);
    }

    // Refresh page
    await page.reload();
    await TestHelpers.waitForAppReady(page);

    // App should still work
    await TestHelpers.verifyNoErrors(page);
    const mainLayout = page.locator('.ant-layout, .app-container');
    await expect(mainLayout).toBeVisible();
  });

  test('should have no console errors on startup', async ({ page }) => {
    const errors: string[] = [];

    // Listen for console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await TestHelpers.waitForAppReady(page);
    await page.waitForTimeout(2000); // Give time for any async errors

    // Should have no console errors
    expect(errors).toHaveLength(0);
  });

  test('should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');
    await TestHelpers.waitForAppReady(page);

    const loadTime = Date.now() - startTime;
    console.log(`App load time: ${loadTime}ms`);

    // Should load within 10 seconds
    expect(loadTime).toBeLessThan(10000);
  });
});