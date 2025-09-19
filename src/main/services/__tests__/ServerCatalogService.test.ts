import { ServerCatalogService } from '../ServerCatalogService';

describe('ServerCatalogService', () => {
  describe('getCatalog', () => {
    it('should return a catalog of servers', async () => {
      const catalog = await ServerCatalogService.getCatalog();

      expect(catalog).toBeInstanceOf(Array);
      expect(catalog.length).toBeGreaterThan(10); // Should have 16+ servers
    });

    it('should return servers with proper structure', async () => {
      const catalog = await ServerCatalogService.getCatalog();
      const server = catalog[0];

      expect(server).toHaveProperty('name');
      expect(server).toHaveProperty('description');
      expect(server).toHaveProperty('author');
      expect(server).toHaveProperty('command');
      expect(server).toHaveProperty('category');

      expect(typeof server.name).toBe('string');
      expect(typeof server.description).toBe('string');
      expect(['core', 'data', 'web', 'ai', 'community', 'tools']).toContain(server.category);
    });

    it('should include expected servers', async () => {
      const catalog = await ServerCatalogService.getCatalog();
      const serverNames = catalog.map(s => s.name);

      // Check for core servers
      expect(serverNames).toContain('Filesystem');
      expect(serverNames).toContain('PostgreSQL');
      expect(serverNames).toContain('GitHub');
      expect(serverNames).toContain('Docker');
      expect(serverNames).toContain('OpenAI');
    });

    it('should cache catalog results', async () => {
      const catalog1 = await ServerCatalogService.getCatalog();
      const catalog2 = await ServerCatalogService.getCatalog();

      // Should return same instance if cached
      expect(catalog1).toEqual(catalog2);
    });
  });

  describe('searchServers', () => {
    it('should search by name', async () => {
      const results = await ServerCatalogService.searchServers('postgres');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toContain('PostgreSQL');
    });

    it('should search by description', async () => {
      const results = await ServerCatalogService.searchServers('database');

      expect(results.length).toBeGreaterThan(0);
      expect(results.some(s =>
        s.description.toLowerCase().includes('database') ||
        s.name.toLowerCase().includes('database')
      )).toBeTruthy();
    });

    it('should search by author', async () => {
      const results = await ServerCatalogService.searchServers('anthropic');

      expect(results.length).toBeGreaterThan(0);
      expect(results.some(s => s.author === 'Anthropic')).toBeTruthy();
    });

    it('should be case insensitive', async () => {
      const results1 = await ServerCatalogService.searchServers('DOCKER');
      const results2 = await ServerCatalogService.searchServers('docker');

      expect(results1.length).toBe(results2.length);
    });

    it('should return empty array for no matches', async () => {
      const results = await ServerCatalogService.searchServers('xyz123notfound');

      expect(results).toEqual([]);
    });
  });

  describe('getServersByCategory', () => {
    it('should filter by core category', async () => {
      const results = await ServerCatalogService.getServersByCategory('core');

      expect(results.length).toBeGreaterThan(0);
      expect(results.every(s => s.category === 'core')).toBeTruthy();
    });

    it('should filter by data category', async () => {
      const results = await ServerCatalogService.getServersByCategory('data');

      expect(results.length).toBeGreaterThan(0);
      expect(results.every(s => s.category === 'data')).toBeTruthy();
      expect(results.some(s => s.name.includes('SQL'))).toBeTruthy();
    });

    it('should filter by ai category', async () => {
      const results = await ServerCatalogService.getServersByCategory('ai');

      expect(results.length).toBeGreaterThan(0);
      expect(results.every(s => s.category === 'ai')).toBeTruthy();
      expect(results.some(s => s.name === 'OpenAI' || s.name === 'Anthropic')).toBeTruthy();
    });

    it('should return all servers for "all" category', async () => {
      const all = await ServerCatalogService.getServersByCategory('all');
      const core = await ServerCatalogService.getServersByCategory('core');
      const data = await ServerCatalogService.getServersByCategory('data');

      expect(all.length).toBeGreaterThan(core.length);
      expect(all.length).toBeGreaterThan(data.length);
    });
  });

  describe('getPopularServers', () => {
    it('should return popular servers sorted by downloads', async () => {
      const popular = await ServerCatalogService.getPopularServers(5);

      expect(popular.length).toBe(5);

      // Check that they're sorted by downloads
      for (let i = 0; i < popular.length - 1; i++) {
        expect(popular[i].downloads || 0).toBeGreaterThanOrEqual(
          popular[i + 1].downloads || 0
        );
      }
    });

    it('should respect limit parameter', async () => {
      const popular3 = await ServerCatalogService.getPopularServers(3);
      const popular10 = await ServerCatalogService.getPopularServers(10);

      expect(popular3.length).toBe(3);
      expect(popular10.length).toBe(10);
    });

    it('should return high-download servers first', async () => {
      const popular = await ServerCatalogService.getPopularServers(5);

      // Filesystem and Python should be in top 5 (high downloads)
      const names = popular.map(s => s.name);
      expect(names).toContain('Filesystem');
    });
  });

  describe('getRecentServers', () => {
    it('should return recent servers', async () => {
      const recent = await ServerCatalogService.getRecentServers(5);

      expect(recent.length).toBe(5);
      expect(recent[0]).toHaveProperty('name');
    });

    it('should respect limit parameter', async () => {
      const recent3 = await ServerCatalogService.getRecentServers(3);
      const recent7 = await ServerCatalogService.getRecentServers(7);

      expect(recent3.length).toBe(3);
      expect(recent7.length).toBe(7);
    });
  });

  describe('server metadata', () => {
    it('should have proper npm packages', async () => {
      const catalog = await ServerCatalogService.getCatalog();
      const npmServers = catalog.filter(s => s.npm);

      expect(npmServers.length).toBeGreaterThan(10);
      expect(npmServers.every(s =>
        s.npm?.startsWith('@modelcontextprotocol/')
      )).toBeTruthy();
    });

    it('should have repository links', async () => {
      const catalog = await ServerCatalogService.getCatalog();
      const withRepo = catalog.filter(s => s.repository);

      expect(withRepo.length).toBeGreaterThan(10);
      expect(withRepo.every(s =>
        s.repository?.includes('github.com')
      )).toBeTruthy();
    });

    it('should have ratings', async () => {
      const catalog = await ServerCatalogService.getCatalog();
      const withRating = catalog.filter(s => s.rating);

      expect(withRating.length).toBeGreaterThan(10);
      expect(withRating.every(s =>
        s.rating && s.rating >= 0 && s.rating <= 5
      )).toBeTruthy();
    });

    it('should have download counts', async () => {
      const catalog = await ServerCatalogService.getCatalog();
      const withDownloads = catalog.filter(s => s.downloads);

      expect(withDownloads.length).toBeGreaterThan(10);
      expect(withDownloads.every(s =>
        s.downloads && s.downloads > 0
      )).toBeTruthy();
    });
  });
});