/**
 * Metrics IPC Handler
 * Handles all metrics and monitoring operations
 */

import { BaseHandler } from './BaseHandler';
import { container } from '../../container';

export class MetricsHandler extends BaseHandler {
  constructor() {
    super('metrics');
  }

  /**
   * Register all metrics-related IPC handlers
   */
  register(): void {
    const metricsService = container.getMetricsService();

    // Get server metrics
    this.handle<[string, any?], any>(
      'getServerMetrics',
      async (_, serverName: string, serverConfig?: any) => {
        console.log(`[IPC] getServerMetrics called for ${serverName}`);

        // If server config provided, use real MCP inspection
        if (serverConfig && serverConfig.command) {
          const { MCPServerInspector } = await import('../../services/MCPServerInspector');
          try {
            console.log(`[IPC] Attempting real MCP inspection for ${serverName}`);
            const metrics = await MCPServerInspector.getServerMetrics(serverName, serverConfig);
            console.log(`[IPC] Real metrics for ${serverName}:`, metrics);
            return metrics;
          } catch (error) {
            console.error(`[IPC] Failed to get real metrics for ${serverName}:`, error);
          }
        }

        // Fall back to metrics service
        return metricsService.getServerMetrics(serverName);
      }
    );

    // Get total metrics
    this.handle<[string[]], any>(
      'getTotalMetrics',
      async (_, serverNames: string[]) => {
        const { connectionMonitor } = await import('../../services/ConnectionMonitor');
        const totalMetrics = metricsService.getTotalMetrics(serverNames);

        // Override with real connection data
        totalMetrics.connectedCount = connectionMonitor.getConnectedCount();
        totalMetrics.avgResponseTime = connectionMonitor.getAverageResponseTime() || totalMetrics.avgResponseTime;

        return totalMetrics;
      }
    );

    // Get server metrics (alternate endpoint)
    this.handle<[string], any>(
      'getServer',
      async (_, serverName: string) => {
        return metricsService.getServerMetrics(serverName);
      }
    );

    // Get total metrics (alternate endpoint)
    this.handle<[string[]], any>(
      'getTotal',
      async (_, serverNames: string[]) => {
        return metricsService.getTotalMetrics(serverNames);
      }
    );

    // Update metrics
    this.handle<[string, any], void>(
      'update',
      async (_, serverName: string, metrics: any) => {
        metricsService.updateMetrics(serverName, metrics);
      }
    );

    // Clear metrics
    this.handle<[], void>(
      'clear',
      async () => {
        metricsService.clearMetrics();
      }
    );

    console.log('[MetricsHandler] Registered all metrics handlers');
  }
}