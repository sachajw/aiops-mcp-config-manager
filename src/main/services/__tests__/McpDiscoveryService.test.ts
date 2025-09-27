import { McpDiscoveryService } from '../McpDiscoveryService';
import axios from 'axios';
import * as fs from 'fs-extra';
import { app, BrowserWindow } from 'electron';
import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import {
  McpServerEntry,
  InstallationState,
  InstalledServer,
  McpDiscoverySettings,
  DEFAULT_MCP_DISCOVERY_SETTINGS
} from '../../../shared/types/mcp-discovery';

// Mock dependencies
jest.mock('axios');
jest.mock('fs-extra');
jest.mock('child_process');
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn()
  },
  BrowserWindow: {
    getAllWindows: jest.fn(() => []),
    fromWebContents: jest.fn()
  }
}));

describe('McpDiscoveryService', () => {
  let discoveryService: McpDiscoveryService;
  let mockAxios: jest.Mocked<typeof axios>;
  let mockSpawn: jest.MockedFunction<typeof spawn>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Electron app
    (app.getPath as jest.Mock).mockReturnValue('/mock/user/data');

    // Mock fs operations
    (fs.pathExists as jest.Mock).mockResolvedValue(false);
    (fs.readJson as jest.Mock).mockResolvedValue({});
    (fs.writeJson as jest.Mock).mockResolvedValue(undefined);
    (fs.ensureDir as jest.Mock).mockResolvedValue(undefined);

    // Mock axios
    mockAxios = axios as jest.Mocked<typeof axios>;

    // Mock spawn
    mockSpawn = spawn as jest.MockedFunction<typeof spawn>;
    const mockProcess = new EventEmitter() as any;
    mockProcess.stdout = new EventEmitter();
    mockProcess.stderr = new EventEmitter();
    mockProcess.kill = jest.fn();
    mockSpawn.mockReturnValue(mockProcess);

    discoveryService = new McpDiscoveryService();
  });

  describe('constructor and settings', () => {
    it('should initialize with default settings', () => {
      const settings = discoveryService.getSettings();
      expect(settings).toEqual(DEFAULT_MCP_DISCOVERY_SETTINGS);
    });

    it('should initialize with custom settings', () => {
      const customSettings: Partial<McpDiscoverySettings> = {
        cacheTimeout: 3600000, // 1 hour
        catalogUrl: 'https://custom.api.com/servers'
      };

      const service = new McpDiscoveryService(customSettings);
      const settings = service.getSettings();

      expect(settings.cacheTimeout).toBe(3600000);
      expect(settings.catalogUrl).toBe('https://custom.api.com/servers');
      // Other settings should be defaults
      expect(settings.githubFallback).toBe(DEFAULT_MCP_DISCOVERY_SETTINGS.githubFallback);
    });

    it('should load installed servers on initialization', () => {
      expect(fs.pathExists).toHaveBeenCalledWith(
        expect.stringContaining('installed-servers.json')
      );
    });
  });

  describe('fetchCatalogFromAPI', () => {
    it('should fetch catalog from configured API endpoint', async () => {
      const mockApiResponse = {
        version: '1.0.0',
        servers: [
          {
            name: 'test-server',
            description: 'A test server',
            status: 'active',
            packages: [{ registry_type: 'npm', identifier: '@test/server' }]
          }
        ]
      };

      mockAxios.get.mockResolvedValue({ data: mockApiResponse });

      const result = await discoveryService.fetchCatalogFromAPI();

      expect(mockAxios.get).toHaveBeenCalledWith(DEFAULT_MCP_DISCOVERY_SETTINGS.catalogUrl);
      expect(result).toEqual(mockApiResponse);
    });

    it('should handle API errors gracefully', async () => {
      mockAxios.get.mockRejectedValue(new Error('Network error'));

      await expect(discoveryService.fetchCatalogFromAPI())
        .rejects.toThrow('Network error');
    });

    it('should support force refresh parameter', async () => {
      const mockResponse = { servers: [] };
      mockAxios.get.mockResolvedValue({ data: mockResponse });

      await discoveryService.fetchCatalogFromAPI(true);

      expect(mockAxios.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('fetchCatalogFromGitHub', () => {
    it('should fetch official servers from GitHub', async () => {
      // Mock GitHub API responses
      const mockDirsResponse = [
        { name: 'filesystem', type: 'dir' },
        { name: 'github', type: 'dir' },
        { name: 'not-a-directory', type: 'file' }
      ];

      const mockReadmeResponse = `
# MCP Servers

A collection of reference MCP servers

## 🤝 Third-Party Servers

- [Awesome Server](https://github.com/user/awesome) - Does awesome things
- [Database Server](https://github.com/org/db) - Connects to databases
`;

      mockAxios.get.mockImplementation((url: string) => {
        if (url.includes('api.github.com/repos/modelcontextprotocol/servers/contents/src')) {
          return Promise.resolve({ data: mockDirsResponse });
        }
        if (url.includes('README.md')) {
          return Promise.resolve({ data: mockReadmeResponse });
        }
        if (url.includes('package.json')) {
          return Promise.resolve({
            data: JSON.stringify({ name: '@modelcontextprotocol/server-filesystem' })
          });
        }
        return Promise.reject(new Error('Not found'));
      });

      const catalog = await discoveryService.fetchCatalogFromGitHub();

      expect(catalog).toBeDefined();
      expect(catalog.servers).toBeDefined();
      expect(Array.isArray(catalog.servers)).toBe(true);

      // Should include official servers
      const filesystemServer = catalog.servers.find(s => s.name.includes('filesystem'));
      expect(filesystemServer).toBeDefined();

      // Should include third-party servers
      const awesomeServer = catalog.servers.find(s => s.name === 'Awesome Server');
      expect(awesomeServer).toBeDefined();
      expect(awesomeServer?.description).toBe('Does awesome things');
    });

    it('should handle GitHub API errors', async () => {
      mockAxios.get.mockRejectedValue(new Error('GitHub API rate limit'));

      await expect(discoveryService.fetchCatalogFromGitHub())
        .rejects.toThrow('GitHub API rate limit');
    });

    it('should categorize servers correctly', async () => {
      const mockReadmeResponse = `
## Third-Party Servers

- [AI Assistant](https://github.com/test/ai) - OpenAI integration for chat
- [Database Tool](https://github.com/test/db) - PostgreSQL connection
- [File Manager](https://github.com/test/files) - Filesystem operations
- [Security Tool](https://github.com/test/auth) - Authentication service
`;

      mockAxios.get.mockImplementation((url: string) => {
        if (url.includes('README.md')) {
          return Promise.resolve({ data: mockReadmeResponse });
        }
        return Promise.resolve({ data: [] });
      });

      const catalog = await discoveryService.fetchCatalogFromGitHub();

      const aiServer = catalog.servers.find(s => s.name === 'AI Assistant');
      expect(aiServer?.category).toBe('AI & Language Models');

      const dbServer = catalog.servers.find(s => s.name === 'Database Tool');
      expect(dbServer?.category).toBe('Data & Analytics');

      const fileServer = catalog.servers.find(s => s.name === 'File Manager');
      expect(fileServer?.category).toBe('File Management');

      const authServer = catalog.servers.find(s => s.name === 'Security Tool');
      expect(authServer?.category).toBe('Security');
    });
  });

  describe('installServer', () => {
    beforeEach(() => {
      // Mock successful installation by default
      const mockProcess = mockSpawn.mockReturnValue({
        stdout: new EventEmitter(),
        stderr: new EventEmitter(),
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(() => callback(0), 10); // Success
          }
        }),
        kill: jest.fn()
      } as any);
    });

    it('should install npm packages', async () => {
      const server: McpServerEntry = {
        id: 'test-server',
        name: 'Test Server',
        description: 'A test server',
        status: 'active',
        version: '1.0.0',
        category: 'Other',
        packages: [{
          registry_type: 'npm',
          identifier: '@test/mcp-server',
          version: '1.0.0',
          transport: { type: 'stdio' }
        }],
        repository: {
          url: 'https://github.com/test/server',
          source: 'github'
        }
      };

      const result = await discoveryService.installServer(server);

      expect(result.success).toBe(true);
      expect(mockSpawn).toHaveBeenCalledWith(
        'npm',
        expect.arrayContaining(['install', '-g', '@test/mcp-server']),
        expect.any(Object)
      );
    });

    it('should install pip packages', async () => {
      const server: McpServerEntry = {
        id: 'python-server',
        name: 'Python Server',
        description: 'A Python server',
        status: 'active',
        version: '1.0.0',
        category: 'Other',
        packages: [{
          registry_type: 'pypi',
          identifier: 'mcp-server-python',
          version: '1.0.0',
          transport: { type: 'stdio' }
        }],
        repository: {
          url: 'https://github.com/test/python-server',
          source: 'github'
        }
      };

      const result = await discoveryService.installServer(server);

      expect(result.success).toBe(true);
      expect(mockSpawn).toHaveBeenCalledWith(
        'pip',
        expect.arrayContaining(['install', 'mcp-server-python']),
        expect.any(Object)
      );
    });

    it('should handle installation failures', async () => {
      // Mock installation failure
      mockSpawn.mockReturnValue({
        stdout: new EventEmitter(),
        stderr: new EventEmitter(),
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(() => callback(1), 10); // Failure
          }
        }),
        kill: jest.fn()
      } as any);

      const server: McpServerEntry = {
        id: 'failing-server',
        name: 'Failing Server',
        description: 'A server that fails to install',
        status: 'active',
        version: '1.0.0',
        category: 'Other',
        packages: [{
          registry_type: 'npm',
          identifier: 'nonexistent-package',
          version: '1.0.0',
          transport: { type: 'stdio' }
        }],
        repository: {
          url: 'https://github.com/test/failing',
          source: 'github'
        }
      };

      const result = await discoveryService.installServer(server);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should track installation progress', async () => {
      const server: McpServerEntry = {
        id: 'progress-server',
        name: 'Progress Server',
        description: 'Track installation progress',
        status: 'active',
        version: '1.0.0',
        category: 'Other',
        packages: [{
          registry_type: 'npm',
          identifier: '@test/progress',
          version: '1.0.0',
          transport: { type: 'stdio' }
        }],
        repository: {
          url: 'https://github.com/test/progress',
          source: 'github'
        }
      };

      // Start installation (don't await)
      const installPromise = discoveryService.installServer(server);

      // Check installation state is tracked
      const state = discoveryService.getInstallationState(server.id);
      expect(state).toBeDefined();
      expect([InstallationState.INSTALLING, InstallationState.PENDING])
        .toContain(state);

      // Wait for completion
      await installPromise;

      // Check final state
      const finalState = discoveryService.getInstallationState(server.id);
      expect(finalState).toBe(InstallationState.INSTALLED);
    });

    it('should stream installation logs', async () => {
      const server: McpServerEntry = {
        id: 'log-server',
        name: 'Log Server',
        description: 'Server with installation logs',
        status: 'active',
        version: '1.0.0',
        category: 'Other',
        packages: [{
          registry_type: 'npm',
          identifier: '@test/logger',
          version: '1.0.0',
          transport: { type: 'stdio' }
        }],
        repository: {
          url: 'https://github.com/test/logger',
          source: 'github'
        }
      };

      // Mock process with output
      const mockProcess = {
        stdout: new EventEmitter(),
        stderr: new EventEmitter(),
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(() => callback(0), 50);
          }
        }),
        kill: jest.fn()
      };

      mockSpawn.mockReturnValue(mockProcess as any);

      // Start installation
      const installPromise = discoveryService.installServer(server);

      // Simulate installation output
      setTimeout(() => {
        mockProcess.stdout.emit('data', 'Installing package...\n');
        mockProcess.stdout.emit('data', 'Download complete\n');
        mockProcess.stdout.emit('data', 'Installation finished\n');
      }, 10);

      await installPromise;

      // Check logs were captured
      const logs = discoveryService.getInstallationLogs(server.id);
      expect(logs).toBeDefined();
      expect(logs.some(log => log.includes('Installing package'))).toBe(true);
      expect(logs.some(log => log.includes('Installation finished'))).toBe(true);
    });
  });

  describe('uninstallServer', () => {
    beforeEach(() => {
      // Add a mock installed server
      const mockInstalled: InstalledServer = {
        id: 'installed-server',
        name: 'Installed Server',
        version: '1.0.0',
        installDate: new Date(),
        packageType: 'npm',
        packageIdentifier: '@test/installed'
      };

      (discoveryService as any).installedServers.set('installed-server', mockInstalled);
    });

    it('should uninstall npm packages', async () => {
      // Mock successful uninstall
      mockSpawn.mockReturnValue({
        stdout: new EventEmitter(),
        stderr: new EventEmitter(),
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(() => callback(0), 10);
          }
        }),
        kill: jest.fn()
      } as any);

      const result = await discoveryService.uninstallServer('installed-server');

      expect(result.success).toBe(true);
      expect(mockSpawn).toHaveBeenCalledWith(
        'npm',
        expect.arrayContaining(['uninstall', '-g', '@test/installed']),
        expect.any(Object)
      );
    });

    it('should handle uninstall of non-existent server', async () => {
      const result = await discoveryService.uninstallServer('nonexistent-server');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not installed');
    });

    it('should remove server from installed list', async () => {
      // Mock successful uninstall
      mockSpawn.mockReturnValue({
        stdout: new EventEmitter(),
        stderr: new EventEmitter(),
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(() => callback(0), 10);
          }
        }),
        kill: jest.fn()
      } as any);

      await discoveryService.uninstallServer('installed-server');

      const installedServers = discoveryService.getInstalledServers();
      expect(installedServers.find(s => s.id === 'installed-server')).toBeUndefined();
    });
  });

  describe('getInstallationState', () => {
    it('should return installation state for servers', () => {
      // Set installation state
      (discoveryService as any).installationStates.set('test-server', InstallationState.INSTALLING);

      const state = discoveryService.getInstallationState('test-server');
      expect(state).toBe(InstallationState.INSTALLING);
    });

    it('should return NOT_INSTALLED for unknown servers', () => {
      const state = discoveryService.getInstallationState('unknown-server');
      expect(state).toBe(InstallationState.NOT_INSTALLED);
    });
  });

  describe('getInstallationLogs', () => {
    it('should return installation logs for servers', () => {
      const logs = ['Log line 1', 'Log line 2', 'Log line 3'];
      (discoveryService as any).installationLogs.set('test-server', logs);

      const retrievedLogs = discoveryService.getInstallationLogs('test-server');
      expect(retrievedLogs).toEqual(logs);
    });

    it('should return empty array for servers without logs', () => {
      const logs = discoveryService.getInstallationLogs('unknown-server');
      expect(logs).toEqual([]);
    });
  });

  describe('getInstalledServers', () => {
    it('should return list of installed servers', () => {
      const server1: InstalledServer = {
        id: 'server1',
        name: 'Server 1',
        version: '1.0.0',
        installDate: new Date(),
        packageType: 'npm',
        packageIdentifier: '@test/server1'
      };

      const server2: InstalledServer = {
        id: 'server2',
        name: 'Server 2',
        version: '2.0.0',
        installDate: new Date(),
        packageType: 'pip',
        packageIdentifier: 'server2'
      };

      (discoveryService as any).installedServers.set('server1', server1);
      (discoveryService as any).installedServers.set('server2', server2);

      const installed = discoveryService.getInstalledServers();
      expect(installed).toHaveLength(2);
      expect(installed).toContainEqual(server1);
      expect(installed).toContainEqual(server2);
    });

    it('should return empty array when no servers installed', () => {
      const installed = discoveryService.getInstalledServers();
      expect(installed).toEqual([]);
    });
  });

  describe('isServerInstalled', () => {
    it('should return true for installed servers', () => {
      const server: InstalledServer = {
        id: 'test-server',
        name: 'Test Server',
        version: '1.0.0',
        installDate: new Date(),
        packageType: 'npm',
        packageIdentifier: '@test/server'
      };

      (discoveryService as any).installedServers.set('test-server', server);

      expect(discoveryService.isServerInstalled('test-server')).toBe(true);
    });

    it('should return false for non-installed servers', () => {
      expect(discoveryService.isServerInstalled('nonexistent-server')).toBe(false);
    });
  });

  describe('error handling and edge cases', () => {
    it('should handle malformed server data gracefully', async () => {
      const malformedServer = {
        id: 'malformed',
        // Missing required fields
      } as any;

      const result = await discoveryService.installServer(malformedServer);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle installation cancellation', async () => {
      const server: McpServerEntry = {
        id: 'cancel-server',
        name: 'Cancel Server',
        description: 'Server to be cancelled',
        status: 'active',
        version: '1.0.0',
        category: 'Other',
        packages: [{
          registry_type: 'npm',
          identifier: '@test/cancel',
          version: '1.0.0',
          transport: { type: 'stdio' }
        }],
        repository: {
          url: 'https://github.com/test/cancel',
          source: 'github'
        }
      };

      // Mock long-running process
      const mockProcess = {
        stdout: new EventEmitter(),
        stderr: new EventEmitter(),
        on: jest.fn(),
        kill: jest.fn()
      };

      mockSpawn.mockReturnValue(mockProcess as any);

      // Start installation
      const installPromise = discoveryService.installServer(server);

      // Cancel installation
      discoveryService.cancelInstallation(server.id);

      // Check process was killed
      expect(mockProcess.kill).toHaveBeenCalled();

      // Installation should still resolve
      const result = await installPromise;
      expect(result.success).toBe(false);
      expect(result.error).toContain('cancelled');
    });

    it('should handle file system errors during persistence', async () => {
      // Mock file system error
      (fs.writeJson as jest.Mock).mockRejectedValue(new Error('Disk full'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // This should not throw but log error
      await (discoveryService as any).saveInstalledServers();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to save installed servers'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should handle concurrent installations of same server', async () => {
      const server: McpServerEntry = {
        id: 'concurrent-server',
        name: 'Concurrent Server',
        description: 'Server installed concurrently',
        status: 'active',
        version: '1.0.0',
        category: 'Other',
        packages: [{
          registry_type: 'npm',
          identifier: '@test/concurrent',
          version: '1.0.0',
          transport: { type: 'stdio' }
        }],
        repository: {
          url: 'https://github.com/test/concurrent',
          source: 'github'
        }
      };

      // Start two installations simultaneously
      const promise1 = discoveryService.installServer(server);
      const promise2 = discoveryService.installServer(server);

      const results = await Promise.all([promise1, promise2]);

      // One should succeed, one should be skipped/failed
      const successCount = results.filter(r => r.success).length;
      expect(successCount).toBeLessThanOrEqual(1);
    });
  });

  describe('settings and configuration', () => {
    it('should update settings correctly', () => {
      const newSettings: Partial<McpDiscoverySettings> = {
        cacheTimeout: 1800000, // 30 minutes
        githubFallback: false
      };

      discoveryService.updateSettings(newSettings);

      const updatedSettings = discoveryService.getSettings();
      expect(updatedSettings.cacheTimeout).toBe(1800000);
      expect(updatedSettings.githubFallback).toBe(false);
      // Other settings should remain unchanged
      expect(updatedSettings.catalogUrl).toBe(DEFAULT_MCP_DISCOVERY_SETTINGS.catalogUrl);
    });

    it('should validate settings on update', () => {
      const invalidSettings = {
        cacheTimeout: -1000, // Invalid negative timeout
        catalogUrl: 'not-a-url'
      };

      expect(() => {
        discoveryService.updateSettings(invalidSettings);
      }).toThrow();
    });
  });
});