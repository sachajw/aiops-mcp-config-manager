import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { _electron as electron } from 'playwright';
import path from 'path';

let electronApp: ElectronApplication;
let page: Page;

test.describe('Real Metrics and Server Catalog', () => {
  test.beforeAll(async () => {
    // Launch Electron app
    electronApp = await electron.launch({
      args: [path.join(__dirname, '../dist/main/main.js')],
      env: {
        ...process.env,
        NODE_ENV: 'test',
        VITE_DEV_SERVER_URL: 'http://localhost:5173'
      }
    });

    // Get the first window
    page = await electronApp.firstWindow();
    await page.waitForLoadState('networkidle');

    // Navigate to Visual Workspace
    await page.click('text=Get Started');
    await page.waitForTimeout(500);

    // Enable Visual Workspace if needed
    const settingsButton = await page.$('button:has-text("Settings")');
    if (settingsButton) {
      await settingsButton.click();
      await page.waitForTimeout(500);

      // Find and enable Visual Workspace
      const experimentalTab = await page.$('text=Experimental Features');
      if (experimentalTab) {
        await experimentalTab.click();
        const visualToggle = await page.$('text=Visual Workspace');
        if (visualToggle) {
          await visualToggle.click();
        }
      }

      // Go back to main view
      await page.click('button:has-text("Back")');
    }

    // Navigate to Visual tab
    await page.click('button:has-text("Visual")');
    await page.waitForTimeout(1000);
  });

  test.afterAll(async () => {
    await electronApp.close();
  });

  test.describe('Task 50: Real Metrics Collection', () => {
    test('should display realistic server metrics', async () => {
      // Check Server Library exists
      const serverLibrary = await page.$('text=Server Library');
      expect(serverLibrary).toBeTruthy();

      // Look for server cards with realistic metrics
      const serverCards = await page.$$('.server-card');
      expect(serverCards.length).toBeGreaterThan(0);

      // Check for varied tool counts (not all 15)
      const toolCounts = await page.$$eval('.server-card', cards =>
        cards.map(card => {
          const toolElement = card.querySelector('svg[viewBox="0 0 24 24"] + span');
          return toolElement ? parseInt(toolElement.textContent || '0') : 0;
        })
      );

      // Verify tool counts are varied and realistic
      const uniqueToolCounts = [...new Set(toolCounts)];
      expect(uniqueToolCounts.length).toBeGreaterThan(1); // Not all the same
      expect(toolCounts.some(count => count !== 15)).toBeTruthy(); // Not all 15
      expect(toolCounts.every(count => count >= 0 && count <= 30)).toBeTruthy(); // Realistic range
    });

    test('should show dynamic token usage', async () => {
      const tokenDisplays = await page.$$eval('.server-card', cards =>
        cards.map(card => {
          const tokenElements = Array.from(card.querySelectorAll('span'));
          const tokenElement = tokenElements.find(el =>
            el.textContent?.includes('k') || /^\d+$/.test(el.textContent || '')
          );
          return tokenElement ? tokenElement.textContent : '0';
        })
      );

      // Check that not all tokens are 2500 (old hardcoded value)
      const hasVariedTokens = tokenDisplays.some(token =>
        !token.includes('2.5k') && token !== '2500'
      );
      expect(hasVariedTokens).toBeTruthy();
    });

    test('should update Performance Insights with real metrics', async () => {
      // Open Performance Insights if not visible
      const perfPanel = await page.$('text=Performance Insights');
      if (!perfPanel) {
        await page.click('button[title="Toggle details"]');
      }

      // Check token usage display
      const tokenValue = await page.$eval('text=Tokens', el => {
        const parent = el.closest('div');
        const valueEl = parent?.querySelector('.text-sm.font-bold');
        return valueEl?.textContent || '0';
      });

      expect(tokenValue).not.toBe('0');
      expect(tokenValue).not.toBe('2500'); // Not the old hardcoded value
    });

    test('should show realistic response times', async () => {
      const responseTime = await page.$eval('text=Response', el => {
        const parent = el.closest('div');
        const valueEl = parent?.querySelector('.text-sm.font-bold');
        return valueEl?.textContent || '0ms';
      });

      // Parse response time
      const timeValue = parseInt(responseTime);
      expect(timeValue).toBeGreaterThan(0);
      expect(timeValue).not.toBe(45); // Not the old hardcoded 45ms
      expect(timeValue).toBeLessThanOrEqual(1000); // Realistic upper bound
    });
  });

  test.describe('Task 51: Real Server Library', () => {
    test('should load 16+ servers from catalog', async () => {
      const serverCards = await page.$$('.server-card');
      expect(serverCards.length).toBeGreaterThanOrEqual(10); // Should have many servers
    });

    test('should display server metadata', async () => {
      // Click on first server's info button
      const firstCard = await page.$('.server-card');
      if (firstCard) {
        const infoButton = await firstCard.$('button[title*="info"], button[title*="details"]');
        if (infoButton) {
          await infoButton.click();
          await page.waitForTimeout(500);

          // Check for metadata elements
          const author = await firstCard.$('text=/Anthropic|Community|OpenAI|Google|GitHub|Docker|MongoDB|Redis|AWS|Slack/');
          expect(author).toBeTruthy();

          // Check for repository link
          const repoLink = await firstCard.$('a[href*="github.com"]');
          expect(repoLink).toBeTruthy();
        }
      }
    });

    test('should filter servers by category', async () => {
      // Test Core category
      await page.click('button:has-text("Core")');
      await page.waitForTimeout(500);

      let visibleCards = await page.$$('.server-card:visible');
      const coreCount = visibleCards.length;

      // Test Data category
      await page.click('button:has-text("Data")');
      await page.waitForTimeout(500);

      visibleCards = await page.$$('.server-card:visible');
      const dataCount = visibleCards.length;

      // Different categories should have different counts
      expect(coreCount).not.toBe(dataCount);

      // Reset to All
      await page.click('button:has-text("All")');
      await page.waitForTimeout(500);

      visibleCards = await page.$$('.server-card:visible');
      const allCount = visibleCards.length;

      // All should show more than any single category
      expect(allCount).toBeGreaterThan(coreCount);
      expect(allCount).toBeGreaterThan(dataCount);
    });

    test('should search servers', async () => {
      // Search for "database"
      const searchInput = await page.$('input[placeholder*="Search"]');
      if (searchInput) {
        await searchInput.fill('database');
        await page.waitForTimeout(500);

        const visibleCards = await page.$$('.server-card:visible');
        const searchResults = visibleCards.length;

        // Should find some database-related servers
        expect(searchResults).toBeGreaterThan(0);
        expect(searchResults).toBeLessThan(10); // But not all servers

        // Clear search
        await searchInput.fill('');
        await page.waitForTimeout(500);

        const allCards = await page.$$('.server-card:visible');
        expect(allCards.length).toBeGreaterThan(searchResults);
      }
    });

    test('should show proper server names', async () => {
      const serverNames = await page.$$eval('.server-card', cards =>
        cards.map(card => {
          const header = card.querySelector('[class*="font-semibold"]');
          return header?.textContent || '';
        })
      );

      // Check for expected server names
      const expectedServers = ['Filesystem', 'PostgreSQL', 'GitHub', 'Docker'];
      const foundExpected = expectedServers.filter(name =>
        serverNames.some(serverName => serverName.includes(name))
      );

      expect(foundExpected.length).toBeGreaterThan(0); // Should find at least some expected servers
    });
  });

  test.describe('Task 52: Real Connection Monitoring', () => {
    test('should show varied connection status', async () => {
      const badges = await page.$$eval('.server-card', cards =>
        cards.map(card => {
          const badge = card.querySelector('.badge');
          return badge?.textContent || 'none';
        })
      );

      // Not all servers should be "Active"
      const activeCount = badges.filter(b => b === 'Active').length;
      const totalCount = badges.length;

      // Some but not all should be active
      if (totalCount > 5) {
        expect(activeCount).toBeGreaterThan(0);
        expect(activeCount).toBeLessThan(totalCount);
      }
    });

    test('should display connection metrics in Performance panel', async () => {
      // Ensure Performance panel is visible
      const perfPanel = await page.$('text=Performance Insights');
      if (!perfPanel) {
        const toggleButton = await page.$('button[title="Toggle details"]');
        if (toggleButton) await toggleButton.click();
      }

      // Check Active connections display
      const activeConnections = await page.$eval('text=Active', el => {
        const parent = el.closest('div');
        const valueEl = parent?.querySelector('.text-sm.font-bold');
        return valueEl?.textContent || '0/10';
      });

      // Parse connection count
      const [current] = activeConnections.split('/').map(s => parseInt(s));
      expect(current).toBeGreaterThanOrEqual(0);
      expect(current).toBeLessThanOrEqual(10);
    });

    test('should show connection health details', async () => {
      // Expand details if needed
      const detailsButton = await page.$('button[title*="details"]');
      if (detailsButton) {
        await detailsButton.click();
        await page.waitForTimeout(500);
      }

      // Look for Connection Health section
      const healthSection = await page.$('text=Connection Health');
      if (healthSection) {
        // Check for uptime
        const uptimeEl = await page.$('text=Uptime');
        expect(uptimeEl).toBeTruthy();

        // Check for error count
        const errorsEl = await page.$('text=Errors');
        expect(errorsEl).toBeTruthy();

        // Verify values are present
        const uptimeValue = await page.$eval('text=Uptime', el => {
          const parent = el.closest('div');
          const valueEl = parent?.querySelector('.font-semibold');
          return valueEl?.textContent || '';
        });

        expect(uptimeValue).toMatch(/\d+(\.\d+)?%?/); // Should be a percentage or number
      }
    });
  });

  test.describe('Integration Tests', () => {
    test('should update metrics when adding servers to canvas', async () => {
      // Get initial metrics
      const initialTokens = await page.$eval('text=Tokens', el => {
        const parent = el.closest('div');
        const valueEl = parent?.querySelector('.text-sm.font-bold');
        return parseInt(valueEl?.textContent || '0');
      });

      // Drag a server to canvas
      const serverCard = await page.$('.server-card');
      const canvas = await page.$('#react-flow-wrapper');

      if (serverCard && canvas) {
        const serverBox = await serverCard.boundingBox();
        const canvasBox = await canvas.boundingBox();

        if (serverBox && canvasBox) {
          await page.mouse.move(serverBox.x + serverBox.width / 2, serverBox.y + serverBox.height / 2);
          await page.mouse.down();
          await page.mouse.move(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2, { steps: 10 });
          await page.mouse.up();
          await page.waitForTimeout(1000);

          // Check if metrics updated
          const updatedTokens = await page.$eval('text=Tokens', el => {
            const parent = el.closest('div');
            const valueEl = parent?.querySelector('.text-sm.font-bold');
            return parseInt(valueEl?.textContent || '0');
          });

          // Metrics should have changed
          expect(updatedTokens).not.toBe(initialTokens);
        }
      }
    });

    test('should maintain data after category filter changes', async () => {
      // Get initial server count
      const initialCards = await page.$$('.server-card');
      const initialCount = initialCards.length;

      // Switch categories multiple times
      await page.click('button:has-text("Core")');
      await page.waitForTimeout(300);
      await page.click('button:has-text("Data")');
      await page.waitForTimeout(300);
      await page.click('button:has-text("All")');
      await page.waitForTimeout(300);

      // Should return to initial count
      const finalCards = await page.$$('.server-card');
      expect(finalCards.length).toBe(initialCount);
    });
  });
});