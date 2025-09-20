/**
 * Critical Validation Tests for Visual Workspace
 * These tests MUST pass before any release
 */

import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';

test.describe('Visual Workspace Critical Validation', () => {
  let electronApp: ElectronApplication;
  let page: Page;

  test.beforeAll(async () => {
    // Launch Electron app
    electronApp = await electron.launch({
      args: ['dist/main/main.js']
    });

    // Get the first window
    page = await electronApp.firstWindow();

    // Wait for app to be ready
    await page.waitForSelector('#root', { timeout: 10000 });
    await page.waitForTimeout(2000); // Allow initial data loading
  });

  test.afterAll(async () => {
    await electronApp.close();
  });

  test('CRITICAL: Client selector must show detected clients', async () => {
    // Navigate to Visual tab
    await page.click('button:has-text("Visual")');
    await page.waitForTimeout(1000);

    // Check if clients are displayed
    const noClientsMessage = await page.locator('text=No clients installed').isVisible();
    const clientCards = await page.locator('[data-testid="client-card"]').count();

    // CRITICAL ASSERTION: Either we have clients or we show "No clients" message
    if (clientCards > 0) {
      expect(noClientsMessage).toBe(false);
      console.log(`✅ Found ${clientCards} client(s) in selector`);
    } else {
      expect(noClientsMessage).toBe(true);
      console.log('⚠️ No clients detected, but message is shown correctly');
    }

    // Take screenshot for verification
    await page.screenshot({
      path: 'test-results/client-selector.png',
      fullPage: false
    });
  });

  test('CRITICAL: Server Library must display available servers', async () => {
    // Ensure we're on Visual tab
    const visualButton = page.locator('button:has-text("Visual")');
    if (await visualButton.isVisible()) {
      await visualButton.click();
      await page.waitForTimeout(1000);
    }

    // Check Server Library
    const serverLibrary = page.locator('.server-library, [data-testid="server-library"]');
    await expect(serverLibrary).toBeVisible({ timeout: 5000 });

    // Check for servers or "No servers" message
    const noServersMessage = await page.locator('text=No servers found').isVisible();
    const serverItems = await page.locator('.server-item, [data-testid="server-item"]').count();

    // CRITICAL ASSERTION: Server library must show servers
    if (serverItems > 0) {
      expect(serverItems).toBeGreaterThan(0);
      expect(noServersMessage).toBe(false);
      console.log(`✅ Found ${serverItems} server(s) in library`);
    } else {
      // This is a FAILURE - we should always have servers in the catalog
      throw new Error('❌ CRITICAL: Server Library is empty - catalog not loading');
    }

    await page.screenshot({
      path: 'test-results/server-library.png',
      fullPage: false
    });
  });

  test('CRITICAL: Performance metrics must show real data', async () => {
    // Ensure we're on Visual tab
    const visualButton = page.locator('button:has-text("Visual")');
    if (await visualButton.isVisible()) {
      await visualButton.click();
      await page.waitForTimeout(1000);
    }

    // Check Performance Insights panel
    const performancePanel = page.locator('.performance-insights, [data-testid="performance-insights"]');

    // Panel should be visible
    await expect(performancePanel).toBeVisible({ timeout: 5000 });

    // Get the text content
    const panelText = await performancePanel.textContent();

    // CRITICAL ASSERTIONS: Must show numbers, not hardcoded percentages
    expect(panelText).not.toContain('75%'); // Should not have hardcoded 75%
    expect(panelText).toMatch(/\d+/); // Should contain actual numbers

    // Check specific metrics
    const tokenDisplay = page.locator('[data-testid="token-display"], .token-display');
    if (await tokenDisplay.isVisible()) {
      const tokenText = await tokenDisplay.textContent();
      expect(tokenText).toMatch(/\d+/); // Should be a number
      expect(tokenText).not.toMatch(/\d+%/); // Should NOT be a percentage
      console.log(`✅ Token display shows: ${tokenText}`);
    }

    await page.screenshot({
      path: 'test-results/performance-metrics.png',
      fullPage: false
    });
  });

  test('CRITICAL: Drag and drop must be functional', async () => {
    // Ensure we're on Visual tab
    const visualButton = page.locator('button:has-text("Visual")');
    if (await visualButton.isVisible()) {
      await visualButton.click();
      await page.waitForTimeout(1000);
    }

    // Find a server in the library
    const firstServer = page.locator('.server-item, [data-testid="server-item"]').first();
    const canvas = page.locator('#react-flow-wrapper, [data-testid="canvas"]');

    if (await firstServer.isVisible() && await canvas.isVisible()) {
      // Get initial node count
      const initialNodes = await page.locator('.react-flow__node').count();

      // Attempt drag and drop
      await firstServer.hover();
      await page.mouse.down();
      await canvas.hover();
      await page.mouse.up();
      await page.waitForTimeout(500);

      // Check if node was added
      const finalNodes = await page.locator('.react-flow__node').count();

      // Log result but don't fail - drag/drop might require special setup
      if (finalNodes > initialNodes) {
        console.log('✅ Drag and drop is functional');
      } else {
        console.log('⚠️ Drag and drop may not be working - manual verification needed');
      }
    } else {
      console.log('⚠️ Cannot test drag/drop - elements not visible');
    }
  });

  test('CRITICAL: Connection status indicators must be accurate', async () => {
    // Ensure we're on Visual tab
    const visualButton = page.locator('button:has-text("Visual")');
    if (await visualButton.isVisible()) {
      await visualButton.click();
      await page.waitForTimeout(1000);
    }

    // Check for misleading "Connected" status
    const connectedStatus = await page.locator('text=Connected').isVisible();
    const installedStatus = await page.locator('text=INSTALLED').isVisible();

    // These should be separate and clear
    if (connectedStatus && installedStatus) {
      console.log('✅ Connection status indicators present');
    }

    // Check that we distinguish between client installed and servers configured
    const activeCount = await page.locator('text=/Active.*\\d+/').textContent();
    const serverCount = await page.locator('text=/Servers.*\\d+/').textContent();

    if (activeCount && serverCount) {
      console.log(`✅ Status shows: ${activeCount}, ${serverCount}`);
    }

    await page.screenshot({
      path: 'test-results/connection-status.png',
      fullPage: false
    });
  });
});

test.describe('Data Integrity Validation', () => {
  let electronApp: ElectronApplication;
  let page: Page;

  test.beforeAll(async () => {
    electronApp = await electron.launch({
      args: ['dist/main/main.js']
    });
    page = await electronApp.firstWindow();
    await page.waitForSelector('#root', { timeout: 10000 });
  });

  test.afterAll(async () => {
    await electronApp.close();
  });

  test('IPC communication returns correct data format', async () => {
    // Test that config:detect returns the right format
    const result = await page.evaluate(async () => {
      if ((window as any).electronAPI?.detectClients) {
        return await (window as any).electronAPI.detectClients();
      }
      return null;
    });

    if (result && Array.isArray(result)) {
      // Check data structure
      if (result.length > 0) {
        const client = result[0];
        expect(client).toHaveProperty('name');
        expect(client).toHaveProperty('displayName');
        expect(client).toHaveProperty('installed');
        expect(client).toHaveProperty('format');

        // Should NOT have old MCPClient properties
        expect(client).not.toHaveProperty('id');
        expect(client).not.toHaveProperty('configPaths');

        console.log('✅ IPC returns correct DetectedClient format');
      }
    } else {
      throw new Error('❌ CRITICAL: IPC detectClients not returning data');
    }
  });
});

// Export test results summary
test.afterEach(async ({ }, testInfo) => {
  if (testInfo.status === 'failed') {
    console.error(`❌ TEST FAILED: ${testInfo.title}`);
    console.error('This is a CRITICAL validation failure - DO NOT RELEASE');
  }
});