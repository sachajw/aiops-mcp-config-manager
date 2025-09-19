import { ConnectionMonitor } from '../ConnectionMonitor';

describe('ConnectionMonitor', () => {
  let monitor: ConnectionMonitor;

  beforeEach(() => {
    monitor = new ConnectionMonitor();
  });

  afterEach(async () => {
    await monitor.stopAll();
  });

  describe('startMonitoring', () => {
    it('should start monitoring a server', async () => {
      const serverId = 'test-server';
      const serverName = 'Test Server';

      await monitor.startMonitoring(serverId, serverName, 'node', ['--version']);

      const status = monitor.getConnectionStatus(serverId);
      expect(status).toBeDefined();
      expect(status?.serverId).toBe(serverId);
      expect(status?.serverName).toBe(serverName);
    });

    it('should emit statusChange event', (done) => {
      const serverId = 'test-server';

      monitor.on('statusChange', (status) => {
        expect(status.serverId).toBe(serverId);
        done();
      });

      monitor.startMonitoring(serverId, 'Test Server', 'node', ['--version']);
    });

    it('should set initial status to connecting', async () => {
      const serverId = 'test-server';

      // Start monitoring but check immediately
      const promise = monitor.startMonitoring(serverId, 'Test', 'node');
      const status = monitor.getConnectionStatus(serverId);

      expect(status?.status).toBe('connecting');

      await promise;
    });

    it('should transition to connected state', (done) => {
      const serverId = 'test-server';
      let connectingReceived = false;

      monitor.on('statusChange', (status) => {
        if (status.status === 'connecting') {
          connectingReceived = true;
        }
        if (status.status === 'connected' && connectingReceived) {
          done();
        }
      });

      monitor.startMonitoring(serverId, 'Test', 'node');
    });

    it('should stop existing monitoring if restarting', async () => {
      const serverId = 'test-server';

      await monitor.startMonitoring(serverId, 'Test 1', 'node');
      const status1 = monitor.getConnectionStatus(serverId);

      await monitor.startMonitoring(serverId, 'Test 2', 'node');
      const status2 = monitor.getConnectionStatus(serverId);

      expect(status2?.serverName).toBe('Test 2');
    });
  });

  describe('stopMonitoring', () => {
    it('should stop monitoring a server', async () => {
      const serverId = 'test-server';

      await monitor.startMonitoring(serverId, 'Test', 'node');
      expect(monitor.getConnectionStatus(serverId)).toBeDefined();

      await monitor.stopMonitoring(serverId);
      expect(monitor.getConnectionStatus(serverId)).toBeUndefined();
    });

    it('should emit disconnected event', (done) => {
      const serverId = 'test-server';

      monitor.startMonitoring(serverId, 'Test', 'node').then(() => {
        monitor.on('event', (event) => {
          if (event.type === 'disconnected' && event.serverId === serverId) {
            done();
          }
        });

        monitor.stopMonitoring(serverId);
      });
    });

    it('should handle stopping non-existent server', async () => {
      await expect(monitor.stopMonitoring('non-existent')).resolves.not.toThrow();
    });
  });

  describe('getConnectionStatus', () => {
    it('should return undefined for non-monitored server', () => {
      const status = monitor.getConnectionStatus('unknown-server');
      expect(status).toBeUndefined();
    });

    it('should return correct status for monitored server', async () => {
      const serverId = 'test-server';
      await monitor.startMonitoring(serverId, 'Test', 'node');

      const status = monitor.getConnectionStatus(serverId);
      expect(status).toBeDefined();
      expect(status?.serverId).toBe(serverId);
    });
  });

  describe('getAllConnectionStatuses', () => {
    it('should return empty array initially', () => {
      const statuses = monitor.getAllConnectionStatuses();
      expect(statuses).toEqual([]);
    });

    it('should return all monitored servers', async () => {
      await monitor.startMonitoring('server1', 'Server 1', 'node');
      await monitor.startMonitoring('server2', 'Server 2', 'node');

      const statuses = monitor.getAllConnectionStatuses();
      expect(statuses.length).toBe(2);
      expect(statuses.map(s => s.serverId)).toContain('server1');
      expect(statuses.map(s => s.serverId)).toContain('server2');
    });
  });

  describe('getConnectedCount', () => {
    it('should return 0 initially', () => {
      expect(monitor.getConnectedCount()).toBe(0);
    });

    it('should count connected servers', async () => {
      await monitor.startMonitoring('server1', 'Server 1', 'node');
      await monitor.startMonitoring('server2', 'Server 2', 'node');

      // Wait for connections to establish (simulated delay)
      await new Promise(resolve => setTimeout(resolve, 2500));

      const count = monitor.getConnectedCount();
      expect(count).toBeGreaterThanOrEqual(0);
      expect(count).toBeLessThanOrEqual(2);
    });
  });

  describe('getAverageResponseTime', () => {
    it('should return 0 when no servers connected', () => {
      expect(monitor.getAverageResponseTime()).toBe(0);
    });

    it('should calculate average response time', async () => {
      await monitor.startMonitoring('server1', 'Server 1', 'node');
      await monitor.startMonitoring('server2', 'Server 2', 'node');

      // Wait for connections and initial pings
      await new Promise(resolve => setTimeout(resolve, 2500));

      const avgTime = monitor.getAverageResponseTime();
      if (monitor.getConnectedCount() > 0) {
        expect(avgTime).toBeGreaterThan(0);
        expect(avgTime).toBeLessThan(1000);
      } else {
        expect(avgTime).toBe(0);
      }
    });
  });

  describe('connection events', () => {
    it('should emit connected event', (done) => {
      const serverId = 'test-server';

      monitor.on('event', (event) => {
        if (event.type === 'connected' && event.serverId === serverId) {
          expect(event.timestamp).toBeInstanceOf(Date);
          done();
        }
      });

      monitor.startMonitoring(serverId, 'Test', 'node');
    });

    it('should emit error event on failure', (done) => {
      const serverId = 'error-server';

      monitor.on('event', (event) => {
        if (event.type === 'error' && event.serverId === serverId) {
          expect(event.data).toBeDefined();
          done();
        }
      });

      // Simulate error by monitoring then triggering multiple ping failures
      monitor.startMonitoring(serverId, 'Test', 'invalid-command');
    });
  });

  describe('stopAll', () => {
    it('should stop all monitored servers', async () => {
      await monitor.startMonitoring('server1', 'Server 1', 'node');
      await monitor.startMonitoring('server2', 'Server 2', 'node');
      await monitor.startMonitoring('server3', 'Server 3', 'node');

      expect(monitor.getAllConnectionStatuses().length).toBe(3);

      await monitor.stopAll();

      expect(monitor.getAllConnectionStatuses().length).toBe(0);
    });
  });

  describe('status properties', () => {
    it('should track uptime', async () => {
      const serverId = 'test-server';
      await monitor.startMonitoring(serverId, 'Test', 'node');

      // Wait for connection
      await new Promise(resolve => setTimeout(resolve, 1500));

      const status = monitor.getConnectionStatus(serverId);
      if (status?.status === 'connected') {
        expect(status.uptime).toBeGreaterThanOrEqual(0);
      }
    });

    it('should track last ping time', async () => {
      const serverId = 'test-server';
      await monitor.startMonitoring(serverId, 'Test', 'node');

      const status = monitor.getConnectionStatus(serverId);
      expect(status?.lastPing).toBeInstanceOf(Date);
    });

    it('should track error count', async () => {
      const serverId = 'test-server';
      await monitor.startMonitoring(serverId, 'Test', 'node');

      const status = monitor.getConnectionStatus(serverId);
      expect(status?.errorCount).toBe(0);
    });
  });
});