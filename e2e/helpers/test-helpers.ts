import { Page } from '@playwright/test';

/**
 * Helper functions for E2E tests
 */

/**
 * Ensures the app is past the landing page and on the main interface
 * @param window - The Playwright Page object
 * @returns true if successfully navigated to main interface
 */
export async function ensureMainInterface(window: Page): Promise<boolean> {
  console.log('Checking current page state...');

  // Check if we're on the landing page
  const landingTitle = window.locator('h1:has-text("My MCP Manager")');
  const landingVisible = await landingTitle.isVisible({ timeout: 2000 }).catch(() => false);

  if (landingVisible) {
    console.log('Landing page detected - clicking Get Started');

    // Find and click the Get Started button
    const getStartedBtn = window.locator('button:has-text("Get Started")');

    // Wait for button to be visible and enabled
    await getStartedBtn.waitFor({ state: 'visible', timeout: 5000 });

    // Check if button is enabled
    const isEnabled = await getStartedBtn.isEnabled();
    if (!isEnabled) {
      console.error('Get Started button is disabled!');
      return false;
    }

    // Click the button
    await getStartedBtn.click();
    console.log('Clicked Get Started button');

    // Wait for navigation
    await window.waitForTimeout(2000);

    // Verify we navigated away from landing
    const stillOnLanding = await landingTitle.isVisible({ timeout: 500 }).catch(() => false);
    if (stillOnLanding) {
      console.error('Failed to navigate from landing page!');

      // Try clicking again with force
      await getStartedBtn.click({ force: true });
      await window.waitForTimeout(2000);

      // Check one more time
      const stillStuck = await landingTitle.isVisible({ timeout: 500 }).catch(() => false);
      if (stillStuck) {
        console.error('Still stuck on landing page after force click');
        return false;
      }
    }

    console.log('Successfully navigated from landing page');
  } else {
    console.log('Already on main interface');
  }

  // Verify main interface is visible
  const mainInterface = window.locator('text=/MCP Servers/i, text=/Select.*Client/i, select').first();
  const mainVisible = await mainInterface.isVisible({ timeout: 5000 }).catch(() => false);

  if (!mainVisible) {
    console.error('Main interface not visible after navigation attempt');

    // Debug: Get current page content
    const bodyText = await window.locator('body').innerText().catch(() => '');
    console.log('Current page text (first 200 chars):', bodyText.substring(0, 200));

    return false;
  }

  console.log('✓ Main interface is ready');
  return true;
}

/**
 * Waits for client dropdown to be visible and interactable
 * @param window - The Playwright Page object
 * @returns The client dropdown locator if found, null otherwise
 */
export async function waitForClientDropdown(window: Page) {
  console.log('Waiting for client dropdown...');

  // Try multiple selectors for the dropdown
  const dropdownSelectors = [
    'select',
    '[role="combobox"]',
    'select.select-bordered',
    '[data-testid="client-dropdown"]'
  ];

  for (const selector of dropdownSelectors) {
    const dropdown = window.locator(selector).first();

    if (await dropdown.isVisible({ timeout: 1000 }).catch(() => false)) {
      console.log(`Found dropdown with selector: ${selector}`);

      // Check if it has options
      const options = await dropdown.locator('option').count();
      if (options > 0) {
        console.log(`Dropdown has ${options} options`);
        return dropdown;
      }
    }
  }

  console.error('Client dropdown not found');
  return null;
}

/**
 * Selects a client from the dropdown
 * @param window - The Playwright Page object
 * @param clientIndex - Index of client to select (0 is usually placeholder)
 * @returns true if client was selected successfully
 */
export async function selectClient(window: Page, clientIndex: number = 1): Promise<boolean> {
  const dropdown = await waitForClientDropdown(window);

  if (!dropdown) {
    console.error('Cannot select client - dropdown not found');
    return false;
  }

  try {
    // Get available options
    const options = await dropdown.locator('option').all();

    if (options.length <= clientIndex) {
      console.error(`Not enough options. Requested index ${clientIndex} but only ${options.length} options available`);
      return false;
    }

    // Get the text of the option we're selecting
    const optionText = await options[clientIndex].textContent();
    console.log(`Selecting client: "${optionText}"`);

    // Select the option
    await dropdown.selectOption({ index: clientIndex });
    await window.waitForTimeout(1000);

    // Verify selection
    const selectedValue = await dropdown.inputValue();
    if (!selectedValue || selectedValue === '') {
      console.error('Client selection failed - no value selected');
      return false;
    }

    console.log(`✓ Client selected: ${selectedValue}`);
    return true;
  } catch (error) {
    console.error('Error selecting client:', error);
    return false;
  }
}

/**
 * Takes a screenshot with a descriptive name
 * @param window - The Playwright Page object
 * @param name - Name for the screenshot file
 */
export async function takeScreenshot(window: Page, name: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `test-results/${name}-${timestamp}.png`;

  try {
    await window.screenshot({ path: filename });
    console.log(`Screenshot saved: ${filename}`);
  } catch (error) {
    console.error(`Failed to take screenshot: ${error}`);
  }
}

/**
 * Checks if the Add Server button is enabled
 * @param window - The Playwright Page object
 * @returns true if Add Server button is enabled
 */
export async function isAddServerEnabled(window: Page): Promise<boolean> {
  const addServerBtn = window.locator('button:has-text("Add Server")').first();

  if (await addServerBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    const isEnabled = await addServerBtn.isEnabled();
    console.log(`Add Server button is ${isEnabled ? 'enabled' : 'disabled'}`);
    return isEnabled;
  }

  console.log('Add Server button not found');
  return false;
}

/**
 * Waits for the app to be fully loaded and ready
 * @param window - The Playwright Page object
 * @param timeout - Maximum time to wait in milliseconds
 */
export async function waitForAppReady(window: Page, timeout: number = 10000) {
  console.log('Waiting for app to be ready...');

  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    // Check if either landing or main interface is visible
    const landingVisible = await window.locator('h1:has-text("My MCP Manager")').isVisible({ timeout: 500 }).catch(() => false);
    const mainVisible = await window.locator('text=/MCP Servers/i').isVisible({ timeout: 500 }).catch(() => false);

    if (landingVisible || mainVisible) {
      console.log('✓ App is ready');
      return true;
    }

    // Check for error messages
    const errorVisible = await window.locator('.error, [role="alert"], text=/error/i').isVisible({ timeout: 500 }).catch(() => false);
    if (errorVisible) {
      const errorText = await window.locator('.error, [role="alert"]').first().textContent();
      console.error(`Error detected: ${errorText}`);
      return false;
    }

    await window.waitForTimeout(500);
  }

  console.error('Timeout waiting for app to be ready');
  return false;
}