/**
 * Shared Electron fixture for Playwright E2E tests
 *
 * This fixture provides a properly launched Electron app instance
 * that can be used by all E2E tests without manual CDP connection.
 *
 * Uses Playwright's native _electron.launch() which works with Electron 35+.
 *
 * Usage:
 *   import { test, expect } from './fixtures/electron-fixture';
 *
 *   test('my test', async ({ electronApp, page }) => {
 *     // electronApp - the Electron application instance
 *     // page - the first window's page object
 *   });
 */

import { test as base, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import path from 'path';

// Extend the base test with Electron fixtures
export const test = base.extend<{
  electronApp: ElectronApplication;
  page: Page;
}>({
  // Launch Electron app before each test
  electronApp: async ({ }, use) => {
    console.log('[ElectronFixture] Launching Electron app...');

    const appPath = path.join(__dirname, '../..');
    console.log('[ElectronFixture] App path:', appPath);

    const electronApp = await electron.launch({
      args: ['.'],  // Pass current directory with package.json
      cwd: appPath,
      env: {
        ...process.env,
        NODE_ENV: 'development',
        ELECTRON_IS_DEV: '1',
        TEST_MODE: 'true',
      },
      timeout: 60000, // 60 second timeout for launch
    });

    // Pipe process output to console for debugging
    const appProcess = electronApp.process();
    if (appProcess.stdout) {
      appProcess.stdout.on('data', (data) => {
        console.log(`[Electron Main] ${data.toString().trim()}`);
      });
    }
    if (appProcess.stderr) {
      appProcess.stderr.on('data', (data) => {
        console.error(`[Electron Main Err] ${data.toString().trim()}`);
      });
    }

    console.log('[ElectronFixture] Electron app launched');

    // Use the app in tests
    await use(electronApp);

    // Cleanup: close the app after tests
    console.log('[ElectronFixture] Closing Electron app...');
    try {
      await electronApp.close();
      console.log('[ElectronFixture] Electron app closed successfully');
    } catch (error) {
      console.error('[ElectronFixture] Error closing app:', error);
    }
  },

  // Get the first valid application window (ignoring DevTools)
  page: async ({ electronApp }, use) => {
    console.log('[ElectronFixture] Waiting for application window...');

    // Wait for the first window that is not DevTools
    let page: Page | undefined;

    // Poll for windows
    for (let i = 0; i < 20; i++) {
      const windows = electronApp.windows();
      for (const window of windows) {
        const title = await window.title().catch(() => 'Unknown');
        const url = window.url();
        console.log(`[ElectronFixture] Found window: "${title}" (URL: ${url})`);
        if (title !== 'DevTools' && !title.includes('DevTools')) {
          page = window;
          break;
        }
      }
      if (page) break;
      await new Promise(r => setTimeout(r, 500));
    }

    if (!page) {
      // Fallback to firstWindow if we couldn't find a non-DevTools one (or if only one exists)
      console.log('[ElectronFixture] Could not find specific app window, falling back to firstWindow()');
      page = await electronApp.firstWindow();
    }

    console.log(`[ElectronFixture] Selected window with title: "${await page.title()}"`);

    // Wait for the window to be ready
    await page.waitForLoadState('domcontentloaded');
    console.log('[ElectronFixture] Window ready');

    // Forward console messages to Node terminal for debugging
    page.on('console', (msg) => {
      const type = msg.type();
      if (type === 'error') {
        console.error('[Renderer]', msg.text());
      } else if (type === 'warning') {
        console.warn('[Renderer]', msg.text());
      } else {
        console.log('[Renderer]', msg.text());
      }
    });

    // Use the page in tests
    await use(page);
  },
});

// Re-export expect for convenience
export { expect } from '@playwright/test';

// Helper function to wait for app to be ready
export async function waitForAppReady(page: Page, timeout = 30000): Promise<void> {
  console.log(`[ElectronFixture] Waiting for app to be ready (timeout: ${timeout}ms)...`);
  try {
    // Wait for either the landing page or main interface to be visible
    await Promise.race([
      page.waitForSelector('h1:has-text("My MCP Manager")', { timeout }),
      page.waitForSelector('text=/MCP Servers/i', { timeout }),
      page.waitForSelector('.ant-layout', { timeout }),
      page.waitForSelector('#root', { state: 'attached', timeout }), // Fallback for basic DOM
    ]);
    console.log('[ElectronFixture] App ready signal detected.');
  } catch (error) {
    console.warn('[ElectronFixture] App ready check timed out! The tests might fail if the UI is not loaded.');
    // Log the current HTML to help debug
    const content = await page.content().catch(() => 'Could not get page content');
    console.log('[ElectronFixture] Current Page Content Preview:', content.substring(0, 500) + '...');
  }
}

// Helper to bypass landing page if present
export async function bypassLandingPage(page: Page): Promise<void> {
  const landingHeading = page.locator('h1:has-text("My MCP Manager")');
  const isLandingVisible = await landingHeading.isVisible().catch(() => false);

  if (isLandingVisible) {
    const getStartedBtn = page.locator('button:has-text("Get Started")');
    if (await getStartedBtn.isVisible().catch(() => false)) {
      await getStartedBtn.click();
      await page.waitForTimeout(1000); // Wait for navigation
    }
  }
}

// Helper to evaluate in main process
export async function evaluateInMain<T>(
  electronApp: ElectronApplication,
  fn: (modules: { app: Electron.App; BrowserWindow: typeof Electron.BrowserWindow }) => T | Promise<T>
): Promise<T> {
  return electronApp.evaluate(fn as any);
}
