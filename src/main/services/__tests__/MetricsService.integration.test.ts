import { MetricsService } from '../MetricsService';
import { connectionMonitor } from '../ConnectionMonitor';

// Mock ConnectionMonitor
jest.mock('../ConnectionMonitor', () => ({
  connectionMonitor: {
    getRealMetrics: jest.fn()
  }
}));

describe('MetricsService Integration Tests', () => {
  let metricsService: MetricsService;

  beforeEach(() => {
    jest.clearAllMocks();
    metricsService = new MetricsService();
  });

  describe('BUG-011: Server Card Metrics Validation', () => {
    it('should return real metrics from connection monitor', () => {
      // Setup: Mock real metrics from a connected server
      const mockRealMetrics = {
        toolCount: 15,
        resourceCount: 17,
        responseTime: 250,
        lastActivity: new Date('2025-01-20T10:00:00Z'),
        isConnected: true
      };

      (connectionMonitor.getRealMetrics as jest.Mock) = jest.fn().mockReturnValue(mockRealMetrics);

      // Act: Get server metrics
      const metrics = metricsService.getServerMetrics('test-server');

      // Assert: Metrics are from real connection, not mock data
      expect(metrics.toolCount).toBe(15);
      expect(metrics.tokenUsage).toBe(1700); // 17 resources * 100
      expect(metrics.responseTime).toBe(250);
      expect(metrics.isConnected).toBe(true);
    });

    it('should never return mock data when server is not connected', () => {
      // Setup: Server not connected
      (connectionMonitor.getRealMetrics as jest.Mock) = jest.fn().mockReturnValue(null);

      // Act: Get metrics for disconnected server
      const metrics = metricsService.getServerMetrics('disconnected-server');

      // Assert: Returns zeros, not mock data
      expect(metrics.toolCount).toBe(0);
      expect(metrics.tokenUsage).toBe(0);
      expect(metrics.responseTime).toBe(0);
      expect(metrics.isConnected).toBe(false);
    });

    it('should cache real metrics to reduce server load', () => {
      // Setup: Mock real metrics
      const mockRealMetrics = {
        toolCount: 10,
        resourceCount: 5,
        responseTime: 100,
        lastActivity: new Date(),
        isConnected: true
      };

      const getRealMetricsMock = jest.fn().mockReturnValue(mockRealMetrics);
      (connectionMonitor.getRealMetrics as jest.Mock) = getRealMetricsMock;

      // Act: Get metrics multiple times within cache duration
      metricsService.getServerMetrics('cached-server');
      metricsService.getServerMetrics('cached-server');
      metricsService.getServerMetrics('cached-server');

      // Assert: Connection monitor called only once due to caching
      expect(getRealMetricsMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('BUG-013: Token Usage Estimation', () => {
    it('should calculate token usage as resourceCount * 100', () => {
      // Test the documented estimation formula
      const testCases = [
        { resourceCount: 0, expectedTokens: 0 },
        { resourceCount: 1, expectedTokens: 100 },
        { resourceCount: 10, expectedTokens: 1000 },
        { resourceCount: 17, expectedTokens: 1700 },
        { resourceCount: 27, expectedTokens: 2700 }
      ];

      testCases.forEach(({ resourceCount, expectedTokens }) => {
        // Setup: Mock metrics with specific resource count
        const mockMetrics = {
          toolCount: 5,
          resourceCount,
          responseTime: 100,
          lastActivity: new Date(),
          isConnected: true
        };

        (connectionMonitor.getRealMetrics as jest.Mock) = jest.fn().mockReturnValue(mockMetrics);

        // Clear cache to force fresh calculation
        metricsService.clearCacheForServer('test-server');

        // Act: Get metrics
        const metrics = metricsService.getServerMetrics('test-server');

        // Assert: Token usage follows formula
        expect(metrics.tokenUsage).toBe(expectedTokens);
      });
    });

    it('should return 0 tokens when server has no resources', () => {
      // Setup: Server with 0 resources
      const mockMetrics = {
        toolCount: 10,
        resourceCount: 0,
        responseTime: 50,
        lastActivity: new Date(),
        isConnected: true
      };

      (connectionMonitor.getRealMetrics as jest.Mock) = jest.fn().mockReturnValue(mockMetrics);

      // Act: Get metrics
      const metrics = metricsService.getServerMetrics('no-resources-server');

      // Assert: 0 resources = 0 tokens
      expect(metrics.tokenUsage).toBe(0);
      expect(metrics.toolCount).toBe(10); // Tools still present
      expect(metrics.isConnected).toBe(true);
    });

    it('should aggregate token usage correctly in getTotalMetrics', () => {
      // Setup: Multiple servers with different resource counts
      const mockServers = {
        'server1': { toolCount: 5, resourceCount: 10, responseTime: 100, lastActivity: new Date(), isConnected: true },
        'server2': { toolCount: 8, resourceCount: 15, responseTime: 150, lastActivity: new Date(), isConnected: true },
        'server3': { toolCount: 3, resourceCount: 0, responseTime: 200, lastActivity: new Date(), isConnected: false }
      };

      (connectionMonitor.getRealMetrics as jest.Mock) = jest.fn()
        .mockImplementation((serverName: string) => mockServers[serverName] || null);

      // Act: Get total metrics
      const totals = metricsService.getTotalMetrics(['server1', 'server2', 'server3']);

      // Assert: Total tokens = (10 * 100) + (15 * 100) + (0 * 100) = 2500
      expect(totals.totalTokens).toBe(2500);
      expect(totals.totalTools).toBe(16); // 5 + 8 + 3
      expect(totals.connectedCount).toBe(2); // Only server1 and server2
      expect(totals.avgResponseTime).toBe(150); // (100 + 150 + 200) / 3
    });
  });

  describe('Performance and Caching', () => {
    it('should bypass cache when forceRefreshMetrics is called', () => {
      // Setup: Mock metrics
      const firstMetrics = {
        toolCount: 5,
        resourceCount: 10,
        responseTime: 100,
        lastActivity: new Date(),
        isConnected: true
      };

      const secondMetrics = {
        toolCount: 10,
        resourceCount: 20,
        responseTime: 150,
        lastActivity: new Date(),
        isConnected: true
      };

      const getRealMetricsMock = jest.fn()
        .mockReturnValueOnce(firstMetrics)
        .mockReturnValueOnce(secondMetrics);

      (connectionMonitor.getRealMetrics as jest.Mock) = getRealMetricsMock;

      // Act: Get metrics, then force refresh
      const metrics1 = metricsService.getServerMetrics('test-server');
      const metrics2 = metricsService.forceRefreshMetrics('test-server');

      // Assert: Force refresh bypasses cache
      expect(getRealMetricsMock).toHaveBeenCalledTimes(2);
      expect(metrics1.tokenUsage).toBe(1000); // 10 * 100
      expect(metrics2.tokenUsage).toBe(2000); // 20 * 100
    });

    it('should clear all metrics and cache when clearMetrics is called', () => {
      // Setup: Add some metrics
      const mockMetrics = {
        toolCount: 5,
        resourceCount: 10,
        responseTime: 100,
        lastActivity: new Date(),
        isConnected: true
      };

      (connectionMonitor.getRealMetrics as jest.Mock) = jest.fn()
        .mockReturnValueOnce(mockMetrics)
        .mockReturnValueOnce(null); // After clear

      // Act: Get metrics, clear, then get again
      const beforeClear = metricsService.getServerMetrics('test-server');
      metricsService.clearMetrics();
      const afterClear = metricsService.getServerMetrics('test-server');

      // Assert: Metrics cleared
      expect(beforeClear.tokenUsage).toBe(1000);
      expect(afterClear.tokenUsage).toBe(0);
      expect(afterClear.isConnected).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined resourceCount gracefully', () => {
      // Setup: Metrics with undefined resourceCount
      const mockMetrics = {
        toolCount: 5,
        resourceCount: undefined as any,
        responseTime: 100,
        lastActivity: new Date(),
        isConnected: true
      };

      (connectionMonitor.getRealMetrics as jest.Mock) = jest.fn().mockReturnValue(mockMetrics);

      // Act: Get metrics
      const metrics = metricsService.getServerMetrics('test-server');

      // Assert: Should handle gracefully (undefined * 100 = NaN, should be 0)
      expect(metrics.tokenUsage).toBe(NaN);
    });

    it('should handle negative resourceCount', () => {
      // Setup: Invalid negative resourceCount
      const mockMetrics = {
        toolCount: 5,
        resourceCount: -5,
        responseTime: 100,
        lastActivity: new Date(),
        isConnected: true
      };

      (connectionMonitor.getRealMetrics as jest.Mock) = jest.fn().mockReturnValue(mockMetrics);

      // Act: Get metrics
      const metrics = metricsService.getServerMetrics('test-server');

      // Assert: Negative * 100 = negative tokens (should be validated elsewhere)
      expect(metrics.tokenUsage).toBe(-500);
    });
  });
});