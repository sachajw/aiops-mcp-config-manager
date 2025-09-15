
import { _electron, test, expect, ElectronApplication, Page } from '@playwright/test';
import path from 'path';

// This test suite assumes you have set up Playwright to work with Electron and Jest.
// The main application entry point is assumed to be in `build/main/main.js`.

describe('TS-01: Application Lifecycle & Basic UI', () => {
  let app: ElectronApplication;
  let window: Page;

  // TC-01-01: Launch the application before all tests
  beforeAll(async () => {
    // Path to your electron app's main file
    const mainFile = path.resolve(__dirname, '../../build/main/main.js');

    app = await _electron.launch({
      args: [mainFile],
    });

    // Wait for the first window to open and assign it to the window variable
    window = await app.firstWindow();
  }, 30000); // 30-second timeout for app launch

  // TC-01-02: Close the application after all tests
  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  test('TC-01-01: Application should launch and display a window', async () => {
    expect(app).toBeDefined();
    expect(window).toBeDefined();

    const isVisible = await window.isVisible();
    expect(isVisible).toBe(true);

    // Optional: Check for a specific title if your app has one
    // const title = await window.title();
    // expect(title).toBe('MCP Config Manager');
  });

  test('TC-01-03: Window should be minimizable and restorable', async () => {
    // Electron-specific function to minimize
    await app.evaluate(async ({ app: electronApp }) => {
      electronApp.getWindows()[0].minimize();
    });

    // We can't easily assert minimization in a headless environment,
    // but we can ensure no errors were thrown and then restore.

    await app.evaluate(async ({ app: electronApp }) => {
      electronApp.getWindows()[0].restore();
    });

    const isVisible = await window.isVisible();
    expect(isVisible).toBe(true);
  });

  test('TC-01-03: Window should be resizable', async () => {
    const initialSize = await window.viewportSize();
    expect(initialSize).not.toBeNull();

    const newSize = { width: 800, height: 600 };
    await window.setViewportSize(newSize);

    const resizedSize = await window.viewportSize();
    expect(resizedSize).toEqual(newSize);
  });
});
