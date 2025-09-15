#!/usr/bin/env node

/**
 * Test script for MCP Catalog Integration
 * Run this in the browser console to validate catalog functionality
 */

console.log('=== MCP Catalog Integration Test ===\n');

// Test 1: Check catalog exists
const catalog = localStorage.getItem('mcp-server-catalog');
if (catalog) {
  const parsed = JSON.parse(catalog);
  console.log('✅ Catalog found with', Object.keys(parsed).length, 'servers:');
  Object.entries(parsed).forEach(([name, server]) => {
    console.log(`  - ${name}: ${server.type || 'local'} (${server.command})`);
  });
} else {
  console.log('❌ No catalog found in localStorage');
}

// Test 2: Add a test server to catalog
console.log('\n=== Adding Test Server ===');
const testServer = {
  command: 'npx',
  args: ['@test/mcp-server'],
  env: {},
  type: 'local',
  description: 'Test server for validation'
};

const currentCatalog = catalog ? JSON.parse(catalog) : {};
currentCatalog['test-server'] = testServer;
localStorage.setItem('mcp-server-catalog', JSON.stringify(currentCatalog));
console.log('✅ Added test-server to catalog');

// Test 3: Trigger catalog update event
console.log('\n=== Triggering Catalog Update Event ===');
window.dispatchEvent(new CustomEvent('catalog-updated', {
  detail: {
    serverName: 'test-server',
    server: testServer
  }
}));
console.log('✅ Catalog update event dispatched');

// Test 4: Verify catalog persistence
console.log('\n=== Verifying Catalog Persistence ===');
const updatedCatalog = localStorage.getItem('mcp-server-catalog');
if (updatedCatalog && JSON.parse(updatedCatalog)['test-server']) {
  console.log('✅ Test server persisted in catalog');
} else {
  console.log('❌ Test server not found in catalog');
}

// Test 5: Clean up test server
console.log('\n=== Cleaning Up ===');
const finalCatalog = JSON.parse(localStorage.getItem('mcp-server-catalog'));
delete finalCatalog['test-server'];
localStorage.setItem('mcp-server-catalog', JSON.stringify(finalCatalog));
console.log('✅ Test server removed from catalog');

console.log('\n=== Test Complete ===');
console.log('Check the UI to verify:');
console.log('1. Badge count on "Add Server" button matches catalog size');
console.log('2. Catalog dropdown shows all servers');
console.log('3. Selecting from dropdown auto-fills the form');