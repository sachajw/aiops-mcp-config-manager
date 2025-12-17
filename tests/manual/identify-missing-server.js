const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Identify which server is on canvas but not in config file
 */

(async () => {
  console.log('🔍 IDENTIFYING MISSING SERVER');
  console.log('==============================\n');

  let browser;
  let page;

  try {
    browser = await chromium.connectOverCDP('http://localhost:9222');
    page = browser.contexts()[0].pages()[0];

    // Navigate to Visual
    try {
      await page.locator('button:has-text("Visual")').first().click({ timeout: 5000 });
      await page.waitForTimeout(2000);
    } catch (e) {
      // Already there
    }

    // Get all node IDs from canvas
    const canvasServerIds = await page.evaluate(() => {
      const nodes = document.querySelectorAll('.react-flow__node');
      return Array.from(nodes).map(node => {
        const id = node.getAttribute('data-id');
        // Remove 'server-' or 'client-' prefix if present
        return id?.replace(/^(server-|client-)/, '') || id;
      }).filter(id => id && !id.includes('client'));
    });

    console.log(`📊 Canvas servers (${canvasServerIds.length}):  `);
    canvasServerIds.sort().forEach((id, i) => {
      console.log(`   ${i + 1}. ${id}`);
    });
    console.log();

    // Read config file
    const configPath = path.join(os.homedir(), 'Library/Application Support/Claude/claude_desktop_config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const configServerIds = Object.keys(config.mcpServers || {});

    console.log(`📄 Config file servers (${configServerIds.length}):`);
    configServerIds.sort().forEach((id, i) => {
      console.log(`   ${i + 1}. ${id}`);
    });
    console.log();

    // Find differences
    const onlyOnCanvas = canvasServerIds.filter(id => !configServerIds.includes(id));
    const onlyInConfig = configServerIds.filter(id => !canvasServerIds.includes(id));

    console.log('═══════════════════════════════════════════');
    console.log('DIFFERENCE ANALYSIS');
    console.log('═══════════════════════════════════════════\n');

    if (onlyOnCanvas.length > 0) {
      console.log(`❌ On canvas but NOT in config (${onlyOnCanvas.length}):`);
      onlyOnCanvas.forEach(id => console.log(`   - ${id}`));
      console.log();
    }

    if (onlyInConfig.length > 0) {
      console.log(`❌ In config but NOT on canvas (${onlyInConfig.length}):`);
      onlyInConfig.forEach(id => console.log(`   - ${id}`));
      console.log();
    }

    if (onlyOnCanvas.length === 0 && onlyInConfig.length === 0) {
      console.log('✅ All servers match!\n');
    } else {
      console.log('🎯 ROOT CAUSE:');
      if (onlyOnCanvas.length > 0) {
        console.log(`   Canvas has ${onlyOnCanvas.length} extra server(s) not saved to config`);
        console.log(`   This suggests canvas is showing cached/stale data`);
      }
      if (onlyInConfig.length > 0) {
        console.log(`   Config has ${onlyInConfig.length} server(s) not shown on canvas`);
        console.log(`   This suggests canvas failed to load all servers`);
      }
      console.log();
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
})();