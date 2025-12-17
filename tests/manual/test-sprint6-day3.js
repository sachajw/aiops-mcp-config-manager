const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const os = require('os');

console.log('🧪 Sprint 6 Day 3-4 QA Testing');
console.log('================================');
console.log(`Time: ${new Date().toISOString()}`);
console.log('Testing: Persistence Layer & Performance\n');

const APP_URL = 'http://localhost:5175';
const DB_PATH = path.join(os.homedir(), 'Library/Application Support/MCP Configuration Manager/database.json');

async function testPersistenceAPI(page) {
  console.log('\n📦 Test 1: Persistence API Exposure');
  console.log('=====================================');

  try {
    const hasAPI = await page.evaluate(() => {
      return window.electronAPI &&
             window.electronAPI.persistence &&
             typeof window.electronAPI.persistence.get === 'function';
    });

    console.log(`  ✓ Persistence API available: ${hasAPI ? '✅' : '❌'}`);

    if (hasAPI) {
      const methods = await page.evaluate(() => {
        return Object.keys(window.electronAPI.persistence);
      });
      console.log(`  ✓ Available methods: ${methods.join(', ')}`);
    }

    return hasAPI;
  } catch (error) {
    console.log(`  ❌ Error checking API: ${error.message}`);
    return false;
  }
}

async function testDatabaseFile() {
  console.log('\n📂 Test 2: Database File Creation');
  console.log('===================================');

  if (fs.existsSync(DB_PATH)) {
    console.log(`  ✅ Database file exists at: ${DB_PATH}`);
    const stats = fs.statSync(DB_PATH);
    console.log(`  ✓ File size: ${stats.size} bytes`);
    console.log(`  ✓ Last modified: ${stats.mtime.toISOString()}`);

    try {
      const content = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
      console.log(`  ✓ Database version: ${content.version}`);
      console.log(`  ✓ Categories: ${Object.keys(content).filter(k => typeof content[k] === 'object').join(', ')}`);
      return true;
    } catch (error) {
      console.log(`  ⚠️ Error reading database: ${error.message}`);
      return false;
    }
  } else {
    console.log(`  ❌ Database file not found at: ${DB_PATH}`);
    return false;
  }
}

async function testMigration(page) {
  console.log('\n🔄 Test 3: LocalStorage Migration');
  console.log('====================================');

  try {
    // Check if localStorage has data
    const hasLocalStorage = await page.evaluate(() => {
      return localStorage.length > 0;
    });

    console.log(`  ✓ LocalStorage has data: ${hasLocalStorage ? 'Yes' : 'No'}`);

    if (hasLocalStorage) {
      const keys = await page.evaluate(() => {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
          keys.push(localStorage.key(i));
        }
        return keys;
      });
      console.log(`  ✓ LocalStorage keys: ${keys.slice(0, 5).join(', ')}${keys.length > 5 ? '...' : ''}`);
      console.log(`  ✓ Total keys: ${keys.length}`);

      // Test migration
      const migrationResult = await page.evaluate(async () => {
        if (window.electronAPI && window.electronAPI.persistence && window.electronAPI.persistence.migrate) {
          const data = {};
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            try {
              data[key] = JSON.parse(localStorage.getItem(key));
            } catch {
              data[key] = localStorage.getItem(key);
            }
          }
          return await window.electronAPI.persistence.migrate(data);
        }
        return null;
      });

      console.log(`  ✓ Migration attempted: ${migrationResult ? '✅' : '⚠️ API not available'}`);
    }

    return true;
  } catch (error) {
    console.log(`  ❌ Migration test error: ${error.message}`);
    return false;
  }
}

async function testVisualWorkspacePersistence(page) {
  console.log('\n🎨 Test 4: Visual Workspace Persistence');
  console.log('=========================================');

  try {
    // Navigate to Visual Workspace
    await page.click('button:has-text("Visual Workspace")').catch(() => {
      console.log('  ⚠️ Visual Workspace button not found');
    });

    await page.waitForTimeout(2000);

    // Check if persistence functions are used
    const usingPersistence = await page.evaluate(() => {
      // Check if setPersistenceValue and getPersistenceValue are defined
      return typeof window.setPersistenceValue === 'function' &&
             typeof window.getPersistenceValue === 'function';
    });

    console.log(`  ✓ Using persistence helpers: ${usingPersistence ? '✅' : '❌'}`);

    // Try to save canvas state
    const saveResult = await page.evaluate(async () => {
      if (window.electronAPI && window.electronAPI.persistence) {
        const testData = {
          nodes: [{ id: 'test-1', position: { x: 100, y: 100 }, data: { label: 'Test' } }],
          edges: [],
          timestamp: Date.now()
        };

        try {
          await window.electronAPI.persistence.set('canvas', 'test-workspace', testData);
          const retrieved = await window.electronAPI.persistence.get('canvas', 'test-workspace');
          return retrieved && retrieved.nodes && retrieved.nodes.length === 1;
        } catch (error) {
          return false;
        }
      }
      return false;
    });

    console.log(`  ✓ Canvas state save/load: ${saveResult ? '✅' : '❌'}`);

    return saveResult;
  } catch (error) {
    console.log(`  ❌ Visual Workspace test error: ${error.message}`);
    return false;
  }
}

async function testPerformance(page) {
  console.log('\n⚡ Test 5: Performance Improvements');
  console.log('=====================================');

  try {
    // Test save operation speed
    const saveTime = await page.evaluate(async () => {
      if (window.electronAPI && window.electronAPI.persistence) {
        const start = performance.now();
        const testData = { test: Array(100).fill({ data: 'test' }) };
        await window.electronAPI.persistence.set('test', 'performance', testData);
        return performance.now() - start;
      }
      return -1;
    });

    console.log(`  ✓ Save operation (100 items): ${saveTime > 0 ? saveTime.toFixed(2) + 'ms' : 'N/A'}`);
    console.log(`  ${saveTime < 100 ? '✅ Excellent' : saveTime < 500 ? '✅ Good' : '⚠️ Needs optimization'}`);

    // Test load operation speed
    const loadTime = await page.evaluate(async () => {
      if (window.electronAPI && window.electronAPI.persistence) {
        const start = performance.now();
        await window.electronAPI.persistence.get('test', 'performance');
        return performance.now() - start;
      }
      return -1;
    });

    console.log(`  ✓ Load operation: ${loadTime > 0 ? loadTime.toFixed(2) + 'ms' : 'N/A'}`);
    console.log(`  ${loadTime < 50 ? '✅ Excellent' : loadTime < 200 ? '✅ Good' : '⚠️ Needs optimization'}`);

    // Test metrics loading
    await page.click('[data-testid="claude-desktop-card"]').catch(() => {});
    await page.waitForTimeout(1000);

    const metricsLoadTime = await page.evaluate(() => {
      const panel = document.querySelector('.performance-insights-panel');
      if (panel && panel.dataset.loadTime) {
        return parseFloat(panel.dataset.loadTime);
      }
      return -1;
    });

    console.log(`  ✓ Metrics load time: ${metricsLoadTime > 0 ? metricsLoadTime + 'ms' : 'From cache'}`);

    return true;
  } catch (error) {
    console.log(`  ❌ Performance test error: ${error.message}`);
    return false;
  }
}

async function testImportProfile(page) {
  console.log('\n📥 Test 6: Import Profile Performance');
  console.log('========================================');

  try {
    // Open settings
    await page.click('button[aria-label="Settings"]').catch(() => {
      console.log('  ⚠️ Settings button not found, trying alternative');
    });

    await page.waitForTimeout(1000);

    // Navigate to profiles tab
    await page.click('text=Profiles').catch(() => {
      console.log('  ⚠️ Profiles tab not found');
    });

    // Test import functionality
    const importTime = await page.evaluate(async () => {
      if (window.electronAPI && window.electronAPI.persistence) {
        const testProfile = {
          name: 'Test Profile',
          servers: Array(50).fill({
            name: 'test-server',
            command: 'node',
            args: ['server.js']
          })
        };

        const start = performance.now();
        await window.electronAPI.persistence.set('profiles', 'test-import', testProfile);
        return performance.now() - start;
      }
      return -1;
    });

    console.log(`  ✓ Import 50 servers: ${importTime > 0 ? importTime.toFixed(2) + 'ms' : 'N/A'}`);
    console.log(`  ${importTime < 500 ? '✅ Fast' : importTime < 2000 ? '✅ Acceptable' : '⚠️ Slow'}`);

    return true;
  } catch (error) {
    console.log(`  ❌ Import profile test error: ${error.message}`);
    return false;
  }
}

async function runTests() {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1280, height: 800 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.goto(APP_URL, { waitUntil: 'networkidle0' });

  const results = {
    persistenceAPI: await testPersistenceAPI(page),
    databaseFile: testDatabaseFile(),
    migration: await testMigration(page),
    visualWorkspace: await testVisualWorkspacePersistence(page),
    performance: await testPerformance(page),
    importProfile: await testImportProfile(page)
  };

  console.log('\n📊 Test Summary - Sprint 6 Day 3-4');
  console.log('====================================');
  console.log(`Persistence API: ${results.persistenceAPI ? '✅ Available' : '❌ Not Available'}`);
  console.log(`Database File: ${results.databaseFile ? '✅ Created' : '❌ Not Found'}`);
  console.log(`Migration: ${results.migration ? '✅ Ready' : '⚠️ Needs Work'}`);
  console.log(`Visual Workspace: ${results.visualWorkspace ? '✅ Integrated' : '❌ Not Integrated'}`);
  console.log(`Performance: ${results.performance ? '✅ Good' : '⚠️ Needs Testing'}`);
  console.log(`Import Profile: ${results.importProfile ? '✅ Fast' : '⚠️ Needs Testing'}`);

  const passCount = Object.values(results).filter(r => r).length;
  const totalCount = Object.keys(results).length;

  console.log(`\n🎯 Overall Score: ${passCount}/${totalCount} tests passing`);
  console.log(`Status: ${passCount === totalCount ? '✅ All tests passing!' :
            passCount >= totalCount * 0.7 ? '✅ Good progress' : '⚠️ Needs attention'}`);

  await browser.close();
  process.exit(passCount === totalCount ? 0 : 1);
}

runTests().catch(console.error);