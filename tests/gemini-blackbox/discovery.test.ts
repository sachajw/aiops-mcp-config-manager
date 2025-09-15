
import { _electron, test, expect, ElectronApplication, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';

// --- Test Configuration ---
// NOTE: These selectors are placeholders. Replace them with the actual selectors from your app.
const SELECTORS = {
  serverList: '[data-testid="server-list"]',
  serverName: '[data-testid="server-name"]', // Selector for the text of a server name in the list
  projectScopeButton: '[data-testid="scope-btn-project"]',
  systemScopeButton: '[data-testid="scope-btn-system"]',
  errorMessage: '[data-testid="error-message"]',
};

const MOCK_PROJECT_SERVER = { name: 'Mock Project Server', url: 'http://localhost:8001' };
const MOCK_SYSTEM_SERVER = { name: 'Mock System Server', url: 'http://localhost:8002' };

// --- Test Suite ---
describe('TS-02: Configuration Discovery & Scopes', () => {
  let app: ElectronApplication;
  let window: Page;
  let testDir: string; // A temporary directory for our test configs

  // Create a temporary directory for configs before any tests run
  beforeAll(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-test-'));
  });

  // Clean up the temporary directory after all tests
  afterAll(() => {
    fs.removeSync(testDir);
  });

  // Launch the app before each test
  beforeEach(async () => {
    // Launch the app with an environment variable pointing to our temp dir
    // This allows us to control the "home" directory for system configs without polluting the real one.
    app = await _electron.launch({
      args: [path.resolve(__dirname, '../../build/main/main.js')],
      env: { ...process.env, MCP_TEST_HOME_DIR: testDir },
    });
    window = await app.firstWindow();
  });

  // Clean up and close the app after each test
  afterEach(async () => {
    if (app) {
      await app.close();
    }
    // Clean the directory content for the next test
    fs.emptyDirSync(testDir);
  });

  test('TC-02-01: Should show an empty state with no configs', async () => {
    const serverCount = await window.locator(SELECTORS.serverName).count();
    expect(serverCount).toBe(0);
  });

  test('TC-02-02: Should discover project-scoped configurations', async () => {
    // Setup: Create a project config file
    const projectConfigDir = path.join(testDir, '.mcp');
    fs.outputJsonSync(path.join(projectConfigDir, 'config.json'), { servers: [MOCK_PROJECT_SERVER] });

    // The app needs to be looking at this directory. This might require another env var
    // or launching the app with a specific working directory.
    // For now, we assume the app is launched in `testDir` or can find it.

    await window.locator(SELECTORS.projectScopeButton).click();
    await expect(window.locator(`${SELECTORS.serverName}:text("${MOCK_PROJECT_SERVER.name}")`)).toBeVisible();
  });

  test('TC-02-03: Should discover system-scoped configurations', async () => {
    // Setup: Create a system config file in our mocked home dir
    const systemConfigDir = path.join(testDir, '.config', 'mcp');
    fs.outputJsonSync(path.join(systemConfigDir, 'config.json'), { servers: [MOCK_SYSTEM_SERVER] });

    await window.locator(SELECTORS.systemScopeButton).click();
    await expect(window.locator(`${SELECTORS.serverName}:text("${MOCK_SYSTEM_SERVER.name}")`)).toBeVisible();
  });

  test('TC-02-04: Should correctly toggle between scopes', async () => {
    // Setup: Create both project and system configs
    const projectConfigDir = path.join(testDir, '.mcp');
    fs.outputJsonSync(path.join(projectConfigDir, 'config.json'), { servers: [MOCK_PROJECT_SERVER] });
    const systemConfigDir = path.join(testDir, '.config', 'mcp');
    fs.outputJsonSync(path.join(systemConfigDir, 'config.json'), { servers: [MOCK_SYSTEM_SERVER] });

    // Check system scope
    await window.locator(SELECTORS.systemScopeButton).click();
    await expect(window.locator(`${SELECTORS.serverName}:text("${MOCK_SYSTEM_SERVER.name}")`)).toBeVisible();
    await expect(window.locator(`${SELECTORS.serverName}:text("${MOCK_PROJECT_SERVER.name}")`)).not.toBeVisible();

    // Check project scope
    await window.locator(SELECTORS.projectScopeButton).click();
    await expect(window.locator(`${SELECTORS.serverName}:text("${MOCK_PROJECT_SERVER.name}")`)).toBeVisible();
    await expect(window.locator(`${SELECTORS.serverName}:text("${MOCK_SYSTEM_SERVER.name}")`)).not.toBeVisible();
  });

  test('TC-02-05: Should handle corrupt config files gracefully', async () => {
    // Setup: Create a malformed project config
    const projectConfigDir = path.join(testDir, '.mcp');
    fs.ensureDirSync(projectConfigDir);
    fs.writeFileSync(path.join(projectConfigDir, 'config.json'), '{
  "servers": [{"name": "bad json"}]'); // Invalid JSON

    await window.locator(SELECTORS.projectScopeButton).click();

    // Check for an error message and no servers listed
    await expect(window.locator(SELECTORS.errorMessage)).toBeVisible();
    const serverCount = await window.locator(SELECTORS.serverName).count();
    expect(serverCount).toBe(0);
  });
});
