import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * Playwright configuration for E2E testing of MCP Configuration Manager
 */
export default defineConfig({
  // Test directory
  testDir: './e2e',

  // Test timeout
  timeout: 30000,

  // Global timeout
  globalTimeout: 10 * 60 * 1000, // 10 minutes

  // Retry failed tests
  retries: process.env.CI ? 2 : 1,

  // Number of workers
  workers: process.env.CI ? 1 : 2,

  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list'],
  ],

  // Shared settings for all projects
  use: {
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',

    // Viewport size
    viewport: { width: 1280, height: 720 },

    // Ignore HTTPS errors
    ignoreHTTPSErrors: true,
  },

  // Configure projects for different testing scenarios
  projects: [
    {
      name: 'electron',
      testMatch: /.*\.e2e\.ts$/,
      use: {
        ...devices['Desktop Chrome'],
        // Connect to running Electron app with remote debugging
        connectOptions: {
          wsEndpoint: 'ws://localhost:9222/devtools/browser',
        },
      },
    },
    {
      name: 'smoke',
      testMatch: /.*\.smoke\.ts$/,
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'visual',
      testMatch: /.*\.visual\.ts$/,
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      name: 'working',
      testMatch: /.*\.spec\.ts$/,
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],

  // Output folder for test artifacts
  outputDir: 'test-results',

  // Folder for test artifacts such as screenshots, videos, traces, etc.
  preserveOutput: 'failures-only',

  // Run your local web server before starting the tests
  webServer: process.env.ELECTRON_DEV ? undefined : {
    command: 'npm run dev:renderer',
    port: 5175,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});