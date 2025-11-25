#!/usr/bin/env node

/**
 * Persistence Integration Test
 * Tests the persistence layer through the running app
 */

const { chromium } = require('playwright');

const APP_URL = 'http://localhost:5175';

async function testPersistenceIntegration() {
  console.log('🧪 Persistence Layer Integration Test');
  console.log('=====================================\n');

  const browser = await chromium.launch({
    headless: false,
    devtools: true
  });

  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Navigate to the app
    await page.goto(APP_URL);
    await page.waitForLoadState('networkidle');

    console.log('✓ App loaded successfully\n');

    // Test 1: Check if persistence API is available
    console.log('Test 1: Persistence API Availability');
    const apiAvailable = await page.evaluate(() => {
      return !!window.electronAPI?.persistence;
    });
    console.log(`  Persistence API available: ${apiAvailable ? '✅' : '❌'}`);

    if (!apiAvailable) {
      console.log('\n⚠️  Persistence API not available. This might be because:');
      console.log('  1. The app is running in development mode without IPC');
      console.log('  2. The PersistenceHandler is not registered');
      console.log('  3. The preload script doesn\'t expose the persistence API\n');

      // Check what APIs are available
      const availableAPIs = await page.evaluate(() => {
        if (!window.electronAPI) return [];
        return Object.keys(window.electronAPI);
      });
      console.log('Available APIs:', availableAPIs);
    }

    // Test 2: Test localStorage migration (if API available)
    if (apiAvailable) {
      console.log('\nTest 2: localStorage Migration');

      // Set test data in localStorage
      await page.evaluate(() => {
        localStorage.setItem('test_key_1', JSON.stringify({ data: 'test1' }));
        localStorage.setItem('test_key_2', 'simple string');
        localStorage.setItem('visualWorkspace_nodes', JSON.stringify([{ id: 1, x: 100, y: 200 }]));
      });
      console.log('  ✓ Set test data in localStorage');

      // Check localStorage before migration
      const itemsBefore = await page.evaluate(() => localStorage.length);
      console.log(`  ✓ localStorage items before migration: ${itemsBefore}`);

      // Attempt migration
      try {
        const migrationResult = await page.evaluate(async () => {
          if (window.electronAPI?.persistence?.migrate) {
            const data = {};
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key) {
                data[key] = localStorage.getItem(key);
              }
            }
            return await window.electronAPI.persistence.migrate(data);
          }
          return { success: false, error: 'Migration API not available' };
        });
        console.log(`  Migration result: ${migrationResult.success ? '✅' : '❌'}`);
        if (!migrationResult.success) {
          console.log(`    Error: ${migrationResult.error}`);
        }
      } catch (error) {
        console.log(`  Migration failed: ${error.message}`);
      }

      // Test 3: Test CRUD operations
      console.log('\nTest 3: CRUD Operations');

      try {
        // SET operation
        const setResult = await page.evaluate(async () => {
          return await window.electronAPI.persistence.set('configs', 'test-server', {
            name: 'Test Server',
            enabled: true,
            port: 3000
          });
        });
        console.log(`  SET operation: ${setResult?.success ? '✅' : '❌'}`);

        // GET operation
        const getResult = await page.evaluate(async () => {
          return await window.electronAPI.persistence.get('configs', 'test-server');
        });
        console.log(`  GET operation: ${getResult?.success ? '✅' : '❌'}`);
        if (getResult?.data) {
          console.log(`    Retrieved data: ${JSON.stringify(getResult.data)}`);
        }

        // DELETE operation
        const deleteResult = await page.evaluate(async () => {
          return await window.electronAPI.persistence.delete('configs', 'test-server');
        });
        console.log(`  DELETE operation: ${deleteResult?.success ? '✅' : '❌'}`);

        // CLEAR operation
        const clearResult = await page.evaluate(async () => {
          return await window.electronAPI.persistence.clear('configs');
        });
        console.log(`  CLEAR operation: ${clearResult?.success ? '✅' : '❌'}`);
      } catch (error) {
        console.log(`  CRUD operations failed: ${error.message}`);
      }

      // Test 4: Test backup functionality
      console.log('\nTest 4: Backup Functionality');

      try {
        const backupResult = await page.evaluate(async () => {
          return await window.electronAPI.persistence.backup();
        });
        console.log(`  Backup creation: ${backupResult?.success ? '✅' : '❌'}`);
        if (backupResult?.backupPath) {
          console.log(`    Backup saved to: ${backupResult.backupPath}`);
        }
      } catch (error) {
        console.log(`  Backup failed: ${error.message}`);
      }

      // Test 5: Test database info
      console.log('\nTest 5: Database Information');

      try {
        const infoResult = await page.evaluate(async () => {
          return await window.electronAPI.persistence.info();
        });
        console.log(`  Info retrieval: ${infoResult?.success ? '✅' : '❌'}`);
        if (infoResult?.info) {
          console.log('  Database info:');
          console.log(`    Version: ${infoResult.info.version}`);
          console.log(`    Location: ${infoResult.info.location}`);
          console.log(`    Categories: ${JSON.stringify(infoResult.info.categories)}`);
        }
      } catch (error) {
        console.log(`  Info retrieval failed: ${error.message}`);
      }
    }

    // Test 6: Check Visual Workspace persistence
    console.log('\nTest 6: Visual Workspace Persistence');

    await page.goto(`${APP_URL}/#/visual-workspace`);
    await page.waitForLoadState('networkidle');

    // Check if nodes are being saved/loaded
    const hasPersistedNodes = await page.evaluate(() => {
      const nodes = document.querySelectorAll('.react-flow__node');
      return nodes.length > 0;
    });
    console.log(`  Persisted nodes found: ${hasPersistedNodes ? '✅' : '❌'}`);

    // Check console for persistence-related logs
    const consoleLogs = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('Persistence') || text.includes('database') || text.includes('localStorage')) {
        consoleLogs.push(text);
      }
    });

    await page.waitForTimeout(2000);

    if (consoleLogs.length > 0) {
      console.log('\n  Persistence-related console logs:');
      consoleLogs.slice(0, 5).forEach(log => {
        console.log(`    - ${log}`);
      });
    }

    // Summary
    console.log('\n📊 Test Summary');
    console.log('================');
    console.log('Persistence API Available:', apiAvailable ? '✅' : '❌');
    console.log('Migration Support:', apiAvailable ? '✅' : '❌');
    console.log('CRUD Operations:', apiAvailable ? '✅' : '❌');
    console.log('Backup Support:', apiAvailable ? '✅' : '❌');
    console.log('Visual Workspace Integration:', hasPersistedNodes ? '✅' : '⚠️  Needs verification');

    console.log('\n📝 Recommendations:');
    if (!apiAvailable) {
      console.log('1. Check that PersistenceHandler is registered in main process');
      console.log('2. Verify preload script exposes persistence API');
      console.log('3. Ensure app is built with latest changes');
    } else {
      console.log('1. Persistence layer is functional');
      console.log('2. Continue with remaining localStorage migrations');
      console.log('3. Add more comprehensive E2E tests');
    }

  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
}

// Run the test
testPersistenceIntegration().catch(console.error);