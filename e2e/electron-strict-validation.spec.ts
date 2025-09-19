import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

let electronApp: ElectronApplication;
let window: Page;

test.describe('Electron App - Strict Validation Tests', () => {
  test.beforeAll(async () => {
    test.setTimeout(60000);

    console.log('=== Starting Electron App Launch ===');

    // Check if main.js exists
    const mainPath = path.join(__dirname, '..', 'dist', 'main', 'main.js');
    const mainExists = fs.existsSync(mainPath);

    if (!mainExists) {
      console.log('❌ main.js not found at:', mainPath);
      console.log('Attempting to use development mode...');

      // Try to launch in development mode
      electronApp = await electron.launch({
        args: ['.', '--remote-debugging-port=9555'],
        cwd: path.join(__dirname, '..'),
        env: {
          ...process.env,
          NODE_ENV: 'development',
          ELECTRON_IS_DEV: '1'
        },
        timeout: 30000
      });
    } else {
      console.log('✅ main.js found at:', mainPath);
      electronApp = await electron.launch({
        args: [mainPath],
        env: {
          ...process.env,
          NODE_ENV: 'production'
        },
        timeout: 30000
      });
    }

    // Get the first window - this must succeed
    window = await electronApp.firstWindow();
    console.log('✅ Got Electron window');

    // Wait for content to load
    await window.waitForLoadState('domcontentloaded');
    console.log('✅ DOM content loaded');

    // Additional wait for app initialization
    await window.waitForTimeout(3000);

    // Take initial screenshot for debugging
    await window.screenshot({ path: 'test-results/strict-initial.png' });
  });

  test.afterAll(async () => {
    if (electronApp) {
      await electronApp.close();
    }
  });

  test('STRICT: App must load with visible content', async () => {
    // Get page content to verify something loaded
    const content = await window.content();
    expect(content).toBeTruthy();
    expect(content.length).toBeGreaterThan(100); // Must have substantial content

    // Check viewport size
    const viewportSize = await window.viewportSize();
    expect(viewportSize).toBeTruthy();
    expect(viewportSize!.width).toBeGreaterThan(0);
    expect(viewportSize!.height).toBeGreaterThan(0);
    console.log('Viewport size:', viewportSize);

    // Verify window title
    const title = await window.title();
    console.log('Window title:', title);
    expect(title).toBeTruthy();

    // Get actual window properties from Electron
    const windowProps = await electronApp.evaluate(({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0];
      return {
        exists: !!win,
        title: win?.getTitle(),
        isVisible: win?.isVisible(),
        bounds: win?.getBounds()
      };
    });

    console.log('Window properties:', windowProps);
    expect(windowProps.exists).toBe(true);
    expect(windowProps.isVisible).toBe(true);
  });

  test('STRICT: Landing page must be visible OR main interface', async () => {
    // One of these MUST be visible - no silent failures
    const landingTitle = window.locator('h1:has-text("My MCP Manager")');
    const mainInterface = window.locator('text=/MCP Servers/i');

    // Wait for either to appear
    const landingVisible = await landingTitle.isVisible({ timeout: 5000 }).catch(() => false);
    const mainVisible = await mainInterface.isVisible({ timeout: 5000 }).catch(() => false);

    console.log('Landing visible:', landingVisible);
    console.log('Main interface visible:', mainVisible);

    // Take screenshot for evidence
    await window.screenshot({ path: 'test-results/strict-content-check.png' });

    // At least one MUST be visible
    if (!landingVisible && !mainVisible) {
      // Get all visible text to debug
      const allText = await window.locator('body').innerText();
      console.log('Page text content:', allText.substring(0, 500));

      // Check if there's an error message
      const errorMessages = await window.locator('.error, [role="alert"], text=/error/i').all();
      if (errorMessages.length > 0) {
        for (const error of errorMessages) {
          console.log('Error found:', await error.textContent());
        }
      }

      throw new Error('Neither landing page nor main interface is visible. App did not load correctly.');
    }

    expect(landingVisible || mainVisible).toBe(true);
  });

  test('STRICT: Get Started button must work if on landing page', async () => {
    const landingTitle = window.locator('h1:has-text("My MCP Manager")');
    const landingVisible = await landingTitle.isVisible({ timeout: 1000 }).catch(() => false);

    if (landingVisible) {
      console.log('On landing page - testing Get Started button');

      // Find the button - it MUST exist
      const getStartedBtn = window.locator('button:has-text("Get Started")');

      // Verify button exists and is visible
      await expect(getStartedBtn).toBeVisible({ timeout: 5000 });

      // Get button properties before click
      const isEnabled = await getStartedBtn.isEnabled();
      expect(isEnabled).toBe(true);

      // Click the button
      await getStartedBtn.click();
      console.log('Clicked Get Started button');

      // Wait for navigation
      await window.waitForTimeout(2000);

      // Take screenshot after click
      await window.screenshot({ path: 'test-results/strict-after-get-started.png' });

      // Verify we actually navigated away
      const stillOnLanding = await landingTitle.isVisible({ timeout: 1000 }).catch(() => false);

      if (stillOnLanding) {
        throw new Error('Get Started button clicked but still on landing page - navigation failed!');
      }

      // Verify main interface is now visible
      const mainInterface = window.locator('text=/MCP Servers/i');
      const mainNowVisible = await mainInterface.isVisible({ timeout: 5000 }).catch(() => false);

      if (!mainNowVisible) {
        // Get current content for debugging
        const currentText = await window.locator('body').innerText();
        console.log('Current page content:', currentText.substring(0, 300));
        throw new Error('Navigated from landing but main interface not visible');
      }

      expect(mainNowVisible).toBe(true);
      console.log('✅ Successfully navigated to main interface');
    } else {
      console.log('Already on main interface - skipping landing page test');

      // But we should still verify main interface is actually there
      const mainInterface = window.locator('text=/MCP Servers/i');
      await expect(mainInterface).toBeVisible({ timeout: 5000 });
    }
  });

  test('STRICT: UI elements must be interactive', async () => {
    // Ensure we're on the main interface
    const landing = window.locator('h1:has-text("My MCP Manager")');
    if (await landing.isVisible({ timeout: 1000 }).catch(() => false)) {
      const btn = window.locator('button:has-text("Get Started")');
      await btn.click();
      await window.waitForTimeout(2000);
    }

    // Now we MUST find interactive elements
    const dropdowns = await window.locator('select').all();
    const buttons = await window.locator('button:visible').all();
    const inputs = await window.locator('input:visible').all();

    console.log(`Found: ${dropdowns.length} dropdowns, ${buttons.length} buttons, ${inputs.length} inputs`);

    // Take screenshot of current state
    await window.screenshot({ path: 'test-results/strict-interactive-elements.png' });

    // We must have SOME interactive elements
    const totalInteractive = dropdowns.length + buttons.length + inputs.length;

    if (totalInteractive === 0) {
      // Try to get any visible element for debugging
      const anyElement = await window.locator('*:visible').first();
      const tagName = await anyElement.evaluate(el => el.tagName);
      console.log('First visible element:', tagName);

      throw new Error('No interactive elements found - app is not properly loaded');
    }

    expect(totalInteractive).toBeGreaterThan(0);

    // Test actual interaction with first dropdown if available
    if (dropdowns.length > 0) {
      const firstDropdown = dropdowns[0];

      // Verify it's actually a select element
      const tagName = await firstDropdown.evaluate(el => el.tagName);
      expect(tagName).toBe('SELECT');

      // Get options
      const options = await firstDropdown.locator('option').all();
      console.log(`Dropdown has ${options.length} options`);

      if (options.length > 1) {
        // Try to select second option
        const optionText = await options[1].textContent();
        console.log(`Selecting option: "${optionText}"`);

        await firstDropdown.selectOption({ index: 1 });
        await window.waitForTimeout(500);

        // Verify selection worked
        const selectedValue = await firstDropdown.inputValue();
        expect(selectedValue).toBeTruthy();
        console.log(`Selected value: "${selectedValue}"`);
      }
    }

    console.log('✅ UI elements are interactive');
  });

  test('STRICT: App must not have console errors', async () => {
    // Collect console messages
    const consoleLogs: string[] = [];
    const consoleErrors: string[] = [];

    window.on('console', (msg) => {
      const type = msg.type();
      const text = msg.text();

      if (type === 'error') {
        consoleErrors.push(text);
        console.log('Console ERROR:', text);
      } else {
        consoleLogs.push(text);
      }
    });

    // Wait a bit to collect any errors
    await window.waitForTimeout(2000);

    // Navigate through the app to trigger any errors
    const buttons = await window.locator('button:visible').all();
    if (buttons.length > 0) {
      // Click first safe button (not Close/Cancel)
      for (const button of buttons) {
        const text = await button.textContent();
        if (text && !text.includes('Close') && !text.includes('Cancel')) {
          await button.click();
          break;
        }
      }
    }

    await window.waitForTimeout(1000);

    // Check for critical errors
    const criticalErrors = consoleErrors.filter(err =>
      err.includes('Failed to load') ||
      err.includes('Cannot read') ||
      err.includes('undefined') ||
      err.includes('null')
    );

    if (criticalErrors.length > 0) {
      console.log('Critical errors found:', criticalErrors);
      throw new Error(`App has ${criticalErrors.length} critical console errors`);
    }

    // Warnings are okay, but errors are not
    expect(consoleErrors.length).toBe(0);
  });
});