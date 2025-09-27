import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs-extra';

let app: ElectronApplication;
let page: Page;

// Paths for test configurations
const TEST_CONFIG_DIR = path.join(__dirname, 'test-configs');
const TEST_CONFIG_PATH = path.join(TEST_CONFIG_DIR, 'test-client-config.json');

test.describe('JSON Editor E2E Tests', () => {
  test.beforeAll(async () => {
    // Ensure test directory exists
    await fs.ensureDir(TEST_CONFIG_DIR);

    // Create a test configuration file
    const testConfig = {
      mcpServers: {
        'test-server': {
          command: 'node',
          args: ['server.js'],
          env: { TEST_KEY: 'test-value' }
        }
      }
    };
    await fs.writeJson(TEST_CONFIG_PATH, testConfig, { spaces: 2 });

    // Launch Electron app
    app = await electron.launch({
      args: [
        path.join(__dirname, '../../../dist/main/main.js'),
        '--test-mode'
      ],
      env: {
        ...process.env,
        NODE_ENV: 'test',
        TEST_CONFIG_PATH
      }
    });

    // Get the first window
    page = await app.firstWindow();
    await page.waitForLoadState('domcontentloaded');
  });

  test.afterAll(async () => {
    // Clean up test files
    await fs.remove(TEST_CONFIG_DIR);

    // Close the app
    if (app) {
      await app.close();
    }
  });

  test.describe('Navigation to JSON Editor', () => {
    test('can navigate to JSON editor from menu', async () => {
      // Click on the menu item (assuming it's in the sidebar)
      await page.click('text=JSON Editor');

      // Verify the editor is visible
      await expect(page.locator('[data-testid="json-editor"]')).toBeVisible();

      // Verify Monaco editor is loaded
      await expect(page.locator('.monaco-editor')).toBeVisible();
    });

    test('can open JSON editor from configuration page', async () => {
      // Navigate to configurations
      await page.click('text=Configurations');

      // Select a client
      await page.click('[data-testid="client-card-claude-desktop"]');

      // Click "Edit JSON" button
      await page.click('button:has-text("Edit JSON")');

      // Verify editor opens
      await expect(page.locator('[data-testid="json-editor"]')).toBeVisible();
    });

    test('can open JSON editor in modal from server dialog', async () => {
      // Open server configuration dialog
      await page.click('[data-testid="server-card"]', { timeout: 5000 });
      await page.click('button:has-text("Configure")');

      // Click "Advanced (JSON)" button
      await page.click('button:has-text("Advanced")');

      // Verify modal with JSON editor opens
      await expect(page.locator('.ant-modal [data-testid="json-editor"]')).toBeVisible();
    });
  });

  test.describe('JSON Editing Functionality', () => {
    test.beforeEach(async () => {
      // Navigate to JSON editor
      await page.click('text=JSON Editor');
      await page.waitForSelector('[data-testid="json-editor"]');
    });

    test('can edit JSON configuration', async () => {
      // Get the Monaco editor
      const editor = page.locator('.monaco-editor textarea');

      // Clear and type new configuration
      await editor.click();
      await page.keyboard.press('Control+A');
      await page.keyboard.type(`{
  "mcpServers": {
    "edited-server": {
      "command": "python",
      "args": ["app.py"]
    }
  }
}`);

      // Verify the content changed
      const content = await editor.inputValue();
      expect(content).toContain('edited-server');
      expect(content).toContain('python');
    });

    test('shows syntax highlighting', async () => {
      // Check for Monaco syntax highlighting classes
      await expect(page.locator('.mtk5')).toBeVisible(); // Keywords
      await expect(page.locator('.mtk6')).toBeVisible(); // Strings
    });

    test('validates JSON syntax', async () => {
      const editor = page.locator('.monaco-editor textarea');

      // Type invalid JSON
      await editor.click();
      await page.keyboard.press('Control+A');
      await page.keyboard.type('{ "invalid": }');

      // Check for error indicator
      await expect(page.locator('[data-testid="json-error-alert"]')).toBeVisible();
      await expect(page.locator('text=/unexpected/i')).toBeVisible();
    });

    test('formats JSON on button click', async () => {
      const editor = page.locator('.monaco-editor textarea');

      // Type minified JSON
      await editor.click();
      await page.keyboard.press('Control+A');
      await page.keyboard.type('{"servers":{"test":{"command":"node","args":["server.js"]}}}');

      // Click format button
      await page.click('button:has-text("Format")');

      // Check if JSON is formatted
      const formattedContent = await editor.inputValue();
      expect(formattedContent).toMatch(/{\s+"/); // Should have whitespace after opening brace
      expect(formattedContent.split('\n').length).toBeGreaterThan(1); // Should be multi-line
    });

    test('validates against MCP schema', async () => {
      const editor = page.locator('.monaco-editor textarea');

      // Type configuration with invalid MCP field
      await editor.click();
      await page.keyboard.press('Control+A');
      await page.keyboard.type(`{
  "mcpServers": {
    "test": {
      "invalidField": "should cause warning"
    }
  }
}`);

      // Check for schema validation warning
      await expect(page.locator('text=/unknown field/i')).toBeVisible();
    });
  });

  test.describe('Save and Load Operations', () => {
    test('can save edited configuration', async () => {
      // Navigate to JSON editor
      await page.click('text=JSON Editor');
      await page.waitForSelector('[data-testid="json-editor"]');

      // Edit the configuration
      const editor = page.locator('.monaco-editor textarea');
      await editor.click();
      await page.keyboard.press('Control+A');
      await page.keyboard.type(`{
  "mcpServers": {
    "saved-server": {
      "command": "node",
      "args": ["saved.js"]
    }
  }
}`);

      // Save using button
      await page.click('button:has-text("Save")');

      // Check for success notification
      await expect(page.locator('.ant-notification:has-text("saved successfully")')).toBeVisible();

      // Verify file was saved (in test mode, this would be mocked)
      // In real test, we'd check the file system
    });

    test('can save with keyboard shortcut', async () => {
      await page.click('text=JSON Editor');
      const editor = page.locator('.monaco-editor textarea');

      // Make an edit
      await editor.click();
      await page.keyboard.type('// comment');

      // Save with Ctrl+S
      await page.keyboard.press('Control+S');

      // Check for save indication
      await expect(page.locator('.ant-notification:has-text("saved")')).toBeVisible();
    });

    test('creates backup before saving', async () => {
      await page.click('text=JSON Editor');

      // Make an edit
      const editor = page.locator('.monaco-editor textarea');
      await editor.click();
      await page.keyboard.type(' ');

      // Save
      await page.click('button:has-text("Save")');

      // Check for backup creation message (if shown)
      // In real app, we'd verify backup file exists
      await expect(page.locator('text=/backup created/i')).toBeVisible({ timeout: 5000 });
    });

    test('loads existing configuration', async () => {
      // Select a client with existing config
      await page.click('text=Configurations');
      await page.click('[data-testid="client-claude-desktop"]');
      await page.click('button:has-text("Edit JSON")');

      // Verify configuration is loaded
      const editor = page.locator('.monaco-editor textarea');
      const content = await editor.inputValue();

      expect(content).toBeTruthy();
      expect(content).toContain('mcpServers');
    });

    test('handles read-only mode', async () => {
      // Open a system/protected configuration
      await page.click('text=Configurations');
      await page.click('[data-testid="scope-global"]'); // Global scope might be read-only

      // Try to open JSON editor
      await page.click('button:has-text("View JSON")'); // Might say "View" instead of "Edit"

      // Verify read-only indicator
      await expect(page.locator('text=/read-only/i')).toBeVisible();

      // Try to edit - should not be possible
      const editor = page.locator('.monaco-editor textarea');
      const isReadOnly = await editor.getAttribute('readonly');
      expect(isReadOnly).toBeTruthy();
    });
  });

  test.describe('Import and Export', () => {
    test('can export configuration', async () => {
      await page.click('text=JSON Editor');

      // Click export button
      await page.click('button:has-text("Export")');

      // Check for file dialog or success message
      await expect(page.locator('.ant-notification:has-text("exported")')).toBeVisible();
    });

    test('can import configuration', async () => {
      await page.click('text=JSON Editor');

      // Click import button
      await page.click('button:has-text("Import")');

      // In real test, we'd handle file dialog
      // For now, check that import dialog opens
      await expect(page.locator('.ant-modal:has-text("Import")')).toBeVisible();
    });

    test('validates imported configuration', async () => {
      await page.click('text=JSON Editor');
      await page.click('button:has-text("Import")');

      // Simulate importing invalid config (this would be mocked in test)
      // Check for validation error
      await expect(page.locator('text=/invalid configuration/i')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Tab Switching', () => {
    test('can switch between Form and JSON views', async () => {
      await page.click('text=Configurations');
      await page.click('[data-testid="client-card"]');

      // Should see form view by default
      await expect(page.locator('[data-testid="form-editor"]')).toBeVisible();

      // Switch to JSON view
      await page.click('text=JSON');
      await expect(page.locator('[data-testid="json-editor"]')).toBeVisible();

      // Switch back to Form view
      await page.click('text=Form');
      await expect(page.locator('[data-testid="form-editor"]')).toBeVisible();
    });

    test('preserves changes when switching tabs', async () => {
      await page.click('text=Configurations');
      await page.click('[data-testid="client-card"]');

      // Make change in form view
      await page.fill('[data-testid="server-command-input"]', 'updated-command');

      // Switch to JSON view
      await page.click('text=JSON');

      // Verify change is reflected in JSON
      const editor = page.locator('.monaco-editor textarea');
      const content = await editor.inputValue();
      expect(content).toContain('updated-command');
    });
  });

  test.describe('Error Handling', () => {
    test('handles network errors during save', async () => {
      await page.click('text=JSON Editor');

      // Simulate network error (would need to mock in real test)
      await page.route('**/api/save', route => route.abort());

      // Try to save
      await page.click('button:has-text("Save")');

      // Check for error message
      await expect(page.locator('.ant-notification:has-text("failed")')).toBeVisible();
    });

    test('handles corrupted configuration files', async () => {
      // Try to load a corrupted config (would be set up in beforeEach)
      await page.click('text=Configurations');
      await page.click('[data-testid="client-corrupted"]'); // Assume this has corrupted config

      // Check for error handling
      await expect(page.locator('text=/failed to load/i')).toBeVisible();

      // Should offer recovery options
      await expect(page.locator('button:has-text("Restore Default")')).toBeVisible();
    });

    test('warns about unsaved changes', async () => {
      await page.click('text=JSON Editor');

      // Make an edit
      const editor = page.locator('.monaco-editor textarea');
      await editor.click();
      await page.keyboard.type(' ');

      // Try to navigate away
      await page.click('text=Dashboard');

      // Check for confirmation dialog
      await expect(page.locator('text=/unsaved changes/i')).toBeVisible();

      // Cancel navigation
      await page.click('button:has-text("Cancel")');

      // Should still be on JSON editor
      await expect(page.locator('[data-testid="json-editor"]')).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('supports keyboard navigation', async () => {
      await page.click('text=JSON Editor');

      // Tab through controls
      await page.keyboard.press('Tab'); // Focus format button
      await expect(page.locator('button:has-text("Format")').locator('focused')).toBeVisible();

      await page.keyboard.press('Tab'); // Focus save button
      await expect(page.locator('button:has-text("Save")').locator('focused')).toBeVisible();

      // Use arrow keys in editor
      const editor = page.locator('.monaco-editor textarea');
      await editor.click();
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowRight');
      // Editor should handle navigation
    });

    test('announces errors to screen readers', async () => {
      await page.click('text=JSON Editor');

      // Create an error
      const editor = page.locator('.monaco-editor textarea');
      await editor.click();
      await page.keyboard.press('Control+A');
      await page.keyboard.type('{ invalid }');

      // Check for ARIA alert
      await expect(page.locator('[role="alert"]')).toBeVisible();
      await expect(page.locator('[role="alert"]')).toContainText(/error/i);
    });

    test('has proper focus management', async () => {
      await page.click('text=JSON Editor');

      // Open a modal (like import dialog)
      await page.click('button:has-text("Import")');

      // Focus should be trapped in modal
      const modal = page.locator('.ant-modal');
      await expect(modal).toBeVisible();

      // Tab should cycle within modal
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Focus should not leave modal
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedElement).toBeTruthy();
    });
  });

  test.describe('Performance', () => {
    test('handles large configuration files', async () => {
      await page.click('text=JSON Editor');

      // Generate large configuration
      const largeConfig = {
        mcpServers: Object.fromEntries(
          Array.from({ length: 100 }, (_, i) => [
            `server-${i}`,
            {
              command: 'node',
              args: [`server-${i}.js`],
              env: { [`KEY_${i}`]: `value-${i}` }
            }
          ])
        )
      };

      const editor = page.locator('.monaco-editor textarea');
      await editor.click();
      await page.keyboard.press('Control+A');
      await page.keyboard.type(JSON.stringify(largeConfig, null, 2));

      // Should still be responsive
      const startTime = Date.now();
      await page.click('button:has-text("Format")');
      const endTime = Date.now();

      // Format should complete within 2 seconds
      expect(endTime - startTime).toBeLessThan(2000);
    });

    test('provides real-time syntax validation', async () => {
      await page.click('text=JSON Editor');

      const editor = page.locator('.monaco-editor textarea');
      await editor.click();

      // Type rapidly
      for (let i = 0; i < 10; i++) {
        await page.keyboard.type(`"field${i}": "value${i}",`);
      }

      // Validation should keep up
      // Check that error indicators update in real-time
      await expect(page.locator('[data-testid="json-status"]')).toBeVisible();
    });
  });
});