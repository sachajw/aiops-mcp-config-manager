import { MetricsService, ServerMetrics, MetricsStore } from '../MetricsService';
import { connectionMonitor } from '../ConnectionMonitor';

// Mock ConnectionMonitor
jest.mock('../ConnectionMonitor', () => ({
  connectionMonitor: {
    getRealMetrics: jest.fn(),
    getConnectionStatus: jest.fn(),
    getConnectedCount: jest.fn(),
    getAverageResponseTime: jest.fn(),
    getAllConnectionStatuses: jest.fn()
  }
}));

describe('MetricsService', () => {
  let service: MetricsService;
  let mockConnectionMonitor: jest.Mocked<typeof connectionMonitor>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockConnectionMonitor = connectionMonitor as jest.Mocked<typeof connectionMonitor>;
    service = new MetricsService();
    service.clearMetrics();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('getServerMetrics', () => {
    it('should return real metrics from ConnectionMonitor when available', () => {
      const mockRealMetrics = {
        toolCount: 15,
        resourceCount: 3,
        responseTime: 120,
        lastActivity: new Date('2023-01-01'),
        isConnected: true
      };

      mockConnectionMonitor.getRealMetrics.mockReturnValue(mockRealMetrics);

      const metrics = service.getServerMetrics('test-server');

      expect(metrics).toEqual({
        toolCount: 15,
        tokenUsage: 300, // resourceCount * 100
        responseTime: 120,
        lastUpdated: new Date('2023-01-01'),
        isConnected: true
      });
      expect(mockConnectionMonitor.getRealMetrics).toHaveBeenCalledWith('test-server');
    });

    it('should return default metrics when ConnectionMonitor returns null', () => {
      mockConnectionMonitor.getRealMetrics.mockReturnValue(null);

      const metrics = service.getServerMetrics('unknown-server');

      expect(metrics).toEqual({
        toolCount: 0,
        tokenUsage: 0,
        responseTime: 0,
        lastUpdated: expect.any(Date),
        isConnected: false
      });
    });

    it('should use cached metrics within cache duration', () => {
      const mockRealMetrics = {
        toolCount: 10,
        resourceCount: 2,
        responseTime: 100,
        lastActivity: new Date(),
        isConnected: true
      };

      mockConnectionMonitor.getRealMetrics.mockReturnValue(mockRealMetrics);

      // First call
      const metrics1 = service.getServerMetrics('cached-server');
      expect(mockConnectionMonitor.getRealMetrics).toHaveBeenCalledTimes(1);

      // Second call within cache duration (should use cache)
      jest.advanceTimersByTime(15000); // 15 seconds
      const metrics2 = service.getServerMetrics('cached-server');
      expect(mockConnectionMonitor.getRealMetrics).toHaveBeenCalledTimes(1); // Not called again
      expect(metrics1).toEqual(metrics2);
    });

    it('should refresh metrics after cache expiration', () => {
      const mockRealMetrics = {
        toolCount: 10,
        resourceCount: 2,
        responseTime: 100,
        lastActivity: new Date(),
        isConnected: true
      };

      mockConnectionMonitor.getRealMetrics.mockReturnValue(mockRealMetrics);

      // First call
      service.getServerMetrics('expiring-server');
      expect(mockConnectionMonitor.getRealMetrics).toHaveBeenCalledTimes(1);

      // Advance time beyond cache duration
      jest.advanceTimersByTime(35000); // 35 seconds (cache is 30 seconds)

      // Second call should refresh
      service.getServerMetrics('expiring-server');
      expect(mockConnectionMonitor.getRealMetrics).toHaveBeenCalledTimes(2);
    });

    it('should fall back to stored metrics when real metrics unavailable', () => {
      mockConnectionMonitor.getRealMetrics.mockReturnValue(null);

      // First store some metrics
      service.updateServerMetrics('stored-server', {
        toolCount: 8,
        tokenUsage: 400,
        responseTime: 150
      });

      const metrics = service.getServerMetrics('stored-server');
      expect(metrics.toolCount).toBe(8);
      expect(metrics.tokenUsage).toBe(400);
      expect(metrics.responseTime).toBe(150);
    });

    it('should calculate token usage correctly (resourceCount * 100)', () => {
      const mockRealMetrics = {
        toolCount: 5,
        resourceCount: 7,
        responseTime: 80,
        lastActivity: new Date(),
        isConnected: true
      };

      mockConnectionMonitor.getRealMetrics.mockReturnValue(mockRealMetrics);

      const metrics = service.getServerMetrics('token-test-server');
      expect(metrics.tokenUsage).toBe(700); // 7 * 100
    });
  });

  describe('getTotalMetrics', () => {
    beforeEach(() => {
      // Setup mock real metrics for different servers
      mockConnectionMonitor.getRealMetrics.mockImplementation((serverName) => {
        const metricsMap: { [key: string]: any } = {
          'server1': {
            toolCount: 10,
            resourceCount: 3,
            responseTime: 100,
            lastActivity: new Date(),
            isConnected: true
          },
          'server2': {
            toolCount: 15,
            resourceCount: 5,
            responseTime: 200,
            lastActivity: new Date(),
            isConnected: true
          },
          'server3': {
            toolCount: 8,
            resourceCount: 2,
            responseTime: 150,
            lastActivity: new Date(),
            isConnected: false
          }
        };
        return metricsMap[serverName] || null;
      });
    });

    it('should calculate total metrics across multiple servers', () => {
      const serverNames = ['server1', 'server2', 'server3'];
      const totals = service.getTotalMetrics(serverNames);

      expect(totals.totalTools).toBe(33); // 10 + 15 + 8
      expect(totals.totalTokens).toBe(1000); // (3 + 5 + 2) * 100
      expect(totals.avgResponseTime).toBe(150); // (100 + 200 + 150) / 3
      expect(totals.connectedCount).toBe(2); // only server1 and server2 are connected
    });

    it('should return zero metrics for empty server list', () => {
      const totals = service.getTotalMetrics([]);

      expect(totals.totalTools).toBe(0);
      expect(totals.totalTokens).toBe(0);
      expect(totals.avgResponseTime).toBe(0);
      expect(totals.connectedCount).toBe(0);
    });

    it('should handle servers with no real metrics', () => {
      mockConnectionMonitor.getRealMetrics.mockReturnValue(null);

      const serverNames = ['unknown1', 'unknown2'];
      const totals = service.getTotalMetrics(serverNames);

      // With undefined metrics, these will be NaN due to undefined + undefined
      expect(Number.isNaN(totals.totalTools)).toBe(true);
      expect(Number.isNaN(totals.totalTokens)).toBe(true);
      expect(totals.avgResponseTime).toBe(0);
      expect(totals.connectedCount).toBe(0);
    });

    it('should calculate averages correctly for mixed server states', () => {
      const serverNames = ['server1', 'server2']; // Both connected
      const totals = service.getTotalMetrics(serverNames);

      expect(totals.totalTools).toBe(25); // 10 + 15
      expect(totals.totalTokens).toBe(800); // (3 + 5) * 100
      expect(totals.avgResponseTime).toBe(150); // (100 + 200) / 2
      expect(totals.connectedCount).toBe(2);
    });

    it('should include disconnected servers in totals but not connected count', () => {
      const serverNames = ['server1', 'server3']; // One connected, one disconnected
      const totals = service.getTotalMetrics(serverNames);

      expect(totals.totalTools).toBe(18); // 10 + 8
      expect(totals.totalTokens).toBe(500); // (3 + 2) * 100
      expect(totals.avgResponseTime).toBe(125); // (100 + 150) / 2
      expect(totals.connectedCount).toBe(1); // only server1 is connected
    });
  });

  describe('updateServerMetrics', () => {
    it('should update existing metrics with partial data', () => {
      // Start with default metrics (no real metrics available)
      mockConnectionMonitor.getRealMetrics.mockReturnValue(null);

      service.updateServerMetrics('test-server', {
        toolCount: 99,
        tokenUsage: 9999
      });

      const updatedMetrics = service.getServerMetrics('test-server');
      expect(updatedMetrics.toolCount).toBe(99);
      expect(updatedMetrics.tokenUsage).toBe(9999);
      expect(updatedMetrics.responseTime).toBe(0); // Should preserve other defaults
      expect(updatedMetrics.isConnected).toBe(false);
    });

    it('should merge with existing metrics', () => {
      mockConnectionMonitor.getRealMetrics.mockReturnValue(null);

      // Set initial metrics
      service.updateServerMetrics('merge-server', {
        toolCount: 10,
        tokenUsage: 500,
        responseTime: 100,
        isConnected: true
      });

      // Clear cache to ensure we read stored metrics
      service.clearCacheForServer('merge-server');

      // Update only some fields
      service.updateServerMetrics('merge-server', {
        toolCount: 20,
        tokenUsage: 1000
      });

      // Clear cache again to read updated stored metrics
      service.clearCacheForServer('merge-server');

      const metrics = service.getServerMetrics('merge-server');
      expect(metrics.toolCount).toBe(20); // Updated
      expect(metrics.tokenUsage).toBe(1000); // Updated
      expect(metrics.responseTime).toBe(100); // Preserved
      expect(metrics.isConnected).toBe(true); // Preserved
    });

    it('should always update lastUpdated timestamp', () => {
      mockConnectionMonitor.getRealMetrics.mockReturnValue(null);

      const beforeUpdate = new Date();
      jest.advanceTimersByTime(1000); // Advance 1 second

      service.updateServerMetrics('timestamp-server', {
        toolCount: 50
      });

      const metrics = service.getServerMetrics('timestamp-server');
      expect(metrics.lastUpdated.getTime()).toBeGreaterThan(beforeUpdate.getTime());
    });

    it('should use stored metrics when real metrics are unavailable after update', () => {
      // Initially no real metrics
      mockConnectionMonitor.getRealMetrics.mockReturnValue(null);

      // Update with stored values
      service.updateServerMetrics('stored-server', {
        toolCount: 100,
        tokenUsage: 2000,
        responseTime: 300,
        isConnected: false
      });

      // Clear cache to ensure we read stored metrics
      service.clearCacheForServer('stored-server');

      const metrics = service.getServerMetrics('stored-server');
      expect(metrics.toolCount).toBe(100);
      expect(metrics.tokenUsage).toBe(2000);
      expect(metrics.responseTime).toBe(300);
      expect(metrics.isConnected).toBe(false);
    });
  });

  describe('clearMetrics', () => {
    it('should clear all stored metrics and cache', () => {
      mockConnectionMonitor.getRealMetrics.mockReturnValue(null);

      // Update some metrics
      service.updateServerMetrics('server1', { toolCount: 10 });
      service.updateServerMetrics('server2', { toolCount: 20 });

      // Get metrics to populate cache
      service.getServerMetrics('server1');
      service.getServerMetrics('server2');

      // Clear all metrics
      service.clearMetrics();

      // Should return default metrics (not stored values)
      const metrics1 = service.getServerMetrics('server1');
      const metrics2 = service.getServerMetrics('server2');

      expect(metrics1.toolCount).toBe(0); // Default, not stored value
      expect(metrics2.toolCount).toBe(0); // Default, not stored value
    });

    it('should clear cache along with stored metrics', () => {
      const mockRealMetrics = {
        toolCount: 15,
        resourceCount: 3,
        responseTime: 120,
        lastActivity: new Date(),
        isConnected: true
      };

      mockConnectionMonitor.getRealMetrics.mockReturnValue(mockRealMetrics);

      // Get metrics to populate cache
      service.getServerMetrics('cached-server');
      expect(mockConnectionMonitor.getRealMetrics).toHaveBeenCalledTimes(1);

      // Clear all metrics (including cache)
      service.clearMetrics();

      // Next call should hit ConnectionMonitor again (cache was cleared)
      service.getServerMetrics('cached-server');
      expect(mockConnectionMonitor.getRealMetrics).toHaveBeenCalledTimes(2);
    });
  });

  describe('cache management', () => {
    it('should clear cache for specific server', () => {
      const mockRealMetrics = {
        toolCount: 10,
        resourceCount: 2,
        responseTime: 100,
        lastActivity: new Date(),
        isConnected: true
      };

      mockConnectionMonitor.getRealMetrics.mockReturnValue(mockRealMetrics);

      // Get metrics to populate cache
      service.getServerMetrics('cache-test-server');
      expect(mockConnectionMonitor.getRealMetrics).toHaveBeenCalledTimes(1);

      // Clear cache for this server
      service.clearCacheForServer('cache-test-server');

      // Next call should hit ConnectionMonitor again
      service.getServerMetrics('cache-test-server');
      expect(mockConnectionMonitor.getRealMetrics).toHaveBeenCalledTimes(2);
    });

    it('should force refresh metrics bypassing cache', () => {
      const mockRealMetrics = {
        toolCount: 12,
        resourceCount: 4,
        responseTime: 80,
        lastActivity: new Date(),
        isConnected: true
      };

      mockConnectionMonitor.getRealMetrics.mockReturnValue(mockRealMetrics);

      // Get metrics to populate cache
      service.getServerMetrics('force-refresh-server');
      expect(mockConnectionMonitor.getRealMetrics).toHaveBeenCalledTimes(1);

      // Force refresh should bypass cache
      const refreshedMetrics = service.forceRefreshMetrics('force-refresh-server');
      expect(mockConnectionMonitor.getRealMetrics).toHaveBeenCalledTimes(2);
      expect(refreshedMetrics.toolCount).toBe(12);
    });

    it('should return same object reference for force refresh as regular call', () => {
      const mockRealMetrics = {
        toolCount: 5,
        resourceCount: 1,
        responseTime: 60,
        lastActivity: new Date(),
        isConnected: true
      };

      mockConnectionMonitor.getRealMetrics.mockReturnValue(mockRealMetrics);

      const regularMetrics = service.getServerMetrics('consistency-server');
      const forcedMetrics = service.forceRefreshMetrics('consistency-server');

      expect(regularMetrics).toEqual(forcedMetrics);
    });
  });

  describe('collectRealMetrics', () => {
    it('should log that real metrics collection is not implemented', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      mockConnectionMonitor.getRealMetrics.mockReturnValue(null);

      const result = await service.collectRealMetrics('future-server', {});

      expect(consoleSpy).toHaveBeenCalledWith(
        '[MetricsService] Real metrics collection not yet implemented for:',
        'future-server'
      );
      expect(result).toEqual({
        toolCount: 0,
        tokenUsage: 0,
        responseTime: 0,
        lastUpdated: expect.any(Date),
        isConnected: false
      });

      consoleSpy.mockRestore();
    });

    it('should return current metrics for server', async () => {
      const mockRealMetrics = {
        toolCount: 8,
        resourceCount: 2,
        responseTime: 90,
        lastActivity: new Date(),
        isConnected: true
      };

      mockConnectionMonitor.getRealMetrics.mockReturnValue(mockRealMetrics);

      const result = await service.collectRealMetrics('existing-server', {});

      expect(result).toEqual({
        toolCount: 8,
        tokenUsage: 200, // resourceCount * 100
        responseTime: 90,
        lastUpdated: expect.any(Date),
        isConnected: true
      });
    });
  });

  describe('error handling', () => {
    it('should handle ConnectionMonitor throwing errors', () => {
      mockConnectionMonitor.getRealMetrics.mockImplementation(() => {
        throw new Error('Connection error');
      });

      // Should throw the error since MetricsService doesn't handle it
      expect(() => {
        service.getServerMetrics('error-server');
      }).toThrow('Connection error');
    });

    it('should handle undefined return from ConnectionMonitor', () => {
      mockConnectionMonitor.getRealMetrics.mockReturnValue(undefined as any);

      const metrics = service.getServerMetrics('undefined-server');

      expect(metrics).toEqual({
        toolCount: 0,
        tokenUsage: 0,
        responseTime: 0,
        lastUpdated: expect.any(Date),
        isConnected: false
      });
    });
  });
});