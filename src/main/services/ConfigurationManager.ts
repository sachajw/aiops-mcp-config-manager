import * as fs from 'fs-extra';
import * as path from 'path';
import { 
  MCPClient, 
  MCPServer,
  Configuration,
  ResolvedConfiguration,
  ConfigurationExport,
  ConfigurationDiff,
  ConfigurationChange,
  ExportMetadata,
  ExportOptions
} from '../../shared/types';
import { ConfigScope } from '../../shared/types/enums';
import { ConfigurationService } from './ConfigurationService';
import { ScopeManager } from './ScopeManager';
import { ClientDetector } from './ClientDetector';
import { FileSystemUtils } from '../utils/fileSystemUtils';
import { MacOSPathResolver } from '../utils/pathResolver';
import { ServerTester, ServerTestResult } from './ServerTester';

/**
 * Main configuration manager that orchestrates all configuration operations
 * Provides high-level CRUD operations for MCP server configurations
 */
export class ConfigurationManager {
  /**
   * Discover all installed MCP clients
   */
  static async discoverClients(): Promise<MCPClient[]> {
    const result = await ClientDetector.discoverClients();
    return result.clients;
  }

  /**
   * Load configuration for a specific client and scope
   */
  static async loadConfiguration(
    client: MCPClient, 
    scope: ConfigScope
  ): Promise<Configuration | null> {
    const configPath = client.configPaths.scopePaths[scope];
    
    if (!await FileSystemUtils.fileExists(configPath)) {
      return null;
    }

    const result = await ConfigurationService.loadConfiguration(configPath, client.type);
    
    if (!result.success || !result.data) {
      throw new Error(`Failed to load configuration: ${result.errors.join(', ')}`);
    }

    return result.data;
  }

  /**
   * Load resolved configuration (merged from all applicable scopes)
   */
  static async loadResolvedConfiguration(client: MCPClient): Promise<ResolvedConfiguration> {
    return ScopeManager.resolveConfiguration(client);
  }

  /**
   * Save configuration to a specific client and scope
   */
  static async saveConfiguration(
    client: MCPClient,
    config: Configuration,
    scope: ConfigScope
  ): Promise<void> {
    const configPath = client.configPaths.scopePaths[scope];
    
    // Ensure directory exists
    await fs.ensureDir(path.dirname(configPath));
    
    // Update metadata
    config.metadata.scope = scope;
    config.metadata.sourcePath = configPath;
    config.metadata.lastModified = new Date();

    const result = await ConfigurationService.saveConfiguration(
      config,
      configPath,
      client.type
    );

    if (!result.success) {
      throw new Error(`Failed to save configuration: ${result.errors.join(', ')}`);
    }
  }

  /**
   * Add or update MCP server in specified scope
   */
  static async addOrUpdateServer(
    client: MCPClient,
    serverName: string,
    serverConfig: MCPServer,
    scope: ConfigScope
  ): Promise<void> {
    // Load existing configuration or create new
    let config = await this.loadConfiguration(client, scope);
    
    if (!config) {
      config = {
        mcpServers: {},
        metadata: {
          lastModified: new Date(),
          version: '1.0.0',
          scope,
          sourcePath: client.configPaths.scopePaths[scope]
        }
      };
    }

    // Add or update server
    config.mcpServers[serverName] = {
      ...serverConfig,
      scope
    };

    // Save configuration
    await this.saveConfiguration(client, config, scope);
  }

  /**
   * Remove MCP server from specified scope
   */
  static async removeServer(
    client: MCPClient,
    serverName: string,
    scope: ConfigScope
  ): Promise<void> {
    const config = await this.loadConfiguration(client, scope);
    
    if (!config || !config.mcpServers[serverName]) {
      throw new Error(`Server '${serverName}' not found in ${scope} scope`);
    }

    delete config.mcpServers[serverName];

    // Save updated configuration or remove file if empty
    if (Object.keys(config.mcpServers).length > 0) {
      await this.saveConfiguration(client, config, scope);
    } else {
      const configPath = client.configPaths.scopePaths[scope];
      if (await FileSystemUtils.fileExists(configPath)) {
        await fs.remove(configPath);
      }
    }
  }

  /**
   * Get effective server configuration (from highest priority scope)
   */
  static async getEffectiveServerConfig(
    client: MCPClient,
    serverName: string
  ): Promise<MCPServer | null> {
    const resolved = await this.loadResolvedConfiguration(client);
    return resolved.servers[serverName] || null;
  }

  /**
   * Migrate server between scopes
   */
  static async migrateServer(
    client: MCPClient,
    serverName: string,
    fromScope: ConfigScope,
    toScope: ConfigScope
  ): Promise<void> {
    await ScopeManager.migrateServerScope(client, serverName, fromScope, toScope);
  }

  /**
   * Test MCP server connection
   */
  static async testServerConnection(
    server: MCPServer, 
    testConnection = false
  ): Promise<ServerTestResult> {
    return ServerTester.testServer(server, {
      testConnection,
      checkCommand: true,
      checkWorkingDirectory: true,
      checkEnvironment: true
    });
  }

  /**
   * Validate all servers in a configuration
   */
  static async validateConfiguration(
    client: MCPClient,
    config: Configuration,
    testConnection = false
  ): Promise<{
    isValid: boolean;
    serverResults: Record<string, ServerTestResult>;
  }> {
    const serverResults: Record<string, ServerTestResult> = {};
    let allValid = true;

    for (const [serverName, server] of Object.entries(config.mcpServers)) {
      const testResult = await this.testServerConnection(server, testConnection);
      serverResults[serverName] = testResult;
      
      if (!testResult.success) {
        allValid = false;
      }
    }

    return {
      isValid: allValid,
      serverResults
    };
  }

  /**
   * Export configurations from multiple clients
   */
  static async exportConfigurations(
    clients: MCPClient[],
    options: ExportOptions = {
      includeSensitiveData: false,
      includeDisabledServers: true,
      includeMetadata: true,
      compress: false
    }
  ): Promise<ConfigurationExport> {
    const configurations: Record<string, Configuration> = {};
    
    for (const client of clients) {
      try {
        const resolved = await this.loadResolvedConfiguration(client);
        
        // Convert resolved configuration back to Configuration format
        const config: Configuration = {
          mcpServers: resolved.servers,
          metadata: {
            lastModified: new Date(),
            version: '1.0.0',
            scope: ConfigScope.USER // Default for export
          }
        };

        // Filter sensitive data if requested
        if (!options.includeSensitiveData) {
          for (const server of Object.values(config.mcpServers)) {
            if (server.env) {
              // Remove potentially sensitive environment variables
              const filteredEnv: Record<string, string> = {};
              for (const [key, value] of Object.entries(server.env)) {
                if (!this.isSensitiveEnvVar(key, value)) {
                  filteredEnv[key] = value;
                }
              }
              server.env = filteredEnv;
            }
          }
        }

        // Filter disabled servers if requested
        if (!options.includeDisabledServers) {
          const enabledServers: Record<string, MCPServer> = {};
          for (const [name, server] of Object.entries(config.mcpServers)) {
            if (server.enabled !== false) {
              enabledServers[name] = server;
            }
          }
          config.mcpServers = enabledServers;
        }

        configurations[client.id] = config;
      } catch (error) {
        console.warn(`Failed to export configuration for ${client.name}:`, error);
      }
    }

    const metadata: ExportMetadata = {
      exportedAt: new Date(),
      version: '1.0.0',
      source: {
        platform: process.platform,
        version: process.version
      },
      clients: clients.map(c => c.id),
      options
    };

    return {
      configurations,
      metadata
    };
  }

  /**
   * Import configurations to multiple clients
   */
  static async importConfigurations(
    exportData: ConfigurationExport,
    clientMappings: Record<string, MCPClient>,
    scope: ConfigScope = ConfigScope.USER,
    mergeStrategy: 'replace' | 'merge' | 'skip-existing' = 'merge'
  ): Promise<{
    successful: string[];
    failed: Array<{ clientId: string; error: string }>;
  }> {
    const successful: string[] = [];
    const failed: Array<{ clientId: string; error: string }> = [];

    for (const [exportedClientId, importConfig] of Object.entries(exportData.configurations)) {
      const targetClient = clientMappings[exportedClientId];
      
      if (!targetClient) {
        failed.push({
          clientId: exportedClientId,
          error: 'Target client not found'
        });
        continue;
      }

      try {
        let finalConfig = importConfig;

        if (mergeStrategy !== 'replace') {
          const existingConfig = await this.loadConfiguration(targetClient, scope);
          
          if (existingConfig) {
            if (mergeStrategy === 'skip-existing') {
              // Only add servers that don't already exist
              const newServers: Record<string, MCPServer> = {};
              for (const [name, server] of Object.entries(importConfig.mcpServers)) {
                if (!existingConfig.mcpServers[name]) {
                  newServers[name] = server;
                }
              }
              finalConfig = {
                ...existingConfig,
                mcpServers: { ...existingConfig.mcpServers, ...newServers }
              };
            } else if (mergeStrategy === 'merge') {
              // Merge configurations, with imported taking precedence
              finalConfig = {
                ...existingConfig,
                mcpServers: { ...existingConfig.mcpServers, ...importConfig.mcpServers }
              };
            }
          }
        }

        await this.saveConfiguration(targetClient, finalConfig, scope);
        successful.push(targetClient.id);

      } catch (error: any) {
        failed.push({
          clientId: exportedClientId,
          error: error.message
        });
      }
    }

    return { successful, failed };
  }

  /**
   * Compare configurations between clients or scopes
   */
  static async compareConfigurations(
    sourceConfig: Configuration,
    targetConfig: Configuration
  ): Promise<ConfigurationDiff> {
    const added: MCPServer[] = [];
    const modified: ConfigurationChange[] = [];
    const removed: MCPServer[] = [];
    const unchanged: string[] = [];

    const sourceServers = sourceConfig.mcpServers;
    const targetServers = targetConfig.mcpServers;

    // Find added and modified servers
    for (const [name, sourceServer] of Object.entries(sourceServers)) {
      const targetServer = targetServers[name];
      
      if (!targetServer) {
        removed.push(sourceServer);
      } else {
        const changedFields = this.getChangedFields(sourceServer, targetServer);
        
        if (changedFields.length > 0) {
          modified.push({
            serverName: name,
            original: sourceServer,
            modified: targetServer,
            changedFields
          });
        } else {
          unchanged.push(name);
        }
      }
    }

    // Find added servers
    for (const [name, targetServer] of Object.entries(targetServers)) {
      if (!sourceServers[name]) {
        added.push(targetServer);
      }
    }

    return { added, modified, removed, unchanged };
  }

  /**
   * Bulk add/remove servers across multiple clients
   */
  static async bulkUpdateServers(
    clients: MCPClient[],
    operation: 'add' | 'remove' | 'update',
    serverName: string,
    serverConfig?: MCPServer,
    scope: ConfigScope = ConfigScope.USER
  ): Promise<{
    successful: string[];
    failed: Array<{ clientId: string; error: string }>;
  }> {
    const successful: string[] = [];
    const failed: Array<{ clientId: string; error: string }> = [];

    for (const client of clients) {
      try {
        switch (operation) {
          case 'add':
          case 'update':
            if (!serverConfig) {
              throw new Error('Server configuration required for add/update operation');
            }
            await this.addOrUpdateServer(client, serverName, serverConfig, scope);
            break;

          case 'remove':
            await this.removeServer(client, serverName, scope);
            break;
        }
        
        successful.push(client.id);

      } catch (error: any) {
        failed.push({
          clientId: client.id,
          error: error.message
        });
      }
    }

    return { successful, failed };
  }

  /**
   * Get all scopes that contain a specific server
   */
  static async getServerScopes(
    client: MCPClient,
    serverName: string
  ): Promise<ConfigScope[]> {
    return ScopeManager.getScopesContainingServer(client, serverName);
  }

  /**
   * Check if environment variable is potentially sensitive
   */
  private static isSensitiveEnvVar(key: string, value: string | null | undefined): boolean {
    const sensitivePatterns = [
      /api[_-]?key/i,
      /secret/i,
      /password/i,
      /token/i,
      /credential/i,
      /private[_-]?key/i
    ];

    return sensitivePatterns.some(pattern => pattern.test(key)) || 
           Boolean(value && value.length > 20 && /^[A-Za-z0-9+/=_-]+$/.test(value));
  }

  /**
   * Get changed fields between two server configurations
   */
  private static getChangedFields(original: MCPServer, modified: MCPServer): string[] {
    const changed: string[] = [];
    
    const fields: Array<keyof MCPServer> = ['command', 'args', 'env', 'cwd', 'enabled'];
    
    for (const field of fields) {
      if (JSON.stringify(original[field]) !== JSON.stringify(modified[field])) {
        changed.push(field);
      }
    }

    return changed;
  }
}