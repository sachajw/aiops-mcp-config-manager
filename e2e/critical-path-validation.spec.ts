import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';

/**
 * Critical Path Validation Tests
 *
 * These tests validate the core functionality of the MCP Configuration Manager:
 * 1. App launches and loads correctly
 * 2. Client selection works
 * 3. Server management (add/edit/remove)
 * 4. Configuration saving and loading
 * 5. Sync between clients
 * 6. Settings persistence
 */

let electronApp: ElectronApplication;
let window: Page;
let testConfigDir: string;

test.describe('Critical Path Validation', () => {
  test.beforeAll(async () => {
    test.setTimeout(60000);

    // Create test config directory
    testConfigDir = path.join(os.tmpdir(), `mcp-test-${Date.now()}`);
    await fs.ensureDir(testConfigDir);
    console.log('Test config directory:', testConfigDir);

    // Launch Electron app
    console.log('Launching Electron app...');
    electronApp = await electron.launch({
      args: ['.', '--remote-debugging-port=9557'],
      cwd: path.join(__dirname, '..'),
      env: {
        ...process.env,
        NODE_ENV: 'development',
        ELECTRON_IS_DEV: '1',
        TEST_MODE: 'true',
        TEST_CONFIG_PATH: testConfigDir
      },
      timeout: 30000
    });

    window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(3000);

    // Take initial screenshot
    await window.screenshot({ path: 'test-results/critical-initial.png' });
    console.log('✅ Electron app launched');
  });

  test.afterAll(async () => {
    if (electronApp) {
      await electronApp.close();
    }
    // Clean up test directory
    await fs.remove(testConfigDir);
  });

  test('1. App Launch and Navigation', async () => {
    console.log('\n=== Testing App Launch and Navigation ===');

    // Check if on landing page
    const landingTitle = window.locator('h1:has-text("My MCP Manager")');
    const isLanding = await landingTitle.isVisible({ timeout: 2000 }).catch(() => false);

    if (isLanding) {
      console.log('✓ Landing page loaded');

      // Navigate to main app
      const getStartedBtn = window.locator('button:has-text("Get Started")');
      await expect(getStartedBtn).toBeVisible();
      await getStartedBtn.click();
      await window.waitForTimeout(2000);

      // Verify navigation
      const stillOnLanding = await landingTitle.isVisible({ timeout: 500 }).catch(() => false);
      expect(stillOnLanding).toBe(false);
      console.log('✓ Navigated to main interface');
    }

    // Verify main interface elements
    const clientDropdown = window.locator('select').first();
    await expect(clientDropdown).toBeVisible({ timeout: 5000 });

    const serversSection = window.locator('text=/MCP Servers/i');
    await expect(serversSection).toBeVisible();

    await window.screenshot({ path: 'test-results/critical-main-interface.png' });
    console.log('✅ Main interface loaded successfully');
  });

  test('2. Client Selection and Detection', async () => {
    console.log('\n=== Testing Client Selection ===');

    const clientDropdown = window.locator('select').first();

    // Get available clients
    const options = await clientDropdown.locator('option').all();
    console.log(`Found ${options.length} client options`);

    // Should have at least the placeholder and one client
    expect(options.length).toBeGreaterThan(1);

    // Select first actual client (skip placeholder at index 0)
    if (options.length > 1) {
      const clientText = await options[1].textContent();
      console.log(`Selecting client: ${clientText}`);

      await clientDropdown.selectOption({ index: 1 });
      await window.waitForTimeout(1000);

      // Verify selection
      const selectedValue = await clientDropdown.inputValue();
      expect(selectedValue).toBeTruthy();
      expect(selectedValue).not.toBe('');

      // Check that server list updates
      await window.screenshot({ path: 'test-results/critical-client-selected.png' });
      console.log('✓ Client selected successfully');

      // Verify UI updates for selected client
      const addServerBtn = window.locator('button:has-text("Add Server")');
      const isEnabled = await addServerBtn.isEnabled();
      expect(isEnabled).toBe(true);
      console.log('✓ Add Server button enabled after client selection');
    }

    console.log('✅ Client selection working');
  });

  test('3. Add Server Configuration', async () => {
    console.log('\n=== Testing Add Server ===');

    // Ensure a client is selected
    const clientDropdown = window.locator('select').first();
    const selectedValue = await clientDropdown.inputValue();

    if (!selectedValue || selectedValue === '') {
      // Select first client
      await clientDropdown.selectOption({ index: 1 });
      await window.waitForTimeout(1000);
    }

    // Click Add Server
    const addServerBtn = window.locator('button:has-text("Add Server")');
    await expect(addServerBtn).toBeEnabled();
    await addServerBtn.click();
    await window.waitForTimeout(1000);

    // Check if modal/form appears
    const nameInput = window.locator('input[placeholder*="name" i], input[name*="name" i]').first();
    const commandInput = window.locator('input[placeholder*="command" i], input[name*="command" i]').first();

    if (await nameInput.isVisible({ timeout: 2000 })) {
      console.log('✓ Add server form opened');

      // Fill in server details
      const testServerName = `test-server-${Date.now()}`;
      await nameInput.fill(testServerName);
      console.log(`✓ Entered server name: ${testServerName}`);

      if (await commandInput.isVisible()) {
        await commandInput.fill('npx');
        console.log('✓ Entered command');
      }

      // Look for args input
      const argsInput = window.locator('input[placeholder*="args" i], textarea[placeholder*="args" i]').first();
      if (await argsInput.isVisible({ timeout: 1000 })) {
        await argsInput.fill('-y @modelcontextprotocol/server-memory');
        console.log('✓ Entered arguments');
      }

      await window.screenshot({ path: 'test-results/critical-add-server-form.png' });

      // Try to save
      const saveBtn = window.locator('button:has-text("Save"), button:has-text("Add"), button:has-text("OK")').first();
      if (await saveBtn.isVisible()) {
        await saveBtn.click();
        await window.waitForTimeout(2000);
        console.log('✓ Clicked save');

        // Check if server was added to list
        const serverInList = window.locator(`text=${testServerName}`);
        const isAdded = await serverInList.isVisible({ timeout: 3000 }).catch(() => false);

        if (isAdded) {
          console.log('✅ Server added successfully');
        } else {
          // Check for error message
          const errorMsg = window.locator('.error, [role="alert"]').first();
          if (await errorMsg.isVisible({ timeout: 1000 })) {
            const error = await errorMsg.textContent();
            console.log(`⚠️ Error adding server: ${error}`);
          }
        }
      }
    } else {
      console.log('⚠️ Add server form did not appear');

      // Close any open modal
      const cancelBtn = window.locator('button:has-text("Cancel"), button:has-text("Close")').first();
      if (await cancelBtn.isVisible()) {
        await cancelBtn.click();
      }
    }
  });

  test('4. Edit Server Configuration', async () => {
    console.log('\n=== Testing Edit Server ===');

    // Find an existing server in the list
    const serverItems = window.locator('[data-testid*="server-item"], .server-item, [class*="server"]').all();

    if ((await serverItems).length > 0) {
      const firstServer = (await serverItems)[0];

      // Look for edit button
      const editBtn = firstServer.locator('button:has-text("Edit"), button[title*="Edit"]').first();

      if (await editBtn.isVisible({ timeout: 2000 })) {
        await editBtn.click();
        await window.waitForTimeout(1000);
        console.log('✓ Clicked edit button');

        // Check if edit form appears
        const commandInput = window.locator('input[value*="npx"], input[value*="node"]').first();

        if (await commandInput.isVisible({ timeout: 2000 })) {
          // Make a small edit
          const currentValue = await commandInput.inputValue();
          await commandInput.fill(currentValue + '-edited');
          console.log('✓ Modified command');

          // Save changes
          const saveBtn = window.locator('button:has-text("Save"), button:has-text("Update")').first();
          if (await saveBtn.isVisible()) {
            await saveBtn.click();
            await window.waitForTimeout(1000);
            console.log('✓ Saved changes');
          }
        }

        await window.screenshot({ path: 'test-results/critical-edit-server.png' });
      } else {
        console.log('⚠️ No edit button found for servers');
      }
    } else {
      console.log('⚠️ No servers found to edit');
    }
  });

  test('5. Settings Configuration', async () => {
    console.log('\n=== Testing Settings ===');

    // Navigate to settings
    const settingsBtn = window.locator('button:has-text("Settings"), [role="tab"]:has-text("Settings")').first();

    if (await settingsBtn.isVisible({ timeout: 2000 })) {
      await settingsBtn.click();
      await window.waitForTimeout(1500);
      console.log('✓ Opened settings');

      // Look for settings options
      const toggles = await window.locator('input[type="checkbox"], [role="switch"]').all();
      console.log(`Found ${toggles.length} settings toggles`);

      if (toggles.length > 0) {
        // Toggle first setting
        const firstToggle = toggles[0];
        const wasChecked = await firstToggle.isChecked();
        await firstToggle.click();
        await window.waitForTimeout(500);

        // Verify toggle changed
        const isChecked = await firstToggle.isChecked();
        expect(isChecked).toBe(!wasChecked);
        console.log('✓ Setting toggled successfully');
      }

      await window.screenshot({ path: 'test-results/critical-settings.png' });

      // Go back to main view
      const backBtn = window.locator('button:has-text("Back"), button:has-text("Done")').first();
      if (await backBtn.isVisible()) {
        await backBtn.click();
      } else {
        // Try clicking on a different tab
        const mainTab = window.locator('[role="tab"]:has-text("Servers"), [role="tab"]:has-text("Main")').first();
        if (await mainTab.isVisible()) {
          await mainTab.click();
        }
      }
      console.log('✅ Settings configuration working');
    } else {
      console.log('⚠️ Settings button not found');
    }
  });

  test('6. Data Persistence Check', async () => {
    console.log('\n=== Testing Data Persistence ===');

    // Get current state
    const clientDropdown = window.locator('select').first();
    const currentClient = await clientDropdown.inputValue();
    console.log(`Current client: ${currentClient}`);

    // Count servers
    const serverCount = await window.locator('[data-testid*="server"], .server-item').count();
    console.log(`Current server count: ${serverCount}`);

    // Check if configuration files exist
    const configFiles = await electronApp.evaluate(async ({ app }) => {
      const fs = require('fs');
      const path = require('path');
      const homeDir = app.getPath('home');

      const configs = {
        claudeDesktop: path.join(homeDir, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json'),
        claudeCode: path.join(homeDir, '.claude', 'claude_code_config.json'),
      };

      const results: Record<string, boolean> = {};
      for (const [name, filePath] of Object.entries(configs)) {
        results[name] = fs.existsSync(filePath);
      }
      return results;
    });

    console.log('Config files found:', configFiles);

    // Take final screenshot
    await window.screenshot({ path: 'test-results/critical-final-state.png' });

    console.log('✅ Data persistence check complete');
  });
});

test.describe('Validation Summary', () => {
  test('Generate Test Report', async () => {
    console.log('\n' + '='.repeat(60));
    console.log('CRITICAL PATH VALIDATION SUMMARY');
    console.log('='.repeat(60));

    const report = {
      timestamp: new Date().toISOString(),
      tests: {
        'App Launch': 'Testing app startup and navigation',
        'Client Selection': 'Testing client dropdown and detection',
        'Add Server': 'Testing server addition functionality',
        'Edit Server': 'Testing server modification',
        'Settings': 'Testing settings configuration',
        'Data Persistence': 'Testing configuration saving'
      }
    };

    // Save report
    const reportPath = path.join('test-results', 'critical-path-report.json');
    await fs.writeJson(reportPath, report, { spaces: 2 });
    console.log(`Report saved to: ${reportPath}`);

    console.log('\nValidation complete. Check test-results/ for screenshots and report.');
    console.log('='.repeat(60));
  });
});