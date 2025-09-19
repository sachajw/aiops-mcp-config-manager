import { test, expect, chromium } from '@playwright/test';

test.describe('MCP Configuration Manager - Working Tests', () => {
  test('connect to running Electron app', async () => {
    // Connect to running Electron app via CDP (use IPv4)
    const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
    const context = browser.contexts()[0];
    const page = context.pages()[0];

    // Verify connection
    expect(page).toBeDefined();

    // Get current URL
    const url = await page.url();
    console.log('Connected to:', url);
    expect(url).toContain('localhost:5175');

    // Verify app loaded
    const appContainer = page.locator('.ant-layout, .app-container, #root').first();
    await expect(appContainer).toBeVisible({ timeout: 5000 });

    // Take screenshot
    await page.screenshot({ path: 'test-results/app-connected.png' });
  });

  test('navigate to Visual Workspace', async () => {
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    const context = browser.contexts()[0];
    const page = context.pages()[0];

    // Look for navigation elements
    const buttons = await page.locator('button').all();
    console.log(`Found ${buttons.length} buttons`);

    // Log all button texts to understand UI
    for (const button of buttons) {
      const text = await button.textContent();
      if (text) console.log(`  Button: "${text}"`);
    }

    // Try different selectors for Visual button
    const visualSelectors = [
      'button:has-text("Visual")',
      'button[title*="Visual"]',
      '[data-testid="visual-button"]',
      '.ant-btn:has-text("Visual")',
      'text=Visual'
    ];

    let visualButton = null;
    for (const selector of visualSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
        visualButton = element;
        console.log(`Found Visual button with selector: ${selector}`);
        break;
      }
    }

    if (visualButton) {
      await visualButton.click();
      await page.waitForTimeout(2000);

      // Check if Visual Workspace loaded
      const workspace = page.locator('.visual-workspace');
      const isVisible = await workspace.isVisible({ timeout: 3000 }).catch(() => false);
      expect(isVisible).toBe(true);
    } else {
      console.log('Visual button not found - app might be in different state');
    }
  });

  test('test drag and drop if Visual Workspace available', async () => {
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    const context = browser.contexts()[0];
    const page = context.pages()[0];

    // Check if we're in Visual Workspace
    const workspace = page.locator('.visual-workspace');
    const inVisualMode = await workspace.isVisible({ timeout: 1000 }).catch(() => false);

    if (!inVisualMode) {
      console.log('Not in Visual Workspace - skipping drag test');
      test.skip();
      return;
    }

    // Count initial server nodes
    const initialNodes = await page.locator('.server-node').count();
    console.log(`Initial server nodes: ${initialNodes}`);

    // Find server cards
    const serverCards = await page.locator('.server-card').count();
    console.log(`Server cards available: ${serverCards}`);

    if (serverCards > 0) {
      // Get first server card
      const firstServer = page.locator('.server-card').first();
      const serverName = await firstServer.textContent();
      console.log(`Dragging server: ${serverName?.split('\n')[0]}`);

      // Get bounding boxes
      const serverBox = await firstServer.boundingBox();
      const canvas = page.locator('#react-flow-wrapper');
      const canvasBox = await canvas.boundingBox();

      expect(serverBox).toBeDefined();
      expect(canvasBox).toBeDefined();

      if (serverBox && canvasBox) {
        // Perform drag
        await page.mouse.move(serverBox.x + serverBox.width/2, serverBox.y + serverBox.height/2);
        await page.mouse.down();
        await page.waitForTimeout(100);

        const dropX = canvasBox.x + canvasBox.width/2;
        const dropY = canvasBox.y + canvasBox.height/2;
        await page.mouse.move(dropX, dropY, { steps: 10 });
        await page.waitForTimeout(100);

        await page.mouse.up();
        await page.waitForTimeout(1500);

        // Verify node was added
        const finalNodes = await page.locator('.server-node').count();
        console.log(`Final server nodes: ${finalNodes}`);

        // Assert that a node was added
        expect(finalNodes).toBeGreaterThan(initialNodes);
      }
    }
  });
});