import { test, expect, _electron as electron } from '@playwright/test';
import path from 'path';

test.describe('Electron App Testing', () => {
  test('Launch and test Electron app', async () => {
    // Set a longer timeout for Electron tests
    test.setTimeout(60000);

    console.log('Starting Electron app test...');

    // Launch Electron app - use current directory with package.json
    const electronApp = await electron.launch({
      args: ['.', '--remote-debugging-port=9333'],
      cwd: path.join(__dirname, '..'),
      env: {
        ...process.env,
        // Force development mode to use localhost:5175
        NODE_ENV: 'development',
        ELECTRON_IS_DEV: '1'
      },
      timeout: 30000 // 30 second timeout for launch
    });

    console.log('Electron app launched');

    // Get the first window
    const window = await electronApp.firstWindow();
    console.log('Got first window');

    // Wait for the window to be ready
    await window.waitForLoadState('domcontentloaded');
    console.log('Window DOM content loaded');

    // Direct Electron console to Node terminal
    window.on('console', (msg) => {
      console.log('Console:', msg.type(), msg.text());
    });

    // Wait a bit for full initialization
    await window.waitForTimeout(2000);

    // Take initial screenshot
    await window.screenshot({ path: 'test-results/electron-proper-1.png' });
    console.log('Initial screenshot taken');

    // Get page title using Electron API
    const appInfo = await electronApp.evaluate(async ({ app, BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0];
      return {
        name: app.getName(),
        version: app.getVersion(),
        title: win ? win.getTitle() : 'No window',
        isVisible: win ? win.isVisible() : false,
        bounds: win ? win.getBounds() : null
      };
    });
    console.log('App info:', appInfo);

    // Check page content
    const pageTitle = await window.title();
    console.log('Page title:', pageTitle);

    // Look for landing page elements
    const landingHeading = window.locator('h1:has-text("My MCP Manager")');
    const landingVisible = await landingHeading.isVisible().catch(() => false);

    if (landingVisible) {
      console.log('✅ Landing page is visible');

      // Find and click Get Started button
      const getStartedBtn = window.locator('button:has-text("Get Started")');

      // Check if button exists and is visible
      const btnVisible = await getStartedBtn.isVisible().catch(() => false);
      if (btnVisible) {
        console.log('Get Started button found, clicking...');

        // Click the button
        await getStartedBtn.click();
        console.log('Clicked Get Started button');

        // Wait for navigation
        await window.waitForTimeout(2000);

        // Take screenshot after clicking
        await window.screenshot({ path: 'test-results/electron-proper-2.png' });
        console.log('Post-click screenshot taken');

        // Check if we navigated away from landing
        const stillOnLanding = await landingHeading.isVisible().catch(() => false);
        if (!stillOnLanding) {
          console.log('✅ Successfully navigated from landing page');
        } else {
          console.log('⚠️ Still on landing page');
        }
      } else {
        console.log('⚠️ Get Started button not found');
      }
    }

    // Look for main interface
    const serversText = window.locator('text=/MCP Servers/i');
    const mainVisible = await serversText.isVisible().catch(() => false);

    if (mainVisible) {
      console.log('✅ Main interface is visible');

      // Try to interact with UI
      const buttons = await window.locator('button').count();
      console.log(`Found ${buttons} buttons`);

      // Try dropdown interaction
      const selects = await window.locator('select').count();
      console.log(`Found ${selects} select elements`);

      if (selects > 0) {
        const firstSelect = window.locator('select').first();
        const options = await firstSelect.locator('option').count();
        console.log(`First dropdown has ${options} options`);

        if (options > 1) {
          // Select second option
          await firstSelect.selectOption({ index: 1 });
          console.log('Selected option from dropdown');
          await window.waitForTimeout(1000);
        }
      }

      // Final screenshot
      await window.screenshot({ path: 'test-results/electron-proper-3.png' });
      console.log('Final screenshot taken');
    }

    // Test evaluation in main process
    const result = await electronApp.evaluate(async ({ app }) => {
      return {
        appPath: app.getAppPath(),
        isReady: app.isReady(),
        name: app.getName()
      };
    });
    console.log('Main process eval result:', result);

    // Verify the app is working
    expect(appInfo.isVisible).toBe(true);
    expect(landingVisible || mainVisible).toBe(true);

    // Close the app
    await electronApp.close();
    console.log('✅ Test completed successfully');
  });
});