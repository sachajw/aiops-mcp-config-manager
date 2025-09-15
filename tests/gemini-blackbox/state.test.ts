
import { _electron, test, expect, ElectronApplication, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';

// --- Test Configuration ---
const SELECTORS = {
  serverListItem: '[data-testid="server-list-item"]',
  enableButton: '[data-testid="enable-btn"]',
  disableButton: '[data-testid="disable-btn"]',
  disabledStateIndicator: '[data-testid="disabled-indicator"]', // e.g., a class or element indicating a disabled row
};

const MOCK_SERVER = { name: 'State Test Server', url: 'http://localhost:7001', enabled: true };

// --- Test Suite ---
describe('TS-04: Server State Management', () => {
  let app: ElectronApplication;
  let window: Page;
  let testDir: string;
  let projectConfigPath: string;

  beforeAll(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-state-test-'));
    const projectDir = path.join(testDir, 'test-project');
    projectConfigPath = path.join(projectDir, '.mcp', 'config.json');
  });

  afterAll(() => {
    fs.removeSync(testDir);
  });

  beforeEach(async () => {
    // Start with a single, enabled server
    fs.outputJsonSync(projectConfigPath, { servers: [MOCK_SERVER] });

    app = await _electron.launch({
      args: [path.resolve(__dirname, '../../build/main/main.js')],
      cwd: path.join(testDir, 'test-project'),
    });
    window = await app.firstWindow();
    await window.waitForLoadState('domcontentloaded');
  });

  afterEach(async () => {
    await app.close();
  });

  test('TC-04-01: Should disable a server and persist the state', async () => {
    const serverRow = window.locator(`${SELECTORS.serverListItem}:has-text("${MOCK_SERVER.name}")`);
    await serverRow.locator(SELECTORS.disableButton).click();

    // Verify UI state changes
    await expect(serverRow.locator(SELECTORS.disabledStateIndicator)).toBeVisible();

    // Verify config file was updated
    const savedConfig = fs.readJsonSync(projectConfigPath);
    expect(savedConfig.servers[0].enabled).toBe(false);
  });

  test('TC-04-02: Should enable a disabled server and persist the state', async () => {
    // Setup: Start with a disabled server
    const disabledServer = { ...MOCK_SERVER, enabled: false };
    fs.outputJsonSync(projectConfigPath, { servers: [disabledServer] });
    await window.reload();

    const serverRow = window.locator(`${SELECTORS.serverListItem}:has-text("${MOCK_SERVER.name}")`);
    await expect(serverRow.locator(SELECTORS.disabledStateIndicator)).toBeVisible();

    // Action: Enable the server
    await serverRow.locator(SELECTORS.enableButton).click();

    // Verify UI state changes back to normal
    await expect(serverRow.locator(SELECTORS.disabledStateIndicator)).not.toBeVisible();

    // Verify config file was updated
    const savedConfig = fs.readJsonSync(projectConfigPath);
    expect(savedConfig.servers[0].enabled).toBe(true);
  });
});
