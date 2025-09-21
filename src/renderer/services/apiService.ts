/**
 * Unified API Service for all UI components
 * Provides real data from backend services through IPC
 * NO MOCK DATA - All data comes from real sources
 * ENHANCED: With intelligent caching and retry logic
 */

import { IPC_CHANNELS } from '@/shared/types/ipc.new';
import { cacheManager, CacheKeys } from '@/shared/utils/CacheManager';
import { RetryManager } from '@/shared/utils/RetryManager';

export class ApiService {
  private static instance: ApiService;
  private readonly CACHE_TTL = {
    CLIENTS: 10 * 60 * 1000,     // 10 minutes
    SERVERS: 5 * 60 * 1000,       // 5 minutes
    METRICS: 30 * 1000,           // 30 seconds
    DISCOVERY: 30 * 60 * 1000,    // 30 minutes
    CONFIGURATION: 2 * 60 * 1000, // 2 minutes
    SETTINGS: 5 * 60 * 1000       // 5 minutes
  };

  static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  /**
   * Helper to execute IPC calls with retry logic
   */
  private async invokeWithRetry<T>(channel: string, data: any): Promise<T> {
    return RetryManager.execute(
      () => window.electronAPI.invoke?.(channel, data) ?? Promise.reject(new Error('electronAPI.invoke not available')),
      {
        maxAttempts: 3,
        initialDelay: 500,
        onRetry: (attempt, error) => {
          console.warn(`Retrying ${channel} (attempt ${attempt}):`, error.message);
        }
      }
    );
  }

  // ============================================================
  // Configuration API
  // ============================================================

  async getConfiguration(clientId: string, scope?: string, forceRefresh = false) {
    const key = CacheKeys.configuration(clientId);
    return cacheManager.get(
      key,
      () => window.electronAPI.invoke?.(IPC_CHANNELS.CONFIG.READ, {
        clientId,
        scope
      }) ?? Promise.reject(new Error('electronAPI.invoke not available')),
      { ttl: this.CACHE_TTL.CONFIGURATION, forceRefresh }
    );
  }

  async getAllConfigurations(clientId?: string, forceRefresh = false) {
    const key = clientId ? `configs:${clientId}` : 'configs:all';
    return cacheManager.get(
      key,
      () => window.electronAPI.invoke?.(IPC_CHANNELS.CONFIG.READ_ALL, {
        clientId
      }) ?? Promise.reject(new Error('electronAPI.invoke not available')),
      { ttl: this.CACHE_TTL.CONFIGURATION, forceRefresh }
    );
  }

  async saveConfiguration(clientId: string, config: any, scope: string) {
    const result = await this.invokeWithRetry(IPC_CHANNELS.CONFIG.WRITE, {
      clientId,
      config,
      scope
    });
    // Invalidate cache after successful save
    cacheManager.invalidate(CacheKeys.configuration(clientId));
    cacheManager.invalidatePattern(`configs:`);
    return result;
  }

  async updateConfiguration(clientId: string, updates: any, scope: string) {
    return window.electronAPI.invoke?.(IPC_CHANNELS.CONFIG.UPDATE, {
      clientId,
      updates,
      scope
    }) ?? Promise.reject(new Error('electronAPI.invoke not available'));
  }

  async deleteConfiguration(clientId: string, scope: string) {
    return window.electronAPI.invoke?.(IPC_CHANNELS.CONFIG.DELETE, {
      clientId,
      scope
    }) ?? Promise.reject(new Error('electronAPI.invoke not available'));
  }

  async validateConfiguration(config: any) {
    return window.electronAPI.invoke?.(IPC_CHANNELS.CONFIG.VALIDATE, {
      config
    }) ?? Promise.reject(new Error('electronAPI.invoke not available'));
  }

  async importConfiguration(path: string, clientId: string, scope: string) {
    return window.electronAPI.invoke?.(IPC_CHANNELS.CONFIG.IMPORT, {
      path,
      clientId,
      scope
    }) ?? Promise.reject(new Error('electronAPI.invoke not available'));
  }

  async exportConfiguration(clientId: string, scope: string, path: string) {
    return window.electronAPI.invoke?.(IPC_CHANNELS.CONFIG.EXPORT, {
      clientId,
      scope,
      path
    }) ?? Promise.reject(new Error('electronAPI.invoke not available'));
  }

  async syncConfiguration(source: any, target: any, strategy: string) {
    return window.electronAPI.invoke?.(IPC_CHANNELS.CONFIG.SYNC, {
      source,
      target,
      strategy
    }) ?? Promise.reject(new Error('electronAPI.invoke not available'));
  }

  // ============================================================
  // Server API
  // ============================================================

  async listServers(clientId?: string, filters?: any, forceRefresh = false) {
    const key = CacheKeys.servers(clientId);
    return cacheManager.get(
      key,
      () => window.electronAPI.invoke?.(IPC_CHANNELS.SERVER.LIST, {
        clientId,
        ...filters
      }) ?? Promise.reject(new Error('electronAPI.invoke not available')),
      { ttl: this.CACHE_TTL.SERVERS, forceRefresh }
    );
  }

  async discoverServers(forceRefresh = false) {
    const key = CacheKeys.discovery();
    return cacheManager.get(
      key,
      () => window.electronAPI.invoke?.(IPC_CHANNELS.SERVER.DISCOVER, {}) ?? Promise.reject(new Error('electronAPI.invoke not available')),
      { ttl: this.CACHE_TTL.DISCOVERY, forceRefresh }
    );
  }

  async searchServers(query: string, filters?: any) {
    return window.electronAPI.invoke?.(IPC_CHANNELS.SERVER.SEARCH, {
      query,
      ...filters
    }) ?? Promise.reject(new Error('electronAPI.invoke not available'));
  }

  async connectServer(serverId: string, clientId: string) {
    return window.electronAPI.invoke?.(IPC_CHANNELS.SERVER.CONNECT, {
      serverId,
      clientId
    }) ?? Promise.reject(new Error('electronAPI.invoke not available'));
  }

  async disconnectServer(serverId: string) {
    return window.electronAPI.invoke?.(IPC_CHANNELS.SERVER.DISCONNECT, {
      serverId
    }) ?? Promise.reject(new Error('electronAPI.invoke not available'));
  }

  async addServer(clientId: string, server: any) {
    return window.electronAPI.invoke?.(IPC_CHANNELS.SERVER.ADD, {
      clientId,
      server
    }) ?? Promise.reject(new Error('electronAPI.invoke not available'));
  }

  async updateServer(serverId: string, updates: any) {
    return window.electronAPI.invoke?.(IPC_CHANNELS.SERVER.UPDATE, {
      serverId,
      updates
    }) ?? Promise.reject(new Error('electronAPI.invoke not available'));
  }

  async removeServer(serverId: string, clientId: string) {
    return window.electronAPI.invoke?.(IPC_CHANNELS.SERVER.REMOVE, {
      serverId,
      clientId
    }) ?? Promise.reject(new Error('electronAPI.invoke not available'));
  }

  async getServerStatus(serverId: string) {
    return window.electronAPI.invoke?.(IPC_CHANNELS.SERVER.GET_STATUS, {
      serverId
    }) ?? Promise.reject(new Error('electronAPI.invoke not available'));
  }

  async getServerMetrics(serverId: string) {
    return window.electronAPI.invoke?.(IPC_CHANNELS.SERVER.GET_METRICS, {
      serverId
    }) ?? Promise.reject(new Error('electronAPI.invoke not available'));
  }

  async getServerLogs(serverId: string, options?: any) {
    return window.electronAPI.invoke?.(IPC_CHANNELS.SERVER.GET_LOGS, {
      serverId,
      ...options
    }) ?? Promise.reject(new Error('electronAPI.invoke not available'));
  }

  async bulkConnectServers(serverIds: string[]) {
    return window.electronAPI.invoke?.(IPC_CHANNELS.SERVER.BULK_CONNECT, {
      serverIds
    }) ?? Promise.reject(new Error('electronAPI.invoke not available'));
  }

  async bulkDisconnectServers(serverIds: string[]) {
    return window.electronAPI.invoke?.(IPC_CHANNELS.SERVER.BULK_DISCONNECT, {
      serverIds
    }) ?? Promise.reject(new Error('electronAPI.invoke not available'));
  }

  // ============================================================
  // Client API
  // ============================================================

  async discoverClients() {
    return window.electronAPI.invoke?.(IPC_CHANNELS.CLIENT.DISCOVER, {}) ?? Promise.reject(new Error('electronAPI.invoke not available'));
  }

  async detectClient(clientId: string) {
    return window.electronAPI.invoke?.(IPC_CHANNELS.CLIENT.DETECT, {
      clientId
    }) ?? Promise.reject(new Error('electronAPI.invoke not available'));
  }

  async getClientInfo(clientId: string) {
    return window.electronAPI.invoke?.(IPC_CHANNELS.CLIENT.GET_INFO, {
      clientId
    }) ?? Promise.reject(new Error('electronAPI.invoke not available'));
  }

  async validateClient(clientId: string) {
    return window.electronAPI.invoke?.(IPC_CHANNELS.CLIENT.VALIDATE, {
      clientId
    }) ?? Promise.reject(new Error('electronAPI.invoke not available'));
  }

  async getClientConfig(clientId: string) {
    return window.electronAPI.invoke?.(IPC_CHANNELS.CLIENT.GET_CONFIG, {
      clientId
    }) ?? Promise.reject(new Error('electronAPI.invoke not available'));
  }

  async setClientConfig(clientId: string, config: any) {
    return window.electronAPI.invoke?.(IPC_CHANNELS.CLIENT.SET_CONFIG, {
      clientId,
      config
    }) ?? Promise.reject(new Error('electronAPI.invoke not available'));
  }

  async openClientConfig(clientId: string) {
    return window.electronAPI.invoke?.(IPC_CHANNELS.CLIENT.OPEN_CONFIG, {
      clientId
    }) ?? Promise.reject(new Error('electronAPI.invoke not available'));
  }

  // ============================================================
  // System API
  // ============================================================

  async getSystemInfo() {
    return window.electronAPI.invoke?.(IPC_CHANNELS.SYSTEM.GET_INFO, {}) ?? Promise.reject(new Error('electronAPI.invoke not available'));
  }

  async getSettings() {
    return window.electronAPI.invoke?.(IPC_CHANNELS.SYSTEM.GET_SETTINGS, {}) ?? Promise.reject(new Error('electronAPI.invoke not available'));
  }

  async setSettings(settings: any) {
    return window.electronAPI.invoke?.(IPC_CHANNELS.SYSTEM.SET_SETTINGS, {
      settings
    }) ?? Promise.reject(new Error('electronAPI.invoke not available'));
  }

  async resetSettings() {
    return window.electronAPI.invoke?.(IPC_CHANNELS.SYSTEM.RESET_SETTINGS, {}) ?? Promise.reject(new Error('electronAPI.invoke not available'));
  }

  async openExternal(url: string) {
    return window.electronAPI.invoke?.(IPC_CHANNELS.SYSTEM.OPEN_EXTERNAL, {
      url
    }) ?? Promise.reject(new Error('electronAPI.invoke not available'));
  }

  async selectFile(options?: any) {
    return window.electronAPI.invoke?.(IPC_CHANNELS.SYSTEM.SELECT_FILE, options) ?? Promise.reject(new Error('electronAPI.invoke not available'));
  }

  async selectDirectory(options?: any) {
    return window.electronAPI.invoke?.(IPC_CHANNELS.SYSTEM.SELECT_DIRECTORY, options) ?? Promise.reject(new Error('electronAPI.invoke not available'));
  }

  // ============================================================
  // Discovery API
  // ============================================================

  async getCatalog() {
    return window.electronAPI.invoke?.(IPC_CHANNELS.DISCOVERY.GET_CATALOG, {}) ?? Promise.reject(new Error('electronAPI.invoke not available'));
  }

  async refreshCatalog() {
    return window.electronAPI.invoke?.(IPC_CHANNELS.DISCOVERY.REFRESH_CATALOG, {}) ?? Promise.reject(new Error('electronAPI.invoke not available'));
  }

  async searchDiscoveryServers(query: string) {
    return window.electronAPI.invoke?.(IPC_CHANNELS.DISCOVERY.SEARCH_SERVERS, {
      query
    }) ?? Promise.reject(new Error('electronAPI.invoke not available'));
  }

  async getServerDetails(serverId: string) {
    return window.electronAPI.invoke?.(IPC_CHANNELS.DISCOVERY.GET_SERVER_DETAILS, {
      serverId
    }) ?? Promise.reject(new Error('electronAPI.invoke not available'));
  }

  async installDiscoveryServer(serverId: string, clientId: string) {
    return window.electronAPI.invoke?.(IPC_CHANNELS.DISCOVERY.INSTALL_SERVER, {
      serverId,
      clientId
    }) ?? Promise.reject(new Error('electronAPI.invoke not available'));
  }

  async uninstallDiscoveryServer(serverId: string) {
    return window.electronAPI.invoke?.(IPC_CHANNELS.DISCOVERY.UNINSTALL_SERVER, {
      serverId
    }) ?? Promise.reject(new Error('electronAPI.invoke not available'));
  }

  async getCategories() {
    return window.electronAPI.invoke?.(IPC_CHANNELS.DISCOVERY.GET_CATEGORIES, {}) ?? Promise.reject(new Error('electronAPI.invoke not available'));
  }

  async getServersByCategory(category: string) {
    return window.electronAPI.invoke?.(IPC_CHANNELS.DISCOVERY.GET_SERVERS_BY_CATEGORY, {
      category
    }) ?? Promise.reject(new Error('electronAPI.invoke not available'));
  }

  // ============================================================
  // Event Subscriptions
  // ============================================================

  subscribeToServerEvents(callback: (event: any) => void) {
    const unsubscribers = [
      window.electronAPI.on?.(IPC_CHANNELS.EVENTS.SERVER_CONNECTED, callback),
      window.electronAPI.on?.(IPC_CHANNELS.EVENTS.SERVER_DISCONNECTED, callback),
      window.electronAPI.on?.(IPC_CHANNELS.EVENTS.SERVER_ERROR, callback)
    ];

    return () => {
      unsubscribers.forEach(unsub => unsub?.());
    };
  }

  subscribeToConfigEvents(callback: (event: any) => void) {
    const unsubscribers = [
      window.electronAPI.on?.(IPC_CHANNELS.EVENTS.CONFIG_SAVED, callback),
      window.electronAPI.on?.(IPC_CHANNELS.EVENTS.CONFIG_LOADED, callback),
      window.electronAPI.on?.(IPC_CHANNELS.EVENTS.CONFIG_ERROR, callback)
    ];

    return () => {
      unsubscribers.forEach(unsub => unsub?.());
    };
  }

  subscribeToClientEvents(callback: (event: any) => void) {
    const unsubscribers = [
      window.electronAPI.on?.(IPC_CHANNELS.EVENTS.CLIENT_DISCOVERED, callback),
      window.electronAPI.on?.(IPC_CHANNELS.EVENTS.CLIENT_REMOVED, callback)
    ];

    return () => {
      unsubscribers.forEach(unsub => unsub?.());
    };
  }

  subscribeToSystemEvents(callback: (event: any) => void) {
    const unsubscribers = [
      window.electronAPI.on?.(IPC_CHANNELS.EVENTS.SETTINGS_CHANGED, callback),
      window.electronAPI.on?.(IPC_CHANNELS.EVENTS.UPDATE_AVAILABLE, callback),
      window.electronAPI.on?.(IPC_CHANNELS.EVENTS.UPDATE_DOWNLOADED, callback)
    ];

    return () => {
      unsubscribers.forEach(unsub => unsub?.());
    };
  }
}

// Export singleton instance
export const apiService = ApiService.getInstance();