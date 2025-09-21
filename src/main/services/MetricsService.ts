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
  // NO MOCK MODE - Only real metrics from actual servers

  /**
   * Get metrics for a specific server
   * Returns real metrics or default zeros if not connected
   */
  public getServerMetrics(serverName: string): ServerMetrics {
    // First try to get real metrics from connection monitor
    const realMetrics = connectionMonitor.getRealMetrics(serverName);
    if (realMetrics) {
      return {
        toolCount: realMetrics.toolCount,
        tokenUsage: realMetrics.resourceCount * 100, // Estimate based on resources
        responseTime: realMetrics.responseTime,
        lastUpdated: realMetrics.lastActivity,
        isConnected: realMetrics.isConnected
      };
    }

    // Fall back to stored metrics
    if (this.metrics[serverName]) {
      return this.metrics[serverName];
    }

    // NO MOCK DATA - Return zeros for disconnected/unknown servers
    // The UI should show appropriate loading or disconnected states
    return {
      toolCount: 0,
      tokenUsage: 0,
      responseTime: 0,
      lastUpdated: new Date(),
      isConnected: false
    };
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