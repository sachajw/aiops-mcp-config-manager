// Test script to verify Bug-032 fix (save race condition)
const fs = require('fs');
const path = require('path');
const os = require('os');

// Path to Claude Desktop config
const configPath = path.join(
  os.homedir(),
  'Library',
  'Application Support',
  'Claude',
  'claude_desktop_config.json'
);

// Create a backup
const backupPath = configPath + '.test-backup';
console.log('Creating backup of current config...');
if (fs.existsSync(configPath)) {
  fs.copyFileSync(configPath, backupPath);
  console.log('✓ Backup created at:', backupPath);
}

// Monitor file changes
console.log('\n📁 Monitoring config file for changes...');
console.log('Path:', configPath);
console.log('\nInstructions:');
console.log('1. Open MCP Configuration Manager');
console.log('2. Go to Visual Workspace');
console.log('3. Make a change (add/remove a server)');
console.log('4. Click Save ONCE');
console.log('5. Watch this console for immediate file update\n');

let lastContent = fs.existsSync(configPath)
  ? fs.readFileSync(configPath, 'utf8')
  : '';
let saveCount = 0;
let lastSaveTime = null;

// Watch for changes
fs.watchFile(configPath, { interval: 100 }, (curr, prev) => {
  if (curr.mtime > prev.mtime) {
    saveCount++;
    const now = Date.now();
    const timeSinceLastSave = lastSaveTime ? now - lastSaveTime : 0;
    lastSaveTime = now;

    const newContent = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(newContent);
    const serverCount = config.mcpServers ? Object.keys(config.mcpServers).length : 0;

    console.log(`\n✅ SAVE DETECTED #${saveCount}`);
    console.log('  Time:', new Date().toISOString());
    console.log('  Servers in file:', serverCount);
    console.log('  Time since last save:', timeSinceLastSave + 'ms');

    if (timeSinceLastSave > 0 && timeSinceLastSave < 200) {
      console.log('  ⚠️ WARNING: Multiple saves detected within 200ms!');
      console.log('  This suggests the race condition still exists.');
    } else if (saveCount === 1) {
      console.log('  ✨ EXCELLENT: First save worked immediately!');
      console.log('  Bug-032 fix is working correctly.');
    }

    // Show what changed
    if (lastContent !== newContent) {
      const oldServers = JSON.parse(lastContent).mcpServers || {};
      const newServers = config.mcpServers || {};

      const added = Object.keys(newServers).filter(k => !oldServers[k]);
      const removed = Object.keys(oldServers).filter(k => !newServers[k]);

      if (added.length) console.log('  Added servers:', added);
      if (removed.length) console.log('  Removed servers:', removed);
    }

    lastContent = newContent;
  }
});

console.log('Press Ctrl+C to stop monitoring and restore backup\n');

// Cleanup on exit
process.on('SIGINT', () => {
  console.log('\n\nRestoring original config...');
  if (fs.existsSync(backupPath)) {
    fs.copyFileSync(backupPath, configPath);
    fs.unlinkSync(backupPath);
    console.log('✓ Original config restored');
  }
  process.exit();
});