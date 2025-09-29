/**
 * Dependency Injection Container
 * Provides centralized service management for better testability and maintainability
 */

import { ConfigurationManager } from './services/ConfigurationManager';
import { ClientDetector } from './services/ClientDetector';
import { ClientDetectorV2 } from './services/ClientDetectorV2';
import { ValidationEngine } from './services/ValidationEngine';
import { BackupManager } from './services/BackupManager';
import { FileMonitor } from './services/FileMonitor';
import { ScopeManager } from './services/ScopeManager';
import { ConfigurationParser } from './services/ConfigurationParser';
import { MCPClient } from './services/MCPClient';
import { MCPConnectionPool, connectionPool } from './services/MCPConnectionPool';
import { ConnectionMonitor } from './services/ConnectionMonitor';
import { MetricsService } from './services/MetricsService';
import { ServerCatalogService } from './services/ServerCatalogService';
import { McpDiscoveryService } from './services/McpDiscoveryService';
import { UnifiedConfigService } from './services/UnifiedConfigService';

/**
 * Service interfaces for loose coupling
 */
export interface IConfigurationManager {
  readConfiguration(clientId: string, scope?: string): Promise<any>;
  writeConfiguration(clientId: string, config: any, scope?: string): Promise<void>;
  deleteConfiguration(clientId: string, scope?: string): Promise<void>;
  validateConfiguration(config: any): Promise<any>;
}

export interface IClientDetector {
  detectClients(): Promise<any>;
  detectClient(clientType: string): Promise<any>;
  isClientActive(clientId: string): Promise<boolean>;
  validateClient(client: any): Promise<any>;
}

export interface IValidationEngine {
  validate(data: any, schema?: any): Promise<any>;
  validateConfiguration(config: any): Promise<any>;
  validateServer(server: any): Promise<any>;
}

export interface IBackupManager {
  createBackup(clientId: string, config: any): Promise<string>;
  restoreBackup(backupId: string): Promise<void>;
  listBackups(clientId?: string): Promise<any[]>;
  deleteBackup(backupId: string): Promise<void>;
}

export interface IMetricsService {
  getServerMetrics(serverName: string, forceRefresh?: boolean, allowStale?: boolean): any;
  getTotalMetrics(serverNames: string[]): any;
  updateServerMetrics(serverName: string, metrics: any): void;
  clearMetrics(): void;
  getCachedMetrics(serverName: string, maxAge?: number): any;
  getCachedMetricsStale(serverName: string): any;
  hasFreshCache(serverName: string, maxAge?: number): boolean;
  setCachedMetrics(serverName: string, metrics: any, serverConfig: any): void;
  forceRefreshMetrics(serverName: string): any;
  getServerMetricsCacheFirst(serverName: string): any;
  scheduleBackgroundRefresh(serverNames: string[], serverConfigs: Record<string, any>): Promise<void>;
  clearCacheForServer(serverName: string): void;
  getCacheStats(): { total: number; fresh: number; stale: number };
  prefetchMetricsForAllServers(): Promise<void>;
}

/**
 * Service container configuration
 */
interface ServiceConfig {
  mock?: boolean;
  testMode?: boolean;
  configPath?: string;
  useImprovedServices?: boolean;  // Use V2 services when available
}

/**
 * Dependency Injection Container
 */
export class DIContainer {
  private static instance: DIContainer;
  private services: Map<string, any> = new Map();
  private factories: Map<string, () => any> = new Map();
  private config: ServiceConfig;

  private constructor(config: ServiceConfig = {}) {
    this.config = config;
    this.registerServices();
  }

  /**
   * Get container instance
   */
  static getInstance(config?: ServiceConfig): DIContainer {
    if (!DIContainer.instance) {
      DIContainer.instance = new DIContainer(config);
    }
    return DIContainer.instance;
  }

  /**
   * Reset container (useful for testing)
   */
  static reset(): void {
    if (DIContainer.instance) {
      DIContainer.instance.dispose();
      DIContainer.instance = null as any;
    }
  }

  /**
   * Register all services
   */
  private registerServices(): void {
    // Register singleton services
    this.registerSingleton('configurationParser', () => new ConfigurationParser());
    // ValidationEngine uses static methods, create wrapper
    this.registerSingleton('validationEngine', () => ({
      validate: (data: any, schema?: any) => ValidationEngine.validateConfiguration(data, { clientType: 'claude-desktop' as any }),
      validateConfiguration: (config: any) => ValidationEngine.validateConfiguration(config, { clientType: 'claude-desktop' as any }),
      validateServer: (server: any) => ValidationEngine.validateServer(server, server.name || 'unknown', { clientType: 'claude-desktop' as any })
    }));
    this.registerSingleton('scopeManager', () => new ScopeManager());
    this.registerSingleton('fileMonitor', () => new FileMonitor());
    this.registerSingleton('metricsService', () => new MetricsService());
    this.registerSingleton('serverCatalog', () => new ServerCatalogService());
    this.registerSingleton('discoveryService', () => new McpDiscoveryService());

    // Register connection pool for MCP clients
    this.registerSingleton('connectionPool', () => connectionPool);

    // Register transient services (new instance each time)
    // Note: MCPClient requires config, so we'll create it on-demand with config
    this.registerTransient('mcpClient', () => null); // Will need config at creation time
    this.registerTransient('connectionMonitor', () => new ConnectionMonitor());

    // Register services with dependencies
    // Use new instance-based ClientDetectorV2 with caching
    this.registerSingleton('clientDetectorV2', () => new ClientDetectorV2());

    // Keep old ClientDetector wrapper for backward compatibility
    this.registerSingleton('clientDetector', () => {
      // Use V2 if available, otherwise fall back to static methods
      const useV2 = this.config.useImprovedServices ?? true;

      if (useV2) {
        const v2 = this.get<ClientDetectorV2>('clientDetectorV2');
        return {
          detectClients: () => v2.discoverClients(),
          detectClient: async (clientType: string) => {
            const result = await v2.discoverClients();
            return result.clients.find(c => c.type === clientType);
          },
          isClientActive: async (clientId: string) => {
            const client = await v2.getClientDetails(clientId);
            return client ? (client.status === 'active' || client.isActive === true) : false;
          },
          validateClient: (client: any) => v2.validateClient(client)
        };
      }

      // Fallback to static methods
      return {
        detectClients: () => ClientDetector.discoverClients(),
        detectClient: async (clientType: string) => {
          const result = await ClientDetector.discoverClients();
          return result.clients.find(c => c.type === clientType);
        },
        isClientActive: async (clientId: string) => {
          const client = await ClientDetector.getClientDetails(clientId);
          return client ? client.status === 'active' : false;
        },
        validateClient: (client: any) => ClientDetector.validateClient(client)
      };
    });

    // ConfigurationManager uses static methods, create wrapper
    this.registerSingleton('configurationManager', () => ({
      readConfiguration: async (clientId: string, scope?: string) => {
        const client = await ClientDetector.getClientDetails(clientId);
        if (!client) throw new Error(`Client not found: ${clientId}`);
        return ConfigurationManager.loadConfiguration(client, scope as any);
      },
      writeConfiguration: async (clientId: string, config: any, scope?: string) => {
        const client = await ClientDetector.getClientDetails(clientId);
        if (!client) throw new Error(`Client not found: ${clientId}`);
        return ConfigurationManager.saveConfiguration(client, config, scope as any);
      },
      deleteConfiguration: async (clientId: string, scope?: string) => {
        const client = await ClientDetector.getClientDetails(clientId);
        if (client) {
          const emptyConfig = { mcpServers: {}, metadata: { version: '1.0', scope: scope || 'user', lastModified: new Date() } };
          await ConfigurationManager.saveConfiguration(client, emptyConfig as any, scope as any);
        }
      },
      validateConfiguration: async (config: any) => {
        // Need to get a client for validation context
        const result = await ClientDetector.discoverClients();
        const client = result.clients[0] || { type: 'claude-desktop' };
        return ConfigurationManager.validateConfiguration(client as any, config);
      }
    }));

    // BackupManager uses static methods, create wrapper
    this.registerSingleton('backupManager', () => ({
      createBackup: async (clientId: string, config: any) => {
        const client = await ClientDetector.getClientDetails(clientId);
        if (!client) throw new Error(`Client not found: ${clientId}`);
        // Create backup of client's config file
        const configPath = client.configPaths?.primary || '';
        return BackupManager.createBackup(configPath, 'manual' as any, client);
      },
      restoreBackup: async (backupId: string) => {
        // Find backup and restore it
        const backups = await BackupManager.listBackups({});
        const backup = backups.find((b: any) => b.id === backupId);
        if (backup) {
          return BackupManager.restoreFromBackup(backup, '');
        }
        throw new Error(`Backup not found: ${backupId}`);
      },
      listBackups: (clientId?: string) => BackupManager.listBackups({}),
      deleteBackup: async (backupId: string) => {
        // Delete backups by ID pattern
        await BackupManager.deleteBackups([backupId]);
      }
    }));

    this.registerSingleton('unifiedConfigService', () => new UnifiedConfigService());
  }

  /**
   * Register a singleton service
   */
  registerSingleton<T>(name: string, factory: () => T): void {
    this.factories.set(name, () => {
      if (!this.services.has(name)) {
        this.services.set(name, factory());
      }
      return this.services.get(name);
    });
  }

  /**
   * Register a transient service
   */
  registerTransient<T>(name: string, factory: () => T): void {
    this.factories.set(name, factory);
  }

  /**
   * Register a service instance
   */
  registerInstance<T>(name: string, instance: T): void {
    this.services.set(name, instance);
  }

  /**
   * Get a service
   */
  get<T>(name: string): T {
    const factory = this.factories.get(name);
    if (!factory) {
      throw new Error(`Service '${name}' not registered`);
    }
    return factory();
  }

  /**
   * Get service with type safety
   */
  getConfigurationManager(): IConfigurationManager {
    return this.get<IConfigurationManager>('configurationManager');
  }

  getClientDetector(): IClientDetector {
    return this.get<IClientDetector>('clientDetector');
  }

  getValidationEngine(): IValidationEngine {
    return this.get<IValidationEngine>('validationEngine');
  }

  getBackupManager(): IBackupManager {
    return this.get<IBackupManager>('backupManager');
  }

  getMetricsService(): IMetricsService {
    return this.get<IMetricsService>('metricsService');
  }

  /**
   * Check if service is registered
   */
  has(name: string): boolean {
    return this.factories.has(name);
  }

  /**
   * Dispose of all services
   */
  dispose(): void {
    // Call dispose on services that need cleanup
    const disposableServices = [
      'fileMonitor',
      'connectionMonitor',
      'mcpClient'
    ];

    for (const serviceName of disposableServices) {
      try {
        const service = this.services.get(serviceName);
        if (service && typeof service.dispose === 'function') {
          service.dispose();
        }
      } catch (error) {
        console.error(`Error disposing service ${serviceName}:`, error);
      }
    }

    this.services.clear();
    this.factories.clear();
  }

  /**
   * Get container configuration
   */
  getConfig(): ServiceConfig {
    return { ...this.config };
  }

  /**
   * Update container configuration
   */
  updateConfig(config: Partial<ServiceConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// Export singleton instance
export const container = DIContainer.getInstance();

/**
 * Service locator pattern (for gradual migration)
 * Use this to get services in existing code during migration
 */
export const ServiceLocator = {
  getConfigurationManager: () => container.getConfigurationManager(),
  getClientDetector: () => container.getClientDetector(),
  getValidationEngine: () => container.getValidationEngine(),
  getBackupManager: () => container.getBackupManager(),
  getMetricsService: () => container.getMetricsService(),
  get: <T>(name: string) => container.get<T>(name),
  reset: () => DIContainer.reset()
};

/**
 * Decorator for dependency injection
 */
export function Injectable(target: any) {
  // Mark class as injectable
  (target as any).__injectable = true;
  return target;
}

/**
 * Decorator for injecting dependencies
 */
export function Inject(serviceName: string) {
  return function (target: any, propertyKey: string) {
    Object.defineProperty(target, propertyKey, {
      get: () => container.get(serviceName),
      enumerable: true,
      configurable: true
    });
  };
}