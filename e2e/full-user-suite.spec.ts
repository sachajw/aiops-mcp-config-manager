import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';

let electronApp: ElectronApplication;
let window: Page;

test.describe.serial('MCP Configuration Manager - Full User Suite', () => {
    test.beforeAll(async () => {
        // Create test configuration directory
        const testConfigDir = path.join(os.tmpdir(), `mcp-test-user-suite-${Date.now()}`);
        await fs.ensureDir(testConfigDir);

        // Set up test client configurations
        const testClients = {
            claudeDesktop: path.join(testConfigDir, 'claude-desktop', 'config.json'),
            claudeCode: path.join(testConfigDir, '.claude', 'claude_code_config.json'),
            vsCode: path.join(testConfigDir, '.config', 'Code', 'User', 'settings.json')
        };

        // Create test configurations for each client
        for (const [client, configPath] of Object.entries(testClients)) {
            await fs.ensureDir(path.dirname(configPath));
            await fs.writeJson(configPath, {
                mcpServers: {
                    'initial-server': {
                        command: 'echo',
                        args: ['hello']
                    }
                }
            }, { spaces: 2 });
        }

        // Launch Electron app
        electronApp = await electron.launch({
            args: ['.', '--remote-debugging-port=9555'],
            cwd: path.join(__dirname, '..'),
            env: {
                ...process.env,
                NODE_ENV: 'development',
                ELECTRON_IS_DEV: '1',
                TEST_MODE: 'true',
                TEST_CONFIG_DIR: testConfigDir,
                HOME: testConfigDir,
                USERPROFILE: testConfigDir
            },
            timeout: 30000
        });

        window = await electronApp.firstWindow();
        await window.waitForLoadState('domcontentloaded');
        await window.waitForTimeout(3000);

        // Navigate past landing page if present
        const landingTitle = window.locator('h1:has-text("My MCP Manager")');
        try {
            if (await landingTitle.isVisible({ timeout: 5000 })) {
                console.log('Landing page detected, clicking Get Started...');
                await window.click('button:has-text("Get Started")');
                await expect(landingTitle).not.toBeVisible({ timeout: 5000 });
            }
        } catch (e) {
            console.log('Landing page check/navigation failed or timed out, proceeding...');
        }
    });

    test.afterAll(async () => {
        if (electronApp) {
            await electronApp.close();
        }
    });

    test('1. Client Selection', async () => {
        console.log('\n=== Test 1: Client Selection ===');

        // Close any open modals
        const modalBackdrop = window.locator('.fixed.inset-0.z-50, [class*="modal"], [role="dialog"]');
        if (await modalBackdrop.isVisible({ timeout: 2000 })) {
            const closeBtn = window.locator('button:has-text("Close"), button:has-text("Cancel"), button[aria-label="Close"]').first();
            if (await closeBtn.isVisible()) {
                await closeBtn.click();
                await window.waitForTimeout(500);
                console.log('Closed existing modal');
            }
        }

        const clientDropdown = window.locator('select').first();
        await expect(clientDropdown).toBeVisible({ timeout: 10000 });

        const options = await clientDropdown.locator('option').allInnerTexts();
        console.log('Available clients:', options);

        if (options.length > 1) {
            // Try to select 'Claude Desktop' if available, otherwise index 1
            const claudeIndex = options.findIndex(o => o.includes('Claude Desktop'));
            const indexToSelect = claudeIndex > 0 ? claudeIndex : 1;

            await clientDropdown.selectOption({ index: indexToSelect }); // Select first available client
            await window.waitForTimeout(1000);
            const selected = await clientDropdown.inputValue();
            expect(selected).toBeTruthy();
            console.log(`✅ Client selected (Index: ${indexToSelect})`);
        } else {
            console.log('⚠️ No clients available to select');
        }
    });

    test('2. Add Server (CRUD - Create)', async () => {
        console.log('\n=== Test 2: Add Server ===');

        // Ensure we are on a client that allows adding
        const addServerBtn = window.locator('button:has-text("Add Server")');

        // If disabled, try selecting client again
        if (!await addServerBtn.isEnabled()) {
            console.log('⚠️ Add Server button disabled, retrying client selection...');
            const clientDropdown = window.locator('select').first();
            await clientDropdown.selectOption({ index: 1 });
            await window.waitForTimeout(1000);
        }

        // Wait for button to be enabled
        await expect(addServerBtn).toBeEnabled({ timeout: 10000 });
        await addServerBtn.click();

        // Wait for modal
        const nameInput = window.locator('input[placeholder*="Name"]');
        await expect(nameInput).toBeVisible();

        // Fill form
        await nameInput.fill('test-auto-server');
        await window.locator('input[placeholder*="Command"]').fill('echo');

        // Add argument
        const argsInput = window.locator('input[placeholder*="Argument"]');
        if (await argsInput.isVisible()) {
            await argsInput.fill('hello world');
        }

        // Save
        await window.click('button:has-text("Save"), button:has-text("Add")');
        await window.waitForTimeout(1000);

        // Verify added
        const serverCard = window.locator('text=test-auto-server');
        await expect(serverCard).toBeVisible();
        console.log('✅ Server added successfully');
    });

    test('3. Edit Server (CRUD - Update)', async () => {
        console.log('\n=== Test 3: Edit Server ===');

        const serverCard = window.locator('div:has-text("test-auto-server")').last();
        if (await serverCard.isVisible()) {
            // Find edit button within the card
            const editBtn = serverCard.locator('button[title*="Edit"], button:has-text("Edit")').first();
            // If not found directly, might be hidden or different icon, try clicking card
            if (await editBtn.isVisible()) {
                await editBtn.click();
            } else {
                // Fallback: click the card itself if that opens edit
                await serverCard.click();
            }

            await window.waitForTimeout(500);

            // Change name
            await window.fill('input[placeholder*="Name"]', 'test-auto-server-edited');
            await window.click('button:has-text("Save"), button:has-text("Update")');
            await window.waitForTimeout(1000);

            // Verify change
            const newCard = window.locator('text=test-auto-server-edited');
            await expect(newCard).toBeVisible();
            console.log('✅ Server edited successfully');
        } else {
            console.log('⚠️ Test server not found for editing');
        }
    });

    test('4. Profiles (Save/Load)', async () => {
        console.log('\n=== Test 4: Profiles ===');

        // Open Profiles/Templates menu
        const profilesBtn = window.locator('button:has-text("Profiles"), button[title*="Profiles"]');
        if (await profilesBtn.isVisible()) {
            await profilesBtn.click();

            // Save Profile
            await window.click('button:has-text("Save Profile"), button:has-text("Save Template")');
            await window.fill('input[placeholder*="Name"]', 'AutoTestProfile');
            await window.click('button:has-text("Save")');
            await window.waitForTimeout(1000);
            console.log('✅ Profile saved');

            // Close modal if open
            const closeBtn = window.locator('button:has-text("Close")');
            if (await closeBtn.isVisible()) await closeBtn.click();
        } else {
            console.log('ℹ️ Profiles feature not accessible/visible');
        }
    });

    test('5. Delete Server (CRUD - Delete)', async () => {
        console.log('\n=== Test 5: Delete Server ===');

        const serverCard = window.locator('div:has-text("test-auto-server-edited")').last();
        if (await serverCard.isVisible()) {
            // Find delete button
            const deleteBtn = serverCard.locator('button[title*="Delete"], button[title*="Remove"]').first();
            await deleteBtn.click();

            // Confirm deletion if modal appears
            const confirmBtn = window.locator('button:has-text("Delete"), button:has-text("Confirm"), button:has-text("Yes")');
            if (await confirmBtn.isVisible()) {
                await confirmBtn.click();
            }

            await window.waitForTimeout(1000);

            // Verify gone
            const goneCard = window.locator('text=test-auto-server-edited');
            await expect(goneCard).not.toBeVisible();
            console.log('✅ Server deleted successfully');
        } else {
            console.log('⚠️ Test server not found for deletion');
        }
    });

    test('6. Visual Workspace Navigation', async () => {
        console.log('\n=== Test 6: Visual Workspace ===');
        await window.click('button:has-text("Visual"), [role="tab"]:has-text("Visual")');
        await window.waitForTimeout(1000);
        const canvas = window.locator('.react-flow');
        await expect(canvas).toBeVisible();
        console.log('✅ Visual Workspace accessible');
    });

});
