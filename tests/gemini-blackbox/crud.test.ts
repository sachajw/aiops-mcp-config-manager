
import { _electron, test, expect, ElectronApplication, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';

// --- Test Configuration ---
// NOTE: These selectors are placeholders. Replace them with the actual selectors from your app.
const SELECTORS = {
  serverList: '[data-testid="server-list"]',
  serverListItem: '[data-testid="server-list-item"]',
  serverNameInList: '[data-testid="server-name"]',
  addServerButton: '[data-testid="add-server-btn"]',
  // Modal selectors
  addServerModal: '[data-testid="add-server-modal"]',
  serverNameInput: 'input[name="name"]',
  serverUrlInput: 'input[name="url"]',
  saveServerButton: 'button[type="submit"]', // Assuming it's a submit button
  // Server-specific selectors
  editButton: '[data-testid="edit-btn"]',
  deleteButton: '[data-testid="delete-btn"]',
  confirmDeleteButton: '[data-testid="confirm-delete-btn"]',
  validationError: '[data-testid="validation-error"]',
};

const MOCK_SERVER = { name: 'My Test Server', url: 'http://localhost:9999' };
const MOCK_SERVER_EDITED = { name: 'My Edited Server', url: 'http://localhost:9998' };

// --- Test Suite ---
describe('TS-03: Server Management (CRUD)', () => {
  let app: ElectronApplication;
  let window: Page;
  let testDir: string;
  let projectConfigPath: string;

  beforeAll(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-crud-test-'));
    const projectDir = path.join(testDir, 'test-project');
    projectConfigPath = path.join(projectDir, '.mcp', 'config.json');
    // We assume the app runs with `projectDir` as its current working directory.
  });

  afterAll(() => {
    fs.removeSync(testDir);
  });

  beforeEach(async () => {
    // Ensure a clean config for each test
    fs.outputJsonSync(projectConfigPath, { servers: [] });

    app = await _electron.launch({
      args: [path.resolve(__dirname, '../../build/main/main.js')],
      cwd: path.join(testDir, 'test-project'), // Set working dir to our test project
    });
    window = await app.firstWindow();
  });

  afterEach(async () => {
    await app.close();
  });

  test('TC-03-01: Should add a new server and persist it to the config file', async () => {
    await window.locator(SELECTORS.addServerButton).click();
    await expect(window.locator(SELECTORS.addServerModal)).toBeVisible();

    await window.locator(SELECTORS.serverNameInput).fill(MOCK_SERVER.name);
    await window.locator(SELECTORS.serverUrlInput).fill(MOCK_SERVER.url);
    await window.locator(SELECTORS.saveServerButton).click();

    await expect(window.locator(SELECTORS.addServerModal)).not.toBeVisible();
    await expect(window.locator(`${SELECTORS.serverListItem}:has-text("${MOCK_SERVER.name}")`)).toBeVisible();

    const savedConfig = fs.readJsonSync(projectConfigPath);
    expect(savedConfig.servers).toHaveLength(1);
    expect(savedConfig.servers[0]).toEqual(MOCK_SERVER);
  });

  test('TC-03-02: Should show validation errors for invalid server data', async () => {
    await window.locator(SELECTORS.addServerButton).click();
    await window.locator(SELECTORS.serverNameInput).fill('Incomplete Server');
    await window.locator(SELECTORS.saveServerButton).click();

    await expect(window.locator(SELECTORS.addServerModal)).toBeVisible();
    await expect(window.locator(SELECTORS.validationError)).toBeVisible();

    const savedConfig = fs.readJsonSync(projectConfigPath);
    expect(savedConfig.servers).toHaveLength(0);
  });

  test('TC-03-04: Should edit an existing server and persist changes', async () => {
    fs.outputJsonSync(projectConfigPath, { servers: [MOCK_SERVER] });
    await window.reload(); // Reload to pick up the new config

    const serverRow = window.locator(`${SELECTORS.serverListItem}:has-text("${MOCK_SERVER.name}")`);
    await serverRow.locator(SELECTORS.editButton).click();

    await expect(window.locator(SELECTORS.addServerModal)).toBeVisible();
    await window.locator(SELECTORS.serverNameInput).fill(MOCK_SERVER_EDITED.name);
    await window.locator(SELECTORS.serverUrlInput).fill(MOCK_SERVER_EDITED.url);
    await window.locator(SELECTORS.saveServerButton).click();

    await expect(window.locator(`${SELECTORS.serverListItem}:has-text("${MOCK_SERVER_EDITED.name}")`)).toBeVisible();
    await expect(window.locator(`${SELECTORS.serverListItem}:has-text("${MOCK_SERVER.name}")`)).not.toBeVisible();

    const savedConfig = fs.readJsonSync(projectConfigPath);
    expect(savedConfig.servers).toHaveLength(1);
    expect(savedConfig.servers[0]).toEqual(MOCK_SERVER_EDITED);
  });

  test('TC-03-05: Should delete a server and remove it from the config file', async () => {
    fs.outputJsonSync(projectConfigPath, { servers: [MOCK_SERVER] });
    await window.reload();

    const serverRow = window.locator(`${SELECTORS.serverListItem}:has-text("${MOCK_SERVER.name}")`);
    await serverRow.locator(SELECTORS.deleteButton).click();

    // Handle confirmation dialog if one exists
    await window.locator(SELECTORS.confirmDeleteButton).click();

    await expect(window.locator(`${SELECTORS.serverListItem}:has-text("${MOCK_SERVER.name}")`)).not.toBeVisible();

    const savedConfig = fs.readJsonSync(projectConfigPath);
    expect(savedConfig.servers).toHaveLength(0);
  });
});
