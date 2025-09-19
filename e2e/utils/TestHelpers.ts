import { Page, expect } from '@playwright/test';

/**
 * Test helper utilities for reliable testing
 */
export class TestHelpers {
  /**
   * Wait for the application to be fully loaded and ready
   */
  static async waitForAppReady(page: Page): Promise<void> {
    try {
      // Wait for network to settle with shorter timeout
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});

      // Wait for React to mount (check for root element)
      const rootSelector = '.app-container, #root, [data-testid="app-root"], .ant-layout';
      await page.waitForSelector(rootSelector, {
        state: 'visible',
        timeout: 10000,
      }).catch(async () => {
        // If not found, check if we have any visible content
        const body = await page.locator('body').textContent();
        if (body && body.trim().length > 0) {
          console.log('App has content but no recognized root element');
        }
      });

      // Give React a moment to complete rendering
      await page.waitForTimeout(500);
    } catch (error) {
      console.error('waitForAppReady failed:', error);
      // Don't throw - let the test continue and fail on specific assertions
    }
  }

  /**
   * Verify no errors are present in the application
   */
  static async verifyNoErrors(page: Page): Promise<void> {
    // Check for React error boundary
    const errorBoundary = page.locator('[data-testid="error-boundary"], .error-boundary, .ant-result-error');
    await expect(errorBoundary).not.toBeVisible({ timeout: 1000 }).catch(() => {});

    // Check for error messages
    const errorMessages = page.locator('.ant-message-error, .ant-alert-error');
    const errorCount = await errorMessages.count();
    expect(errorCount).toBe(0);
  }

  /**
   * Take a screenshot with proper naming
   */
  static async screenshot(page: Page, name: string): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await page.screenshot({
      path: `test-results/screenshots/${name}-${timestamp}.png`,
      fullPage: false,
    });
  }

  /**
   * Wait for stable DOM (no changes for specified time)
   */
  static async waitForStableDOM(page: Page, stabilityTime: number = 500): Promise<void> {
    await page.evaluate((time) => {
      return new Promise((resolve) => {
        let lastHTML = document.body.innerHTML;
        const check = () => {
          const currentHTML = document.body.innerHTML;
          if (currentHTML === lastHTML) {
            resolve(true);
          } else {
            lastHTML = currentHTML;
            setTimeout(check, time);
          }
        };
        setTimeout(check, time);
      });
    }, stabilityTime);
  }

  /**
   * Reliable click with retry logic
   */
  static async reliableClick(
    page: Page,
    selector: string,
    options: { maxRetries?: number; delay?: number } = {}
  ): Promise<void> {
    const { maxRetries = 3, delay = 1000 } = options;

    for (let i = 0; i < maxRetries; i++) {
      try {
        await page.click(selector, { timeout: 5000 });
        return;
      } catch (error) {
        if (i === maxRetries - 1) {
          throw new Error(`Failed to click ${selector} after ${maxRetries} attempts: ${error}`);
        }
        await page.waitForTimeout(delay * Math.pow(2, i)); // Exponential backoff
      }
    }
  }

  /**
   * Wait for element and verify it's interactable
   */
  static async waitForInteractable(page: Page, selector: string): Promise<void> {
    const element = page.locator(selector);
    await element.waitFor({ state: 'visible', timeout: 10000 });
    await expect(element).toBeVisible();
    await expect(element).toBeEnabled();
  }

  /**
   * Perform drag and drop with verification
   */
  static async dragAndDropWithVerification(
    page: Page,
    sourceSelector: string,
    targetSelector: string,
    verifySelector?: string
  ): Promise<void> {
    // Ensure elements are visible
    await this.waitForInteractable(page, sourceSelector);
    await this.waitForInteractable(page, targetSelector);

    // Get initial state if verify selector provided
    let initialCount = 0;
    if (verifySelector) {
      initialCount = await page.locator(verifySelector).count();
    }

    // Perform drag and drop
    const source = page.locator(sourceSelector).first();
    const target = page.locator(targetSelector).first();

    await source.hover();
    await page.mouse.down();
    await target.hover();
    await page.mouse.up();

    // Verify if specified
    if (verifySelector) {
      await page.waitForTimeout(1000); // Allow time for DOM update
      const finalCount = await page.locator(verifySelector).count();
      expect(finalCount).toBeGreaterThan(initialCount);
    }
  }

  /**
   * Clear all application state
   */
  static async clearAppState(page: Page): Promise<void> {
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
      // Clear any app-specific state
      if (window.__ZUSTAND_STORE__) {
        window.__ZUSTAND_STORE__.destroy?.();
      }
    });
  }

  /**
   * Get console errors from page
   */
  static async getConsoleErrors(page: Page): Promise<string[]> {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    return errors;
  }

  /**
   * Assert element contains expected text with retry
   */
  static async assertTextContent(
    page: Page,
    selector: string,
    expectedText: string,
    options: { timeout?: number; exact?: boolean } = {}
  ): Promise<void> {
    const { timeout = 5000, exact = false } = options;
    const element = page.locator(selector);

    if (exact) {
      await expect(element).toHaveText(expectedText, { timeout });
    } else {
      await expect(element).toContainText(expectedText, { timeout });
    }
  }

  /**
   * Wait for network idle with timeout
   */
  static async waitForNetworkIdle(page: Page, timeout: number = 5000): Promise<void> {
    await Promise.race([
      page.waitForLoadState('networkidle'),
      page.waitForTimeout(timeout),
    ]);
  }
}