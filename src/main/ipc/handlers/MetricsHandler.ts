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

    // Get server metrics with optional force refresh
    this.handle<[string, any?, boolean?], any>(
      'getServerMetrics',
      async (_, serverName: string, serverConfig?: any, forceRefresh: boolean = false) => {
        console.log(`[MetricsHandler] getServerMetrics called for ${serverName}, forceRefresh: ${forceRefresh}`);
        console.log(`[MetricsHandler] Server config provided:`, serverConfig);

        // Check cache first (unless force refresh)
        if (!forceRefresh) {
          const cached = metricsService.getCachedMetrics(serverName);
          if (cached) {
            console.log(`[MetricsHandler] Using cached metrics for ${serverName}`);
            return cached;
          }
        }

        // If server config provided, use real MCP inspection
        if (serverConfig && serverConfig.command) {
          const { MCPServerInspector } = await import('../../services/MCPServerInspector');
          try {
            console.log(`[MetricsHandler] Attempting real MCP inspection for ${serverName}`);
            console.log(`[MetricsHandler] Command: ${serverConfig.command}, Args:`, serverConfig.args);
            const inspectionResult = await MCPServerInspector.inspectServer(serverName, serverConfig, forceRefresh);
            console.log(`[MetricsHandler] Inspection result for ${serverName}:`, inspectionResult);

            // Only cache and return if we got valid metrics
            if (inspectionResult && typeof inspectionResult.toolCount === 'number') {
              const metrics = {
                toolCount: inspectionResult.toolCount,
                tokenUsage: inspectionResult.tokenUsage ?? undefined, // Use calculated token count
                responseTime: 0, // Will be updated by actual connection
                lastUpdated: inspectionResult.timestamp,
                isConnected: !inspectionResult.error
              };
              console.log(`[MetricsHandler] Converted metrics for ${serverName}:`, metrics);

              // Cache the successful metrics
              metricsService.setCachedMetrics(serverName, metrics, serverConfig);
              return metrics;
            } else {
              console.log(`[MetricsHandler] Invalid metrics received for ${serverName}, returning undefined`);
              return undefined;
            }
          } catch (error) {
            console.error(`[MetricsHandler] Failed to get real metrics for ${serverName}:`, error);
            console.error(`[MetricsHandler] Error details:`, (error as Error).message);
          }
        } else {
          console.log(`[MetricsHandler] No valid server config provided for ${serverName}, falling back to MetricsService`);
        }

        // Fall back to metrics service (with force refresh if requested)
        const fallbackMetrics = metricsService.getServerMetrics(serverName, forceRefresh);
        console.log(`[MetricsHandler] Fallback metrics for ${serverName}:`, fallbackMetrics);
        return fallbackMetrics;
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
        console.log('[MetricsHandler] getTotal called with serverNames:', serverNames);
        const result = metricsService.getTotalMetrics(serverNames);
        console.log('[MetricsHandler] getTotal returning:', result);
        return result;
      }
    );

    // Update metrics
    this.handle<[string, any], void>(
      'update',
      async (_, serverName: string, metrics: any) => {
        metricsService.updateServerMetrics(serverName, metrics);
      }
    );

    // Force refresh metrics for a server
    this.handle<[string], any>(
      'refresh',
      async (_, serverName: string) => {
        console.log(`[MetricsHandler] Force refreshing metrics for ${serverName}`);
        return metricsService.forceRefreshMetrics(serverName);
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