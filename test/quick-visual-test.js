const puppeteer = require('puppeteer');

async function quickTest() {
  console.log('Quick Visual Workspace Test\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });

    // Navigate
    console.log('Loading app...');
    await page.goto('http://localhost:5175', { waitUntil: 'domcontentloaded', timeout: 10000 });

    // Wait a bit for React to render
    await new Promise(r => setTimeout(r, 2000));

    // Get page content for debugging
    const title = await page.title();
    console.log('Page title:', title);

    // Check if we have the main app container
    const hasApp = await page.$('#root') !== null;
    console.log('App root found:', hasApp);

    // Try to find and click Get Started button first
    const buttons = await page.$$eval('button', buttons =>
      buttons.map(b => b.textContent)
    );
    console.log('\nButtons found:', buttons);

    // Click Get Started if present
    const getStartedIndex = buttons.findIndex(b => b && b.includes('Get Started'));
    if (getStartedIndex >= 0) {
      const allButtons = await page.$$('button');
      await allButtons[getStartedIndex].click();
      console.log('Clicked Get Started button');
      await new Promise(r => setTimeout(r, 2000));

      // Now look for Visual button
      const newButtons = await page.$$eval('button', buttons =>
        buttons.map(b => b.textContent)
      );
      console.log('\nButtons after Get Started:', newButtons);

      const visualButton = newButtons.findIndex(b => b && b.includes('Visual'));
      if (visualButton >= 0) {
        const allButtons = await page.$$('button');
        await allButtons[visualButton].click();
        console.log('Clicked Visual button');
        await new Promise(r => setTimeout(r, 1500));
      }
    }

    // Check for visual workspace
    const hasVisualWorkspace = await page.$('.visual-workspace') !== null;
    console.log('\nVisual workspace found:', hasVisualWorkspace);

    // If not found, check what's on the page
    if (!hasVisualWorkspace) {
      const pageContent = await page.evaluate(() => {
        const root = document.querySelector('#root');
        if (!root) return 'No root element';

        // Get visible elements
        const visibleElements = [];
        const elements = root.querySelectorAll('*');
        elements.forEach(el => {
          if (el.offsetParent !== null && el.textContent && el.textContent.trim()) {
            const tagName = el.tagName.toLowerCase();
            const className = el.className || 'no-class';
            if (tagName === 'div' || tagName === 'button' || tagName === 'h1' || tagName === 'h2') {
              visibleElements.push(`${tagName}.${className}: ${el.textContent.substring(0, 50)}`);
            }
          }
        });
        return visibleElements.slice(0, 10);
      });
      console.log('\nPage content:', pageContent);
    }

    if (hasVisualWorkspace) {
      // Count components
      const serverCards = await page.$$('.server-card');
      const clientCards = await page.$$('.client-card');
      const canvas = await page.$('#react-flow-wrapper') !== null;

      console.log(`\nComponents found:
- Server cards: ${serverCards.length}
- Client cards: ${clientCards.length}
- Canvas: ${canvas}`);

      // Test drag functionality
      if (serverCards.length > 0 && canvas) {
        console.log('\nTesting drag...');

        const server = await serverCards[0].boundingBox();
        const canvasEl = await page.$('#react-flow-wrapper');
        const canvasBox = await canvasEl.boundingBox();

        // Simulate drag
        await page.mouse.move(server.x + 10, server.y + 10);
        await page.mouse.down();
        await page.mouse.move(canvasBox.x + 200, canvasBox.y + 200, { steps: 5 });
        await page.mouse.up();
        await new Promise(r => setTimeout(r, 500));

        // Check for nodes
        const nodes = await page.$$('.server-node');
        console.log(`Server nodes after drag: ${nodes.length}`);
      }

      // Check for layout issues
      const workspace = await page.$eval('.visual-workspace', el => ({
        height: el.offsetHeight,
        scrollHeight: el.scrollHeight,
        width: el.offsetWidth,
        className: el.className
      }));

      console.log(`\nLayout check:
- Workspace dimensions: ${workspace.width}x${workspace.height}px
- Scroll height: ${workspace.scrollHeight}px
- Has overflow: ${workspace.scrollHeight > workspace.height}
- Classes: ${workspace.className}`);

      // Check specific issues
      const issues = [];

      // Check performance panel
      const perfPanel = await page.$('[class*="InsightsPanel"]');
      if (perfPanel) {
        const perfBox = await perfPanel.boundingBox();
        console.log(`\nPerformance panel position: y=${perfBox.y}, height=${perfBox.height}`);
      }

      // Check React Flow controls
      const controls = await page.$('.react-flow__controls');
      if (controls) {
        const controlsBox = await controls.boundingBox();
        console.log(`Controls position: y=${controlsBox.y}, height=${controlsBox.height}`);
      }
    }

    // Take screenshot
    await page.screenshot({ path: 'quick-test.png', fullPage: true });
    console.log('\nScreenshot saved as quick-test.png');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
    console.log('\nTest complete');
  }
}

quickTest();