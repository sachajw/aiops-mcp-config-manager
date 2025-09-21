/**
 * MetricsService - Collects real metrics from MCP servers
 * Replaces hardcoded values with actual data
 */

import { connectionMonitor } from './ConnectionMonitor';

export interface ServerMetrics {
  toolCount: number;
  tokenUsage: number;
  responseTime: number;
  lastUpdated: Date;
  isConnected: boolean;
}

export interface MetricsStore {
  [serverName: string]: ServerMetrics;
}

export class MetricsService {
  private metrics: MetricsStore = {};
  private metricsCache: Map<string, { metrics: ServerMetrics; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 30000; // 30 seconds cache to reduce server load
  // NO MOCK MODE - Only real metrics from actual servers

  /**
   * Get metrics for a specific server with caching
   * Returns real metrics or default zeros if not connected
   *
   * TOKEN USAGE ESTIMATION FORMULA:
   * - tokenUsage = resourceCount * 100
   * - This is an ESTIMATION since MCP protocol doesn't provide actual token metrics
   * - Each resource is estimated to consume approximately 100 tokens
   * - If resourceCount = 0, then tokenUsage = 0
   * - This estimation helps provide a relative measure of server activity
   *
   * @param serverName - Name of the server to get metrics for
   * @returns ServerMetrics with estimated token usage
   */
  public getServerMetrics(serverName: string): ServerMetrics {
    // Check cache first
    const cached = this.metricsCache.get(serverName);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log(`[MetricsService] Using cached metrics for ${serverName}`);
      return cached.metrics;
    }

    // First try to get real metrics from connection monitor
    const realMetrics = connectionMonitor.getRealMetrics(serverName);
    if (realMetrics) {
      const metrics: ServerMetrics = {
        toolCount: realMetrics.toolCount,
        tokenUsage: realMetrics.resourceCount * 100, // ESTIMATED: resourceCount * 100 tokens per resource
        responseTime: realMetrics.responseTime,
        lastUpdated: realMetrics.lastActivity,
        isConnected: realMetrics.isConnected
      };

      // Cache the metrics
      this.metricsCache.set(serverName, {
        metrics,
        timestamp: Date.now()
      });

      return metrics;
    }

    // Fall back to stored metrics
    if (this.metrics[serverName]) {
      // Cache even stored metrics
      this.metricsCache.set(serverName, {
        metrics: this.metrics[serverName],
        timestamp: Date.now()
      });
      return this.metrics[serverName];
    }

    // NO MOCK DATA - Return zeros for disconnected/unknown servers
    // The UI should show appropriate loading or disconnected states
    const defaultMetrics: ServerMetrics = {
      toolCount: 0,
      tokenUsage: 0,
      responseTime: 0,
      lastUpdated: new Date(),
      isConnected: false
    };

    // Don't cache default metrics to allow retry
    return defaultMetrics;
  }

  /**
   * Get total metrics across all servers
   */
  public getTotalMetrics(serverNames: string[]): {
    totalTools: number;
    totalTokens: number;
    avgResponseTime: number;
    connectedCount: number;
  } {
    let totalTools = 0;
    let totalTokens = 0;
    let totalResponseTime = 0;
    let connectedCount = 0;

    serverNames.forEach(name => {
      const metrics = this.getServerMetrics(name);
      totalTools += metrics.toolCount;
      totalTokens += metrics.tokenUsage;
      totalResponseTime += metrics.responseTime;
      if (metrics.isConnected) connectedCount++;
    });

    return {
      totalTools,
      totalTokens,
      avgResponseTime: serverNames.length > 0 ? Math.round(totalResponseTime / serverNames.length) : 0,
      connectedCount
    };
  }

  // REMOVED: generateMockMetrics method - NO MOCK DATA
  // All metrics must come from real server connections or return zeros

  /**
   * Update metrics for a server (for future real implementation)
   */
  public updateServerMetrics(serverName: string, metrics: Partial<ServerMetrics>): void {
    this.metrics[serverName] = {
      ...this.getServerMetrics(serverName),
      ...metrics,
      lastUpdated: new Date()
    };
  }

  /**
   * Clear all metrics
   */
  public clearMetrics(): void {
    this.metrics = {};
    this.metricsCache.clear();
  }

  /**
   * Clear cache for a specific server
   */
  public clearCacheForServer(serverName: string): void {
    this.metricsCache.delete(serverName);
  }

  /**
   * Force refresh metrics for a server (bypasses cache)
   */
  public forceRefreshMetrics(serverName: string): ServerMetrics {
    this.clearCacheForServer(serverName);
    return this.getServerMetrics(serverName);
  }

  /**
   * TODO: Implement real metrics collection
   * This will involve:
   * 1. Connecting to MCP servers via their protocol
   * 2. Fetching tool manifests to get actual tool counts
   * 3. Tracking token usage from LLM interactions
   * 4. Measuring actual response times
   * 5. Monitoring connection health
   */
  public async collectRealMetrics(serverName: string, serverConfig: any): Promise<ServerMetrics> {
    console.log('[MetricsService] Real metrics collection not yet implemented for:', serverName);
    return this.getServerMetrics(serverName);
  }
}