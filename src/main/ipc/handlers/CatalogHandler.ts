/**
 * Catalog IPC Handler
 * Handles server catalog and discovery operations
 */

import { BaseHandler } from './BaseHandler';

export class CatalogHandler extends BaseHandler {
  constructor() {
    super('catalog');
  }

  /**
   * Register all catalog-related IPC handlers
   */
  register(): void {
    // Get server catalog
    this.handle<[], any>('getServers', async () => {
      const { ServerCatalogService } = await import('../../services/ServerCatalogService');
      return ServerCatalogService.getCatalog();
    });

    // Search servers
    this.handle<[string], any>('searchServers', async (_, query: string) => {
      const { ServerCatalogService } = await import('../../services/ServerCatalogService');
      return ServerCatalogService.searchServers(query);
    });

    // Get servers by category
    this.handle<[string], any>('getServersByCategory', async (_, category: string) => {
      const { ServerCatalogService } = await import('../../services/ServerCatalogService');
      return ServerCatalogService.getServersByCategory(category);
    });

    // Get popular servers
    this.handle<[number?], any>('getPopularServers', async (_, limit?: number) => {
      const { ServerCatalogService } = await import('../../services/ServerCatalogService');
      return ServerCatalogService.getPopularServers(limit);
    });

    console.log('[CatalogHandler] Registered all catalog handlers');
  }
}