const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Bug-024 & Bug-026 Fix Verification
 *
 * Bug-024: Trace save flow with debug logging
 * Bug-026: Verify localStorage persistence
 */

(async () => {
  console.log('🔍 BUG-024 & BUG-026 FIX VERIFICATION');
  console.log('=====================================\n');

  let browser;
  let page;
  const configPath = path.join(os.homedir(), 'Library/Application Support/Claude/claude_desktop_config.json');

  try {
    // Connect to running app
    console.log('📡 Connecting to Electron app...');
    browser = await chromium.connectOverCDP('http://localhost:9222');
    page = browser.contexts()[0].pages()[0];
    console.log('✅ Connected\n');

    // Collect debug logs
    const debugLogs = [];
    page.on('console', msg => {
      const text = msg.text();
      debugLogs.push({ time: Date.now(), text });

      // Print important debug messages in real-time
      if (text.includes('[VisualWorkspace]') ||
          text.includes('[Store]') ||
          text.includes('SAVE CONFIG') ||
          text.includes('💾') ||
          text.includes('📦')) {
        console.log(`   ${text}`);
      }
    });

    await page.waitForTimeout(2000);

    // Navigate to Visual Workspace if needed
    const currentUrl = page.url();
    if (!currentUrl.includes('visual')) {
      console.log('🎯 Navigating to Visual Workspace...');
      try {
        await page.locator('button:has-text("Visual")').first().click({ timeout: 5000 });
        await page.waitForTimeout(2000);
        console.log('✅ Navigated\n');
      } catch (e) {
        console.log('Already on Visual Workspace\n');
      }
    }

    // ========================================
    // BUG-024: Debug Save Flow
    // ========================================
    console.log('═══════════════════════════════════════════');
    console.log('🧪 BUG-024: Debug Save Flow with Logging');
    console.log('═══════════════════════════════════════════\n');

    // Read initial config
    const initialConfig = fs.existsSync(configPath) ?
      JSON.parse(fs.readFileSync(configPath, 'utf-8')) : null;
    const initialCount = initialConfig?.mcpServers ? Object.keys(initialConfig.mcpServers).length : 0;

    console.log(`📊 Initial state:`);
    console.log(`   Config file: ${initialCount} servers`);

    // Count canvas nodes
    const canvasNodes = await page.locator('.react-flow__node').count();
    console.log(`   Canvas: ${canvasNodes} nodes`);

    // Check save button
    const saveButton = page.locator('button:has-text("Save Configuration")').first();
    const saveText = await saveButton.textContent();
    const hasUnsaved = saveText.includes('*');
    const isEnabled = !(await saveButton.isDisabled());

    console.log(`   Save button: "${saveText}" (enabled: ${isEnabled})\n`);

    if (hasUnsaved && isEnabled) {
      console.log('🎬 Triggering save with debug logging...\n');
      console.log('Debug logs will appear below:');
      console.log('─────────────────────────────────────────');

      // Click save and wait for logs
      await saveButton.click();
      await page.waitForTimeout(3000);

      console.log('─────────────────────────────────────────\n');

      // Read updated config
      const updatedConfig = fs.existsSync(configPath) ?
        JSON.parse(fs.readFileSync(configPath, 'utf-8')) : null;
      const finalCount = updatedConfig?.mcpServers ? Object.keys(updatedConfig.mcpServers).length : 0;

      console.log('📊 After save:');
      console.log(`   Config file: ${finalCount} servers`);
      console.log(`   Canvas: ${canvasNodes} nodes`);

      const countsMatch = finalCount === canvasNodes;
      console.log(`   Match: ${countsMatch ? '✅ YES' : '❌ NO'}\n`);

      if (!countsMatch) {
        console.log('🔍 Analyzing debug logs for server count mismatch...\n');

        // Find relevant save logs
        const saveLogs = debugLogs.filter(log =>
          log.text.includes('SAVE') ||
          log.text.includes('servers') ||
          log.text.includes('nodes')
        );

        if (saveLogs.length > 0) {
          console.log('📋 Save flow logs:');
          saveLogs.slice(-20).forEach(log => {
            console.log(`   ${log.text}`);
          });
          console.log();
        }
      }
    } else {
      console.log('⚠️  No unsaved changes - cannot test save flow\n');
      console.log('   Making a change to trigger save...');

      // Try to make a small change (move a node)
      if (canvasNodes > 0) {
        const firstNode = page.locator('.react-flow__node').first();
        const bounds = await firstNode.boundingBox();

        if (bounds) {
          await page.mouse.move(bounds.x + 50, bounds.y + 50);
          await page.mouse.down();
          await page.mouse.move(bounds.x + 150, bounds.y + 150, { steps: 5 });
          await page.mouse.up();
          await page.waitForTimeout(1000);

          console.log('   ✅ Moved a node to trigger dirty state\n');

          // Try save again
          const nowEnabled = !(await saveButton.isDisabled());
          if (nowEnabled) {
            console.log('🎬 Save button now enabled - triggering save...\n');
            await saveButton.click();
            await page.waitForTimeout(3000);
          }
        }
      }
    }

    // ========================================
    // BUG-026: localStorage Persistence Test
    // ========================================
    console.log('\n═══════════════════════════════════════════');
    console.log('🧪 BUG-026: localStorage Persistence Test');
    console.log('═══════════════════════════════════════════\n');

    // Check localStorage for saved state
    const localStorageData = await page.evaluate(() => {
      const keys = Object.keys(localStorage);
      const data = {};
      keys.forEach(key => {
        if (key.includes('workspace') || key.includes('visual') || key.includes('nodes') || key.includes('edges')) {
          try {
            data[key] = JSON.parse(localStorage.getItem(key));
          } catch {
            data[key] = localStorage.getItem(key);
          }
        }
      });
      return data;
    });

    console.log('📦 localStorage inspection:');
    const storageKeys = Object.keys(localStorageData);

    if (storageKeys.length > 0) {
      console.log(`   Found ${storageKeys.length} workspace-related keys:\n`);

      storageKeys.forEach(key => {
        const value = localStorageData[key];
        if (Array.isArray(value)) {
          console.log(`   ✅ ${key}: ${value.length} items`);
        } else if (typeof value === 'object') {
          console.log(`   ✅ ${key}: ${Object.keys(value).length} properties`);
        } else {
          console.log(`   ✅ ${key}: ${value}`);
        }
      });
      console.log();

      // Check for nodes storage specifically
      const nodesKey = storageKeys.find(k => k.includes('nodes'));
      if (nodesKey) {
        const savedNodes = localStorageData[nodesKey];
        console.log(`✅ Nodes saved to localStorage: ${savedNodes.length} nodes`);
        console.log(`   Matches canvas: ${savedNodes.length === canvasNodes ? '✅ YES' : '❌ NO'}\n`);
      }
    } else {
      console.log('   ❌ No workspace-related keys found in localStorage\n');
    }

    // Test refresh restoration
    console.log('🔄 Testing page refresh restoration...');
    console.log('   Current node positions:');

    const nodePositionsBefore = await page.evaluate(() => {
      const nodes = document.querySelectorAll('.react-flow__node');
      return Array.from(nodes).slice(0, 3).map(node => ({
        id: node.getAttribute('data-id'),
        transform: node.style.transform
      }));
    });

    nodePositionsBefore.forEach((node, i) => {
      console.log(`   [${i + 1}] ${node.id}: ${node.transform.substring(0, 40)}...`);
    });

    console.log('\n   Refreshing page...');
    await page.reload();
    await page.waitForTimeout(3000);

    // Navigate back to Visual Workspace after refresh
    try {
      await page.locator('button:has-text("Visual")').first().click({ timeout: 5000 });
      await page.waitForTimeout(2000);
    } catch (e) {
      // Already there
    }

    console.log('   Checking node positions after refresh:\n');

    const nodePositionsAfter = await page.evaluate(() => {
      const nodes = document.querySelectorAll('.react-flow__node');
      return Array.from(nodes).slice(0, 3).map(node => ({
        id: node.getAttribute('data-id'),
        transform: node.style.transform
      }));
    });

    nodePositionsAfter.forEach((node, i) => {
      console.log(`   [${i + 1}] ${node.id}: ${node.transform.substring(0, 40)}...`);
    });

    // Compare positions
    let positionsRestored = true;
    for (let i = 0; i < Math.min(nodePositionsBefore.length, nodePositionsAfter.length); i++) {
      if (nodePositionsBefore[i].transform !== nodePositionsAfter[i].transform) {
        positionsRestored = false;
        break;
      }
    }

    console.log(`\n   Positions restored: ${positionsRestored ? '✅ YES' : '❌ NO'}\n`);

    // ========================================
    // FINAL RESULTS
    // ========================================
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 VERIFICATION RESULTS');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Bug-024 verdict
    const updatedConfig = fs.existsSync(configPath) ?
      JSON.parse(fs.readFileSync(configPath, 'utf-8')) : null;
    const finalCount = updatedConfig?.mcpServers ? Object.keys(updatedConfig.mcpServers).length : 0;
    const bug024Fixed = finalCount === canvasNodes;

    console.log('BUG-024 (Config Persistence):');
    if (bug024Fixed) {
      console.log('   ✅ PASS - Canvas and config file match');
      console.log(`   Canvas: ${canvasNodes} nodes`);
      console.log(`   Config: ${finalCount} servers\n`);
    } else {
      console.log('   ❌ FAIL - Mismatch detected');
      console.log(`   Canvas: ${canvasNodes} nodes`);
      console.log(`   Config: ${finalCount} servers`);
      console.log('   📋 Review debug logs above to identify where servers are lost\n');
    }

    // Bug-026 verdict
    const bug026Fixed = storageKeys.length > 0 && positionsRestored;

    console.log('BUG-026 (State Restoration):');
    if (bug026Fixed) {
      console.log('   ✅ PASS - localStorage persistence working');
      console.log(`   Storage keys: ${storageKeys.length}`);
      console.log(`   Positions restored: ${positionsRestored ? 'YES' : 'NO'}\n`);
    } else {
      console.log('   ❌ FAIL - localStorage persistence not working');
      if (storageKeys.length === 0) {
        console.log('   Issue: No storage keys found');
      }
      if (!positionsRestored) {
        console.log('   Issue: Positions not restored after refresh');
      }
      console.log();
    }

    console.log('═══════════════════════════════════════════════════════════\n');

    const overallPass = bug024Fixed && bug026Fixed;
    process.exit(overallPass ? 0 : 1);

  } catch (error) {
    console.error('\n❌ Test Error:', error.message);
    process.exit(1);
  }
})();