import { McpDiscoveryService } from '../McpDiscoveryService';
import axios from 'axios';
import * as fs from 'fs-extra';
import { app } from 'electron';

// Mock dependencies
jest.mock('axios');
jest.mock('fs-extra');
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn()
  },
  BrowserWindow: {
    getAllWindows: jest.fn(() => [])
  }
}));

describe('McpDiscoveryService Integration Tests', () => {
  let discoveryService: McpDiscoveryService;

  beforeEach(() => {
    jest.clearAllMocks();
    (app.getPath as jest.Mock).mockReturnValue('/mock/user/data');
    (fs.pathExists as jest.Mock).mockResolvedValue(false);
    (fs.readJson as jest.Mock).mockResolvedValue({});
    (fs.writeJson as jest.Mock).mockResolvedValue(undefined);
    (fs.ensureDir as jest.Mock).mockResolvedValue(undefined);

    discoveryService = new McpDiscoveryService();
  });

  describe('BUG-012: Server Description Handling', () => {
    it('should extract descriptions from GitHub README files', async () => {
      // Setup: Mock GitHub API responses
      const mockReadmeContent = `
# MCP Servers

## 🤝 Third-Party Servers

- [Awesome Server](https://github.com/user/awesome-server) - A fantastic MCP server for doing awesome things
- [Database MCP](https://github.com/org/database-mcp) - Connect to PostgreSQL and MySQL databases
- [No Description Server](https://github.com/test/no-desc)
- **[Bold Server](https://github.com/bold/server)** - Server with bold formatting
`;

      (axios.get as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('README.md')) {
          return Promise.resolve({ data: mockReadmeContent });
        }
        if (url.includes('api.github.com')) {
          return Promise.resolve({
            data: [
              { name: 'server1', type: 'dir' },
              { name: 'server2', type: 'dir' }
            ]
          });
        }
        return Promise.reject(new Error('Not found'));
      });

      // Act: Fetch catalog from GitHub
      const catalog = await discoveryService.fetchCatalogFromGitHub();

      // Assert: Descriptions are properly extracted
      const servers = catalog.servers;

      // Check third-party servers have descriptions
      const awesomeServer = servers.find(s => s.name === 'Awesome Server');
      expect(awesomeServer?.description).toBe('A fantastic MCP server for doing awesome things');

      const databaseServer = servers.find(s => s.name === 'Database MCP');
      expect(databaseServer?.description).toBe('Connect to PostgreSQL and MySQL databases');

      // Server without description should have fallback
      const noDescServer = servers.find(s => s.name === 'No Description Server');
      expect(noDescServer?.description).toBe('No Description Server MCP server');

      // Bold formatted server
      const boldServer = servers.find(s => s.name === 'Bold Server');
      expect(boldServer?.description).toBe('Server with bold formatting');
    });

    it('should provide fallback descriptions for servers without metadata', async () => {
      // Setup: Mock empty README
      (axios.get as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('README.md')) {
          return Promise.resolve({ data: '' });
        }
        if (url.includes('api.github.com')) {
          return Promise.resolve({
            data: [
              { name: 'filesystem', type: 'dir' },
              { name: 'github', type: 'dir' }
            ]
          });
        }
        // No individual README files
        return Promise.reject(new Error('Not found'));
      });

      // Act: Fetch catalog
      const catalog = await discoveryService.fetchCatalogFromGitHub();

      // Assert: All servers have some description
      catalog.servers.forEach(server => {
        expect(server.description).toBeTruthy();
        expect(server.description).not.toBe('');

        // Should have fallback format
        if (!server.description.includes('MCP')) {
          expect(server.description).toContain('server');
        }
      });
    });

    it('should handle special characters in descriptions', async () => {
      // Setup: Mock README with special characters
      const mockReadmeContent = `
## 🤝 Third-Party Servers

- [Special Server](https://github.com/test/special) - Handles & processes <data> with "quotes" and 'apostrophes'
- [Unicode Server](https://github.com/test/unicode) - 支持中文 and émojis 🎉
- [Markdown Server](https://github.com/test/markdown) - Uses \`code\` and **bold** text
`;

      (axios.get as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('README.md')) {
          return Promise.resolve({ data: mockReadmeContent });
        }
        return Promise.resolve({ data: [] });
      });

      // Act: Parse third-party servers
      const servers = discoveryService['parseThirdPartyServersFromReadme'](mockReadmeContent);

      // Assert: Special characters preserved
      const specialServer = servers.find(s => s.name === 'Special Server');
      expect(specialServer?.description).toContain('&');
      expect(specialServer?.description).toContain('<data>');
      expect(specialServer?.description).toContain('"quotes"');

      const unicodeServer = servers.find(s => s.name === 'Unicode Server');
      expect(unicodeServer?.description).toContain('支持中文');
      expect(unicodeServer?.description).toContain('émojis');
      expect(unicodeServer?.description).toContain('🎉');

      const markdownServer = servers.find(s => s.name === 'Markdown Server');
      expect(markdownServer?.description).toContain('`code`');
      expect(markdownServer?.description).toContain('**bold**');
    });

    it('should categorize servers based on description keywords', async () => {
      // Setup: Mock README with categorizable servers
      const mockReadmeContent = `
## Third-Party Servers

- [AI Assistant](https://github.com/test/ai) - OpenAI GPT integration for chat
- [Git Tools](https://github.com/test/git) - GitHub and GitLab development tools
- [PostgreSQL Server](https://github.com/test/pg) - Database connection for analytics
- [Slack Integration](https://github.com/test/slack) - Communication and notifications
- [File Manager](https://github.com/test/files) - Filesystem and cloud storage
- [Auth Service](https://github.com/test/auth) - Authentication and security tokens
- [Generic Server](https://github.com/test/generic) - Some basic functionality
`;

      (axios.get as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('README.md')) {
          return Promise.resolve({ data: mockReadmeContent });
        }
        return Promise.resolve({ data: [] });
      });

      // Act: Parse servers
      const servers = discoveryService['parseThirdPartyServersFromReadme'](mockReadmeContent);

      // Assert: Proper categorization based on keywords
      const aiServer = servers.find(s => s.name === 'AI Assistant');
      expect(aiServer?.category).toContain('AI & Language Models');

      const gitServer = servers.find(s => s.name === 'Git Tools');
      expect(gitServer?.category).toContain('Development Tools');

      const dbServer = servers.find(s => s.name === 'PostgreSQL Server');
      expect(dbServer?.category).toContain('Data & Analytics');

      const slackServer = servers.find(s => s.name === 'Slack Integration');
      expect(slackServer?.category).toContain('Communication');

      const fileServer = servers.find(s => s.name === 'File Manager');
      expect(fileServer?.category).toContain('File Management');

      const authServer = servers.find(s => s.name === 'Auth Service');
      expect(authServer?.category).toContain('Security');

      const genericServer = servers.find(s => s.name === 'Generic Server');
      expect(genericServer?.category).toContain('Other');
    });
  });

  describe('Catalog Transformation', () => {
    it('should transform API response to catalog format with descriptions', () => {
      // Setup: Mock API response
      const apiResponse = {
        servers: [
          {
            name: 'test-server',
            description: 'A test server for testing',
            status: 'active',
            version: '1.0.0',
            packages: [
              { registry_type: 'npm', identifier: '@test/server' }
            ],
            repository: { url: 'https://github.com/test/server' },
            _meta: {
              'io.modelcontextprotocol.registry/official': {
                id: 'test-123',
                updated_at: '2025-01-20T10:00:00Z'
              }
            }
          },
          {
            name: 'no-description-server',
            status: 'active',
            packages: []
          }
        ]
      };

      // Act: Transform response
      const catalog = discoveryService['transformAPIResponse'](apiResponse);

      // Assert: Descriptions handled correctly
      expect(catalog.servers[0].description).toBe('A test server for testing');
      expect(catalog.servers[1].description).toBe('No description available');
    });

    it('should filter out inactive servers', () => {
      // Setup: Mix of active and inactive servers
      const apiResponse = {
        servers: [
          { name: 'active-1', status: 'active', description: 'Active server' },
          { name: 'inactive-1', status: 'deprecated', description: 'Old server' },
          { name: 'active-2', status: 'active', description: 'Another active' },
          { name: 'inactive-2', status: 'disabled', description: 'Disabled server' }
        ]
      };

      // Act: Transform response
      const catalog = discoveryService['transformAPIResponse'](apiResponse);

      // Assert: Only active servers included
      expect(catalog.servers).toHaveLength(2);
      expect(catalog.servers.find(s => s.name === 'active-1')).toBeTruthy();
      expect(catalog.servers.find(s => s.name === 'active-2')).toBeTruthy();
      expect(catalog.servers.find(s => s.name === 'inactive-1')).toBeFalsy();
      expect(catalog.servers.find(s => s.name === 'inactive-2')).toBeFalsy();
    });
  });

  describe('Caching and Performance', () => {
    it('should cache catalog to reduce API calls', async () => {
      // Setup: Mock successful API response
      const mockCatalog = {
        servers: [
          { name: 'server1', description: 'Test server', status: 'active' }
        ]
      };

      (axios.get as jest.Mock).mockResolvedValue({ data: mockCatalog });

      // Act: Fetch catalog multiple times
      const catalog1 = await discoveryService.fetchCatalog();
      const catalog2 = await discoveryService.fetchCatalog();
      const catalog3 = await discoveryService.fetchCatalog();

      // Assert: API called only once due to caching
      expect(axios.get).toHaveBeenCalledTimes(1);
      expect(catalog1).toEqual(catalog2);
      expect(catalog2).toEqual(catalog3);
    });

    it('should force refresh when requested', async () => {
      // Setup: Mock changing API responses
      const firstResponse = {
        servers: [{ name: 'server1', description: 'Version 1', status: 'active' }]
      };
      const secondResponse = {
        servers: [{ name: 'server1', description: 'Version 2', status: 'active' }]
      };

      (axios.get as jest.Mock)
        .mockResolvedValueOnce({ data: firstResponse })
        .mockResolvedValueOnce({ data: secondResponse });

      // Act: Fetch with and without force refresh
      const catalog1 = await discoveryService.fetchCatalog();
      const catalog2 = await discoveryService.fetchCatalog(false); // Should use cache
      const catalog3 = await discoveryService.fetchCatalog(true);  // Force refresh

      // Assert: Force refresh bypasses cache
      expect(axios.get).toHaveBeenCalledTimes(2);
      expect(catalog1.servers[0].description).toContain('Version 1');
      expect(catalog2.servers[0].description).toContain('Version 1'); // Cached
      expect(catalog3.servers[0].description).toContain('Version 2'); // Refreshed
    });

    it('should save and load catalog from disk cache', async () => {
      // Setup: Mock file operations
      let savedCatalog: any = null;
      (fs.writeJson as jest.Mock).mockImplementation((path, data) => {
        savedCatalog = data;
        return Promise.resolve();
      });
      (fs.readJson as jest.Mock).mockImplementation(() => Promise.resolve(savedCatalog));
      (fs.pathExists as jest.Mock).mockResolvedValue(true);

      const mockCatalog = {
        version: '1.0.0',
        lastUpdated: new Date(),
        categories: ['Test'],
        servers: [
          { id: 'test', name: 'Test Server', description: 'Cached server' }
        ]
      };

      // Act: Save and load catalog
      await discoveryService['saveCatalogCache'](mockCatalog);
      const loaded = await discoveryService['loadCatalogCache']();

      // Assert: Catalog persisted correctly
      expect(fs.writeJson).toHaveBeenCalled();
      expect(loaded).toEqual(mockCatalog);
      expect(loaded?.servers[0].description).toBe('Cached server');
    });

    it('should use disk cache when API fails', async () => {
      // Setup: API fails, disk cache available
      const cachedCatalog = {
        version: '1.0.0',
        lastUpdated: new Date('2025-01-19T10:00:00Z'),
        categories: ['Cached'],
        servers: [
          { id: 'cached', name: 'Cached Server', description: 'From disk cache' }
        ]
      };

      (axios.get as jest.Mock).mockRejectedValue(new Error('Network error'));
      (fs.pathExists as jest.Mock).mockResolvedValue(true);
      (fs.readJson as jest.Mock).mockResolvedValue(cachedCatalog);

      // Act: Fetch catalog (should fallback to cache)
      const catalog = await discoveryService.fetchCatalog();

      // Assert: Disk cache used
      expect(catalog.servers[0].description).toBe('From disk cache');
      expect(fs.readJson).toHaveBeenCalled();
    });
  });
});