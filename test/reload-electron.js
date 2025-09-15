// Quick script to reload the Electron app via CDP
const CDP = require('chrome-remote-interface');

async function reloadElectron() {
  try {
    const client = await CDP({ port: 9222 });
    const { Page } = client;

    await Page.enable();
    await Page.navigate({ url: 'http://localhost:5175' });

    console.log('✅ Navigated to http://localhost:5175');

    await client.close();
  } catch (error) {
    console.error('Failed to reload:', error.message);
    console.log('\nTry manually in DevTools console:');
    console.log('window.location.href = "http://localhost:5175"');
  }
}

reloadElectron();