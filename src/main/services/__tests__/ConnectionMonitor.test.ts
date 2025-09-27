import { ConnectionMonitor, ConnectionStatus, ConnectionEvent } from '../ConnectionMonitor';
import MCPClient, { MCPServerConfig } from '../MCPClient';
import { EventEmitter } from 'events';

// Mock MCPClient
jest.mock('../MCPClient');

describe('ConnectionMonitor', () => {
  let connectionMonitor: ConnectionMonitor;
  let mockMCPClient: jest.Mocked<MCPClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Mock MCPClient constructor and methods
    mockMCPClient = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      isConnected: jest.fn(),
      ping: jest.fn(),
      getTools: jest.fn(),
      getResources: jest.fn(),
      sendRequest: jest.fn(),
      on: jest.fn(),
      emit: jest.fn(),
      removeAllListeners: jest.fn()
    } as any;

    (MCPClient as jest.MockedClass<typeof MCPClient>).mockImplementation(() => mockMCPClient);

    connectionMonitor = new ConnectionMonitor();
  });

  afterEach(async () => {
    jest.useRealTimers();
    await connectionMonitor.stopAll();
  });

  describe('startMonitoring', () => {
    it('should start monitoring a server successfully', async () => {
      const serverId = 'test-server';
      const serverName = 'Test Server';
      const command = 'node';
      const args = ['server.js'];

      mockMCPClient.connect.mockResolvedValue(undefined);
      mockMCPClient.isConnected.mockReturnValue(true);

      await connectionMonitor.startMonitoring(serverId, serverName, command, args);

      const status = connectionMonitor.getConnectionStatus(serverId);
      expect(status).toBeDefined();
      expect(status?.serverId).toBe(serverId);
      expect(status?.serverName).toBe(serverName);
      expect(status?.status).toBe('connecting');
    });

    it('should stop existing monitoring before starting new', async () => {
      const serverId = 'test-server';
      const serverName = 'Test Server';
      const command = 'node';

      mockMCPClient.connect.mockResolvedValue(undefined);
      mockMCPClient.disconnect.mockResolvedValue(undefined);

      // Start monitoring twice
      await connectionMonitor.startMonitoring(serverId, serverName, command);
      await connectionMonitor.startMonitoring(serverId, serverName, command);

      // Should have called disconnect to stop the previous monitoring
      expect(mockMCPClient.disconnect).toHaveBeenCalled();
    });

    it('should handle connection success', async () => {
      const serverId = 'test-server';
      const serverName = 'Test Server';
      const command = 'node';

      mockMCPClient.connect.mockResolvedValue(undefined);
      mockMCPClient.isConnected.mockReturnValue(true);

      await connectionMonitor.startMonitoring(serverId, serverName, command);

      // Manually trigger connection event by calling the handler
      if (mockMCPClient.on.mock.calls.length > 0) {
        const connectHandler = mockMCPClient.on.mock.calls.find(call => call[0] === 'connected')?.[1];
        if (connectHandler) connectHandler();
      }

      const status = connectionMonitor.getConnectionStatus(serverId);
      expect(status?.status).toBe('connected');
      expect(status?.connectedAt).toBeDefined();
    });

    it('should handle connection failure', async () => {
      const serverId = 'test-server';
      const serverName = 'Test Server';
      const command = 'invalid-command';

      mockMCPClient.connect.mockRejectedValue(new Error('Connection failed'));

      try {
        await connectionMonitor.startMonitoring(serverId, serverName, command);
      } catch (error) {
        // Connection failure is expected
      }

      const status = connectionMonitor.getConnectionStatus(serverId);
      expect(status?.status).toBe('error');
      expect(status?.errorCount).toBeGreaterThan(0);
    });

    it('should set up event listeners for MCP client', async () => {
      const serverId = 'test-server';
      const serverName = 'Test Server';
      const command = 'node';

      mockMCPClient.connect.mockResolvedValue(undefined);

      await connectionMonitor.startMonitoring(serverId, serverName, command);

      // Check that event listeners were set up
      expect(mockMCPClient.on).toHaveBeenCalledWith('connected', expect.any(Function));
      expect(mockMCPClient.on).toHaveBeenCalledWith('disconnected', expect.any(Function));
      expect(mockMCPClient.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should configure MCP client with correct parameters', async () => {
      const serverId = 'test-server';
      const serverName = 'Test Server';
      const command = 'python';
      const args = ['-m', 'server'];
      const env = { NODE_ENV: 'test' };
      const cwd = '/test/directory';

      mockMCPClient.connect.mockResolvedValue(undefined);

      await connectionMonitor.startMonitoring(serverId, serverName, command, args, env, cwd);

      // Check MCPClient was created with correct config
      expect(MCPClient).toHaveBeenCalledWith(expect.objectContaining({
        name: serverName,
        command,
        args,
        env,
        cwd
      }));
    });
  });

  describe('stopMonitoring', () => {
    it('should stop monitoring a server', async () => {
      const serverId = 'test-server';
      const serverName = 'Test Server';
      const command = 'node';

      mockMCPClient.connect.mockResolvedValue(undefined);
      mockMCPClient.disconnect.mockResolvedValue(undefined);

      // Start monitoring
      await connectionMonitor.startMonitoring(serverId, serverName, command);

      // Stop monitoring
      await connectionMonitor.stopMonitoring(serverId);

      expect(mockMCPClient.disconnect).toHaveBeenCalled();
      expect(connectionMonitor.getConnectionStatus(serverId)).toBeUndefined();
    });

    it('should clear ping interval when stopping', async () => {
      const serverId = 'test-server';
      const serverName = 'Test Server';
      const command = 'node';

      mockMCPClient.connect.mockResolvedValue(undefined);
      mockMCPClient.disconnect.mockResolvedValue(undefined);

      // Start monitoring
      await connectionMonitor.startMonitoring(serverId, serverName, command);

      // Check ping interval is set
      jest.advanceTimersByTime(30000); // PING_INTERVAL

      // Stop monitoring
      await connectionMonitor.stopMonitoring(serverId);

      // Ping interval should be cleared
      jest.advanceTimersByTime(30000);
      expect(mockMCPClient.ping).not.toHaveBeenCalled();
    });

    it('should handle stopping non-existent server gracefully', async () => {
      await expect(connectionMonitor.stopMonitoring('non-existent'))
        .resolves.not.toThrow();
    });
  });

  describe('getConnectionStatus', () => {
    it('should return connection status for existing server', async () => {
      const serverId = 'test-server';
      const serverName = 'Test Server';
      const command = 'node';

      mockMCPClient.connect.mockResolvedValue(undefined);

      await connectionMonitor.startMonitoring(serverId, serverName, command);

      const status = connectionMonitor.getConnectionStatus(serverId);
      expect(status).toBeDefined();
      expect(status?.serverId).toBe(serverId);
      expect(status?.serverName).toBe(serverName);
    });

    it('should return undefined for non-existent server', () => {
      const status = connectionMonitor.getConnectionStatus('non-existent');
      expect(status).toBeUndefined();
    });
  });

  describe('getAllConnectionStatuses', () => {
    it('should return all connection statuses', async () => {
      const servers = [
        { id: 'server1', name: 'Server 1', command: 'node' },
        { id: 'server2', name: 'Server 2', command: 'python' },
        { id: 'server3', name: 'Server 3', command: 'go' }
      ];

      mockMCPClient.connect.mockResolvedValue(undefined);

      // Start monitoring multiple servers
      for (const server of servers) {
        await connectionMonitor.startMonitoring(server.id, server.name, server.command);
      }

      const statuses = connectionMonitor.getAllConnectionStatuses();
      expect(statuses).toHaveLength(3);
      expect(statuses.map(s => s.serverId)).toEqual(
        expect.arrayContaining(['server1', 'server2', 'server3'])
      );
    });

    it('should return empty array when no servers monitored', () => {
      const statuses = connectionMonitor.getAllConnectionStatuses();
      expect(statuses).toEqual([]);
    });
  });

  describe('getConnectedCount', () => {
    it('should return count of connected servers', async () => {
      const servers = [
        { id: 'server1', name: 'Server 1', command: 'node' },
        { id: 'server2', name: 'Server 2', command: 'python' }
      ];

      mockMCPClient.connect.mockResolvedValue(undefined);
      mockMCPClient.isConnected.mockReturnValue(true);

      // Start monitoring servers
      for (const server of servers) {
        await connectionMonitor.startMonitoring(server.id, server.name, server.command);
      }

      // Simulate successful connections
      for (const server of servers) {
        const status = connectionMonitor.getConnectionStatus(server.id);
        if (status) {
          (status as any).status = 'connected';
        }
      }

      const connectedCount = connectionMonitor.getConnectedCount();
      expect(connectedCount).toBe(2);
    });

    it('should return 0 when no servers connected', () => {
      const connectedCount = connectionMonitor.getConnectedCount();
      expect(connectedCount).toBe(0);
    });
  });

  describe('getAverageResponseTime', () => {
    it('should calculate average response time for connected servers', async () => {
      const servers = [
        { id: 'server1', name: 'Server 1', command: 'node' },
        { id: 'server2', name: 'Server 2', command: 'python' },
        { id: 'server3', name: 'Server 3', command: 'go' }
      ];

      mockMCPClient.connect.mockResolvedValue(undefined);

      // Start monitoring servers
      for (const server of servers) {
        await connectionMonitor.startMonitoring(server.id, server.name, server.command);
      }

      // Set response times for connected servers
      const responseTimes = [100, 200, 300];
      servers.forEach((server, index) => {
        const status = connectionMonitor.getConnectionStatus(server.id);
        if (status) {
          (status as any).status = 'connected';
          (status as any).responseTime = responseTimes[index];
        }
      });

      const averageTime = connectionMonitor.getAverageResponseTime();
      expect(averageTime).toBe(200); // (100 + 200 + 300) / 3
    });

    it('should return 0 when no servers connected', () => {
      const averageTime = connectionMonitor.getAverageResponseTime();
      expect(averageTime).toBe(0);
    });

    it('should ignore disconnected servers in calculation', async () => {
      const servers = [
        { id: 'server1', name: 'Server 1', command: 'node' },
        { id: 'server2', name: 'Server 2', command: 'python' }
      ];

      mockMCPClient.connect.mockResolvedValue(undefined);

      for (const server of servers) {
        await connectionMonitor.startMonitoring(server.id, server.name, server.command);
      }

      // Set one connected, one disconnected
      const status1 = connectionMonitor.getConnectionStatus('server1');
      const status2 = connectionMonitor.getConnectionStatus('server2');

      if (status1) {
        (status1 as any).status = 'connected';
        (status1 as any).responseTime = 150;
      }
      if (status2) {
        (status2 as any).status = 'disconnected';
        (status2 as any).responseTime = 500; // Should be ignored
      }

      const averageTime = connectionMonitor.getAverageResponseTime();
      expect(averageTime).toBe(150); // Only connected server counted
    });
  });

  describe('getRealMetrics', () => {
    it('should return real metrics for a connected server', async () => {
      const serverId = 'test-server';
      const serverName = 'Test Server';
      const command = 'node';

      mockMCPClient.connect.mockResolvedValue(undefined);
      mockMCPClient.getTools.mockResolvedValue(['tool1', 'tool2', 'tool3']);
      mockMCPClient.getResources.mockResolvedValue(['resource1', 'resource2']);

      await connectionMonitor.startMonitoring(serverId, serverName, command);

      const metrics = connectionMonitor.getRealMetrics(serverId);

      expect(metrics).toBeDefined();
      if (metrics) {
        expect(metrics.toolCount).toBe(3);
        expect(metrics.resourceCount).toBe(2);
        expect(metrics.tokenUsage).toBe(200); // resourceCount * 100
      }
    });

    it('should return default metrics for disconnected server', () => {
      const metrics = connectionMonitor.getRealMetrics('non-existent');

      expect(metrics).toBeDefined();
      if (metrics) {
        expect(metrics.toolCount).toBe(0);
        expect(metrics.resourceCount).toBe(0);
        expect(metrics.tokenUsage).toBe(0);
      }
    });

    it('should handle errors in metrics collection gracefully', async () => {
      const serverId = 'test-server';
      const serverName = 'Test Server';
      const command = 'node';

      mockMCPClient.connect.mockResolvedValue(undefined);
      mockMCPClient.getTools.mockRejectedValue(new Error('Tools error'));
      mockMCPClient.getResources.mockRejectedValue(new Error('Resources error'));

      await connectionMonitor.startMonitoring(serverId, serverName, command);

      const metrics = connectionMonitor.getRealMetrics(serverId);

      // Should return defaults when errors occur
      expect(metrics).toBeDefined();
      if (metrics) {
        expect(metrics.toolCount).toBe(0);
        expect(metrics.resourceCount).toBe(0);
      }
    });
  });

  describe('stopAll', () => {
    it('should stop monitoring all servers', async () => {
      const servers = [
        { id: 'server1', name: 'Server 1', command: 'node' },
        { id: 'server2', name: 'Server 2', command: 'python' }
      ];

      mockMCPClient.connect.mockResolvedValue(undefined);
      mockMCPClient.disconnect.mockResolvedValue(undefined);

      // Start monitoring multiple servers
      for (const server of servers) {
        await connectionMonitor.startMonitoring(server.id, server.name, server.command);
      }

      expect(connectionMonitor.getAllConnectionStatuses()).toHaveLength(2);

      // Stop all monitoring
      await connectionMonitor.stopAll();

      expect(connectionMonitor.getAllConnectionStatuses()).toHaveLength(0);
      expect(mockMCPClient.disconnect).toHaveBeenCalledTimes(2);
    });

    it('should clear all ping intervals', async () => {
      const serverId = 'test-server';
      const serverName = 'Test Server';
      const command = 'node';

      mockMCPClient.connect.mockResolvedValue(undefined);
      mockMCPClient.disconnect.mockResolvedValue(undefined);

      await connectionMonitor.startMonitoring(serverId, serverName, command);
      await connectionMonitor.stopAll();

      // Advance time and ensure no pings occur
      jest.advanceTimersByTime(60000);
      expect(mockMCPClient.ping).not.toHaveBeenCalled();
    });
  });

});
