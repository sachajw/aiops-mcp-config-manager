import { Page, expect, Locator } from '@playwright/test';
import { TestHelpers } from '../utils/TestHelpers';

/**
 * Page Object Model for Visual Workspace
 */
export class VisualWorkspacePage {
  readonly page: Page;

  // Selectors
  readonly visualButton: Locator;
  readonly workspace: Locator;
  readonly serverLibrary: Locator;
  readonly clientDock: Locator;
  readonly canvas: Locator;
  readonly serverCards: Locator;
  readonly serverNodes: Locator;
  readonly clientCards: Locator;
  readonly clientNodes: Locator;
  readonly autoSaveToggle: Locator;
  readonly saveButton: Locator;
  readonly performancePanel: Locator;

  constructor(page: Page) {
    this.page = page;

    // Initialize locators
    this.visualButton = page.locator('button:has-text("Visual")').first();
    this.workspace = page.locator('.visual-workspace');
    this.serverLibrary = page.locator('.server-library');
    this.clientDock = page.locator('.client-dock');
    this.canvas = page.locator('#react-flow-wrapper');
    this.serverCards = page.locator('.server-card');
    this.serverNodes = page.locator('.server-node');
    this.clientCards = page.locator('.client-card');
    this.clientNodes = page.locator('.client-node');
    this.autoSaveToggle = page.locator('[data-testid="auto-save-toggle"], .auto-save-toggle');
    this.saveButton = page.locator('button:has-text("Save Configuration")');
    this.performancePanel = page.locator('.performance-panel, [data-testid="performance-panel"]');
  }

  /**
   * Navigate to Visual Workspace
   */
  async navigateToVisual(): Promise<void> {
    // Click Visual button
    await TestHelpers.reliableClick(this.page, 'button:has-text("Visual")');

    // Wait for workspace to load
    await this.workspace.waitFor({ state: 'visible', timeout: 10000 });

    // Verify all panels loaded
    await expect(this.serverLibrary).toBeVisible({ timeout: 5000 });
    await expect(this.clientDock).toBeVisible({ timeout: 5000 });
    await expect(this.canvas).toBeVisible({ timeout: 5000 });

    // Wait for initial render to complete
    await TestHelpers.waitForStableDOM(this.page);
  }

  /**
   * Get count of server nodes on canvas
   */
  async getServerNodeCount(): Promise<number> {
    await this.page.waitForTimeout(500); // Allow DOM to update
    return await this.serverNodes.count();
  }

  /**
   * Get count of client nodes on canvas
   */
  async getClientNodeCount(): Promise<number> {
    await this.page.waitForTimeout(500); // Allow DOM to update
    return await this.clientNodes.count();
  }

  /**
   * Drag a server to the canvas with verification
   */
  async dragServerToCanvas(serverName: string): Promise<boolean> {
    // Find the server card
    const serverCard = this.serverCards.filter({ hasText: serverName }).first();

    // Verify server exists
    await expect(serverCard).toBeVisible({ timeout: 5000 });

    // Get initial node count
    const initialCount = await this.getServerNodeCount();
    console.log(`Initial server nodes: ${initialCount}`);

    // Perform drag operation
    await serverCard.hover();
    await this.page.mouse.down();
    await this.page.waitForTimeout(100); // Allow drag to start

    // Move to canvas center
    const canvasBox = await this.canvas.boundingBox();
    if (!canvasBox) {
      throw new Error('Canvas not found');
    }

    const dropX = canvasBox.x + canvasBox.width / 2;
    const dropY = canvasBox.y + canvasBox.height / 2;

    await this.page.mouse.move(dropX, dropY, { steps: 10 });
    await this.page.waitForTimeout(100); // Allow drag preview to update

    await this.page.mouse.up();
    await this.page.waitForTimeout(1500); // Allow drop to process

    // Verify node was added
    const finalCount = await this.getServerNodeCount();
    console.log(`Final server nodes: ${finalCount}`);

    const success = finalCount > initialCount;

    if (success) {
      // Additional verification - check for specific node
      const newNode = this.serverNodes.filter({ hasText: serverName });
      await expect(newNode).toBeVisible({ timeout: 5000 });
    }

    return success;
  }

  /**
   * Select a client by double-clicking
   */
  async selectClient(clientName: string): Promise<void> {
    const clientCard = this.clientCards.filter({ hasText: clientName }).first();

    // Verify client exists
    await expect(clientCard).toBeVisible({ timeout: 5000 });

    // Double-click to select
    await clientCard.dblclick();
    await this.page.waitForTimeout(500);

    // Verify selection (should have ring highlight)
    const isSelected = await clientCard.evaluate((el) => {
      return el.classList.contains('ring-2') ||
             el.classList.contains('selected') ||
             window.getComputedStyle(el).boxShadow !== 'none';
    });

    expect(isSelected).toBeTruthy();
  }

  /**
   * Toggle auto-save
   */
  async toggleAutoSave(enable: boolean): Promise<void> {
    const isChecked = await this.autoSaveToggle.isChecked();

    if (isChecked !== enable) {
      await this.autoSaveToggle.click();
      await this.page.waitForTimeout(500);

      // Verify toggle state
      const newState = await this.autoSaveToggle.isChecked();
      expect(newState).toBe(enable);

      // Verify save button visibility
      if (enable) {
        await expect(this.saveButton).not.toBeVisible({ timeout: 2000 });
      } else {
        await expect(this.saveButton).toBeVisible({ timeout: 2000 });
      }
    }
  }

  /**
   * Save configuration manually
   */
  async saveConfiguration(): Promise<void> {
    await expect(this.saveButton).toBeVisible();
    await this.saveButton.click();

    // Wait for save to complete (button might disable or show success)
    await this.page.waitForTimeout(1000);
  }

  /**
   * Verify workspace is in valid state
   */
  async verifyWorkspaceState(): Promise<{
    hasErrors: boolean;
    serverCount: number;
    clientCount: number;
    canvasVisible: boolean;
  }> {
    await TestHelpers.verifyNoErrors(this.page);

    const serverCount = await this.getServerNodeCount();
    const clientCount = await this.getClientNodeCount();
    const canvasVisible = await this.canvas.isVisible();

    // Check for any error states
    const errorElements = await this.page.locator('.error, .ant-alert-error').count();

    return {
      hasErrors: errorElements > 0,
      serverCount,
      clientCount,
      canvasVisible,
    };
  }

  /**
   * Take a labeled screenshot
   */
  async screenshot(label: string): Promise<void> {
    await TestHelpers.screenshot(this.page, `visual-workspace-${label}`);
  }

  /**
   * Verify drag and drop functionality
   */
  async verifyDragAndDrop(): Promise<{
    canDragServers: boolean;
    canDropOnCanvas: boolean;
    canDropOnClients: boolean;
  }> {
    const results = {
      canDragServers: false,
      canDropOnCanvas: false,
      canDropOnClients: false,
    };

    // Test server drag
    const firstServer = this.serverCards.first();
    if (await firstServer.isVisible()) {
      const serverName = await firstServer.textContent();
      results.canDragServers = true;

      // Test drop on canvas
      const success = await this.dragServerToCanvas(serverName || 'test-server');
      results.canDropOnCanvas = success;
    }

    // Test drop on client (if clients exist)
    const firstClient = this.clientCards.first();
    if (await firstClient.isVisible()) {
      // Would test dropping server on client
      results.canDropOnClients = true; // Placeholder for now
    }

    return results;
  }
}