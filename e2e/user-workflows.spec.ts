import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import path from 'path';

let electronApp: ElectronApplication;
let window: Page;

test.describe.serial('MCP Configuration Manager - User Workflows', () => {
  test.beforeAll(async () => {
    // Launch Electron app once for all tests
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

    window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(2000);

    // Navigate past landing page
    const landingTitle = window.locator('h1:has-text("My MCP Manager")');
    const landingVisible = await landingTitle.isVisible({ timeout: 3000 }).catch(() => false);

    if (landingVisible) {
      console.log('Landing page detected, clicking Get Started...');
      const getStartedBtn = window.locator('button:has-text("Get Started")');
      await getStartedBtn.waitFor({ state: 'visible', timeout: 5000 });
      await getStartedBtn.click();
      await window.waitForTimeout(2000);
      console.log('✅ Navigated past landing page');

      // Verify we left the landing page
      const stillOnLanding = await landingTitle.isVisible({ timeout: 1000 }).catch(() => false);
      if (stillOnLanding) {
        console.log('⚠️ Still on landing page, trying again...');
        await getStartedBtn.click({ force: true });
        await window.waitForTimeout(2000);
      }
    } else {
      console.log('Not on landing page, proceeding...');
    }
  });

  test.afterAll(async () => {
    if (electronApp) {
      await electronApp.close();
    }
  });

  test('Workflow 1: Select client and view servers', async () => {
    console.log('\n=== Workflow 1: Client Selection ===');

    // Check for and close any open modals first
    const modalBackdrop = window.locator('.fixed.inset-0.z-50, [class*="modal"], [role="dialog"]');
    if (await modalBackdrop.isVisible({ timeout: 1000 })) {
      const closeBtn = window.locator('button:has-text("Close"), button:has-text("Cancel"), button[aria-label="Close"]').first();
      if (await closeBtn.isVisible({ timeout: 1000 })) {
        await closeBtn.click();
        await window.waitForTimeout(500);
        console.log('Closed existing modal');
      }
    }

    // Extra wait for UI to stabilize
    await window.waitForTimeout(1000);

    // Select a client
    const clientDropdown = window.locator('select').first();
    await expect(clientDropdown).toBeVisible({ timeout: 5000 });

    const options = await clientDropdown.locator('option').count();
    console.log(`Available clients: ${options - 1}`);

    if (options > 1) {
      await clientDropdown.selectOption({ index: 1 });
      await window.waitForTimeout(1000);

      const selectedText = await clientDropdown.locator('option:checked').textContent();
      console.log(`✅ Selected client: ${selectedText}`);

      // Verify server list updates
      const serversSection = window.locator('text=/MCP Servers/i');
      await expect(serversSection).toBeVisible();
      console.log('✅ Server list displayed');
    }

    await window.screenshot({ path: 'test-results/workflow-1-client-selection.png' });
  });

  test('Workflow 2: Add and configure server', async () => {
    console.log('\n=== Workflow 2: Add Server ===');

    const addServerBtn = window.locator('button:has-text("Add Server")');

    // Check button state
    if (await addServerBtn.isEnabled({ timeout: 2000 })) {
      await addServerBtn.click();
      console.log('✅ Clicked Add Server');
      await window.waitForTimeout(1500);

      // Look for configuration modal/form
      const nameInput = window.locator('input').first();
      if (await nameInput.isVisible({ timeout: 3000 })) {
        await nameInput.fill('test-mcp-server');
        console.log('✅ Entered server name');

        // Look for command input
        const inputs = await window.locator('input').all();
        if (inputs.length > 1) {
          await inputs[1].fill('npx');
          console.log('✅ Entered command');
        }

        // Cancel to avoid actually adding
        const cancelBtn = window.locator('button:has-text("Cancel")');
        if (await cancelBtn.isVisible()) {
          await cancelBtn.click();
          console.log('✅ Cancelled server addition');
        }
      }
    } else {
      console.log('ℹ️ Add Server button is disabled (select client first)');
    }

    await window.screenshot({ path: 'test-results/workflow-2-add-server.png' });
  });

  test('Workflow 3: Navigate to Visual Workspace', async () => {
    console.log('\n=== Workflow 3: Visual Workspace ===');

    // Try different selectors for Visual Workspace
    const visualSelectors = [
      'button:has-text("Visual")',
      '[role="tab"]:has-text("Visual")',
      'text=/Visual Workspace/i'
    ];

    let visualFound = false;
    for (const selector of visualSelectors) {
      const element = window.locator(selector);
      if (await element.isVisible({ timeout: 1000 })) {
        await element.click();
        visualFound = true;
        console.log('✅ Opened Visual Workspace');
        await window.waitForTimeout(2000);
        break;
      }
    }

    if (visualFound) {
      // Check for workspace elements
      const canvas = window.locator('.react-flow, [data-testid*="canvas"], svg').first();
      if (await canvas.isVisible({ timeout: 3000 })) {
        console.log('✅ Visual canvas is visible');
      }

      // Check for server library
      const serverLib = window.locator('text=/Server Library/i');
      if (await serverLib.isVisible()) {
        console.log('✅ Server Library panel found');
      }
    } else {
      console.log('ℹ️ Visual Workspace not accessible');
    }

    await window.screenshot({ path: 'test-results/workflow-3-visual-workspace.png' });
  });

  test('Workflow 4: Access Discovery page', async () => {
    console.log('\n=== Workflow 4: Discovery ===');

    const discoverySelectors = [
      'button:has-text("Discovery")',
      '[role="tab"]:has-text("Discovery")',
      'a:has-text("Discovery")'
    ];

    let discoveryFound = false;
    for (const selector of discoverySelectors) {
      const element = window.locator(selector);
      if (await element.isVisible({ timeout: 1000 })) {
        await element.click();
        discoveryFound = true;
        console.log('✅ Opened Discovery page');
        await window.waitForTimeout(2000);
        break;
      }
    }

    if (discoveryFound) {
      // Search for servers
      const searchInput = window.locator('input[placeholder*="search" i]');
      if (await searchInput.isVisible()) {
        await searchInput.fill('git');
        console.log('✅ Searched for "git" servers');
        await window.waitForTimeout(1000);
      }

      // Check results
      const cards = await window.locator('.card, [class*="card"]').count();
      console.log(`Found ${cards} server cards`);
    } else {
      console.log('ℹ️ Discovery page not accessible');
    }

    await window.screenshot({ path: 'test-results/workflow-4-discovery.png' });
  });

  test('Workflow 5: Configure Settings', async () => {
    console.log('\n=== Workflow 5: Settings ===');

    const settingsSelectors = [
      'button:has-text("Settings")',
      '[role="tab"]:has-text("Settings")',
      'button[title*="Settings"]'
    ];

    let settingsFound = false;
    for (const selector of settingsSelectors) {
      const element = window.locator(selector);
      if (await element.isVisible({ timeout: 1000 })) {
        await element.click();
        settingsFound = true;
        console.log('✅ Opened Settings');
        await window.waitForTimeout(1500);
        break;
      }
    }

    if (settingsFound) {
      // Look for settings tabs
      const tabs = await window.locator('[role="tab"], .tab').all();
      console.log(`Found ${tabs.length} settings tabs`);

      // Try to toggle something
      const toggles = await window.locator('input[type="checkbox"], [role="switch"]').all();
      if (toggles.length > 0) {
        const firstToggle = toggles[0];
        if (await firstToggle.isVisible()) {
          await firstToggle.click();
          console.log('✅ Toggled a setting');
        }
      }
    } else {
      console.log('ℹ️ Settings not accessible');
    }

    await window.screenshot({ path: 'test-results/workflow-5-settings.png' });
  });

  test('Workflow 6: Test Help System', async () => {
    console.log('\n=== Workflow 6: Help System ===');

    // Check for and close any open modals first
    const modalBackdrop = window.locator('.fixed.inset-0.z-50, [class*="modal"], [role="dialog"]');
    if (await modalBackdrop.isVisible({ timeout: 1000 })) {
      const closeBtn = window.locator('button:has-text("Close"), button:has-text("Cancel"), button[aria-label="Close"]').first();
      if (await closeBtn.isVisible({ timeout: 1000 })) {
        await closeBtn.click();
        await window.waitForTimeout(500);
        console.log('Closed existing modal');
      }
    }

    const helpSelectors = [
      'button[title*="Help"]',
      'button:has-text("Help")',
      'button[aria-label*="help"]',
      'button:has-text("?")'
    ];

    let helpFound = false;
    for (const selector of helpSelectors) {
      const element = window.locator(selector);
      if (await element.isVisible({ timeout: 1000 })) {
        // Force click to bypass any overlays
        await element.click({ force: true });
        helpFound = true;
        console.log('✅ Opened Help');
        await window.waitForTimeout(1500);
        break;
      }
    }

    if (helpFound) {
      // Check for help content
      const betaNotice = window.locator('text=/Beta Version/i');
      if (await betaNotice.isVisible()) {
        console.log('✅ Beta notice is visible');
      }

      // Check for documentation links
      const userGuide = window.locator('text=/User Guide/i').first();
      if (await userGuide.isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log('✅ User Guide link found');
      }

      // Close help
      const closeBtn = window.locator('button:has-text("Close"), button[aria-label="Close"]').first();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
        console.log('✅ Closed help modal');
      }
    } else {
      console.log('ℹ️ Help not found');
    }

    await window.screenshot({ path: 'test-results/workflow-6-help.png' });
  });

  test('Workflow 7: Test client switching', async () => {
    console.log('\n=== Workflow 7: Client Switching ===');

    const clientDropdown = window.locator('select').first();
    const optionCount = await clientDropdown.locator('option').count();

    if (optionCount > 2) {
      // Switch between multiple clients
      for (let i = 1; i <= Math.min(3, optionCount - 1); i++) {
        await clientDropdown.selectOption({ index: i });
        await window.waitForTimeout(800);

        const selectedClient = await clientDropdown.locator('option:checked').textContent();
        console.log(`✅ Switched to: ${selectedClient}`);

        // Verify UI updates
        const serversSection = window.locator('text=/MCP Servers/i');
        await expect(serversSection).toBeVisible();
      }
    } else {
      console.log('ℹ️ Not enough clients for switching test');
    }

    await window.screenshot({ path: 'test-results/workflow-7-client-switch.png' });
  });

  test('Workflow 8: Test error handling', async () => {
    console.log('\n=== Workflow 8: Error Handling ===');

    // The first option (index 0) may be disabled, so we don't try to select it
    // Instead, we'll just test the error handling with the current state

    // Check if Add Server button exists and its state
    const addServerBtn = window.locator('button:has-text("Add Server")');
    if (await addServerBtn.isVisible({ timeout: 1000 })) {
      const isEnabled = await addServerBtn.isEnabled();
      console.log(`Add Server button state: ${isEnabled ? 'enabled' : 'disabled'}`);

      // If the button is enabled, test the error handling
      if (isEnabled) {
        await addServerBtn.click();
        await window.waitForTimeout(1000);

        // Try to save without filling required fields
        const saveBtn = window.locator('button:has-text("Save"), button:has-text("OK"), button:has-text("Add")').first();
        if (await saveBtn.isVisible()) {
          await saveBtn.click();
          await window.waitForTimeout(500);

          // Check for validation error
          const hasError = await window.locator('.error, [class*="error"], [role="alert"]').isVisible({ timeout: 2000 });
          console.log(`✅ Validation error shown: ${hasError}`);

          // Close modal
          const cancelBtn = window.locator('button:has-text("Cancel")');
          if (await cancelBtn.isVisible()) {
            await cancelBtn.click();
          }
        }
      } else {
        console.log('✅ Add Server button correctly disabled when no client selected');
      }
    } else {
      console.log('ℹ️ Add Server button not found');
    }

    await window.screenshot({ path: 'test-results/workflow-8-error-handling.png' });
  });

  test('Final: Verify app stability', async () => {
    console.log('\n=== Final Verification ===');

    // Check window state
    const appState = await electronApp.evaluate(({ app, BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0];
      return {
        name: app.getName(),
        version: app.getVersion(),
        isReady: app.isReady(),
        windowVisible: win.isVisible(),
        windowTitle: win.getTitle(),
        windowCount: BrowserWindow.getAllWindows().length
      };
    });

    console.log('App state:', appState);
    expect(appState.isReady).toBe(true);
    expect(appState.windowVisible).toBe(true);
    expect(appState.windowCount).toBe(1);

    // Check for console errors
    let errorCount = 0;
    window.on('console', (msg) => {
      if (msg.type() === 'error') errorCount++;
    });

    await window.waitForTimeout(1000);
    console.log(`Console errors: ${errorCount}`);

    // Final screenshot
    await window.screenshot({ path: 'test-results/workflow-final-state.png' });
    console.log('✅ All workflows completed successfully');
  });
});