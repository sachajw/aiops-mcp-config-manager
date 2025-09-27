/**
 * MetricsService - Collects real metrics from MCP servers
 * Replaces hardcoded values with actual data
 */

import { connectionMonitor } from './ConnectionMonitor';
import { ConfigScope } from '../../shared/types/enums';

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
  private metricsCache: Map<string, {
    metrics: any;
    timestamp: number;
    serverConfig: any;
  }> = new Map();
  private readonly CACHE_DURATION = Infinity; // Never expire until refresh
  private readonly CACHE_STORAGE_KEY = 'mcp-metrics-cache';
  // NO MOCK MODE - Only real metrics from actual servers

  constructor() {
    // Load cache from localStorage on startup
    this.loadCache();
  }

  /**
   * Get cached metrics for a server
   * @param serverName - Name of the server
   * @returns Cached metrics or undefined
   */
  public getCachedMetrics(serverName: string): any {
    const cached = this.metricsCache.get(serverName);
    if (cached) {
      console.log(`[MetricsService] Using cached metrics for ${serverName}`);
      return cached.metrics;
    }
    return undefined;
  }

  /**
   * Set cached metrics for a server
   * @param serverName - Name of the server
   * @param metrics - Metrics to cache
   * @param serverConfig - Server configuration
   */
  public setCachedMetrics(serverName: string, metrics: any, serverConfig: any): void {
    console.log(`[MetricsService] Caching metrics for ${serverName}:`, metrics);
    this.metricsCache.set(serverName, {
      metrics,
      timestamp: Date.now(),
      serverConfig
    });
    // Persist to localStorage
    this.persistCache();
  }

  /**
   * Persist cache to localStorage
   */
  private persistCache(): void {
    try {
      const cacheData = Array.from(this.metricsCache.entries()).map(([key, value]) => ({
        serverName: key,
        metrics: value.metrics,
        timestamp: value.timestamp,
        serverConfig: value.serverConfig
      }));
      // Note: In Electron main process, we need to use a different storage mechanism
      // We'll use a file-based cache instead
      const fs = require('fs');
      const path = require('path');
      const { app } = require('electron');
      const cacheFile = path.join(app.getPath('userData'), 'metrics-cache.json');
      fs.writeFileSync(cacheFile, JSON.stringify(cacheData, null, 2));
      console.log(`[MetricsService] Persisted cache to ${cacheFile}`);
    } catch (error) {
      console.error('[MetricsService] Failed to persist cache:', error);
    }
  }

  /**
   * Load cache from storage
   */
  private loadCache(): void {
    try {
      const fs = require('fs');
      const path = require('path');
      const { app } = require('electron');
      const cacheFile = path.join(app.getPath('userData'), 'metrics-cache.json');

      if (fs.existsSync(cacheFile)) {
        const cacheData = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
        cacheData.forEach((item: any) => {
          this.metricsCache.set(item.serverName, {
            metrics: item.metrics,
            timestamp: item.timestamp,
            serverConfig: item.serverConfig
          });
        });
        console.log(`[MetricsService] Loaded ${this.metricsCache.size} cached metrics from ${cacheFile}`);
      }
    } catch (error) {
      console.error('[MetricsService] Failed to load cache:', error);
    }
  }

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
   * @param forceRefresh - Force refresh bypassing cache
   * @returns ServerMetrics with estimated token usage
   */
  public getServerMetrics(serverName: string, forceRefresh: boolean = false): ServerMetrics {
    console.log(`[MetricsService] getServerMetrics called for: ${serverName}, forceRefresh: ${forceRefresh}`);

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = this.getCachedMetrics(serverName);
      if (cached) {
        console.log(`[MetricsService] Returning cached metrics for ${serverName}`);
        return cached;
      }
    } else {
      console.log(`[MetricsService] Force refresh requested for ${serverName}, bypassing cache`);
    }

    // First try to get real metrics from connection monitor
    console.log(`[MetricsService] Fetching real metrics from ConnectionMonitor for ${serverName}`);
    const realMetrics = connectionMonitor.getRealMetrics(serverName);
    console.log(`[MetricsService] ConnectionMonitor returned for ${serverName}:`, realMetrics);
    if (realMetrics) {
      const metrics: ServerMetrics = {
        toolCount: realMetrics.toolCount,
        tokenUsage: realMetrics.resourceCount * 100, // ESTIMATED: resourceCount * 100 tokens per resource
        responseTime: realMetrics.responseTime,
        lastUpdated: realMetrics.lastActivity,
        isConnected: realMetrics.isConnected
      };

      // Cache the metrics with persistent storage
      this.setCachedMetrics(serverName, metrics, null);

      return metrics;
    }

    // Fall back to stored metrics
    if (this.metrics[serverName]) {
      // Don't cache stored metrics if we're force refreshing
      if (!forceRefresh) {
        this.setCachedMetrics(serverName, this.metrics[serverName], null);
      }
      return this.metrics[serverName];
    }

    // NO MOCK DATA - Return undefined for disconnected/unknown servers
    // The UI should show appropriate loading or disconnected states
    const defaultMetrics: ServerMetrics = {
      toolCount: undefined as any, // UI will show "—"
      tokenUsage: undefined as any, // UI will show "—"
      responseTime: 0,
      lastUpdated: new Date(),
      isConnected: false
    };

    // Cache even failed attempts to avoid repeated connection attempts
    // This prevents hammering servers that are offline
    this.setCachedMetrics(serverName, defaultMetrics, null);

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
    console.log('[MetricsService] getTotalMetrics called with servers:', serverNames);
    let totalTools = 0;
    let totalTokens = 0;
    let totalResponseTime = 0;
    let connectedCount = 0;

    serverNames.forEach(name => {
      const metrics = this.getServerMetrics(name);
      console.log(`[MetricsService] Metrics for ${name}:`, metrics);
      totalTools += metrics.toolCount;
      totalTokens += metrics.tokenUsage;
      totalResponseTime += metrics.responseTime;
      if (metrics.isConnected) connectedCount++;
    });

    const result = {
      totalTools,
      totalTokens,
      avgResponseTime: serverNames.length > 0 ? Math.round(totalResponseTime / serverNames.length) : 0,
      connectedCount
    };

    console.log('[MetricsService] Total metrics calculated:', result);
    return result;
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
    this.persistCache(); // Clear persisted cache too
  }

  /**
   * Clear cache for a specific server
   */
  public clearCacheForServer(serverName: string): void {
    this.metricsCache.delete(serverName);
    this.persistCache();
  }

  /**
   * Force refresh metrics for a server (bypasses cache)
   */
  public forceRefreshMetrics(serverName: string): ServerMetrics {
    return this.getServerMetrics(serverName, true);
  }

  /**
   * Prefetch metrics for all installed servers on app startup
   * This ensures all installed servers have cached metrics available
   */
  public async prefetchMetricsForAllServers(): Promise<void> {
    console.log('[MetricsService] Starting prefetch of metrics for all installed servers...');

    try {
      // Import dependencies dynamically to avoid circular dependencies
      const { ClientDetector } = await import('./ClientDetector');
      const { ConfigurationManager } = await import('./ConfigurationManager');

      // Discover all clients
      const clientsResult = await ClientDetector.discoverClients();
      console.log(`[MetricsService] Found ${clientsResult.clients.length} clients`);

      let totalServers = 0;
      let successCount = 0;

      // For each client, get all configured servers
      for (const client of clientsResult.clients) {
        try {
          // Skip if client is not active
          if (client.status !== 'active') {
            console.log(`[MetricsService] Skipping inactive client: ${client.id}`);
            continue;
          }

          console.log(`[MetricsService] Processing client: ${client.id}`);

          // Load the client's actual configuration file directly
          const { ConfigurationService } = await import('./ConfigurationService');
          const configPath = client.configPaths.primary;
          console.log(`[MetricsService] Loading config from: ${configPath}`);

          const result = await ConfigurationService.loadConfiguration(configPath, client.type);
          if (!result.success || !result.data || !result.data.mcpServers) {
            console.log(`[MetricsService] No servers configured for client: ${client.id} at path: ${configPath}`);
            continue;
          }

          const config = result.data;

          // Get all server names and configs
          const serverEntries = Object.entries(config.mcpServers);
          console.log(`[MetricsService] Found ${serverEntries.length} servers for client ${client.id}`);

          // Prefetch metrics for each server
          for (const [serverName, serverConfig] of serverEntries) {
            totalServers++;

            // Check if we already have cached metrics for this server
            const cached = this.getCachedMetrics(serverName);
            if (cached && cached.toolCount !== undefined) {
              console.log(`[MetricsService] Server ${serverName} already has valid cached metrics`);
              successCount++;
              continue;
            }

            // Try to fetch metrics for the server
            console.log(`[MetricsService] Fetching metrics for server: ${serverName}`);
            try {
              const { MCPServerInspector } = await import('./MCPServerInspector');
              const inspection = await MCPServerInspector.inspectServer(serverName, serverConfig as any);

              if (inspection && typeof inspection.toolCount === 'number') {
                const metrics: ServerMetrics = {
                  toolCount: inspection.toolCount,
                  tokenUsage: inspection.tokenUsage ?? 0,
                  responseTime: 0,
                  lastUpdated: inspection.timestamp,
                  isConnected: !inspection.error
                };

                // Cache the metrics
                this.setCachedMetrics(serverName, metrics, serverConfig);
                successCount++;
                console.log(`[MetricsService] Successfully cached metrics for ${serverName}`);
              } else {
                // Cache failed attempt to prevent retries
                const failedMetrics: ServerMetrics = {
                  toolCount: undefined as any,
                  tokenUsage: undefined as any,
                  responseTime: 0,
                  lastUpdated: new Date(),
                  isConnected: false
                };
                this.setCachedMetrics(serverName, failedMetrics, serverConfig);
                console.log(`[MetricsService] Cached failed metrics for ${serverName} (will not retry)`);
              }
            } catch (error) {
              console.error(`[MetricsService] Failed to fetch metrics for ${serverName}:`, error);
              // Cache the failure to prevent retries
              const failedMetrics: ServerMetrics = {
                toolCount: undefined as any,
                tokenUsage: undefined as any,
                responseTime: 0,
                lastUpdated: new Date(),
                isConnected: false
              };
              this.setCachedMetrics(serverName, failedMetrics, serverConfig);
            }

            // Add small delay between servers to avoid overwhelming the system
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (clientError) {
          console.error(`[MetricsService] Error processing client ${client.id}:`, clientError);
        }
      }

      console.log(`[MetricsService] Prefetch complete. Processed ${totalServers} servers, ${successCount} successful`);
      console.log(`[MetricsService] Cache now contains ${this.metricsCache.size} entries`);

      // Persist the cache
      this.persistCache();
    } catch (error) {
      console.error('[MetricsService] Failed to prefetch metrics:', error);
    }
  }

  /**
   * Placeholder for real metrics collection.
   * Real metrics are now collected via MCPServerInspector.
   */
  public async collectRealMetrics(serverName: string, serverConfig: any): Promise<ServerMetrics> {
    console.log('[MetricsService] Real metrics collection not yet implemented for:', serverName);
    return this.getServerMetrics(serverName);
  }
}