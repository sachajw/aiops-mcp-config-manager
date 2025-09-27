/**
 * Tests for MetricsHandler
 * Verifies proper error handling and no fallback antipatterns
 */

import { MetricsHandler } from '../MetricsHandler';
import { container } from '../../../container';
import { MCPServerInspector } from '../../../services/MCPServerInspector';

// Mock dependencies
jest.mock('../../../container');
jest.mock('../../../services/MCPServerInspector');

describe('MetricsHandler', () => {
  let handler: MetricsHandler;
  let mockMetricsService: any;
  let mockHandle: jest.Mock;

  beforeEach(() => {
    // Setup mock metrics service
    mockMetricsService = {
      getCachedMetrics: jest.fn(),
      setCachedMetrics: jest.fn(),
      getServerMetrics: jest.fn(),
      getTotalMetrics: jest.fn(),
      updateServerMetrics: jest.fn(),
      forceRefreshMetrics: jest.fn(),
      clearMetrics: jest.fn()
    };

    (container.getMetricsService as jest.Mock).mockReturnValue(mockMetricsService);

    // Create handler and spy on handle method
    handler = new MetricsHandler();
    mockHandle = jest.fn();
    handler.handle = mockHandle;

    // Register handlers
    handler.register();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Bug-001: IPC Channel Mismatch', () => {
    it('should register handler with correct channel name', () => {
      // Verify the handler was registered with 'getServerMetrics' not 'getMetrics'
      const registeredCalls = mockHandle.mock.calls;
      const getServerMetricsCall = registeredCalls.find(call => call[0] === 'getServerMetrics');

      expect(getServerMetricsCall).toBeDefined();
      expect(getServerMetricsCall[0]).toBe('getServerMetrics');
    });

    it('should handle metrics:getServerMetrics channel correctly', () => {
      // The full channel should be 'metrics:getServerMetrics'
      // This is handled by the BaseHandler prefix
      expect(handler['prefix']).toBe('metrics');

      const registeredCalls = mockHandle.mock.calls;
      const hasGetServerMetrics = registeredCalls.some(call => call[0] === 'getServerMetrics');

      expect(hasGetServerMetrics).toBe(true);
    });
  });

  describe('Bug-006: Fallback Antipattern', () => {
    it('should return undefined on error, NOT zero', async () => {
      // Get the actual handler function
      const handlerCall = mockHandle.mock.calls.find(call => call[0] === 'getServerMetrics');
      const handlerFn = handlerCall[1];

      // Mock inspection error
      (MCPServerInspector.inspectServer as jest.Mock).mockRejectedValue(new Error('Connection failed'));

      const serverConfig = { command: 'node', args: ['server.js'] };
      const result = await handlerFn(null, 'test-server', serverConfig, false);

      // Should return undefined on error, not 0
      expect(result).toBeUndefined();
      expect(result).not.toBe(0);
      expect(result).not.toEqual({ toolCount: 0, tokenUsage: 0 });
    });

    it('should return undefined when inspection result is invalid', async () => {
      const handlerCall = mockHandle.mock.calls.find(call => call[0] === 'getServerMetrics');
      const handlerFn = handlerCall[1];

      // Mock invalid inspection result (missing toolCount)
      (MCPServerInspector.inspectServer as jest.Mock).mockResolvedValue({
        error: 'Failed to connect',
        timestamp: new Date()
      });

      const serverConfig = { command: 'node', args: ['server.js'] };
      const result = await handlerFn(null, 'test-server', serverConfig, false);

      // Should return undefined for invalid metrics
      expect(result).toBeUndefined();
    });

    it('should NOT use || 0 fallback for toolCount', async () => {
      const handlerCall = mockHandle.mock.calls.find(call => call[0] === 'getServerMetrics');
      const handlerFn = handlerCall[1];

      // Mock inspection with undefined toolCount
      (MCPServerInspector.inspectServer as jest.Mock).mockResolvedValue({
        toolCount: undefined,
        tokenUsage: undefined,
        timestamp: new Date()
      });

      const serverConfig = { command: 'node', args: ['server.js'] };
      const result = await handlerFn(null, 'test-server', serverConfig, false);

      // Should return undefined, not create fake metrics
      expect(result).toBeUndefined();
    });

    it('should return actual zero when backend provides real zero', async () => {
      const handlerCall = mockHandle.mock.calls.find(call => call[0] === 'getServerMetrics');
      const handlerFn = handlerCall[1];

      // Mock inspection with actual zero toolCount
      (MCPServerInspector.inspectServer as jest.Mock).mockResolvedValue({
        toolCount: 0, // Real zero from server
        tokenUsage: 0,
        timestamp: new Date()
      });

      const serverConfig = { command: 'node', args: ['server.js'] };
      const result = await handlerFn(null, 'test-server', serverConfig, false);

      // Should return the actual zero
      expect(result).toBeDefined();
      expect(result.toolCount).toBe(0);
      expect(result.tokenUsage).toBe(0);
    });
  });

  describe('Bug-001: Metrics Caching', () => {
    it('should use cached metrics when available and not force refresh', async () => {
      const handlerCall = mockHandle.mock.calls.find(call => call[0] === 'getServerMetrics');
      const handlerFn = handlerCall[1];

      const cachedMetrics = {
        toolCount: 5,
        tokenUsage: 1000,
        lastUpdated: new Date()
      };

      mockMetricsService.getCachedMetrics.mockReturnValue(cachedMetrics);

      const result = await handlerFn(null, 'test-server', undefined, false);

      expect(mockMetricsService.getCachedMetrics).toHaveBeenCalledWith('test-server');
      expect(result).toEqual(cachedMetrics);
      expect(MCPServerInspector.inspectServer).not.toHaveBeenCalled();
    });

    it('should bypass cache when forceRefresh is true', async () => {
      const handlerCall = mockHandle.mock.calls.find(call => call[0] === 'getServerMetrics');
      const handlerFn = handlerCall[1];

      const cachedMetrics = {
        toolCount: 5,
        tokenUsage: 1000,
        lastUpdated: new Date()
      };

      mockMetricsService.getCachedMetrics.mockReturnValue(cachedMetrics);

      const freshMetrics = {
        toolCount: 10,
        tokenUsage: 2000,
        timestamp: new Date()
      };

      (MCPServerInspector.inspectServer as jest.Mock).mockResolvedValue(freshMetrics);

      const serverConfig = { command: 'node', args: ['server.js'] };
      const result = await handlerFn(null, 'test-server', serverConfig, true);

      // Should NOT use cache when force refresh
      expect(mockMetricsService.getCachedMetrics).not.toHaveBeenCalled();
      expect(MCPServerInspector.inspectServer).toHaveBeenCalledWith('test-server', serverConfig, true);
    });

    it('should cache successful metrics', async () => {
      const handlerCall = mockHandle.mock.calls.find(call => call[0] === 'getServerMetrics');
      const handlerFn = handlerCall[1];

      const freshMetrics = {
        toolCount: 10,
        tokenUsage: 2000,
        timestamp: new Date()
      };

      (MCPServerInspector.inspectServer as jest.Mock).mockResolvedValue(freshMetrics);

      const serverConfig = { command: 'node', args: ['server.js'] };
      await handlerFn(null, 'test-server', serverConfig, false);

      // Should cache the successful metrics
      expect(mockMetricsService.setCachedMetrics).toHaveBeenCalledWith(
        'test-server',
        expect.objectContaining({
          toolCount: 10,
          tokenUsage: 2000
        }),
        serverConfig
      );
    });

    it('should NOT cache failed metrics', async () => {
      const handlerCall = mockHandle.mock.calls.find(call => call[0] === 'getServerMetrics');
      const handlerFn = handlerCall[1];

      (MCPServerInspector.inspectServer as jest.Mock).mockRejectedValue(new Error('Failed'));

      const serverConfig = { command: 'node', args: ['server.js'] };
      await handlerFn(null, 'test-server', serverConfig, false);

      // Should NOT cache when inspection fails
      expect(mockMetricsService.setCachedMetrics).not.toHaveBeenCalled();
    });
  });

  describe('Refresh Handler', () => {
    it('should have a refresh handler registered', () => {
      const refreshCall = mockHandle.mock.calls.find(call => call[0] === 'refresh');

      expect(refreshCall).toBeDefined();
      expect(refreshCall[0]).toBe('refresh');
    });

    it('should call forceRefreshMetrics when refresh is invoked', async () => {
      const refreshCall = mockHandle.mock.calls.find(call => call[0] === 'refresh');
      const refreshFn = refreshCall[1];

      mockMetricsService.forceRefreshMetrics.mockResolvedValue({ toolCount: 5 });

      const result = await refreshFn(null, 'test-server');

      expect(mockMetricsService.forceRefreshMetrics).toHaveBeenCalledWith('test-server');
      expect(result).toEqual({ toolCount: 5 });
    });
  });
});