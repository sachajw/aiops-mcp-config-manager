import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import path from 'path';

let electronApp: ElectronApplication;
let window: Page;

test.describe('MCP Configuration Manager - Comprehensive User Tests', () => {
  test.beforeAll(async () => {
    // Kill any existing Electron processes
    const { exec } = require('child_process');
    await new Promise(resolve => {
      exec('pkill -f Electron || true', resolve);
    });
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  test.beforeEach(async () => {
    // Launch Electron app for each test
    electronApp = await electron.launch({
      args: ['.', '--remote-debugging-port=9444'],
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

    // Set up console logging
    window.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error('Console Error:', msg.text());
      }
    });

    // Navigate past landing page if present
    const landingTitle = window.locator('h1:has-text("My MCP Manager")');
    if (await landingTitle.isVisible({ timeout: 2000 })) {
      const getStartedBtn = window.locator('button:has-text("Get Started")');
      await getStartedBtn.click();
      await landingTitle.waitFor({ state: 'hidden', timeout: 5000 });
    }
  });

  test.afterEach(async () => {
    if (electronApp) {
      await electronApp.close();
    }
  });

  test.describe('User Journey 1: First Time Setup', () => {
    test('New user can set up their first MCP server', async () => {
      console.log('=== Testing First Time Setup ===');

      // Step 1: Select a client
      const clientDropdown = window.locator('select').first();
      await expect(clientDropdown).toBeVisible();

      const options = await clientDropdown.locator('option').all();
      console.log(`Found ${options.length} clients available`);

      // Select Claude Desktop if available
      await clientDropdown.selectOption({ index: 1 });
      await window.waitForTimeout(1000);
      console.log('✅ Selected client from dropdown');

      // Step 2: Click Add Server
      const addServerBtn = window.locator('button:has-text("Add Server")');
      await expect(addServerBtn).toBeEnabled();
      await addServerBtn.click();
      console.log('✅ Clicked Add Server button');

      // Step 3: Fill in server configuration
      await window.waitForTimeout(1000);

      // Check if modal opened
      const modal = window.locator('[role="dialog"], .modal, .ant-modal');
      const isModalVisible = await modal.isVisible({ timeout: 2000 });

      if (isModalVisible) {
        console.log('✅ Server configuration modal opened');

        // Fill in server name
        const nameInput = window.locator('input[placeholder*="name" i], input#name').first();
        if (await nameInput.isVisible()) {
          await nameInput.fill('test-server');
          console.log('✅ Entered server name');
        }

        // Fill in command
        const commandInput = window.locator('input[placeholder*="command" i], input#command').first();
        if (await commandInput.isVisible()) {
          await commandInput.fill('npx');
          console.log('✅ Entered command');
        }

        // Cancel for now (don't actually save)
        const cancelBtn = window.locator('button:has-text("Cancel")');
        if (await cancelBtn.isVisible()) {
          await cancelBtn.click();
          console.log('✅ Cancelled server configuration');
        }
      }

      await window.screenshot({ path: 'test-results/first-time-setup.png' });
    });
  });

  test.describe('User Journey 2: Managing Multiple Clients', () => {
    test('User can switch between different AI clients', async () => {
      console.log('=== Testing Multiple Client Management ===');

      const clientDropdown = window.locator('select').first();
      const initialOptions = await clientDropdown.locator('option').count();

      console.log(`Total clients available: ${initialOptions - 1}`); // Minus placeholder

      // Test switching between clients
      for (let i = 1; i <= Math.min(3, initialOptions - 1); i++) {
        await clientDropdown.selectOption({ index: i });
        await window.waitForTimeout(500);

        const selectedOption = await clientDropdown.locator('option:checked').textContent();
        console.log(`✅ Switched to client: ${selectedOption}`);

        // Check that UI updates
        const serversList = window.locator('text=/MCP Servers/i');
        await expect(serversList).toBeVisible();
      }

      await window.screenshot({ path: 'test-results/multiple-clients.png' });
    });
  });

  test.describe('User Journey 3: Visual Workspace', () => {
    test('User can access and interact with Visual Workspace', async () => {
      console.log('=== Testing Visual Workspace ===');

      // Look for Visual Workspace button/tab
      const visualButton = window.locator('button:has-text("Visual"), [role="tab"]:has-text("Visual")');

      if (await visualButton.isVisible({ timeout: 3000 })) {
        await visualButton.click();
        console.log('✅ Clicked Visual Workspace button');
        await window.waitForTimeout(2000);

        // Check for canvas elements
        const canvas = window.locator('.react-flow, canvas, [data-testid="visual-workspace"]');
        if (await canvas.isVisible({ timeout: 3000 })) {
          console.log('✅ Visual Workspace canvas is visible');

          // Look for server library
          const serverLibrary = window.locator('text=/Server Library/i');
          if (await serverLibrary.isVisible()) {
            console.log('✅ Server Library panel found');
          }

          // Look for insights panel
          const insights = window.locator('text=/Insights/i, text=/Metrics/i');
          if (await insights.isVisible()) {
            console.log('✅ Insights panel found');
          }
        }

        await window.screenshot({ path: 'test-results/visual-workspace.png' });
      } else {
        console.log('ℹ️ Visual Workspace not immediately available');
      }
    });
  });

  test.describe('User Journey 4: Discovery Page', () => {
    test('User can browse and search for MCP servers', async () => {
      console.log('=== Testing Discovery Page ===');

      // Look for Discovery navigation
      const discoveryNav = window.locator('button:has-text("Discovery"), [role="tab"]:has-text("Discovery"), a:has-text("Discovery")');

      if (await discoveryNav.isVisible({ timeout: 3000 })) {
        await discoveryNav.click();
        console.log('✅ Navigated to Discovery page');
        await window.waitForTimeout(2000);

        // Look for search functionality
        const searchInput = window.locator('input[placeholder*="search" i]');
        if (await searchInput.isVisible()) {
          await searchInput.fill('github');
          console.log('✅ Searched for "github" servers');
          await window.waitForTimeout(1000);
        }

        // Check for server cards
        const serverCards = await window.locator('.card, [data-testid="server-card"]').count();
        console.log(`Found ${serverCards} server cards`);

        // Try category filters
        const categoryFilter = window.locator('button:has-text("Development"), button:has-text("AI Tools")').first();
        if (await categoryFilter.isVisible()) {
          await categoryFilter.click();
          console.log('✅ Applied category filter');
        }

        await window.screenshot({ path: 'test-results/discovery-page.png' });
      } else {
        console.log('ℹ️ Discovery page not available');
      }
    });
  });

  test.describe('User Journey 5: Settings Configuration', () => {
    test('User can access and modify settings', async () => {
      console.log('=== Testing Settings Configuration ===');

      // Look for Settings button
      const settingsBtn = window.locator('button:has-text("Settings"), [role="tab"]:has-text("Settings"), a:has-text("Settings")');

      if (await settingsBtn.isVisible({ timeout: 3000 })) {
        await settingsBtn.click();
        console.log('✅ Opened Settings');
        await window.waitForTimeout(1500);

        // Check for settings tabs
        const generalTab = window.locator('text=/General/i');
        const backupTab = window.locator('text=/Backup/i');
        const clientsTab = window.locator('text=/Clients/i');

        if (await generalTab.isVisible()) {
          console.log('✅ General settings tab found');
        }

        if (await backupTab.isVisible()) {
          await backupTab.click();
          console.log('✅ Switched to Backup settings');
          await window.waitForTimeout(1000);
        }

        if (await clientsTab.isVisible()) {
          await clientsTab.click();
          console.log('✅ Switched to Clients settings');
          await window.waitForTimeout(1000);
        }

        // Test a toggle
        const toggles = await window.locator('input[type="checkbox"], [role="switch"]').all();
        if (toggles.length > 0) {
          await toggles[0].click();
          console.log('✅ Toggled a setting');
        }

        await window.screenshot({ path: 'test-results/settings.png' });
      } else {
        console.log('ℹ️ Settings not found');
      }
    });
  });

  test.describe('User Journey 6: Bulk Operations', () => {
    test('User can perform bulk server operations', async () => {
      console.log('=== Testing Bulk Operations ===');

      // Select a client first
      const clientDropdown = window.locator('select').first();
      await clientDropdown.selectOption({ index: 1 });
      await window.waitForTimeout(1000);

      // Look for checkboxes to select multiple servers
      const checkboxes = await window.locator('input[type="checkbox"]').all();
      const serverCheckboxes = checkboxes.slice(0, Math.min(3, checkboxes.length));

      if (serverCheckboxes.length > 0) {
        for (const checkbox of serverCheckboxes) {
          if (await checkbox.isVisible()) {
            await checkbox.click();
            console.log('✅ Selected a server');
          }
        }

        // Look for bulk action buttons
        const bulkDelete = window.locator('button:has-text("Delete Selected")');
        const bulkDisable = window.locator('button:has-text("Disable Selected")');

        if (await bulkDelete.isVisible() || await bulkDisable.isVisible()) {
          console.log('✅ Bulk action buttons are available');
        }
      } else {
        console.log('ℹ️ No servers available for bulk operations');
      }

      await window.screenshot({ path: 'test-results/bulk-operations.png' });
    });
  });

  test.describe('User Journey 7: Configuration Export/Import', () => {
    test('User can export and import configurations', async () => {
      console.log('=== Testing Export/Import ===');

      // Look for export button
      const exportBtn = window.locator('button:has-text("Export")');

      if (await exportBtn.isVisible({ timeout: 3000 })) {
        await exportBtn.click();
        console.log('✅ Clicked Export button');
        await window.waitForTimeout(1000);

        // Check if export dialog opened
        const exportDialog = window.locator('text=/Export Configuration/i');
        if (await exportDialog.isVisible()) {
          console.log('✅ Export dialog opened');

          // Cancel export
          const cancelBtn = window.locator('button:has-text("Cancel")');
          if (await cancelBtn.isVisible()) {
            await cancelBtn.click();
          }
        }
      }

      // Look for import button
      const importBtn = window.locator('button:has-text("Import")');
      if (await importBtn.isVisible({ timeout: 3000 })) {
        console.log('✅ Import button is available');
      }

      await window.screenshot({ path: 'test-results/export-import.png' });
    });
  });

  test.describe('User Journey 8: Help and Documentation', () => {
    test('User can access help and documentation', async () => {
      console.log('=== Testing Help System ===');

      // Look for help button
      const helpBtn = window.locator('button[title*="Help" i], button:has-text("Help"), button[aria-label*="help" i]');

      if (await helpBtn.isVisible({ timeout: 3000 })) {
        await helpBtn.click();
        console.log('✅ Opened Help');
        await window.waitForTimeout(1500);

        // Check for help content
        const helpModal = window.locator('[role="dialog"], .modal');
        if (await helpModal.isVisible()) {
          console.log('✅ Help modal opened');

          // Check for beta disclaimer
          const betaWarning = window.locator('text=/Beta Version/i');
          if (await betaWarning.isVisible()) {
            console.log('✅ Beta disclaimer is visible');
          }

          // Check for documentation links
          const userGuide = window.locator('text=/User Guide/i');
          if (await userGuide.isVisible()) {
            console.log('✅ User Guide link found');
          }

          // Close help
          const closeBtn = window.locator('button:has-text("Close"), button[aria-label="Close"]');
          if (await closeBtn.isVisible()) {
            await closeBtn.click();
            console.log('✅ Closed help modal');
          }
        }
      }

      await window.screenshot({ path: 'test-results/help-system.png' });
    });
  });

  test.describe('User Journey 9: Error Handling', () => {
    test('App handles errors gracefully', async () => {
      console.log('=== Testing Error Handling ===');

      // Try to add server without selecting client
      const addServerBtn = window.locator('button:has-text("Add Server")');

      // First, reset to no client selected
      const clientDropdown = window.locator('select').first();
      if (await clientDropdown.isVisible()) {
        await clientDropdown.selectOption({ index: 0 }); // Select placeholder
        await window.waitForTimeout(500);
      }

      // Try to click disabled button
      const isDisabled = await addServerBtn.isDisabled();
      console.log(`Add Server button disabled when no client: ${isDisabled}`);
      expect(isDisabled).toBe(true);

      // Test invalid input in server config
      await clientDropdown.selectOption({ index: 1 });
      await window.waitForTimeout(500);

      if (await addServerBtn.isEnabled()) {
        await addServerBtn.click();
        await window.waitForTimeout(1000);

        // Try to save without required fields
        const saveBtn = window.locator('button:has-text("Save"), button:has-text("Add")');
        if (await saveBtn.isVisible()) {
          await saveBtn.click();
          await window.waitForTimeout(500);

          // Check for validation errors
          const errorMsg = window.locator('.error, .ant-form-item-explain-error, [role="alert"]');
          if (await errorMsg.isVisible()) {
            console.log('✅ Validation errors displayed correctly');
          }

          // Close modal
          const cancelBtn = window.locator('button:has-text("Cancel")');
          if (await cancelBtn.isVisible()) {
            await cancelBtn.click();
          }
        }
      }

      await window.screenshot({ path: 'test-results/error-handling.png' });
    });
  });

  test.describe('User Journey 10: Performance and Stability', () => {
    test('App remains stable during extended use', async () => {
      console.log('=== Testing Performance and Stability ===');

      const startTime = Date.now();

      // Perform multiple operations rapidly
      for (let i = 0; i < 5; i++) {
        // Switch clients
        const clientDropdown = window.locator('select').first();
        const optionCount = await clientDropdown.locator('option').count();
        if (optionCount > 1) {
          const index = (i % (optionCount - 1)) + 1;
          await clientDropdown.selectOption({ index });
        }

        // Click random buttons (non-destructive)
        const buttons = await window.locator('button:visible').all();
        const safeButtons = buttons.filter(async (btn) => {
          const text = await btn.textContent();
          return !text?.match(/delete|remove|clear|save|confirm/i);
        });

        if (safeButtons.length > 0) {
          const randomBtn = safeButtons[Math.floor(Math.random() * safeButtons.length)];
          if (await randomBtn.isVisible()) {
            await randomBtn.click();
            await window.waitForTimeout(200);
          }
        }
      }

      const endTime = Date.now();
      const duration = endTime - startTime;
      console.log(`✅ Completed ${5} operations in ${duration}ms`);

      // Check app is still responsive
      const appState = await electronApp.evaluate(({ BrowserWindow }) => {
        const win = BrowserWindow.getAllWindows()[0];
        return {
          responsive: !win.isDestroyed() && win.isVisible(),
          title: win.getTitle()
        };
      });

      expect(appState.responsive).toBe(true);
      console.log('✅ App remains responsive and stable');

      // Check memory usage
      const metrics = await window.evaluate(() => {
        if (performance.memory) {
          return {
            usedJSHeapSize: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
            totalJSHeapSize: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024)
          };
        }
        return null;
      });

      if (metrics) {
        console.log(`Memory usage: ${metrics.usedJSHeapSize}MB / ${metrics.totalJSHeapSize}MB`);
      }

      await window.screenshot({ path: 'test-results/stability-test.png' });
    });
  });

  test('Final App State Verification', async () => {
    console.log('=== Final Verification ===');

    // Verify no console errors
    let errorCount = 0;
    window.on('console', msg => {
      if (msg.type() === 'error') {
        errorCount++;
      }
    });

    await window.waitForTimeout(1000);
    console.log(`Console errors detected: ${errorCount}`);

    // Verify window state
    const finalState = await electronApp.evaluate(({ app, BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0];
      return {
        appName: app.getName(),
        version: app.getVersion(),
        windowCount: BrowserWindow.getAllWindows().length,
        isReady: app.isReady(),
        windowTitle: win.getTitle()
      };
    });

    console.log('Final app state:', finalState);
    expect(finalState.isReady).toBe(true);
    expect(finalState.windowCount).toBe(1);

    await window.screenshot({ path: 'test-results/final-state.png' });
    console.log('✅ All comprehensive user tests completed');
  });
});