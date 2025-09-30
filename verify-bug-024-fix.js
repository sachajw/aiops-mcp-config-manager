const fs = require('fs');
const path = require('path');

// Config file path
const configPath = path.join(process.env.HOME, 'Library/Application Support/Claude/claude_desktop_config.json');

console.log('=== Bug-024 Fix Verification ===');
console.log(`Config file: ${configPath}`);

// Read current config
const configBefore = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const serversBefore = Object.keys(configBefore.mcpServers || {});
console.log(`\nBefore: ${serversBefore.length} servers`);
console.log('Servers:', serversBefore.slice(0, 5).join(', ') + (serversBefore.length > 5 ? '...' : ''));

// Simulate what the Visual Workspace save would do
console.log('\n📝 Test Instructions:');
console.log('1. In the app, go to Visual Workspace');
console.log('2. Select Claude Desktop');
console.log('3. Remove a server by dragging to trash');
console.log('4. Click Save Configuration');
console.log('5. Run this script again to see if server count changed');
console.log('\nOR manually check the file after save:');
console.log(`  grep -c '"[^"]*"\\s*:\\s*{' "${configPath}"`);

// Watch for changes
console.log('\n🔍 Watching for changes...');
let lastModified = fs.statSync(configPath).mtime;

setInterval(() => {
    const stats = fs.statSync(configPath);
    if (stats.mtime > lastModified) {
        console.log('\n✅ FILE CHANGED!');
        const configAfter = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        const serversAfter = Object.keys(configAfter.mcpServers || {});
        console.log(`After: ${serversAfter.length} servers (was ${serversBefore.length})`);
        console.log('Change: ' + (serversAfter.length - serversBefore.length));
        lastModified = stats.mtime;
    }
}, 1000);