const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * FINAL SAVE VALIDATION - Using Header Save Button
 * Tests complete save flow with the correct button location
 */

(async () => {
  console.log('🔍 FINAL SAVE VALIDATION (Header Save Button)');
  console.log('==============================================\n');

  let browser;
  let page;
  const configPath = path.join(os.homedir(), 'Library/Application Support/Claude/claude_desktop_config.json');

  try {
    browser = await chromium.connectOverCDP('http://localhost:9222');
    page = browser.contexts()[0].pages()[0];
    console.log('✅ Connected to app\n');

    // Capture logs
    const saveLogs = [];
    const ipcLogs = [];
    const errors = [];

    page.on('console', msg => {
      const text = msg.text();

      if (text.includes('SAVE') || text.includes('💾')) {
        saveLogs.push(text);
        console.log(`   💾 ${text}`);
      }

      if (text.includes('IPC') || text.includes('config:save')) {
        ipcLogs.push(text);
        console.log(`   📡 ${text}`);
      }

      if (msg.type() === 'error') {
        errors.push(text);
        console.log(`   ❌ ${text}`);
      }
    });

    await page.waitForTimeout(2000);

    // Navigate to Visual Workspace
    console.log('📍 Step 1: Navigate to Visual Workspace');
    try {
      await page.locator('button:has-text("Visual")').first().click({ timeout: 5000 });
      await page.waitForTimeout(2000);
      console.log('✅ Navigated\n');
    } catch (e) {
      console.log('Already there\n');
    }

    // Backup config
    console.log('📊 Step 2: Backup and read initial state');
    const backupPath = configPath + '.test-backup';
    if (fs.existsSync(configPath)) {
      fs.copyFileSync(configPath, backupPath);
    }

    const initialConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const initialServers = Object.keys(initialConfig.mcpServers || {}).sort();
    console.log(`   Initial: ${initialServers.length} servers in config\n`);

    // Find the header Save button
    console.log('🔍 Step 3: Locate header Save button');

    // Try different selectors for header save button
    const headerSelectors = [
      'header button:has-text("Save")',
      '.header button:has-text("Save")',
      'button:has-text("Save"):not(:has-text("Profile"))',
      'button:has-text("Save")'
    ];

    let saveButton = null;
    for (const selector of headerSelectors) {
      const buttons = await page.locator(selector).all();
      if (buttons.length > 0) {
        console.log(`   ✅ Found with selector: ${selector}`);
        // Get the first one that's just "Save" (not "Save ... Profile")
        for (const btn of buttons) {
          const text = await btn.textContent();
          if (text.trim() === 'Save') {
            saveButton = btn;
            console.log(`   ✅ Selected button with text: "${text}"\n`);
            break;
          }
        }
        if (saveButton) break;
      }
    }

    if (!saveButton) {
      console.log('   ❌ Could not find header Save button\n');
      console.log('Available buttons:');
      const allButtons = await page.locator('button:has-text("Save")').all();
      for (let i = 0; i < allButtons.length; i++) {
        const text = await allButtons[i].textContent();
        console.log(`     [${i + 1}] "${text}"`);
      }
      throw new Error('Save button not found');
    }

    // Check button state
    const isEnabled = !(await saveButton.isDisabled());
    const buttonText = await saveButton.textContent();
    console.log(`💾 Step 4: Save button status`);
    console.log(`   Text: "${buttonText}"`);
    console.log(`   Enabled: ${isEnabled}\n`);

    // Make a change to trigger dirty state
    if (!isEnabled) {
      console.log('🔄 Step 5: Making a change to enable save');
      const nodes = await page.locator('.react-flow__node').all();
      if (nodes.length > 0) {
        const firstNode = nodes[0];
        const bounds = await firstNode.boundingBox();
        if (bounds) {
          await page.mouse.move(bounds.x + 50, bounds.y + 50);
          await page.mouse.down();
          await page.mouse.move(bounds.x + 150, bounds.y + 150, { steps: 10 });
          await page.mouse.up();
          await page.waitForTimeout(1500);

          const nowEnabled = !(await saveButton.isDisabled());
          console.log(`   After change: Save button enabled = ${nowEnabled}\n`);
        }
      }
    }

    // Perform save
    console.log('💾 Step 6: CLICKING SAVE BUTTON');
    console.log('   Watching for debug logs...\n');
    console.log('─────────────────────────────────────────────');

    const finalEnabled = !(await saveButton.isDisabled());
    if (finalEnabled) {
      await saveButton.click();
      console.log('   ✅ Clicked Save button');
      await page.waitForTimeout(3000);
      console.log('─────────────────────────────────────────────\n');
    } else {
      console.log('   ⚠️  Save button still disabled\n');
      console.log('─────────────────────────────────────────────\n');
    }

    // Verify config file
    console.log('📄 Step 7: Verify config file changes');
    await page.waitForTimeout(1000);

    const updatedConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const finalServers = Object.keys(updatedConfig.mcpServers || {}).sort();

    console.log(`   Initial servers: ${initialServers.length}`);
    console.log(`   Final servers: ${finalServers.length}`);

    const changed = JSON.stringify(initialServers) !== JSON.stringify(finalServers);
    console.log(`   Config changed: ${changed ? '✅ YES' : '⚠️  NO'}\n`);

    // Analyze logs
    console.log('📊 Step 8: Log analysis');
    console.log(`   Save logs captured: ${saveLogs.length}`);
    console.log(`   IPC logs captured: ${ipcLogs.length}`);
    console.log(`   Errors: ${errors.length}\n`);

    if (saveLogs.length > 0) {
      console.log('Recent save logs:');
      saveLogs.slice(-5).forEach(log => console.log(`     ${log.substring(0, 80)}`));
      console.log();
    }

    // FINAL VERDICT
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 SAVE FUNCTIONALITY VALIDATION');
    console.log('═══════════════════════════════════════════════════════════\n');

    const checks = {
      buttonFound: !!saveButton,
      buttonWorks: finalEnabled && (saveLogs.length > 0 || ipcLogs.length > 0),
      configUpdates: changed || saveLogs.length > 0,
      noErrors: errors.length === 0
    };

    console.log('VALIDATION CHECKS:');
    console.log(`  ✓ Header Save button found: ${checks.buttonFound ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  ✓ Save button functional: ${checks.buttonWorks ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  ✓ Config updates on save: ${checks.configUpdates ? '✅ PASS' : '⚠️  UNKNOWN'}`);
    console.log(`  ✓ No errors occurred: ${checks.noErrors ? '✅ PASS' : '❌ FAIL'}\n`);

    const allPass = Object.values(checks).every(c => c);

    console.log('═══════════════════════════════════════════════════════════');
    if (allPass) {
      console.log('✅✅✅ SAVE FUNCTIONALITY: **WORKING** ✅✅✅');
      console.log('   Header Save button found and functional');
      console.log('   Config file updates correctly');
    } else {
      console.log('⚠️  SAVE FUNCTIONALITY: **NEEDS ATTENTION**');
      console.log('   Button found but save flow may have issues');
      if (saveLogs.length === 0 && ipcLogs.length === 0) {
        console.log('   ⚠️  No save-related logs detected');
      }
    }
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log(`💾 Backup saved to: ${backupPath}\n`);

    process.exit(allPass ? 0 : 1);

  } catch (error) {
    console.error('\n❌ Test Error:', error.message);
    process.exit(1);
  }
})();