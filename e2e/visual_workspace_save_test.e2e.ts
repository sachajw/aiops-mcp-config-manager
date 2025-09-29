const { test, expect } = require('@playwright/test');
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

/**
 * Visual Workspace Save/Load Test
 * Testing drag-and-drop server persistence and config file updates
 */

test.describe('Visual Workspace - Save/Load Config Tests', () => {
  let page;
  let initialConfigContent = null;
  let configFilePath = null;

  test.beforeAll(async () => {
    console.log('🔗 Connecting to running Electron app...');
    const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
    const contexts = browser.contexts();

    if (contexts.length === 0) {
      throw new Error('No Electron app contexts found. Make sure Electron dev server is running.');
    }

    const context = contexts[0];
    const pages = context.pages();
    page = pages[0];

    await page.waitForLoadState('networkidle');
    console.log('✅ Connected to Electron app successfully');
  });

  test('SETUP: Navigate to Visual Workspace', async () => {
    console.log('🧪 Setting up Visual Workspace...');

    try {
      // Navigate from landing page if needed
      const getStartedButton = page.locator('button:has-text("Get Started")');
      if (await getStartedButton.isVisible()) {
        await getStartedButton.click();
        await page.waitForTimeout(2000);
      }

      // Look for Visual tab or Visual Workspace navigation
      await page.screenshot({ path: '/tmp/save_test_setup.png' });

      const visualTab = page.locator('button:has-text("Visual")');
      if (await visualTab.isVisible()) {
        console.log('✅ Found Visual tab, clicking...');
        await visualTab.click();
        await page.waitForTimeout(2000);
      } else {
        console.log('⚠️ Visual tab not immediately visible, checking other navigation...');

        // Try other possible navigation
        const tabs = await page.locator('button, [role="tab"], .tab').all();
        for (let i = 0; i < Math.min(tabs.length, 5); i++) {
          const tabText = await tabs[i].textContent();
          if (tabText && (tabText.includes('Visual') || tabText.includes('Canvas') || tabText.includes('Workspace'))) {
            console.log(`✅ Found ${tabText} tab, clicking...`);
            await tabs[i].click();
            await page.waitForTimeout(2000);
            break;
          }
        }
      }

      await page.screenshot({ path: '/tmp/save_test_visual_workspace.png' });
      console.log('✅ Visual Workspace navigation completed');

    } catch (error) {
      console.log(`❌ Setup failed: ${error.message}`);
      throw error;
    }
  });

  test('TEST 1: Check Initial Config File State', async () => {
    console.log('🧪 Test 1: Checking initial config file state...');

    try {
      // Take screenshot of current workspace
      await page.screenshot({ path: '/tmp/save_test_initial_state.png' });

      // Look for config file path indicator on the page
      const configPathElements = await page.locator('text*="/", text*=".json", text*="config"').all();

      if (configPathElements.length > 0) {
        for (const element of configPathElements) {
          const text = await element.textContent();
          if (text && text.includes('.json') && (text.includes('claude') || text.includes('config'))) {
            configFilePath = text.trim();
            console.log(`✅ Found config file path: ${configFilePath}`);
            break;
          }
        }
      }

      // If we didn't find path on page, use common Claude Desktop path
      if (!configFilePath) {
        configFilePath = '/Users/briandawson/Library/Application Support/Claude/claude_desktop_config.json';
        console.log(`⚠️ Using default config path: ${configFilePath}`);
      }

      // Read initial config file content
      if (fs.existsSync(configFilePath)) {
        initialConfigContent = fs.readFileSync(configFilePath, 'utf8');
        console.log(`✅ Read initial config file (${initialConfigContent.length} chars)`);

        // Count initial servers
        const initialConfig = JSON.parse(initialConfigContent);
        const serverCount = Object.keys(initialConfig.mcpServers || {}).length;
        console.log(`📊 Initial server count: ${serverCount}`);
      } else {
        console.log(`❌ Config file not found at: ${configFilePath}`);
      }

    } catch (error) {
      console.log(`❌ Test 1 failed: ${error.message}`);
      // Don't fail test, continue with testing
    }
  });

  test('TEST 2: Drag Server to Canvas', async () => {
    console.log('🧪 Test 2: Testing drag and drop server to canvas...');

    try {
      await page.screenshot({ path: '/tmp/save_test_before_drag.png' });

      // Look for server library and available servers
      const serverElements = await page.locator('[data-testid*="server"], .server-item, .draggable, button:has-text("Add"), .catalog-item').all();
      console.log(`Found ${serverElements.length} potential server elements`);

      let dragTarget = null;
      let serverName = null;

      // Find a server to drag
      for (let i = 0; i < Math.min(serverElements.length, 10); i++) {
        const element = serverElements[i];
        const text = await element.textContent();

        if (text && text.length > 0 && text.length < 50) {
          // Look for server-like names
          if (text.includes('mcp') || text.includes('server') || text.includes('tool') || /^[a-zA-Z-_]+$/.test(text.trim())) {
            dragTarget = element;
            serverName = text.trim();
            console.log(`🎯 Selected server for drag: "${serverName}"`);
            break;
          }
        }
      }

      if (!dragTarget) {
        // Try catalog/add button approach
        const addButtons = await page.locator('button:has-text("Add"), button:has-text("+"), .add-server').all();
        if (addButtons.length > 0) {
          console.log(`🎯 Found ${addButtons.length} add buttons, trying first one...`);
          await addButtons[0].click();
          await page.waitForTimeout(2000);

          // Look for server options in modal/dropdown
          const serverOptions = await page.locator('.server-option, .catalog-item, button[data-server]').all();
          if (serverOptions.length > 0) {
            dragTarget = serverOptions[0];
            serverName = await dragTarget.textContent() || 'test-server';
            console.log(`🎯 Found server option: "${serverName}"`);
          }
        }
      }

      if (dragTarget) {
        // Look for canvas/drop area
        const canvasArea = page.locator('.canvas, .workspace-canvas, .drop-zone, [data-testid*="canvas"]').first();

        if (await canvasArea.isVisible()) {
          console.log('✅ Found canvas area');

          // Perform drag and drop
          await dragTarget.dragTo(canvasArea);
          await page.waitForTimeout(3000);

          console.log(`✅ Attempted drag and drop of "${serverName}" to canvas`);
        } else {
          // Try direct click to add server
          console.log('⚠️ Canvas not found, trying direct click...');
          await dragTarget.click();
          await page.waitForTimeout(3000);
        }

        await page.screenshot({ path: '/tmp/save_test_after_drag.png' });

      } else {
        console.log('❌ No suitable server found for dragging');
        expect(false).toBe(true);
      }

    } catch (error) {
      console.log(`❌ Test 2 failed: ${error.message}`);
      throw error;
    }
  });

  test('TEST 3: Check Save Button State', async () => {
    console.log('🧪 Test 3: Checking save button activation...');

    try {
      await page.screenshot({ path: '/tmp/save_test_save_button.png' });

      // Look for save button
      const saveButtons = await page.locator('button:has-text("Save"), .save-button, [data-testid*="save"]').all();

      if (saveButtons.length > 0) {
        for (const saveBtn of saveButtons) {
          const isEnabled = await saveBtn.isEnabled();
          const isVisible = await saveBtn.isVisible();
          const text = await saveBtn.textContent();

          console.log(`Save button "${text}": enabled=${isEnabled}, visible=${isVisible}`);

          if (isVisible && !isEnabled) {
            console.log('❌ ISSUE CONFIRMED: Save button is NOT activated after drag');
          } else if (isVisible && isEnabled) {
            console.log('✅ Save button is properly activated');
          }
        }
      } else {
        console.log('❌ No save button found');
      }

      // Check for auto-save indicator
      const autoSaveElements = await page.locator('text*="auto", text*="Auto", .auto-save').all();
      for (const element of autoSaveElements) {
        const text = await element.textContent();
        console.log(`Auto-save indicator: "${text}"`);
      }

    } catch (error) {
      console.log(`❌ Test 3 failed: ${error.message}`);
    }
  });

  test('TEST 4: Check Config File Update', async () => {
    console.log('🧪 Test 4: Checking config file update...');

    try {
      // Wait a moment for potential auto-save
      await page.waitForTimeout(2000);

      if (configFilePath && fs.existsSync(configFilePath)) {
        const currentConfigContent = fs.readFileSync(configFilePath, 'utf8');

        // Compare with initial content
        const contentChanged = currentConfigContent !== initialConfigContent;
        console.log(`Config file changed: ${contentChanged}`);

        if (!contentChanged) {
          console.log('❌ ISSUE CONFIRMED: Config file NOT updated after drag');
        } else {
          console.log('✅ Config file was updated');

          // Analyze changes
          try {
            const initialConfig = JSON.parse(initialConfigContent || '{}');
            const currentConfig = JSON.parse(currentConfigContent);

            const initialServers = Object.keys(initialConfig.mcpServers || {}).length;
            const currentServers = Object.keys(currentConfig.mcpServers || {}).length;

            console.log(`Server count: ${initialServers} → ${currentServers}`);

            if (currentServers > initialServers) {
              console.log('✅ New server added to config');
            } else {
              console.log('❌ No new servers in config despite UI change');
            }
          } catch (parseError) {
            console.log(`⚠️ Could not parse config: ${parseError.message}`);
          }
        }
      } else {
        console.log('❌ Config file not accessible');
      }

    } catch (error) {
      console.log(`❌ Test 4 failed: ${error.message}`);
    }
  });

  test('TEST 5: Refresh and Check Persistence', async () => {
    console.log('🧪 Test 5: Testing persistence after refresh...');

    try {
      // Take screenshot before refresh
      await page.screenshot({ path: '/tmp/save_test_before_refresh.png' });

      // Count canvas items before refresh
      const canvasItemsBefore = await page.locator('.canvas-item, .server-node, [data-testid*="server-node"]').count();
      console.log(`Canvas items before refresh: ${canvasItemsBefore}`);

      // Refresh the page
      console.log('🔄 Refreshing page...');
      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      // Navigate back to Visual Workspace if needed
      const visualTab = page.locator('button:has-text("Visual")');
      if (await visualTab.isVisible()) {
        await visualTab.click();
        await page.waitForTimeout(2000);
      }

      // Take screenshot after refresh
      await page.screenshot({ path: '/tmp/save_test_after_refresh.png' });

      // Count canvas items after refresh
      const canvasItemsAfter = await page.locator('.canvas-item, .server-node, [data-testid*="server-node"]').count();
      console.log(`Canvas items after refresh: ${canvasItemsAfter}`);

      if (canvasItemsAfter < canvasItemsBefore) {
        console.log('❌ ISSUE CONFIRMED: Server disappeared after refresh (not persisted)');
      } else if (canvasItemsAfter >= canvasItemsBefore) {
        console.log('✅ Canvas items persisted after refresh');
      }

    } catch (error) {
      console.log(`❌ Test 5 failed: ${error.message}`);
    }
  });

  test.afterAll(async () => {
    console.log('🎯 Visual Workspace Save/Load test completed');
    console.log('📸 Screenshots saved to /tmp/save_test_*.png');
  });
});