
import { _electron, test, expect, ElectronApplication, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';

// --- Test Configuration ---
const SELECTORS = {
  serverListItem: '[data-testid="server-list-item"]',
  addServerButton: '[data-testid="add-server-btn"]',
  addServerModal: '[data-testid="add-server-modal"]',
  serverNameInput: 'input[name="name"]',
  serverUrlInput: 'input[name="url"]',
  saveServerButton: 'button[type="submit"]',
  backupButton: '[data-testid="backup-btn"]', // Placeholder for a backup trigger
};

const MOCK_SERVER = { name: 'Persistence Test', url: 'http://localhost:4001' };

// --- Test Suite ---
describe('TS-06: Data Safety & Persistence', () => {
  let app: ElectronApplication | null;
  let testDir: string;
  let projectConfigPath: string;
  const appPath = path.resolve(__dirname, '../../build/main/main.js');

  beforeAll(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-persist-test-'));
    const projectDir = path.join(testDir, 'test-project');
    projectConfigPath = path.join(projectDir, '.mcp', 'config.json');
  });

  afterAll(() => {
    fs.removeSync(testDir);
  });

  beforeEach(() => {
    // Ensure a clean config before each test
    fs.outputJsonSync(projectConfigPath, { servers: [] });
    app = null; // Reset app variable
  });

  afterEach(async () => {
    if (app && !app.isClosed()) {
      await app.close();
    }
  });

  test('TC-06-01: Should persist added data across application sessions', async () => {
    // --- First Session ---
    app = await _electron.launch({ args: [appPath], cwd: path.dirname(projectConfigPath) });
    const window1 = await app.firstWindow();

    // Add a server
    await window1.locator(SELECTORS.addServerButton).click();
    await window1.locator(SELECTORS.serverNameInput).fill(MOCK_SERVER.name);
    await window1.locator(SELECTORS.serverUrlInput).fill(MOCK_SERVER.url);
    await window1.locator(SELECTORS.saveServerButton).click();
    await expect(window1.locator(`${SELECTORS.serverListItem}:has-text("${MOCK_SERVER.name}")`)).toBeVisible();

    // Close the app
    await app.close();
    app = null;

    // --- Second Session ---
    app = await _electron.launch({ args: [appPath], cwd: path.dirname(projectConfigPath) });
    const window2 = await app.firstWindow();

    // Verify the server is still there on launch
    await expect(window2.locator(`${SELECTORS.serverListItem}:has-text("${MOCK_SERVER.name}")`)).toBeVisible();
  });

  test('TC-06-02: Should create a backup file when requested', async () => {
    // This test assumes a UI element triggers the backup.
    fs.outputJsonSync(projectConfigPath, { servers: [MOCK_SERVER] });
    const backupPath = path.join(path.dirname(projectConfigPath), 'config.backup.json');

    app = await _electron.launch({ args: [appPath], cwd: path.dirname(projectConfigPath) });
    const window = await app.firstWindow();

    await window.locator(SELECTORS.backupButton).click();

    // Verify backup file was created
    const backupExists = fs.existsSync(backupPath);
    expect(backupExists).toBe(true);

    // Verify backup content is correct
    const backupContent = fs.readJsonSync(backupPath);
    expect(backupContent.servers[0]).toEqual(MOCK_SERVER);
  });

  test('TC-06-03: Should not corrupt data on unexpected shutdown', async () => {
    // This is a simplified version of an atomic write test.
    // It checks that the app can recover from a partially saved state.
    fs.outputJsonSync(projectConfigPath, { servers: [] });

    app = await _electron.launch({ args: [appPath], cwd: path.dirname(projectConfigPath) });
    const window = await app.firstWindow();

    // Get the app into a state where it's about to write a file
    await window.locator(SELECTORS.addServerButton).click();
    await window.locator(SELECTORS.serverNameInput).fill('Crash Test Server');
    await window.locator(SELECTORS.serverUrlInput).fill('http://crash.test');

    // Perform the save and immediately kill the process
    await window.locator(SELECTORS.saveServerButton).click();
    await app.process().kill(); // Force kill the app
    app = null;

    // Relaunch and check for stability
    app = await _electron.launch({ args: [appPath], cwd: path.dirname(projectConfigPath) });
    const recoveryWindow = await app.firstWindow();

    // The most important check: The app should not crash on launch.
    await expect(recoveryWindow).toBeDefined();
    await expect(recoveryWindow.isClosed()).toBe(false);

    // Check that the config file is still valid JSON.
    let config;
    try {
      config = fs.readJsonSync(projectConfigPath);
    } catch (e) {
      // This will fail the test if the JSON is corrupt
      throw new Error('Configuration file is corrupted!');
    }

    // The outcome can be one of two valid states: either the save completed or it didn't.
    // We accept either, as long as the file isn't corrupt.
    if (config.servers.length > 0) {
      expect(config.servers[0].name).toBe('Crash Test Server');
    }
  });
});
