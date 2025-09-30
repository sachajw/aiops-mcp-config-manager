const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * COMPREHENSIVE SAVE VALIDATION TEST
 * Tests all aspects of save functionality:
 * 1. Save button activation
 * 2. IPC call execution
 * 3. Config file writes
 * 4. State persistence
 * 5. Data integrity
 */

(async () => {
  console.log('🔍 COMPREHENSIVE SAVE FUNCTIONALITY VALIDATION');
  console.log('==============================================\n');

  let browser;
  let page;
  const configPath = path.join(os.homedir(), 'Library/Application Support/Claude/claude_desktop_config.json');

  try {
    // Connect to app
    console.log('📡 Connecting to Electron app on port 9222...');
    browser = await chromium.connectOverCDP('http://localhost:9222');
    page = browser.contexts()[0].pages()[0];
    console.log('✅ Connected\n');

    // Capture ALL console logs and IPC calls
    const logs = [];
    const ipcCalls = [];
    const errors = [];

    page.on('console', msg => {
      const text = msg.text();
      logs.push({ time: Date.now(), type: msg.type(), text });

      // Track IPC calls
      if (text.includes('IPC') || text.includes('invoke') || text.includes('config:save')) {
        ipcCalls.push({ time: Date.now(), text });
        console.log(`   📡 IPC: ${text}`);
      }

      // Track save-related logs
      if (text.includes('SAVE') || text.includes('💾') || text.includes('Saving')) {
        console.log(`   💾 SAVE: ${text}`);
      }

      // Track errors
      if (msg.type() === 'error') {
        errors.push({ time: Date.now(), text });
        console.log(`   ❌ ERROR: ${text}`);
      }
    });

    await page.waitForTimeout(2000);

    // Navigate to Visual Workspace
    console.log('🎯 Step 1: Navigate to Visual Workspace');
    try {
      await page.locator('button:has-text("Visual")').first().click({ timeout: 5000 });
      await page.waitForTimeout(2000);
      console.log('✅ Navigated\n');
    } catch (e) {
      console.log('Already on Visual Workspace\n');
    }

    // Read initial config and create backup
    console.log('📊 Step 2: Read initial state');
    const backupPath = configPath + '.backup-test';
    if (fs.existsSync(configPath)) {
      fs.copyFileSync(configPath, backupPath);
      console.log(`✅ Created backup: ${backupPath}`);
    }

    const initialConfig = fs.existsSync(configPath) ?
      JSON.parse(fs.readFileSync(configPath, 'utf-8')) : null;
    const initialServerCount = initialConfig?.mcpServers ? Object.keys(initialConfig.mcpServers).length : 0;
    const initialServerNames = initialConfig?.mcpServers ? Object.keys(initialConfig.mcpServers).sort() : [];

    console.log(`   Config has ${initialServerCount} servers`);
    console.log(`   File size: ${fs.existsSync(configPath) ? fs.statSync(configPath).size : 0} bytes\n`);

    // Count canvas nodes
    const canvasNodeCount = await page.locator('.react-flow__node').count();
    console.log(`🎨 Step 3: Canvas inspection`);
    console.log(`   Canvas shows ${canvasNodeCount} total nodes\n`);

    // Get canvas server IDs
    const canvasServerIds = await page.evaluate(() => {
      const nodes = document.querySelectorAll('.react-flow__node');
      return Array.from(nodes)
        .map(node => node.getAttribute('data-id'))
        .filter(id => id && id.startsWith('server-'))
        .map(id => id.replace('server-', ''))
        .sort();
    });

    console.log(`   Canvas servers (${canvasServerIds.length}):`);
    canvasServerIds.forEach(id => console.log(`     - ${id}`));
    console.log();

    // Check save button state
    console.log('💾 Step 4: Check save button');
    const saveButton = page.locator('button:has-text("Save Configuration")').first();
    const saveButtonText = await saveButton.textContent();
    const isSaveEnabled = !(await saveButton.isDisabled());
    const hasAsterisk = saveButtonText.includes('*');

    console.log(`   Text: "${saveButtonText}"`);
    console.log(`   Enabled: ${isSaveEnabled}`);
    console.log(`   Has unsaved changes (*): ${hasAsterisk}\n`);

    // If no unsaved changes, make a change
    if (!hasAsterisk && canvasNodeCount > 0) {
      console.log('🔄 Step 5: Making a change to trigger dirty state');

      // Try moving a node
      const firstNode = page.locator('.react-flow__node').first();
      const bounds = await firstNode.boundingBox();

      if (bounds) {
        console.log('   Moving node to trigger change...');
        await page.mouse.move(bounds.x + 50, bounds.y + 50);
        await page.mouse.down();
        await page.mouse.move(bounds.x + 200, bounds.y + 200, { steps: 10 });
        await page.mouse.up();
        await page.waitForTimeout(1500);

        const nowHasAsterisk = (await saveButton.textContent()).includes('*');
        const nowEnabled = !(await saveButton.isDisabled());
        console.log(`   After change: enabled=${nowEnabled}, asterisk=${nowHasAsterisk}\n`);
      }
    }

    // Perform save
    console.log('💾 Step 6: PERFORMING SAVE');
    console.log('   Watching for debug logs...\n');
    console.log('─────────────────────────────────────────────');

    const saveEnabled = !(await saveButton.isDisabled());
    if (saveEnabled) {
      // Click save
      await saveButton.click();
      console.log('   ✅ Clicked Save Configuration button');

      // Wait for save to complete
      await page.waitForTimeout(3000);

      console.log('─────────────────────────────────────────────\n');
    } else {
      console.log('   ❌ Save button is DISABLED - cannot test save\n');
      console.log('─────────────────────────────────────────────\n');
    }

    // Check button state after save
    console.log('📊 Step 7: Post-save validation');
    const afterSaveText = await saveButton.textContent();
    const afterSaveEnabled = !(await saveButton.isDisabled());
    const asteriskGone = !afterSaveText.includes('*');

    console.log(`   Button text: "${afterSaveText}"`);
    console.log(`   Asterisk gone: ${asteriskGone ? '✅ YES' : '❌ NO'}`);
    console.log(`   Button disabled: ${!afterSaveEnabled ? '✅ YES' : '❌ NO'}\n`);

    // Read config file after save
    console.log('📄 Step 8: Verify config file changes');
    await page.waitForTimeout(1000); // Extra wait for file write

    const updatedConfig = fs.existsSync(configPath) ?
      JSON.parse(fs.readFileSync(configPath, 'utf-8')) : null;
    const finalServerCount = updatedConfig?.mcpServers ? Object.keys(updatedConfig.mcpServers).length : 0;
    const finalServerNames = updatedConfig?.mcpServers ? Object.keys(updatedConfig.mcpServers).sort() : [];

    console.log(`   Initial servers: ${initialServerCount}`);
    console.log(`   Final servers: ${finalServerCount}`);
    console.log(`   Canvas servers: ${canvasServerIds.length}`);
    console.log(`   File modified: ${fs.existsSync(configPath) ? 'YES' : 'NO'}\n`);

    // Compare server lists
    const addedServers = finalServerNames.filter(s => !initialServerNames.includes(s));
    const removedServers = initialServerNames.filter(s => !finalServerNames.includes(s));
    const canvasOnly = canvasServerIds.filter(s => !finalServerNames.includes(s));
    const configOnly = finalServerNames.filter(s => !canvasServerIds.includes(s));

    if (addedServers.length > 0) {
      console.log(`   ✅ Servers added to config: ${addedServers.join(', ')}`);
    }
    if (removedServers.length > 0) {
      console.log(`   ✅ Servers removed from config: ${removedServers.join(', ')}`);
    }
    if (canvasOnly.length > 0) {
      console.log(`   ⚠️  On canvas but NOT in config: ${canvasOnly.join(', ')}`);
    }
    if (configOnly.length > 0) {
      console.log(`   ⚠️  In config but NOT on canvas: ${configOnly.join(', ')}`);
    }
    console.log();

    // Analyze IPC calls
    console.log('📡 Step 9: IPC call analysis');
    if (ipcCalls.length > 0) {
      console.log(`   Found ${ipcCalls.length} IPC-related log entries:`);
      ipcCalls.forEach(call => {
        console.log(`     ${call.text.substring(0, 100)}`);
      });
    } else {
      console.log(`   ❌ NO IPC calls detected during save!`);
    }
    console.log();

    // Check for errors
    if (errors.length > 0) {
      console.log('❌ Step 10: Errors detected');
      console.log(`   Found ${errors.length} errors during test:`);
      errors.forEach(err => {
        console.log(`     ${err.text}`);
      });
      console.log();
    }

    // FINAL VERDICT
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 COMPREHENSIVE SAVE VALIDATION RESULTS');
    console.log('═══════════════════════════════════════════════════════════\n');

    const checks = {
      buttonActivates: hasAsterisk || asteriskGone,
      asteriskClears: asteriskGone,
      fileWasModified: finalServerCount !== initialServerCount || addedServers.length > 0 || removedServers.length > 0,
      canvasMatchesConfig: canvasOnly.length === 0 && configOnly.length === 0,
      ipcCallsMade: ipcCalls.length > 0,
      noErrors: errors.length === 0
    };

    console.log('VALIDATION CHECKS:');
    console.log(`  1. Save button activates/deactivates: ${checks.buttonActivates ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  2. Asterisk clears after save: ${checks.asteriskClears ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  3. Config file was modified: ${checks.fileWasModified ? '✅ PASS' : '⚠️  NO CHANGE'}`);
    console.log(`  4. Canvas matches config: ${checks.canvasMatchesConfig ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  5. IPC calls executed: ${checks.ipcCallsMade ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  6. No errors occurred: ${checks.noErrors ? '✅ PASS' : '❌ FAIL'}\n`);

    // Detailed failure analysis
    if (!checks.canvasMatchesConfig) {
      console.log('❌ CRITICAL ISSUE: Canvas and config file are OUT OF SYNC');
      console.log(`   Canvas has: ${canvasServerIds.length} servers`);
      console.log(`   Config has: ${finalServerCount} servers`);
      if (canvasOnly.length > 0) {
        console.log(`   Missing from config: ${canvasOnly.join(', ')}`);
      }
      if (configOnly.length > 0) {
        console.log(`   Missing from canvas: ${configOnly.join(', ')}`);
      }
      console.log();
    }

    if (!checks.ipcCallsMade) {
      console.log('❌ CRITICAL ISSUE: No IPC calls detected!');
      console.log('   Save button may not be calling backend');
      console.log('   Check save handler in VisualWorkspace component\n');
    }

    const allPass = Object.values(checks).every(c => c);

    console.log('═══════════════════════════════════════════════════════════');
    if (allPass) {
      console.log('✅✅✅ SAVE FUNCTIONALITY: **WORKING** ✅✅✅');
      console.log('   All validation checks passed');
    } else {
      console.log('❌❌❌ SAVE FUNCTIONALITY: **BROKEN** ❌❌❌');
      console.log('   Failed checks:');
      Object.entries(checks).forEach(([check, passed]) => {
        if (!passed) {
          console.log(`     ❌ ${check}`);
        }
      });
    }
    console.log('═══════════════════════════════════════════════════════════\n');

    // Restore backup
    if (fs.existsSync(backupPath)) {
      console.log(`💾 Backup available at: ${backupPath}`);
      console.log('   To restore: cp "${backupPath}" "${configPath}"\n');
    }

    process.exit(allPass ? 0 : 1);

  } catch (error) {
    console.error('\n❌ Test Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
})();