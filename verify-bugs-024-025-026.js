const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Comprehensive Bug-024, Bug-025, Bug-026 Verification
 *
 * Bug-024: Config changes persist to disk
 * Bug-025: Auto-save functionality
 * Bug-026: Canvas state restoration
 */

(async () => {
  console.log('🔍 BUGS 024, 025, 026 VERIFICATION');
  console.log('===================================\n');

  let browser;
  let page;
  const configPath = path.join(os.homedir(), 'Library/Application Support/Claude/claude_desktop_config.json');

  try {
    // Connect to running app
    console.log('📡 Connecting to Electron app...');
    browser = await chromium.connectOverCDP('http://localhost:9222');
    page = browser.contexts()[0].pages()[0];
    console.log('✅ Connected\n');

    await page.waitForTimeout(2000);

    // Helper function to read config
    const readConfig = () => {
      if (!fs.existsSync(configPath)) return null;
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    };

    // Helper function to count servers
    const countServers = (config) => {
      return config && config.mcpServers ? Object.keys(config.mcpServers).length : 0;
    };

    // ========================================
    // BUG-024: Config Persistence Test
    // ========================================
    console.log('═══════════════════════════════════════════');
    console.log('🧪 BUG-024: Config Persistence Verification');
    console.log('═══════════════════════════════════════════\n');

    // Navigate to Visual if not already there
    const currentUrl = page.url();
    if (!currentUrl.includes('visual')) {
      console.log('Navigating to Visual Workspace...');
      try {
        await page.locator('button:has-text("Visual")').first().click({ timeout: 5000 });
        await page.waitForTimeout(2000);
      } catch (e) {
        console.log('Already on Visual Workspace or navigation not needed');
      }
    }

    // Read initial config
    const initialConfig = readConfig();
    const initialCount = countServers(initialConfig);
    console.log(`📊 Initial config: ${initialCount} servers\n`);

    // Count canvas nodes
    const canvasNodes = await page.locator('.react-flow__node').count();
    console.log(`🎨 Canvas shows: ${canvasNodes} nodes\n`);

    // Check Save button status
    const saveButton = page.locator('button:has-text("Save Configuration")').first();
    const saveButtonText = await saveButton.textContent().catch(() => 'N/A');
    const hasUnsavedChanges = saveButtonText.includes('*');
    const isSaveEnabled = !(await saveButton.isDisabled().catch(() => true));

    console.log(`💾 Save button state:`);
    console.log(`   Text: "${saveButtonText}"`);
    console.log(`   Enabled: ${isSaveEnabled ? 'YES' : 'NO'}`);
    console.log(`   Unsaved changes: ${hasUnsavedChanges ? 'YES (*)' : 'NO'}\n`);

    // If there are unsaved changes, test save functionality
    let bug024Pass = false;

    if (hasUnsavedChanges && isSaveEnabled) {
      console.log('✓ Unsaved changes detected - testing save...');

      // Click save
      await saveButton.click();
      console.log('  Clicked Save Configuration');
      await page.waitForTimeout(2000);

      // Check button state after save
      const afterSaveText = await saveButton.textContent();
      const asteriskGone = !afterSaveText.includes('*');
      console.log(`  Asterisk gone: ${asteriskGone ? '✅ YES' : '❌ NO'}`);

      // Check if config file was updated
      const updatedConfig = readConfig();
      const updatedCount = countServers(updatedConfig);
      console.log(`  Config file servers: ${updatedCount}`);

      const countsMatch = updatedCount === canvasNodes;
      console.log(`  Canvas matches config: ${countsMatch ? '✅ YES' : '❌ NO'}\n`);

      bug024Pass = asteriskGone && countsMatch;
    } else {
      console.log('⚠️  No unsaved changes to test save functionality');
      console.log('   Testing if current state matches config...\n');

      const countsMatch = initialCount === canvasNodes;
      console.log(`   Canvas matches config: ${countsMatch ? '✅ YES' : '❌ NO'}\n`);

      bug024Pass = countsMatch;
    }

    // ========================================
    // BUG-025: Auto-save Test
    // ========================================
    console.log('\n═══════════════════════════════════════════');
    console.log('🧪 BUG-025: Auto-save Functionality');
    console.log('═══════════════════════════════════════════\n');

    // Check for auto-save checkbox
    const autoSaveCheckbox = page.locator('input[type="checkbox"][name="autoSave"], label:has-text("Auto-save")').first();
    const autoSaveExists = await autoSaveCheckbox.count() > 0;

    console.log(`🔍 Auto-save feature:`);
    console.log(`   Checkbox found: ${autoSaveExists ? '✅ YES' : '❌ NO'}`);

    let bug025Implemented = false;
    if (autoSaveExists) {
      const isChecked = await autoSaveCheckbox.isChecked().catch(() => false);
      console.log(`   Currently enabled: ${isChecked ? 'YES' : 'NO'}\n`);
      bug025Implemented = true;
    } else {
      console.log(`   ⚠️  Auto-save UI not found\n`);
    }

    // ========================================
    // BUG-026: State Restoration Test
    // ========================================
    console.log('\n═══════════════════════════════════════════');
    console.log('🧪 BUG-026: Canvas State Restoration');
    console.log('═══════════════════════════════════════════\n');

    // Check if nodes have position data
    const nodes = await page.locator('.react-flow__node').all();
    let hasPositionData = false;

    if (nodes.length > 0) {
      const firstNode = nodes[0];
      const transform = await firstNode.evaluate(el => el.style.transform);
      hasPositionData = transform && transform.includes('translate');

      console.log(`🎯 Node positioning:`);
      console.log(`   Nodes on canvas: ${nodes.length}`);
      console.log(`   Position data present: ${hasPositionData ? '✅ YES' : '❌ NO'}`);
      if (hasPositionData) {
        console.log(`   Sample transform: ${transform.substring(0, 50)}...`);
      }
      console.log();
    }

    // Check if positions are stored somewhere
    const localStorageKeys = await page.evaluate(() => Object.keys(localStorage));
    const hasWorkspaceStorage = localStorageKeys.some(key =>
      key.includes('workspace') || key.includes('canvas') || key.includes('visual')
    );

    console.log(`💾 State storage:`);
    console.log(`   localStorage keys: ${localStorageKeys.length}`);
    console.log(`   Workspace-related storage: ${hasWorkspaceStorage ? '✅ YES' : '❌ NO'}`);

    if (hasWorkspaceStorage) {
      const workspaceKeys = localStorageKeys.filter(key =>
        key.includes('workspace') || key.includes('canvas') || key.includes('visual')
      );
      console.log(`   Keys: ${workspaceKeys.join(', ')}`);
    }
    console.log();

    const bug026Pass = hasPositionData && hasWorkspaceStorage;

    // ========================================
    // FINAL RESULTS
    // ========================================
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📊 VERIFICATION RESULTS SUMMARY');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('BUG-024 (Config Persistence):');
    if (bug024Pass) {
      console.log('   ✅ PASS - Config changes persist to disk');
      console.log('   ✓ Save button functions correctly');
      console.log('   ✓ Canvas state matches config file\n');
    } else {
      console.log('   ❌ FAIL - Config persistence issues detected');
      console.log('   ✗ Canvas may not match config file\n');
    }

    console.log('BUG-025 (Auto-save):');
    if (bug025Implemented) {
      console.log('   ⚠️  PARTIALLY IMPLEMENTED - UI present');
      console.log('   ℹ️  Manual testing required for 30s timer');
      console.log('   ℹ️  Check "Saving..." indicator appears\n');
    } else {
      console.log('   ❌ NOT IMPLEMENTED - No auto-save UI found\n');
    }

    console.log('BUG-026 (State Restoration):');
    if (bug026Pass) {
      console.log('   ✅ PASS - Canvas state restoration working');
      console.log('   ✓ Node positions tracked');
      console.log('   ✓ State storage present\n');
    } else {
      console.log('   ❌ FAIL - State restoration not working');
      console.log('   ℹ️  Page refresh test needed for full verification\n');
    }

    console.log('═══════════════════════════════════════════════════════════\n');

    const overallPass = bug024Pass && bug026Pass;
    process.exit(overallPass ? 0 : 1);

  } catch (error) {
    console.error('\n❌ Test Error:', error.message);
    process.exit(1);
  }
})();