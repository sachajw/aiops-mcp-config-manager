import { MetricsService } from '../MetricsService';

describe('MetricsService', () => {
  let service: MetricsService;

  beforeEach(() => {
    service = new MetricsService();
    service.clearMetrics();
  });

  describe('getServerMetrics', () => {
    it('should return metrics for a server', () => {
      const metrics = service.getServerMetrics('test-server');

      expect(metrics).toHaveProperty('toolCount');
      expect(metrics).toHaveProperty('tokenUsage');
      expect(metrics).toHaveProperty('responseTime');
      expect(metrics).toHaveProperty('lastUpdated');
      expect(metrics).toHaveProperty('isConnected');
    });

    it('should return different metrics for different server types', () => {
      const filesystemMetrics = service.getServerMetrics('filesystem');
      const databaseMetrics = service.getServerMetrics('database');
      const aiMetrics = service.getServerMetrics('ai-tools');

      // Filesystem should have fewer tools than database
      expect(filesystemMetrics.toolCount).toBeLessThan(databaseMetrics.toolCount);

      // AI should have highest token usage
      expect(aiMetrics.tokenUsage).toBeGreaterThan(filesystemMetrics.tokenUsage);
      expect(aiMetrics.tokenUsage).toBeGreaterThan(databaseMetrics.tokenUsage);

      // Response times should vary
      expect(filesystemMetrics.responseTime).not.toBe(databaseMetrics.responseTime);
    });

    it('should return consistent metrics for the same server', () => {
      const metrics1 = service.getServerMetrics('test-server');
      const metrics2 = service.getServerMetrics('test-server');

      // Mock metrics should be consistent
      expect(metrics1.toolCount).toBe(metrics2.toolCount);
      expect(metrics1.tokenUsage).toBe(metrics2.tokenUsage);
    });
  });

  describe('getTotalMetrics', () => {
    it('should calculate total metrics across servers', () => {
      const serverNames = ['filesystem', 'database', 'web'];
      const totals = service.getTotalMetrics(serverNames);

      expect(totals).toHaveProperty('totalTools');
      expect(totals).toHaveProperty('totalTokens');
      expect(totals).toHaveProperty('avgResponseTime');
      expect(totals).toHaveProperty('connectedCount');

      expect(totals.totalTools).toBeGreaterThan(0);
      expect(totals.totalTokens).toBeGreaterThan(0);
      expect(totals.avgResponseTime).toBeGreaterThan(0);
    });

    it('should return zero metrics for empty server list', () => {
      const totals = service.getTotalMetrics([]);

      expect(totals.totalTools).toBe(0);
      expect(totals.totalTokens).toBe(0);
      expect(totals.avgResponseTime).toBe(0);
      expect(totals.connectedCount).toBe(0);
    });

    it('should sum metrics correctly', () => {
      const serverNames = ['filesystem', 'database'];
      const totals = service.getTotalMetrics(serverNames);

      const filesystemMetrics = service.getServerMetrics('filesystem');
      const databaseMetrics = service.getServerMetrics('database');

      expect(totals.totalTools).toBe(
        filesystemMetrics.toolCount + databaseMetrics.toolCount
      );
      expect(totals.totalTokens).toBe(
        filesystemMetrics.tokenUsage + databaseMetrics.tokenUsage
      );
    });
  });

  describe('updateServerMetrics', () => {
    it('should update existing metrics', () => {
      const initialMetrics = service.getServerMetrics('test-server');
      const initialTools = initialMetrics.toolCount;

      service.updateServerMetrics('test-server', {
        toolCount: 99,
        tokenUsage: 9999
      });

      const updatedMetrics = service.getServerMetrics('test-server');
      expect(updatedMetrics.toolCount).toBe(99);
      expect(updatedMetrics.tokenUsage).toBe(9999);
    });

    it('should update lastUpdated timestamp', () => {
      const initialMetrics = service.getServerMetrics('test-server');
      const initialTime = initialMetrics.lastUpdated;

      // Wait a bit to ensure time difference
      setTimeout(() => {
        service.updateServerMetrics('test-server', {
          toolCount: 50
        });

        const updatedMetrics = service.getServerMetrics('test-server');
        expect(updatedMetrics.lastUpdated.getTime()).toBeGreaterThan(
          initialTime.getTime()
        );
      }, 10);
    });
  });

  describe('clearMetrics', () => {
    it('should clear all stored metrics', () => {
      // Update some metrics
      service.updateServerMetrics('server1', { toolCount: 10 });
      service.updateServerMetrics('server2', { toolCount: 20 });

      // Clear all metrics
      service.clearMetrics();

      // Should return fresh mock metrics
      const metrics1 = service.getServerMetrics('server1');
      const metrics2 = service.getServerMetrics('server2');

      // Should not have our custom values
      expect(metrics1.toolCount).not.toBe(10);
      expect(metrics2.toolCount).not.toBe(20);
    });
  });

  describe('mock data generation', () => {
    it('should generate appropriate metrics for known server types', () => {
      const types = [
        { name: 'filesystem', expectedTools: 8 },
        { name: 'search-server', expectedTools: 5 },
        { name: 'my-database', expectedTools: 12 },
        { name: 'web-api', expectedTools: 6 },
        { name: 'ai-model', expectedTools: 10 },
        { name: 'git-server', expectedTools: 15 },
        { name: 'docker', expectedTools: 20 },
        { name: 'kubernetes', expectedTools: 25 }
      ];

      types.forEach(({ name, expectedTools }) => {
        const metrics = service.getServerMetrics(name);
        expect(metrics.toolCount).toBe(expectedTools);
      });
    });

    it('should provide varied response times', () => {
      const responseTimes = new Set();

      // Get metrics for different server types to ensure variation
      const serverTypes = ['filesystem', 'database', 'web', 'ai', 'git'];
      serverTypes.forEach(type => {
        const metrics = service.getServerMetrics(type);
        responseTimes.add(metrics.responseTime);
      });

      // Should have some variation
      expect(responseTimes.size).toBeGreaterThan(1);
    });

    it('should simulate connection status realistically', () => {
      let connectedCount = 0;
      const totalServers = 100;

      for (let i = 0; i < totalServers; i++) {
        const metrics = service.getServerMetrics(`server-${i}`);
        if (metrics.isConnected) connectedCount++;
      }

      // Around 80% should be connected (with some variance)
      expect(connectedCount).toBeGreaterThan(totalServers * 0.6);
      expect(connectedCount).toBeLessThan(totalServers * 0.95);
    });
  });
});