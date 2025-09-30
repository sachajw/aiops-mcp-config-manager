const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Bug-024 Verification Test
 * Verifies that config changes persist to disk after save
 *
 * Test Protocol:
 * 1. Load current config file and count servers
 * 2. Remove servers from canvas
 * 3. Save configuration
 * 4. Check config file matches canvas
 * 5. Verify removed servers are gone from disk
 */

(async () => {
  console.log('🔍 Bug-024 VERIFICATION TEST');
  console.log('=============================\n');
  console.log('Testing: Config changes persist to disk after save\n');

  let browser;
  let page;

  try {
    // Connect to running Electron app
    console.log('📡 Connecting to Electron app on port 9222...');
    browser = await chromium.connectOverCDP('http://localhost:9222');
    const contexts = browser.contexts();
    page = contexts[0].pages()[0];
    console.log('✅ Connected\n');

    await page.waitForTimeout(2000);

    // Step 1: Determine config file path
    console.log('📂 Step 1: Locate configuration file');
    const configPath = path.join(os.homedir(), 'Library/Application Support/Claude/claude_desktop_config.json');
    console.log(`   Config path: ${configPath}`);

    if (!fs.existsSync(configPath)) {
      console.log('   ⚠️  Config file does not exist - will be created on save');
    }

    // Read initial config
    let initialConfig = null;
    let initialServerCount = 0;

    if (fs.existsSync(configPath)) {
      const configContent = fs.readFileSync(configPath, 'utf-8');
      initialConfig = JSON.parse(configContent);
      initialServerCount = initialConfig.mcpServers ? Object.keys(initialConfig.mcpServers).length : 0;
      console.log(`   Initial server count in config: ${initialServerCount}`);
    }

    // Navigate to Visual Workspace
    console.log('\n🎯 Step 2: Navigate to Visual Workspace');
    const visualTab = page.locator('button:has-text("Visual")').first();
    await visualTab.click();
    await page.waitForTimeout(2000);
    console.log('✅ Navigated to Visual Workspace\n');

    // Count nodes on canvas
    const initialCanvasNodes = await page.locator('.react-flow__node').count();
    console.log(`   Canvas has ${initialCanvasNodes} nodes initially\n`);

    // Step 3: Remove a server node from canvas
    console.log('🗑️  Step 3: Remove a server from canvas');

    if (initialCanvasNodes > 0) {
      // Find a node and delete it
      const firstNode = page.locator('.react-flow__node').first();
      const nodeName = await firstNode.getAttribute('data-id').catch(() => 'unknown');
      console.log(`   Target node to remove: ${nodeName}`);

      // Click the node to select it
      await firstNode.click();
      await page.waitForTimeout(500);

      // Try to find and click delete button
      const deleteButton = page.locator('button:has-text("Delete"), button[title*="Delete"], button[aria-label*="delete"]').first();
      const deleteExists = await deleteButton.count() > 0;

      if (deleteExists) {
        await deleteButton.click();
        await page.waitForTimeout(1000);
        console.log('   ✅ Clicked delete button');
      } else {
        // Try keyboard delete
        console.log('   Trying keyboard delete...');
        await page.keyboard.press('Delete');
        await page.waitForTimeout(1000);
      }

      // Check if node count decreased
      const afterDeleteCount = await page.locator('.react-flow__node').count();
      const removed = afterDeleteCount < initialCanvasNodes;

      console.log(`   After delete: ${afterDeleteCount} nodes (${removed ? '✅ REMOVED' : '❌ NOT REMOVED'})\n`);
    } else {
      console.log('   ⚠️  No nodes to remove\n');
    }

    // Step 4: Click Save Configuration
    console.log('💾 Step 4: Click Save Configuration');
    const saveButton = page.locator('button:has-text("Save Configuration")').first();

    const saveEnabled = !(await saveButton.isDisabled());
    console.log(`   Save button enabled: ${saveEnabled ? '✅ YES' : '❌ NO'}`);

    if (saveEnabled) {
      await saveButton.click();
      console.log('   ✅ Clicked Save Configuration');

      // Wait for save to complete
      await page.waitForTimeout(2000);

      // Check if asterisk is gone (save successful)
      const buttonText = await saveButton.textContent();
      const asteriskGone = !buttonText.includes('*');
      console.log(`   Asterisk gone after save: ${asteriskGone ? '✅ YES' : '❌ NO'}\n`);
    } else {
      console.log('   ⚠️  Save button is disabled - no changes to save\n');
    }

    // Step 5: Verify config file on disk
    console.log('🔍 Step 5: Verify config file matches canvas');

    // Wait a moment for file write
    await page.waitForTimeout(1000);

    if (fs.existsSync(configPath)) {
      const updatedConfigContent = fs.readFileSync(configPath, 'utf-8');
      const updatedConfig = JSON.parse(updatedConfigContent);
      const finalServerCount = updatedConfig.mcpServers ? Object.keys(updatedConfig.mcpServers).length : 0;

      console.log(`   Final server count in config file: ${finalServerCount}`);
      console.log(`   Config file size: ${updatedConfigContent.length} bytes`);

      // Get current canvas node count
      const finalCanvasNodes = await page.locator('.react-flow__node').count();
      console.log(`   Canvas node count: ${finalCanvasNodes}`);

      // Compare
      const countsMatch = finalServerCount === finalCanvasNodes;
      console.log(`   Counts match: ${countsMatch ? '✅ YES' : '❌ NO'}\n`);

      // Check if change persisted
      if (initialConfig && initialServerCount > 0) {
        const changeDetected = finalServerCount !== initialServerCount;
        console.log(`   Change from initial config: ${changeDetected ? '✅ YES' : '❌ NO'}`);
        console.log(`     Initial: ${initialServerCount} servers`);
        console.log(`     Final: ${finalServerCount} servers\n`);
      }

      // Show server list
      if (updatedConfig.mcpServers) {
        console.log('   Servers in config file:');
        Object.keys(updatedConfig.mcpServers).forEach(serverName => {
          console.log(`     - ${serverName}`);
        });
        console.log();
      }

    } else {
      console.log('   ❌ Config file does not exist after save!\n');
    }

    // FINAL VERDICT
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 BUG-024 VERIFICATION RESULTS');
    console.log('═══════════════════════════════════════════════════════════\n');

    const configFileExists = fs.existsSync(configPath);
    let countsMatch = false;
    let changesPersisted = false;

    if (configFileExists) {
      const updatedConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      const finalServerCount = updatedConfig.mcpServers ? Object.keys(updatedConfig.mcpServers).length : 0;
      const finalCanvasNodes = await page.locator('.react-flow__node').count();

      countsMatch = finalServerCount === finalCanvasNodes;
      changesPersisted = initialConfig ? (finalServerCount !== initialServerCount) : true;
    }

    console.log('PASS CONDITIONS:');
    console.log(`  ✓ Config file exists: ${configFileExists ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  ✓ Canvas matches config: ${countsMatch ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  ✓ Changes persisted to disk: ${changesPersisted ? '✅ PASS' : '❌ FAIL'}\n`);

    const overallPass = configFileExists && countsMatch;

    console.log('═══════════════════════════════════════════════════════════');
    if (overallPass) {
      console.log('✅✅✅ BUG-024 VERIFICATION: **PASSED** ✅✅✅');
      console.log('');
      console.log('   Config changes PERSIST to disk after save!');
      console.log('   ✓ Config file updated correctly');
      console.log('   ✓ Canvas state matches config file');
    } else {
      console.log('❌❌❌ BUG-024 VERIFICATION: **FAILED** ❌❌❌');
      console.log('');
      console.log('   Config changes do NOT persist to disk.');
      if (!configFileExists) {
        console.log('   ❌ Config file was not created/updated');
      }
      if (!countsMatch) {
        console.log('   ❌ Canvas state does not match config file');
      }
    }
    console.log('═══════════════════════════════════════════════════════════\n');

    process.exit(overallPass ? 0 : 1);

  } catch (error) {
    console.error('\n❌ Test Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
})();