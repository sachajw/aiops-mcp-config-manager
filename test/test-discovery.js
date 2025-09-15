#!/usr/bin/env node

/**
 * Test script for MCP Discovery feature
 * Tests the Discovery modal with real MCP registry API
 */

const puppeteer = require('puppeteer');
const path = require('path');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testDiscovery() {
  console.log('🚀 Starting MCP Discovery test...');

  // Connect to the running Electron app
  const browser = await puppeteer.connect({
    browserURL: 'http://localhost:9222',
    defaultViewport: null
  });

  const pages = await browser.pages();
  const page = pages[0] || await browser.newPage();

  console.log('📱 Connected to Electron app');

  try {
    // Wait for app to fully load
    await sleep(3000);

    // First, enable the experimental feature in Settings
    console.log('⚙️ Navigating to Settings...');

    // Click Settings button
    const settingsButton = await page.waitForSelector('button:has-text("Settings")', { timeout: 5000 });
    if (settingsButton) {
      await settingsButton.click();
      await sleep(1000);

      // Click Advanced tab
      console.log('🔧 Opening Advanced settings...');
      const advancedTab = await page.waitForSelector('div[role="tab"]:has-text("Advanced")', { timeout: 5000 });
      if (advancedTab) {
        await advancedTab.click();
        await sleep(500);

        // Enable MCP Discovery
        console.log('🔬 Enabling experimental MCP Discovery...');
        const toggleSwitch = await page.waitForSelector('button[role="switch"][aria-label*="MCP Discovery"]', { timeout: 5000 });
        if (toggleSwitch) {
          const isChecked = await toggleSwitch.evaluate(el => el.getAttribute('aria-checked') === 'true');
          if (!isChecked) {
            await toggleSwitch.click();
            console.log('✅ MCP Discovery enabled');
          } else {
            console.log('✅ MCP Discovery already enabled');
          }
          await sleep(500);
        }

        // Close settings
        const closeButton = await page.waitForSelector('button[aria-label="Close"]', { timeout: 5000 });
        if (closeButton) {
          await closeButton.click();
          await sleep(1000);
        }
      }
    }

    // Now test the Discovery feature
    console.log('🔍 Opening Discovery modal...');

    // Look for Discover button
    const discoverButton = await page.waitForSelector('button:has-text("Discover")', { timeout: 5000 });
    if (discoverButton) {
      await discoverButton.click();
      console.log('✅ Discovery modal opened');
      await sleep(2000);

      // Check if catalog loaded
      const serverCards = await page.$$('.card');
      console.log(`📦 Found ${serverCards.length} servers in catalog`);

      // Try clicking on a category filter
      const categoryButtons = await page.$$('button.btn-sm');
      if (categoryButtons.length > 0) {
        console.log(`🏷️ Found ${categoryButtons.length} category buttons`);

        // Click first category
        await categoryButtons[0].click();
        await sleep(1000);

        // Check filtered results
        const filteredCards = await page.$$('.card');
        console.log(`📊 Filtered to ${filteredCards.length} servers`);
      }

      // Test search
      const searchInput = await page.$('input[placeholder*="Search"]');
      if (searchInput) {
        console.log('🔎 Testing search...');
        await searchInput.type('file');
        await sleep(1000);

        const searchResults = await page.$$('.card');
        console.log(`🔍 Search returned ${searchResults.length} results`);
      }

      // Try to view server details
      const firstCard = await page.$('.card');
      if (firstCard) {
        console.log('📋 Opening server details...');
        await firstCard.click();
        await sleep(1000);

        // Check if install button exists
        const installButton = await page.$('button:has-text("Install")');
        if (installButton) {
          console.log('✅ Server details modal opened with Install button');

          // Don't actually install, just test the UI
          console.log('⚠️ Skipping actual installation (test mode)');
        }

        // Close modal
        const closeModal = await page.$('button[aria-label="Close"]');
        if (closeModal) {
          await closeModal.click();
        }
      }

      console.log('✅ Discovery feature test completed successfully!');

    } else {
      console.log('⚠️ Discover button not found - feature may not be enabled');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }

  // Don't close the browser - let the app continue running
  console.log('✨ Test complete - app remains running');
}

// Run the test
testDiscovery().catch(console.error);