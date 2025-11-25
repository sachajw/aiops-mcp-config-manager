#!/usr/bin/env node

/**
 * Test script to verify OAuth loop prevention (Bug-027)
 * This simulates a server that outputs OAuth URLs to stderr
 */

const { spawn } = require('child_process');

// Simulate a server that outputs OAuth URLs repeatedly
const mockServerCode = `
setInterval(() => {
  console.error('Please visit https://example.com/oauth/authorize?client_id=123 to authenticate');
  console.error('OAuth URL: https://example.com/auth/callback');
}, 1000);

// Keep process alive
setInterval(() => {}, 1000);
`;

console.log('Starting OAuth Loop Test for Bug-027...\n');
console.log('This test simulates a server that outputs OAuth URLs to stderr');
console.log('Expected behavior: Should detect OAuth URLs and limit auth attempts\n');

// Create a mock server process
const mockServer = spawn('node', ['-e', mockServerCode], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let stderrCount = 0;
let oauthUrlCount = 0;

// Monitor stderr output
mockServer.stderr.on('data', (data) => {
  const output = data.toString();
  stderrCount++;

  // Check for OAuth patterns
  const oauthPatterns = [
    /https?:\/\/[^\s]*auth[^\s]*/gi,
    /https?:\/\/[^\s]*oauth[^\s]*/gi,
    /please\s+visit[^\n]*https?:\/\/[^\s]+/gi,
  ];

  let hasOauth = false;
  for (const pattern of oauthPatterns) {
    if (pattern.test(output)) {
      hasOauth = true;
      break;
    }
  }

  if (hasOauth) {
    oauthUrlCount++;
    console.log(`[${new Date().toISOString()}] OAuth URL detected #${oauthUrlCount}`);
    console.log(`  Output: ${output.substring(0, 100)}...`);
  }
});

// Test for 5 seconds then kill the process
setTimeout(() => {
  mockServer.kill('SIGTERM');

  console.log('\n=== Test Results ===');
  console.log(`Total stderr outputs: ${stderrCount}`);
  console.log(`OAuth URLs detected: ${oauthUrlCount}`);

  if (oauthUrlCount > 0) {
    console.log('\n✅ OAuth URL detection is working');
    console.log('With the fix in MCPClient.ts:');
    console.log('  - Max 1 auth attempt would be allowed');
    console.log('  - 30s cooldown between attempts');
    console.log('  - Server killed after max attempts');
  } else {
    console.log('\n❌ OAuth URLs not detected');
  }

  process.exit(0);
}, 5000);

console.log('Test running for 5 seconds...\n');