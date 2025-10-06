/**
 * Persistence Layer E2E Tests
 * Test the full persistence layer integration
 */

import { test, expect, ElectronApplication, Page } from '@playwright/test';
import { _electron as electron } from 'playwright';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as os from 'os';

let app: ElectronApplication;
let page: Page;

const APP_DATA_PATH = path.join(os.homedir(), 'Library', 'Application Support', 'MCP Configuration Manager');
const DATABASE_PATH = path.join(APP_DATA_PATH, 'database.json');
const BACKUP_DIR = path.join(APP_DATA_PATH, 'backups');

test.describe('Persistence Layer E2E Tests', () => {
  test.beforeAll(async () => {
    // Clean up any existing test data
    await fs.remove(DATABASE_PATH);
    await fs.remove(BACKUP_DIR);

    // Launch the Electron app
    app = await electron.launch({
      args: [path.join(__dirname, '../dist/main/main.js')],
      env: {
        ...process.env,
        NODE_ENV: 'test',
        ELECTRON_DEV: 'true'
      }
    });

    page = await app.firstWindow();
  });

  test.afterAll(async () => {
    await app.close();
  });

  test.describe('Database Creation', () => {
    test('should create database.json on first launch', async () => {
      // Wait for app initialization
      await page.waitForTimeout(2000);

      // Check if database file was created
      const dbExists = await fs.pathExists(DATABASE_PATH);
      expect(dbExists).toBe(true);

      // Verify database structure
      const dbContent = await fs.readJson(DATABASE_PATH);
      expect(dbContent).toHaveProperty('version', 2);
      expect(dbContent).toHaveProperty('configs');
      expect(dbContent).toHaveProperty('canvas');
      expect(dbContent).toHaveProperty('metrics');
      expect(dbContent).toHaveProperty('preferences');
      expect(dbContent).toHaveProperty('clients');
      expect(dbContent).toHaveProperty('discovery');
      expect(dbContent).toHaveProperty('profiles');
      expect(dbContent).toHaveProperty('lastModified');
      expect(dbContent).toHaveProperty('backups');
    });
  });

  test.describe('localStorage Migration', () => {
    test('should migrate localStorage data to database', async () => {
      // Set some localStorage data
      await page.evaluate(() => {
        localStorage.setItem('visualWorkspace_claude-desktop_nodes', JSON.stringify([
          { id: 'node1', position: { x: 100, y: 100 } }
        ]));
        localStorage.setItem('visualWorkspace_claude-desktop_edges', JSON.stringify([
          { id: 'edge1', source: 'node1', target: 'node2' }
        ]));
        localStorage.setItem('preferences_theme', 'dark');
        localStorage.setItem('preferences_autoSave', 'true');
      });

      // Trigger migration
      await page.evaluate(async () => {
        const { migrateFromLocalStorage } = await import('@/renderer/hooks/usePersistence');
        await migrateFromLocalStorage();
      });

      // Wait for migration to complete
      await page.waitForTimeout(2000);

      // Check database has migrated data
      const dbContent = await fs.readJson(DATABASE_PATH);

      // Canvas data should be migrated
      expect(dbContent.canvas).toHaveProperty('visualWorkspace_claude-desktop_nodes');
      expect(dbContent.canvas).toHaveProperty('visualWorkspace_claude-desktop_edges');

      // Preferences should be migrated
      expect(dbContent.preferences).toHaveProperty('theme', 'dark');
      expect(dbContent.preferences).toHaveProperty('autoSave', 'true');

      // localStorage should be cleared
      const remainingItems = await page.evaluate(() => localStorage.length);
      expect(remainingItems).toBe(0);
    });
  });

  test.describe('Visual Workspace Persistence', () => {
    test('should save Visual Workspace state to database', async () => {
      // Navigate to Visual Workspace
      await page.goto('#/visual-workspace');
      await page.waitForLoadState('networkidle');

      // Select a client
      const clientSelector = await page.locator('[data-testid="client-selector"]');
      if (await clientSelector.isVisible()) {
        await clientSelector.click();
        await page.click('text=Claude Desktop');
        await page.waitForTimeout(1000);
      }

      // Drag a server to canvas (if server library is visible)
      const serverLibrary = await page.locator('.server-library-item').first();
      const canvas = await page.locator('.react-flow__viewport');

      if (await serverLibrary.isVisible() && await canvas.isVisible()) {
        await serverLibrary.dragTo(canvas);
        await page.waitForTimeout(500);

        // Save configuration
        const saveButton = await page.locator('button:has-text("Save")').first();
        if (await saveButton.isVisible() && !await saveButton.isDisabled()) {
          await saveButton.click();
          await page.waitForTimeout(2000);
        }
      }

      // Check database has canvas state
      const dbContent = await fs.readJson(DATABASE_PATH);
      expect(dbContent.canvas).toBeDefined();
      expect(Object.keys(dbContent.canvas).length).toBeGreaterThan(0);
    });

    test('should restore Visual Workspace state on reload', async () => {
      // Get initial canvas state
      const initialNodes = await page.evaluate(() => {
        const nodes = document.querySelectorAll('.react-flow__node');
        return nodes.length;
      });

      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Check nodes are restored
      const restoredNodes = await page.evaluate(() => {
        const nodes = document.querySelectorAll('.react-flow__node');
        return nodes.length;
      });

      expect(restoredNodes).toBe(initialNodes);
    });
  });

  test.describe('Backup Operations', () => {
    test('should create backup when saving configuration', async () => {
      // Make a change and save
      await page.goto('#/visual-workspace');
      const saveButton = await page.locator('button:has-text("Save")').first();

      if (await saveButton.isVisible() && !await saveButton.isDisabled()) {
        await saveButton.click();
        await page.waitForTimeout(2000);
      }

      // Check backup directory
      const backupExists = await fs.pathExists(BACKUP_DIR);
      expect(backupExists).toBe(true);

      // Check for backup files
      const backups = await fs.readdir(BACKUP_DIR);
      expect(backups.length).toBeGreaterThan(0);
      expect(backups[0]).toMatch(/backup-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.json/);
    });

    test('should limit number of backups to 10', async () => {
      // Create 12 backups
      for (let i = 0; i < 12; i++) {
        await page.evaluate(async () => {
          await window.electronAPI.persistence.backup();
        });
        await page.waitForTimeout(100);
      }

      // Check backup count
      const backups = await fs.readdir(BACKUP_DIR);
      expect(backups.length).toBeLessThanOrEqual(10);
    });
  });

  test.describe('Error Recovery', () => {
    test('should recover from corrupted database', async () => {
      // Corrupt the database
      await fs.writeFile(DATABASE_PATH, 'invalid json data');

      // Reload app
      await page.reload();
      await page.waitForTimeout(2000);

      // Check corrupted backup was created
      const files = await fs.readdir(APP_DATA_PATH);
      const corruptedBackup = files.find(f => f.includes('corrupted'));
      expect(corruptedBackup).toBeDefined();

      // Check new database was created
      const dbContent = await fs.readJson(DATABASE_PATH);
      expect(dbContent).toHaveProperty('version', 2);
    });

    test('should handle missing permissions gracefully', async () => {
      // Make database read-only
      await fs.chmod(DATABASE_PATH, 0o444);

      // Try to save data
      const result = await page.evaluate(async () => {
        try {
          await window.electronAPI.persistence.set('test', 'key', 'value');
          return { success: true };
        } catch (error) {
          return { success: false, error: error.message };
        }
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('permission');

      // Restore permissions
      await fs.chmod(DATABASE_PATH, 0o644);
    });
  });

  test.describe('Performance', () => {
    test('should handle large datasets efficiently', async () => {
      // Generate large dataset
      const largeData = {};
      for (let i = 0; i < 1000; i++) {
        largeData[`key${i}`] = {
          id: i,
          data: 'x'.repeat(1000),
          timestamp: Date.now()
        };
      }

      // Measure save time
      const startTime = Date.now();
      await page.evaluate(async (data) => {
        await window.electronAPI.persistence.set('configs', 'large-test', data);
      }, largeData);
      const saveTime = Date.now() - startTime;

      expect(saveTime).toBeLessThan(5000); // Should save in under 5 seconds

      // Measure read time
      const readStartTime = Date.now();
      const retrievedData = await page.evaluate(async () => {
        return await window.electronAPI.persistence.get('configs', 'large-test');
      });
      const readTime = Date.now() - readStartTime;

      expect(readTime).toBeLessThan(1000); // Should read in under 1 second
      expect(Object.keys(retrievedData).length).toBe(1000);
    });

    test('should debounce rapid saves', async () => {
      const initialModified = (await fs.readJson(DATABASE_PATH)).lastModified;

      // Make rapid changes
      for (let i = 0; i < 10; i++) {
        await page.evaluate(async (i) => {
          await window.electronAPI.persistence.set('test', `rapid${i}`, i);
        }, i);
      }

      // Check database hasn't been written yet
      const immediateModified = (await fs.readJson(DATABASE_PATH)).lastModified;
      expect(immediateModified).toBe(initialModified);

      // Wait for debounce
      await page.waitForTimeout(1500);

      // Now should be saved
      const finalModified = (await fs.readJson(DATABASE_PATH)).lastModified;
      expect(finalModified).toBeGreaterThan(initialModified);
    });
  });

  test.describe('Data Integrity', () => {
    test('should maintain data integrity across operations', async () => {
      // Set initial data
      await page.evaluate(async () => {
        await window.electronAPI.persistence.set('configs', 'server1', { name: 'Server 1', port: 3000 });
        await window.electronAPI.persistence.set('configs', 'server2', { name: 'Server 2', port: 3001 });
        await window.electronAPI.persistence.set('preferences', 'theme', 'dark');
      });

      // Wait for save
      await page.waitForTimeout(1500);

      // Read from file directly
      const dbContent = await fs.readJson(DATABASE_PATH);
      expect(dbContent.configs.server1).toEqual({ name: 'Server 1', port: 3000 });
      expect(dbContent.configs.server2).toEqual({ name: 'Server 2', port: 3001 });
      expect(dbContent.preferences.theme).toBe('dark');

      // Verify through API
      const apiData = await page.evaluate(async () => {
        return {
          configs: await window.electronAPI.persistence.get('configs'),
          preferences: await window.electronAPI.persistence.get('preferences')
        };
      });

      expect(apiData.configs.server1).toEqual({ name: 'Server 1', port: 3000 });
      expect(apiData.preferences.theme).toBe('dark');
    });

    test('should handle concurrent operations safely', async () => {
      // Perform concurrent operations
      const results = await page.evaluate(async () => {
        const promises = [];

        // Concurrent writes
        for (let i = 0; i < 10; i++) {
          promises.push(
            window.electronAPI.persistence.set('concurrent', `key${i}`, { value: i })
          );
        }

        // Concurrent reads
        for (let i = 0; i < 10; i++) {
          promises.push(
            window.electronAPI.persistence.get('concurrent', `key${i}`)
          );
        }

        await Promise.all(promises);

        // Get final state
        return await window.electronAPI.persistence.get('concurrent');
      });

      // Verify all data is present
      for (let i = 0; i < 10; i++) {
        expect(results[`key${i}`]).toEqual({ value: i });
      }
    });
  });
});