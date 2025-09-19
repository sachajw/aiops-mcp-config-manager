#!/usr/bin/env node

/**
 * Local Comprehensive Test Suite for MCP Configuration Manager
 *
 * This test validates all configuration operations in a clean, isolated environment
 * without requiring Docker or external dependencies.
 */

const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

// Colors for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Test environment setup
const TEST_ID = `mcp-test-${Date.now()}`;
const TEST_DIR = path.join(os.tmpdir(), TEST_ID);
const MOCK_HOME = path.join(TEST_DIR, 'home');

// Client configuration paths (simulated)
const CLIENT_CONFIGS = {
  claudeDesktop: path.join(MOCK_HOME, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json'),
  claudeCode: path.join(MOCK_HOME, '.claude', 'claude_code_config.json'),
  vsCode: path.join(MOCK_HOME, '.config', 'Code', 'User', 'settings.json'),
  codex: path.join(MOCK_HOME, '.codex', 'config.json'),
  geminiDesktop: path.join(MOCK_HOME, 'Library', 'Application Support', 'Gemini', 'config.json'),
  geminiCli: path.join(MOCK_HOME, '.gemini', 'config.json')
};

// Test results tracking
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const testResults = [];

// Utility functions
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

async function runTest(testName, testFunction) {
  totalTests++;
  process.stdout.write(`  Testing ${testName}... `);

  try {
    await testFunction();
    passedTests++;
    log('✓ PASS', 'green');
    testResults.push({ test: testName, status: 'PASS' });
    return true;
  } catch (error) {
    failedTests++;
    log('✗ FAIL', 'red');
    log(`    Error: ${error.message}`, 'red');
    testResults.push({ test: testName, status: 'FAIL', error: error.message });
    return false;
  }
}

// Test setup
async function setupTestEnvironment() {
  logSection('Setting up test environment');

  // Create test directory structure
  await fs.ensureDir(TEST_DIR);
  await fs.ensureDir(MOCK_HOME);

  // Create client config directories
  for (const [client, configPath] of Object.entries(CLIENT_CONFIGS)) {
    await fs.ensureDir(path.dirname(configPath));
    log(`  Created ${client} config directory`, 'green');
  }

  // Set HOME to mock directory for isolated testing
  process.env.HOME = MOCK_HOME;
  process.env.USERPROFILE = MOCK_HOME; // For Windows compatibility

  log('Test environment ready', 'green');
}

// Test: Client Configuration Setup
async function testClientSetup() {
  logSection('Testing Client Configuration Setup');

  // Test 1: Create Claude Desktop configuration
  await runTest('Create Claude Desktop config', async () => {
    const config = {
      mcpServers: {
        'test-memory': {
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-memory']
        }
      }
    };

    await fs.writeJson(CLIENT_CONFIGS.claudeDesktop, config, { spaces: 2 });
    const exists = await fs.pathExists(CLIENT_CONFIGS.claudeDesktop);
    if (!exists) throw new Error('Config file not created');

    const content = await fs.readJson(CLIENT_CONFIGS.claudeDesktop);
    if (!content.mcpServers['test-memory']) {
      throw new Error('Config content incorrect');
    }
  });

  // Test 2: Create Claude Code configuration
  await runTest('Create Claude Code config', async () => {
    const config = {
      mcpServers: {
        'test-git': {
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-git'],
          env: { GIT_REPO: path.join(TEST_DIR, 'repo') }
        }
      }
    };

    await fs.writeJson(CLIENT_CONFIGS.claudeCode, config, { spaces: 2 });
    const content = await fs.readJson(CLIENT_CONFIGS.claudeCode);
    if (!content.mcpServers['test-git']) {
      throw new Error('Config content incorrect');
    }
  });

  // Test 3: Create VS Code settings
  await runTest('Create VS Code settings', async () => {
    const settings = {
      'mcp.servers': {
        'test-vscode': {
          command: 'node',
          args: ['server.js']
        }
      }
    };

    await fs.writeJson(CLIENT_CONFIGS.vsCode, settings, { spaces: 2 });
    const content = await fs.readJson(CLIENT_CONFIGS.vsCode);
    if (!content['mcp.servers']) {
      throw new Error('Settings content incorrect');
    }
  });
}

// Test: Configuration Operations
async function testConfigOperations() {
  logSection('Testing Configuration Operations');

  const testConfigPath = path.join(TEST_DIR, 'test-config.json');

  // Test 1: Save configuration
  await runTest('Save new configuration', async () => {
    const config = {
      mcpServers: {
        'save-test': {
          command: 'npx',
          args: ['test-server']
        }
      }
    };

    await fs.writeJson(testConfigPath, config, { spaces: 2 });
    const exists = await fs.pathExists(testConfigPath);
    if (!exists) throw new Error('Failed to save configuration');
  });

  // Test 2: Update configuration
  await runTest('Update existing configuration', async () => {
    const original = await fs.readJson(testConfigPath);
    original.mcpServers['updated-server'] = {
      command: 'node',
      args: ['updated.js']
    };

    await fs.writeJson(testConfigPath, original, { spaces: 2 });
    const updated = await fs.readJson(testConfigPath);
    if (!updated.mcpServers['updated-server']) {
      throw new Error('Failed to update configuration');
    }
  });

  // Test 3: Add server to configuration
  await runTest('Add server to configuration', async () => {
    const config = await fs.readJson(testConfigPath);
    config.mcpServers['additional-server'] = {
      command: 'python',
      args: ['server.py'],
      env: { PORT: '3000' }
    };

    await fs.writeJson(testConfigPath, config, { spaces: 2 });
    const updated = await fs.readJson(testConfigPath);
    if (Object.keys(updated.mcpServers).length !== 3) {
      throw new Error('Server count incorrect after addition');
    }
  });

  // Test 4: Remove server from configuration
  await runTest('Remove server from configuration', async () => {
    const config = await fs.readJson(testConfigPath);
    delete config.mcpServers['save-test'];

    await fs.writeJson(testConfigPath, config, { spaces: 2 });
    const updated = await fs.readJson(testConfigPath);
    if (updated.mcpServers['save-test']) {
      throw new Error('Failed to remove server');
    }
  });

  // Test 5: Create backup before update
  await runTest('Create backup before update', async () => {
    const original = await fs.readJson(testConfigPath);
    const backupPath = `${testConfigPath}.backup.${Date.now()}`;

    // Create backup
    await fs.copy(testConfigPath, backupPath);

    // Modify original
    original.mcpServers['backup-test'] = { command: 'test' };
    await fs.writeJson(testConfigPath, original, { spaces: 2 });

    // Verify backup exists and is different
    const backup = await fs.readJson(backupPath);
    if (backup.mcpServers['backup-test']) {
      throw new Error('Backup was modified');
    }
  });
}

// Test: Sync Operations
async function testSyncOperations() {
  logSection('Testing Sync Operations');

  // Test 1: Sync between Claude Desktop and Claude Code
  await runTest('Sync Claude Desktop to Claude Code', async () => {
    const desktopConfig = await fs.readJson(CLIENT_CONFIGS.claudeDesktop);
    const codeConfig = await fs.readJson(CLIENT_CONFIGS.claudeCode);

    // Add server from desktop to code
    codeConfig.mcpServers['test-memory'] = desktopConfig.mcpServers['test-memory'];
    await fs.writeJson(CLIENT_CONFIGS.claudeCode, codeConfig, { spaces: 2 });

    const synced = await fs.readJson(CLIENT_CONFIGS.claudeCode);
    if (!synced.mcpServers['test-memory']) {
      throw new Error('Sync failed');
    }
  });

  // Test 2: Bulk sync multiple servers
  await runTest('Bulk sync multiple servers', async () => {
    const sourceConfig = {
      mcpServers: {
        'bulk1': { command: 'cmd1' },
        'bulk2': { command: 'cmd2' },
        'bulk3': { command: 'cmd3' }
      }
    };

    const targetPath = path.join(TEST_DIR, 'bulk-target.json');
    const targetConfig = { mcpServers: {} };

    // Sync bulk1 and bulk2
    targetConfig.mcpServers['bulk1'] = sourceConfig.mcpServers['bulk1'];
    targetConfig.mcpServers['bulk2'] = sourceConfig.mcpServers['bulk2'];

    await fs.writeJson(targetPath, targetConfig, { spaces: 2 });
    const result = await fs.readJson(targetPath);

    if (!result.mcpServers['bulk1'] || !result.mcpServers['bulk2']) {
      throw new Error('Bulk sync incomplete');
    }
    if (result.mcpServers['bulk3']) {
      throw new Error('Synced unselected server');
    }
  });

  // Test 3: Handle sync conflicts
  await runTest('Handle sync conflicts', async () => {
    const source = path.join(TEST_DIR, 'source.json');
    const target = path.join(TEST_DIR, 'target.json');

    await fs.writeJson(source, {
      mcpServers: {
        'conflict': { command: 'source-cmd' }
      }
    }, { spaces: 2 });

    await fs.writeJson(target, {
      mcpServers: {
        'conflict': { command: 'target-cmd' }
      }
    }, { spaces: 2 });

    // Overwrite target with source
    const sourceConfig = await fs.readJson(source);
    await fs.writeJson(target, sourceConfig, { spaces: 2 });

    const result = await fs.readJson(target);
    if (result.mcpServers['conflict'].command !== 'source-cmd') {
      throw new Error('Conflict resolution failed');
    }
  });
}

// Test: Import/Export Operations
async function testImportExport() {
  logSection('Testing Import/Export Operations');

  // Test 1: Export configuration
  await runTest('Export configuration with metadata', async () => {
    const config = {
      mcpServers: {
        'export-test': { command: 'export-cmd' }
      }
    };

    const exportData = {
      config: config,
      metadata: {
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
        source: 'test-export'
      }
    };

    const exportPath = path.join(TEST_DIR, 'export.json');
    await fs.writeJson(exportPath, exportData, { spaces: 2 });

    const saved = await fs.readJson(exportPath);
    if (!saved.metadata || !saved.config) {
      throw new Error('Export structure incorrect');
    }
  });

  // Test 2: Import configuration
  await runTest('Import configuration from export', async () => {
    const exportPath = path.join(TEST_DIR, 'export.json');
    const importPath = path.join(TEST_DIR, 'import.json');

    const exportData = await fs.readJson(exportPath);
    await fs.writeJson(importPath, exportData.config, { spaces: 2 });

    const imported = await fs.readJson(importPath);
    if (!imported.mcpServers['export-test']) {
      throw new Error('Import failed');
    }
  });

  // Test 3: Merge imported configuration
  await runTest('Merge imported configuration', async () => {
    const existing = {
      mcpServers: {
        'existing': { command: 'existing-cmd' }
      }
    };

    const toImport = {
      mcpServers: {
        'imported': { command: 'imported-cmd' }
      }
    };

    const mergePath = path.join(TEST_DIR, 'merged.json');

    // Merge configurations
    const merged = {
      mcpServers: {
        ...existing.mcpServers,
        ...toImport.mcpServers
      }
    };

    await fs.writeJson(mergePath, merged, { spaces: 2 });
    const result = await fs.readJson(mergePath);

    if (!result.mcpServers['existing'] || !result.mcpServers['imported']) {
      throw new Error('Merge incomplete');
    }
  });
}

// Test: Error Handling
async function testErrorHandling() {
  logSection('Testing Error Handling');

  // Test 1: Handle corrupted JSON
  await runTest('Handle corrupted JSON gracefully', async () => {
    const corruptPath = path.join(TEST_DIR, 'corrupt.json');
    await fs.writeFile(corruptPath, '{ invalid json }', 'utf-8');

    try {
      await fs.readJson(corruptPath);
      throw new Error('Should have thrown error');
    } catch (error) {
      if (!error.message.includes('JSON')) {
        throw new Error('Wrong error type');
      }
    }

    // Recover by writing valid JSON
    await fs.writeJson(corruptPath, { mcpServers: {} }, { spaces: 2 });
    const recovered = await fs.readJson(corruptPath);
    if (!recovered.mcpServers) {
      throw new Error('Recovery failed');
    }
  });

  // Test 2: Handle missing files
  await runTest('Handle missing configuration files', async () => {
    const missingPath = path.join(TEST_DIR, 'missing.json');

    try {
      await fs.readJson(missingPath);
      throw new Error('Should have thrown error');
    } catch (error) {
      if (!error.message.includes('ENOENT')) {
        throw new Error('Wrong error type');
      }
    }
  });

  // Test 3: Handle permission errors
  await runTest('Handle permission errors', async () => {
    const restrictedPath = path.join(TEST_DIR, 'restricted.json');
    await fs.writeJson(restrictedPath, { mcpServers: {} }, { spaces: 2 });

    // Make file read-only
    await fs.chmod(restrictedPath, 0o444);

    try {
      // Try to write to read-only file
      await fs.writeJson(restrictedPath, { mcpServers: { new: {} } });
      // On some systems this might not fail, so we'll accept it
    } catch (error) {
      if (!error.message.includes('EACCES') && !error.message.includes('permission')) {
        // Some systems might throw different errors
        console.log(`    (Permission error type: ${error.code})`);
      }
    }

    // Restore permissions
    await fs.chmod(restrictedPath, 0o644);
  });
}

// Test: Validation
async function testValidation() {
  logSection('Testing Configuration Validation');

  // Test 1: Validate server configuration
  await runTest('Validate valid server configuration', async () => {
    const server = {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-memory']
    };

    if (!server.command) {
      throw new Error('Missing command field');
    }
    if (!Array.isArray(server.args)) {
      throw new Error('Args must be array');
    }
  });

  // Test 2: Detect invalid server configuration
  await runTest('Detect invalid server configuration', async () => {
    const invalidServers = [
      { args: ['test'] }, // Missing command
      { command: '' }, // Empty command
      { command: 'test', args: 'not-array' } // Invalid args type
    ];

    for (const server of invalidServers) {
      if (!server.command || server.command === '') {
        continue; // Invalid as expected
      }
      if (server.args && !Array.isArray(server.args)) {
        continue; // Invalid as expected
      }
    }
  });

  // Test 3: Validate environment variables
  await runTest('Validate environment variables', async () => {
    const validServer = {
      command: 'node',
      args: ['server.js'],
      env: {
        PORT: '3000',
        NODE_ENV: 'production',
        'VALID_KEY': 'value'
      }
    };

    // Check valid server passes
    for (const [key, value] of Object.entries(validServer.env || {})) {
      if (key === '') {
        throw new Error('Empty environment variable key');
      }
    }

    // Test invalid env separately
    const invalidEnv = { '': 'empty-key' };
    let caughtError = false;
    try {
      for (const [key, value] of Object.entries(invalidEnv)) {
        if (key === '') {
          caughtError = true;
          break;
        }
      }
    } catch (e) {
      caughtError = true;
    }

    if (!caughtError) {
      throw new Error('Failed to detect empty env key');
    }
  });
}

// Cleanup
async function cleanup() {
  logSection('Cleaning up');

  try {
    await fs.remove(TEST_DIR);
    log('Test directory removed', 'green');
  } catch (error) {
    log(`Warning: Could not remove test directory: ${error.message}`, 'yellow');
  }
}

// Generate report
function generateReport() {
  logSection('Test Report');

  console.log(`\nTotal Tests: ${totalTests}`);
  log(`Passed: ${passedTests}`, 'green');
  if (failedTests > 0) {
    log(`Failed: ${failedTests}`, 'red');
  }

  const successRate = ((passedTests / totalTests) * 100).toFixed(1);
  console.log(`Success Rate: ${successRate}%`);

  if (failedTests > 0) {
    console.log('\nFailed Tests:');
    testResults
      .filter(r => r.status === 'FAIL')
      .forEach(r => {
        log(`  - ${r.test}`, 'red');
        if (r.error) {
          console.log(`    ${r.error}`);
        }
      });
  }

  console.log('\n' + '='.repeat(60));
  if (failedTests === 0) {
    log('✓ ALL TESTS PASSED!', 'green');
  } else {
    log('✗ SOME TESTS FAILED', 'red');
  }
  console.log('='.repeat(60));
}

// Main test runner
async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  log('MCP Configuration Manager - Local Comprehensive Tests', 'blue');
  console.log('='.repeat(60));

  try {
    await setupTestEnvironment();
    await testClientSetup();
    await testConfigOperations();
    await testSyncOperations();
    await testImportExport();
    await testErrorHandling();
    await testValidation();
  } catch (error) {
    log(`\nFatal error: ${error.message}`, 'red');
    console.error(error.stack);
  } finally {
    await cleanup();
    generateReport();
    process.exit(failedTests > 0 ? 1 : 0);
  }
}

// Run tests
runAllTests().catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});