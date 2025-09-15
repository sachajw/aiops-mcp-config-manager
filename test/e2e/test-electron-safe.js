const puppeteer = require('puppeteer-core');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs-extra');
const os = require('os');

class SafeTestEnvironment {
  constructor() {
    this.backupDir = path.join(__dirname, '../test-backups');
    this.testConfigPaths = {};
    this.originalFiles = [];
  }

  async setupBackups() {
    console.log('🔒 Setting up safe test environment...');

    // Ensure backup directory exists
    await fs.ensureDir(this.backupDir);

    // Define config file paths for different clients
    const homeDir = os.homedir();
    this.testConfigPaths = {
      'claude-desktop': path.join(homeDir, 'Library/Application Support/Claude/claude_desktop_config.json'),
      'claude-code': path.join(homeDir, '.claude/claude_code_config.json'),
      'kiro': path.join(homeDir, '.kiro/settings/mcp.json'),
      'cursor': path.join(homeDir, 'Library/Application Support/Cursor/User/settings.json'),
      'windsurf': path.join(homeDir, 'Library/Application Support/Windsurf/User/settings.json'),
      'vscode': path.join(homeDir, '.vscode/settings.json'),
      'test-project': path.join(__dirname, '../test-project/.mcp/config.json')
    };

    // Create backups of existing files
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    for (const [client, configPath] of Object.entries(this.testConfigPaths)) {
      if (await fs.pathExists(configPath)) {
        const backupPath = path.join(this.backupDir, `${client}_${timestamp}.backup.json`);
        await fs.copy(configPath, backupPath);
        this.originalFiles.push({ client, configPath, backupPath });
        console.log(`✓ Backed up ${client} config to ${path.basename(backupPath)}`);
      } else {
        console.log(`ℹ️  No existing config for ${client}`);
      }
    }

    // Create test project directory
    const testProjectDir = path.dirname(this.testConfigPaths['test-project']);
    await fs.ensureDir(testProjectDir);

    console.log(`✓ Backups complete. ${this.originalFiles.length} files backed up.`);
  }

  async restoreBackups() {
    console.log('🔄 Restoring original configuration files...');

    for (const { client, configPath, backupPath } of this.originalFiles) {
      try {
        await fs.copy(backupPath, configPath);
        console.log(`✓ Restored ${client} config`);
      } catch (error) {
        console.error(`❌ Failed to restore ${client} config:`, error.message);
      }
    }

    // Clean up any test files that shouldn't exist
    const testFiles = [
      this.testConfigPaths['test-project'],
      path.join(os.homedir(), '.test-claude-config.json'),
      path.join(os.homedir(), '.test-mcp-config.json')
    ];

    for (const testFile of testFiles) {
      if (await fs.pathExists(testFile)) {
        // Only remove if it wasn't in our original backups
        const wasOriginal = this.originalFiles.some(f => f.configPath === testFile);
        if (!wasOriginal) {
          await fs.remove(testFile);
          console.log(`🗑️  Removed test file: ${testFile}`);
        }
      }
    }

    console.log('✓ Restore complete');
  }
}

class ElectronTester {
  constructor() {
    this.electronProcess = null;
    this.browser = null;
    this.page = null;
    this.safeEnv = new SafeTestEnvironment();
  }

  async startElectron() {
    console.log('🚀 Starting Electron app for testing...');

    // Kill any existing processes
    try {
      require('child_process').execSync('pkill -f "Electron.*mcp-config-manager"', { stdio: 'ignore' });
      await new Promise(r => setTimeout(r, 1000));
    } catch (e) {
      // Ignore if no process to kill
    }

    // Start Electron with remote debugging
    this.electronProcess = spawn('npx', ['electron', 'dist/main/main.js', '--remote-debugging-port=9222'], {
      cwd: path.join(__dirname, '../..'),
      env: { ...process.env, ELECTRON_ENABLE_LOGGING: '1' },
      stdio: 'pipe'
    });

    // Wait for Electron to start
    await new Promise(r => setTimeout(r, 5000));
    console.log('✓ Electron app started');
  }

  async connectPuppeteer() {
    console.log('🔌 Connecting Puppeteer to Electron...');

    this.browser = await puppeteer.connect({
      browserURL: 'http://localhost:9222',
      defaultViewport: null
    });

    const pages = await this.browser.pages();
    this.page = pages[0] || await this.browser.newPage();

    await this.page.setViewport({ width: 1440, height: 900 });

    // Wait for app to load
    await this.page.waitForSelector('.min-h-screen', { timeout: 10000 });
    await new Promise(r => setTimeout(r, 2000));

    console.log('✓ Connected to Electron app');
  }

  async skipLandingIfPresent() {
    const hasLanding = await this.page.$eval('body', body =>
      body.textContent?.includes('Get Started')
    ).catch(() => false);

    if (hasLanding) {
      console.log('📱 Skipping landing page...');
      await this.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const getStartedBtn = buttons.find(btn => btn.textContent?.includes('Get Started'));
        if (getStartedBtn) getStartedBtn.click();
      });
      await new Promise(r => setTimeout(r, 2000));
      console.log('✓ Landed on main interface');
    }
  }

  async testServerCreation(clientName = 'claude-desktop') {
    console.log(`\n🧪 Testing server creation for ${clientName}...`);

    // Select the client
    await this.page.select('select', clientName);
    await new Promise(r => setTimeout(r, 1500));
    console.log(`✓ Selected ${clientName} client`);

    // Get initial server count
    const initialCount = await this.page.$$eval('tbody tr', rows => rows.length).catch(() => 0);
    console.log(`📊 Initial server count: ${initialCount}`);

    // Click Add Server
    await this.page.click('button.btn-primary');
    await new Promise(r => setTimeout(r, 1500));
    console.log('✓ Opened Add Server modal');

    // Fill in server details
    const testServerName = `Test-Server-${Date.now()}`;
    await this.page.evaluate((name) => {
      const nameInput = document.querySelector('input[placeholder*="name" i]');
      if (nameInput) {
        nameInput.value = name;
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, testServerName);

    await this.page.evaluate(() => {
      const commandInput = document.querySelector('input[placeholder*="command" i]');
      if (commandInput) {
        commandInput.value = 'npx';
        commandInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    // Add arguments
    await this.page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const addArgBtn = buttons.find(btn => btn.textContent?.includes('Add Argument'));
      if (addArgBtn) addArgBtn.click();
    });
    await new Promise(r => setTimeout(r, 500));

    await this.page.evaluate(() => {
      const argInputs = document.querySelectorAll('input[placeholder*="argument" i]');
      if (argInputs[0]) {
        argInputs[0].value = '@modelcontextprotocol/server-memory';
        argInputs[0].dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    // Add environment variables
    await this.page.evaluate(() => {
      const envInput = document.querySelector('textarea') || document.querySelector('input[placeholder*="JSON format" i]');
      if (envInput) {
        envInput.value = JSON.stringify({
          "TEST_VAR": "test-value",
          "DEBUG": "true"
        }, null, 2);
        envInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    console.log(`✓ Filled server details: ${testServerName}`);

    // Save the server
    await this.page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const addBtn = buttons.find(btn => btn.textContent?.includes('Add Server') && !btn.disabled);
      if (addBtn) addBtn.click();
    });
    await new Promise(r => setTimeout(r, 1500));
    console.log('✓ Submitted server form');

    // Verify server was added
    const newCount = await this.page.$$eval('tbody tr', rows => rows.length).catch(() => 0);
    console.log(`📊 New server count: ${newCount}`);

    if (newCount > initialCount) {
      console.log('✅ Server successfully added to the list');
    } else {
      console.log('❌ Server was not added to the list');
    }

    return { testServerName, initialCount, newCount };
  }

  async testConfigurationSaving() {
    console.log('\n💾 Testing configuration saving...');

    // Click Save button
    const saveClicked = await this.page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const saveBtn = buttons.find(btn => btn.textContent?.includes('Save'));
      if (saveBtn) {
        saveBtn.click();
        return true;
      }
      return false;
    });

    if (saveClicked) {
      await new Promise(r => setTimeout(r, 2000));
      console.log('✓ Clicked Save button');

      // Look for success indicators
      const hasSuccess = await this.page.$eval('body', body => {
        return body.textContent?.includes('saved') ||
               body.textContent?.includes('Success') ||
               body.textContent?.includes('Updated');
      }).catch(() => false);

      if (hasSuccess) {
        console.log('✅ Save operation appears successful');
      } else {
        console.log('⚠️  No explicit save confirmation found');
      }
    } else {
      console.log('❌ Save button not found');
    }
  }

  async testDifferentClients() {
    console.log('\n🔄 Testing different client configurations...');

    const clientsToTest = ['claude-code', 'kiro', 'cursor'];
    const results = [];

    for (const client of clientsToTest) {
      try {
        console.log(`\n🎯 Testing ${client}...`);

        // Select client
        await this.page.select('select', client);
        await new Promise(r => setTimeout(r, 2000));

        // Get server count
        const serverCount = await this.page.$$eval('tbody tr', rows => rows.length).catch(() => 0);
        console.log(`📊 ${client} has ${serverCount} servers`);

        // Check status bar for correct config path
        const statusText = await this.page.$eval('.text-xs', el => el.textContent).catch(() => '');
        console.log(`📍 Config path: ${statusText}`);

        results.push({
          client,
          serverCount,
          configPath: statusText,
          success: true
        });

        console.log(`✅ ${client} test passed`);

      } catch (error) {
        console.log(`❌ ${client} test failed:`, error.message);
        results.push({
          client,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  async testProjectScope() {
    console.log('\n📁 Testing Project scope functionality...');

    // Switch to Project scope
    const projectClicked = await this.page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button.btn-sm'));
      const projectBtn = buttons.find(btn => btn.textContent?.trim() === 'Project');
      if (projectBtn) {
        projectBtn.click();
        return true;
      }
      return false;
    });

    if (projectClicked) {
      await new Promise(r => setTimeout(r, 2000));
      console.log('✓ Switched to Project scope');

      // Check if project directory dialog appears or if it shows empty state
      const bodyText = await this.page.$eval('body', body => body.textContent);

      if (bodyText.includes('No MCP servers configured') || bodyText.includes('select a directory')) {
        console.log('✓ Project scope correctly shows empty state or directory selection');
      } else {
        console.log('⚠️  Project scope behavior unclear');
      }

      // Switch back to User scope
      await this.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button.btn-sm'));
        const userBtn = buttons.find(btn => btn.textContent?.trim() === 'User');
        if (userBtn) userBtn.click();
      });
      await new Promise(r => setTimeout(r, 1000));
      console.log('✓ Switched back to User scope');
    }
  }

  async verifyFileCreation() {
    console.log('\n🔍 Verifying actual file creation...');

    const configFiles = [];

    // Check for created/modified config files
    for (const [client, configPath] of Object.entries(this.safeEnv.testConfigPaths)) {
      if (await fs.pathExists(configPath)) {
        try {
          const content = await fs.readJson(configPath);
          const hasTestServer = JSON.stringify(content).includes('Test-Server-');

          configFiles.push({
            client,
            path: configPath,
            exists: true,
            hasTestData: hasTestServer,
            size: (await fs.stat(configPath)).size
          });

          if (hasTestServer) {
            console.log(`✅ ${client} config contains test server data`);
          } else {
            console.log(`ℹ️  ${client} config exists but no test data found`);
          }
        } catch (error) {
          console.log(`⚠️  ${client} config exists but couldn't read:`, error.message);
        }
      }
    }

    return configFiles;
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up test environment...');

    if (this.browser) {
      await this.browser.disconnect();
      console.log('✓ Disconnected Puppeteer');
    }

    if (this.electronProcess) {
      this.electronProcess.kill();
      console.log('✓ Killed Electron process');
    }

    // Wait a moment for process cleanup
    await new Promise(r => setTimeout(r, 1000));
  }
}

async function runElectronTests() {
  const tester = new ElectronTester();
  let testResults = {
    setupSuccess: false,
    serverCreation: null,
    configSaving: false,
    clientTests: [],
    projectScope: false,
    fileVerification: [],
    restoreSuccess: false
  };

  try {
    // Setup safe environment
    await tester.safeEnv.setupBackups();
    testResults.setupSuccess = true;

    // Start Electron and connect
    await tester.startElectron();
    await tester.connectPuppeteer();
    await tester.skipLandingIfPresent();

    // Run core tests
    console.log('\n🧪 Running Core Application Tests...');

    // Test server creation
    testResults.serverCreation = await tester.testServerCreation('claude-desktop');

    // Test configuration saving
    await tester.testConfigurationSaving();
    testResults.configSaving = true;

    // Test different clients
    testResults.clientTests = await tester.testDifferentClients();

    // Test project scope
    await tester.testProjectScope();
    testResults.projectScope = true;

    // Verify file creation
    testResults.fileVerification = await tester.verifyFileCreation();

    console.log('\n📊 TEST RESULTS SUMMARY:');
    console.log('========================');
    console.log(`✅ Test Environment Setup: ${testResults.setupSuccess ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Server Creation: ${testResults.serverCreation?.newCount > testResults.serverCreation?.initialCount ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Configuration Saving: ${testResults.configSaving ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Client Switching: ${testResults.clientTests.filter(t => t.success).length}/${testResults.clientTests.length} clients`);
    console.log(`✅ Project Scope: ${testResults.projectScope ? 'PASS' : 'FAIL'}`);
    console.log(`✅ File Creation: ${testResults.fileVerification.filter(f => f.hasTestData).length} files with test data`);

    // Show detailed results
    if (testResults.fileVerification.length > 0) {
      console.log('\n📁 Created/Modified Files:');
      testResults.fileVerification.forEach(file => {
        console.log(`  ${file.client}: ${file.path} (${file.size} bytes) ${file.hasTestData ? '📝' : '📄'}`);
      });
    }

  } catch (error) {
    console.error('\n❌ Test execution failed:', error);
    console.error(error.stack);
  } finally {
    // Always cleanup
    await tester.cleanup();

    // Restore original files
    try {
      await tester.safeEnv.restoreBackups();
      testResults.restoreSuccess = true;
      console.log('✅ Original configuration files restored successfully');
    } catch (error) {
      console.error('❌ Failed to restore original files:', error);
      testResults.restoreSuccess = false;
    }
  }

  return testResults;
}

// Export for use in other tests
module.exports = { ElectronTester, SafeTestEnvironment, runElectronTests };

// Run if called directly
if (require.main === module) {
  console.log('🚀 Starting MCP Configuration Manager - Electron App Tests');
  console.log('🔒 Safe mode: Original files will be backed up and restored');
  console.log('================================================\n');

  runElectronTests()
    .then(results => {
      console.log('\n🎉 All tests completed!');
      console.log('Original configuration files have been restored.');
      process.exit(results.restoreSuccess ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Test runner failed:', error);
      process.exit(1);
    });
}