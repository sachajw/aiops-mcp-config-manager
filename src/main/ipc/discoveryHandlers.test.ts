import { ipcMain, BrowserWindow } from 'electron';
import { registerDiscoveryHandlers } from './discoveryHandlers';
import { McpDiscoveryService } from '../services/McpDiscoveryService';

// Mock electron modules
jest.mock('electron', () => ({
  ipcMain: {
    handle: jest.fn(),
  },
  BrowserWindow: {
    getAllWindows: jest.fn(() => []),
  },
}));

// Mock the discovery service
jest.mock('../services/McpDiscoveryService');

describe('Discovery IPC Handlers', () => {
  let mockDiscoveryService: jest.Mocked<McpDiscoveryService>;
  const mockHandlers: Map<string, Function> = new Map();

  beforeEach(() => {
    jest.clearAllMocks();
    mockHandlers.clear();

    // Mock ipcMain.handle to store handlers
    (ipcMain.handle as jest.Mock).mockImplementation((channel: string, handler: Function) => {
      mockHandlers.set(channel, handler);
    });

    // Create mock discovery service with all methods
    mockDiscoveryService = {
      fetchCatalog: jest.fn().mockResolvedValue({ servers: [], categories: [], lastUpdated: new Date().toISOString() }),
      getInstalledServers: jest.fn().mockReturnValue([]),
      isServerInstalled: jest.fn().mockReturnValue(false),
      installServer: jest.fn().mockResolvedValue(undefined),
      uninstallServer: jest.fn().mockResolvedValue(undefined),
      getInstallationState: jest.fn().mockReturnValue(undefined),
      getSettings: jest.fn().mockReturnValue({ catalogUrl: 'https://example.com', installLocation: '~/.mcp/servers' }),
      getInstallationLogs: jest.fn().mockReturnValue([]),
    } as any;

    // Mock the constructor to always return the same instance
    (McpDiscoveryService as jest.Mock).mockImplementation(() => mockDiscoveryService);

    // Register handlers
    registerDiscoveryHandlers();
  });

  describe('Handler Registration', () => {
    it('should register all expected IPC handlers', () => {
      expect(mockHandlers.has('discovery:fetchCatalog')).toBe(true);
      expect(mockHandlers.has('discovery:getInstalledServers')).toBe(true);
      expect(mockHandlers.has('discovery:isServerInstalled')).toBe(true);
      expect(mockHandlers.has('discovery:installServer')).toBe(true);
      expect(mockHandlers.has('discovery:uninstallServer')).toBe(true);
      expect(mockHandlers.has('discovery:getInstallationState')).toBe(true);
      expect(mockHandlers.has('discovery:updateSettings')).toBe(true);
      expect(mockHandlers.has('discovery:getSettings')).toBe(true);
      expect(mockHandlers.has('discovery:getInstallationLogs')).toBe(true);
    });
  });

  describe('discovery:fetchCatalog', () => {
    it('should fetch catalog with default parameters', async () => {
      const mockCatalog = { servers: [], categories: [], lastUpdated: new Date().toISOString() };
      mockDiscoveryService.fetchCatalog.mockResolvedValue(mockCatalog);

      const handler = mockHandlers.get('discovery:fetchCatalog');
      const result = await handler({}, false);

      expect(mockDiscoveryService.fetchCatalog).toHaveBeenCalledWith(false);
      expect(result).toBe(mockCatalog);
    });

    it('should force refresh when requested', async () => {
      const mockCatalog = { servers: [], categories: [], lastUpdated: new Date().toISOString() };
      mockDiscoveryService.fetchCatalog.mockResolvedValue(mockCatalog);

      const handler = mockHandlers.get('discovery:fetchCatalog');
      await handler({}, true);

      expect(mockDiscoveryService.fetchCatalog).toHaveBeenCalledWith(true);
    });

    it('should recreate service with new settings', async () => {
      const newSettings = { catalogUrl: 'https://new.url', installLocation: '~/new-location' };
      const mockCatalog = { servers: [], categories: [], lastUpdated: new Date().toISOString() };
      mockDiscoveryService.fetchCatalog.mockResolvedValue(mockCatalog);

      const handler = mockHandlers.get('discovery:fetchCatalog');
      await handler({}, false, newSettings);

      expect(McpDiscoveryService).toHaveBeenCalledWith(newSettings);
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Failed to fetch catalog');
      mockDiscoveryService.fetchCatalog.mockRejectedValue(error);

      const handler = mockHandlers.get('discovery:fetchCatalog');

      await expect(handler({}, false)).rejects.toThrow('Failed to fetch catalog');
    });
  });

  describe('discovery:getInstalledServers', () => {
    it('should return installed servers', async () => {
      const mockServers = [
        { id: 'server1', name: 'Server 1', installedAt: new Date().toISOString() },
        { id: 'server2', name: 'Server 2', installedAt: new Date().toISOString() }
      ];
      mockDiscoveryService.getInstalledServers.mockReturnValue(mockServers);

      const handler = mockHandlers.get('discovery:getInstalledServers');
      const result = await handler({});

      expect(mockDiscoveryService.getInstalledServers).toHaveBeenCalled();
      expect(result).toBe(mockServers);
    });
  });

  describe('discovery:isServerInstalled', () => {
    it('should check if server is installed', async () => {
      mockDiscoveryService.isServerInstalled.mockReturnValue(true);

      const handler = mockHandlers.get('discovery:isServerInstalled');
      const result = await handler({}, 'server1');

      expect(mockDiscoveryService.isServerInstalled).toHaveBeenCalledWith('server1');
      expect(result).toBe(true);
    });

    it('should return false for non-installed server', async () => {
      mockDiscoveryService.isServerInstalled.mockReturnValue(false);

      const handler = mockHandlers.get('discovery:isServerInstalled');
      const result = await handler({}, 'server-not-installed');

      expect(result).toBe(false);
    });
  });

  describe('discovery:installServer', () => {
    it('should install server successfully', async () => {
      mockDiscoveryService.installServer.mockResolvedValue(undefined);

      const handler = mockHandlers.get('discovery:installServer');
      await handler({}, 'server1');

      expect(mockDiscoveryService.installServer).toHaveBeenCalledWith('server1');
    });

    it('should handle installation errors', async () => {
      const error = new Error('Installation failed');
      mockDiscoveryService.installServer.mockRejectedValue(error);

      const handler = mockHandlers.get('discovery:installServer');

      await expect(handler({}, 'server1')).rejects.toThrow('Installation failed');
    });
  });

  describe('discovery:uninstallServer', () => {
    it('should uninstall server successfully', async () => {
      mockDiscoveryService.uninstallServer.mockResolvedValue(undefined);

      const handler = mockHandlers.get('discovery:uninstallServer');
      await handler({}, 'server1');

      expect(mockDiscoveryService.uninstallServer).toHaveBeenCalledWith('server1');
    });

    it('should handle uninstallation errors', async () => {
      const error = new Error('Uninstallation failed');
      mockDiscoveryService.uninstallServer.mockRejectedValue(error);

      const handler = mockHandlers.get('discovery:uninstallServer');

      await expect(handler({}, 'server1')).rejects.toThrow('Uninstallation failed');
    });
  });

  describe('discovery:getInstallationState', () => {
    it('should return installation state', async () => {
      const mockState = { status: 'installing', progress: 50 };
      mockDiscoveryService.getInstallationState.mockReturnValue(mockState);

      const handler = mockHandlers.get('discovery:getInstallationState');
      const result = await handler({}, 'server1');

      expect(mockDiscoveryService.getInstallationState).toHaveBeenCalledWith('server1');
      expect(result).toBe(mockState);
    });

    it('should return undefined for server without state', async () => {
      mockDiscoveryService.getInstallationState.mockReturnValue(undefined);

      const handler = mockHandlers.get('discovery:getInstallationState');
      const result = await handler({}, 'server-no-state');

      expect(result).toBeUndefined();
    });
  });

  describe('discovery:updateSettings', () => {
    it('should update settings and recreate service', async () => {
      const newSettings = { catalogUrl: 'https://updated.url' };

      const handler = mockHandlers.get('discovery:updateSettings');
      await handler({}, newSettings);

      expect(McpDiscoveryService).toHaveBeenCalledWith(newSettings);
    });

    it('should handle settings update errors', async () => {
      const newSettings = { catalogUrl: 'invalid' };
      (McpDiscoveryService as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid settings');
      });

      const handler = mockHandlers.get('discovery:updateSettings');

      await expect(handler({}, newSettings)).rejects.toThrow('Invalid settings');
    });
  });

  describe('discovery:getSettings', () => {
    it('should return current settings', async () => {
      const mockSettings = {
        catalogUrl: 'https://example.com',
        installLocation: '~/.mcp/servers'
      };
      mockDiscoveryService.getSettings.mockReturnValue(mockSettings);

      const handler = mockHandlers.get('discovery:getSettings');
      const result = await handler({});

      expect(mockDiscoveryService.getSettings).toHaveBeenCalled();
      expect(result).toBe(mockSettings);
    });
  });

  describe('discovery:getInstallationLogs', () => {
    it('should return installation logs for server', async () => {
      const mockLogs = [
        'Installing dependencies...',
        'npm install completed',
        'Server ready'
      ];
      mockDiscoveryService.getInstallationLogs.mockReturnValue(mockLogs);

      const handler = mockHandlers.get('discovery:getInstallationLogs');
      const result = await handler({}, 'server1');

      expect(mockDiscoveryService.getInstallationLogs).toHaveBeenCalledWith('server1');
      expect(result).toBe(mockLogs);
    });

    it('should return empty array for server without logs', async () => {
      mockDiscoveryService.getInstallationLogs.mockReturnValue([]);

      const handler = mockHandlers.get('discovery:getInstallationLogs');
      const result = await handler({}, 'server-no-logs');

      expect(result).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    it('should log and throw errors for all handlers', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const error = new Error('Service error');

      // Test each handler's error handling
      const handlers = [
        'discovery:fetchCatalog',
        'discovery:getInstalledServers',
        'discovery:isServerInstalled',
        'discovery:installServer',
        'discovery:uninstallServer',
        'discovery:getInstallationState',
        'discovery:getSettings',
        'discovery:getInstallationLogs'
      ];

      for (const handlerName of handlers) {
        mockDiscoveryService[handlerName.split(':')[1]] = jest.fn().mockRejectedValue(error);

        const handler = mockHandlers.get(handlerName);
        await expect(handler({}, 'test-param')).rejects.toThrow('Service error');

        expect(consoleSpy).toHaveBeenCalled();
      }

      consoleSpy.mockRestore();
    });
  });

  describe('Service Singleton', () => {
    it('should reuse existing service instance', async () => {
      // Call multiple handlers
      await mockHandlers.get('discovery:getSettings')({});
      await mockHandlers.get('discovery:getInstalledServers')({});

      // Should only create service once
      expect(McpDiscoveryService).toHaveBeenCalledTimes(1);
    });

    it('should recreate service when settings change', async () => {
      const newSettings = { catalogUrl: 'https://new.url' };

      await mockHandlers.get('discovery:getSettings')({});
      await mockHandlers.get('discovery:updateSettings')({}, newSettings);

      // Should create service twice (initial + update)
      expect(McpDiscoveryService).toHaveBeenCalledTimes(2);
    });
  });
});