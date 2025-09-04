import * as fs from 'fs-extra';
import { 
  MCPClient, 
  Configuration, 
  ResolvedConfiguration, 
  ScopeConflict, 
  ScopeConfigEntry,
  ConfigurationMetadata,
  ResolutionMetadata,
  ConflictResolutionStrategy
} from '../../shared/types';
import { ConfigScope } from '../../shared/types/enums';
import { MCPServer } from '../../shared/types/server';
import { MacOSPathResolver } from '../utils/pathResolver';
import { FileSystemUtils } from '../utils/fileSystemUtils';
import { ConfigurationParser } from './ConfigurationParser';

/**
 * Configuration Scope Management System
 * Handles scope hierarchy resolution, conflict detection, and scope migrations
 */
export class ScopeManager {
  /**
   * Scope priority mapping (higher number = higher priority)
   */
  private static readonly SCOPE_PRIORITIES: Record<ConfigScope, number> = {
    [ConfigScope.GLOBAL]: 1,
    [ConfigScope.USER]: 2,
    [ConfigScope.LOCAL]: 3,
    [ConfigScope.PROJECT]: 4
  };

  /**
   * Resolve configuration by merging all applicable scopes
   */
  static async resolveConfiguration(client: MCPClient): Promise<ResolvedConfiguration> {
    const resolvedAt = new Date();
    const mergedServers: Record<string, MCPServer> = {};
    const conflicts: ScopeConflict[] = [];
    const sources: Record<string, ConfigScope> = {};
    const mergedScopes: ConfigScope[] = [];

    // Load configurations from all scopes in priority order
    const scopeConfigurations = await this.loadAllScopeConfigurations(client);

    // Track servers by name to detect conflicts
    const serversByName: Record<string, ScopeConfigEntry[]> = {};

    // Process configurations in priority order (lowest to highest)
    const sortedScopes = Object.entries(scopeConfigurations)
      .sort(([, a], [, b]) => this.SCOPE_PRIORITIES[a.scope] - this.SCOPE_PRIORITIES[b.scope]);

    for (const [scopeName, config] of sortedScopes) {
      if (!config || !config.mcpServers) continue;

      const scope = config.metadata.scope;
      mergedScopes.push(scope);

      // Process each server in the configuration
      for (const [serverName, server] of Object.entries(config.mcpServers)) {
        const scopeEntry: ScopeConfigEntry = {
          scope,
          config: { ...server, scope },
          priority: this.SCOPE_PRIORITIES[scope],
          sourcePath: config.metadata.sourcePath || ''
        };

        // Track this server configuration
        if (!serversByName[serverName]) {
          serversByName[serverName] = [];
        }
        serversByName[serverName].push(scopeEntry);

        // Add or override in merged configuration (higher priority wins)
        mergedServers[serverName] = scopeEntry.config;
        sources[serverName] = scope;
      }
    }

    // Detect conflicts (servers defined in multiple scopes)
    for (const [serverName, entries] of Object.entries(serversByName)) {
      if (entries.length > 1) {
        const conflict: ScopeConflict = {
          serverName,
          scopes: entries,
          activeConfig: entries[entries.length - 1].config, // Highest priority
          resolutionStrategy: ConflictResolutionStrategy.PRIORITY
        };
        conflicts.push(conflict);
      }
    }

    const metadata: ResolutionMetadata = {
      resolvedAt,
      mergedScopes,
      serverCount: Object.keys(mergedServers).length,
      conflictCount: conflicts.length
    };

    return {
      servers: mergedServers,
      conflicts,
      sources,
      metadata
    };
  }

  /**
   * Load configuration from all applicable scopes
   */
  private static async loadAllScopeConfigurations(
    client: MCPClient
  ): Promise<Record<string, Configuration | null>> {
    const configurations: Record<string, Configuration | null> = {};
    const configPaths = client.configPaths;

    // Load from each scope
    for (const scope of Object.values(ConfigScope)) {
      const scopePath = configPaths.scopePaths[scope];
      
      try {
        if (await FileSystemUtils.fileExists(scopePath)) {
          const parsed = await ConfigurationParser.parseConfiguration(scopePath);
          if (parsed.success && parsed.configuration) {
            // Ensure metadata has correct scope
            const config: Configuration = {
              ...parsed.configuration,
              metadata: {
                ...parsed.configuration.metadata,
                scope,
                sourcePath: scopePath
              }
            };
            configurations[scope] = config;
          }
        }
      } catch (error) {
        console.warn(`Failed to load ${scope} configuration from ${scopePath}:`, error);
        configurations[scope] = null;
      }
    }

    return configurations;
  }

  /**
   * Get configuration paths for a client
   */
  static getConfigurationPaths(client: MCPClient): typeof client.configPaths {
    return MacOSPathResolver.getClientConfigurationPaths(client.type);
  }

  /**
   * Detect scope conflicts for a specific server
   */
  static async detectScopeConflicts(
    client: MCPClient, 
    serverName: string
  ): Promise<ScopeConflict[]> {
    const resolved = await this.resolveConfiguration(client);
    return resolved.conflicts.filter(conflict => conflict.serverName === serverName);
  }

  /**
   * Migrate server from one scope to another
   */
  static async migrateServerScope(
    client: MCPClient,
    serverName: string,
    fromScope: ConfigScope,
    toScope: ConfigScope
  ): Promise<void> {
    // Load source configuration
    const sourcePath = client.configPaths.scopePaths[fromScope];
    const targetPath = client.configPaths.scopePaths[toScope];

    if (!await FileSystemUtils.fileExists(sourcePath)) {
      throw new Error(`Source configuration not found at ${sourcePath}`);
    }

    const sourceResult = await ConfigurationParser.parseConfiguration(sourcePath);
    if (!sourceResult.success || !sourceResult.configuration) {
      throw new Error(`Failed to parse source configuration: ${sourceResult.errors?.join(', ')}`);
    }

    const sourceConfig = sourceResult.configuration;
    const serverConfig = sourceConfig.mcpServers[serverName];

    if (!serverConfig) {
      throw new Error(`Server '${serverName}' not found in ${fromScope} scope`);
    }

    // Load or create target configuration
    let targetConfig: Configuration;
    
    if (await FileSystemUtils.fileExists(targetPath)) {
      const targetResult = await ConfigurationParser.parseConfiguration(targetPath);
      if (!targetResult.success || !targetResult.configuration) {
        throw new Error(`Failed to parse target configuration: ${targetResult.errors?.join(', ')}`);
      }
      targetConfig = targetResult.configuration;
    } else {
      // Create new configuration
      targetConfig = {
        mcpServers: {},
        metadata: {
          lastModified: new Date(),
          version: '1.0.0',
          scope: toScope,
          sourcePath: targetPath
        }
      };
    }

    // Add server to target scope with updated scope
    targetConfig.mcpServers[serverName] = {
      ...serverConfig,
      scope: toScope
    };
    targetConfig.metadata.lastModified = new Date();

    // Remove server from source scope
    delete sourceConfig.mcpServers[serverName];
    sourceConfig.metadata.lastModified = new Date();

    // Ensure target directory exists
    await fs.ensureDir(require('path').dirname(targetPath));

    // Save both configurations
    await FileSystemUtils.writeJsonFile(targetPath, targetConfig);
    
    // Only update source if it still has servers, otherwise remove the file
    if (Object.keys(sourceConfig.mcpServers).length > 0) {
      await FileSystemUtils.writeJsonFile(sourcePath, sourceConfig);
    } else {
      await fs.remove(sourcePath);
    }
  }

  /**
   * Resolve conflicts using specified strategy
   */
  static async resolveConflicts(
    client: MCPClient,
    conflicts: ScopeConflict[],
    strategy: ConflictResolutionStrategy
  ): Promise<ResolvedConfiguration> {
    for (const conflict of conflicts) {
      switch (strategy) {
        case ConflictResolutionStrategy.PRIORITY:
          // Already handled by default resolution
          break;

        case ConflictResolutionStrategy.MERGE:
          await this.mergeConflictingConfigurations(client, conflict);
          break;

        case ConflictResolutionStrategy.KEEP_EXISTING:
          // Keep the lowest priority configuration
          const lowestPriority = conflict.scopes.reduce((min, entry) => 
            entry.priority < min.priority ? entry : min
          );
          await this.promoteConfigurationToHigherScope(client, conflict.serverName, lowestPriority.scope);
          break;

        case ConflictResolutionStrategy.MANUAL:
          // Manual resolution requires UI interaction
          throw new Error('Manual conflict resolution requires user interaction');
      }
    }

    // Re-resolve after conflict resolution
    return this.resolveConfiguration(client);
  }

  /**
   * Merge conflicting configurations by combining properties
   */
  private static async mergeConflictingConfigurations(
    client: MCPClient,
    conflict: ScopeConflict
  ): Promise<void> {
    // Use the highest priority as base and merge properties from lower scopes
    const highestPriorityEntry = conflict.scopes.reduce((max, entry) =>
      entry.priority > max.priority ? entry : max
    );

    const mergedConfig: MCPServer = { ...highestPriorityEntry.config };

    // Merge environment variables from all scopes
    const mergedEnv: Record<string, string> = {};
    for (const entry of conflict.scopes.sort((a, b) => a.priority - b.priority)) {
      Object.assign(mergedEnv, entry.config.env || {});
    }
    mergedConfig.env = mergedEnv;

    // Update the highest priority configuration with merged result
    const targetPath = client.configPaths.scopePaths[highestPriorityEntry.scope];
    const configResult = await ConfigurationParser.parseConfiguration(targetPath);
    
    if (configResult.success && configResult.configuration) {
      configResult.configuration.mcpServers[conflict.serverName] = mergedConfig;
      configResult.configuration.metadata.lastModified = new Date();
      await FileSystemUtils.writeJsonFile(targetPath, configResult.configuration);
    }

    // Remove from lower priority scopes
    for (const entry of conflict.scopes) {
      if (entry.scope !== highestPriorityEntry.scope) {
        await this.removeServerFromScope(client, conflict.serverName, entry.scope);
      }
    }
  }

  /**
   * Promote configuration to higher scope by copying and removing from lower scope
   */
  private static async promoteConfigurationToHigherScope(
    client: MCPClient,
    serverName: string,
    fromScope: ConfigScope
  ): Promise<void> {
    // Find the next higher scope that doesn't have this server
    const higherScopes = Object.values(ConfigScope)
      .filter(scope => this.SCOPE_PRIORITIES[scope] > this.SCOPE_PRIORITIES[fromScope])
      .sort((a, b) => this.SCOPE_PRIORITIES[a] - this.SCOPE_PRIORITIES[b]);

    if (higherScopes.length === 0) {
      throw new Error(`No higher scope available than ${fromScope}`);
    }

    const targetScope = higherScopes[0];
    await this.migrateServerScope(client, serverName, fromScope, targetScope);
  }

  /**
   * Remove server from specific scope
   */
  private static async removeServerFromScope(
    client: MCPClient,
    serverName: string,
    scope: ConfigScope
  ): Promise<void> {
    const configPath = client.configPaths.scopePaths[scope];
    
    if (!await FileSystemUtils.fileExists(configPath)) {
      return; // Nothing to remove
    }

    const configResult = await ConfigurationParser.parseConfiguration(configPath);
    if (!configResult.success || !configResult.configuration) {
      throw new Error(`Failed to parse configuration at ${configPath}`);
    }

    const config = configResult.configuration;
    if (config.mcpServers[serverName]) {
      delete config.mcpServers[serverName];
      config.metadata.lastModified = new Date();

      // Save updated configuration or remove file if empty
      if (Object.keys(config.mcpServers).length > 0) {
        await FileSystemUtils.writeJsonFile(configPath, config);
      } else {
        await fs.remove(configPath);
      }
    }
  }

  /**
   * Get effective scope for a server (highest priority scope where it exists)
   */
  static async getEffectiveServerScope(
    client: MCPClient,
    serverName: string
  ): Promise<ConfigScope | null> {
    const resolved = await this.resolveConfiguration(client);
    return resolved.sources[serverName] || null;
  }

  /**
   * List all scopes that contain a specific server
   */
  static async getScopesContainingServer(
    client: MCPClient,
    serverName: string
  ): Promise<ConfigScope[]> {
    const scopes: ConfigScope[] = [];
    const configurations = await this.loadAllScopeConfigurations(client);

    for (const [scopeName, config] of Object.entries(configurations)) {
      if (config && config.mcpServers[serverName]) {
        scopes.push(config.metadata.scope);
      }
    }

    return scopes.sort((a, b) => this.SCOPE_PRIORITIES[a] - this.SCOPE_PRIORITIES[b]);
  }

  /**
   * Validate scope hierarchy for consistency
   */
  static async validateScopeHierarchy(client: MCPClient): Promise<{
    isValid: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    const resolved = await this.resolveConfiguration(client);

    // Check for conflicts
    if (resolved.conflicts.length > 0) {
      issues.push(`${resolved.conflicts.length} scope conflicts detected`);
      recommendations.push('Resolve scope conflicts using conflict resolution tools');
    }

    // Check for orphaned configurations
    const configurations = await this.loadAllScopeConfigurations(client);
    for (const [scopeName, config] of Object.entries(configurations)) {
      if (config && Object.keys(config.mcpServers).length === 0) {
        issues.push(`Empty configuration file at ${scopeName} scope`);
        recommendations.push(`Remove empty configuration file for ${scopeName} scope`);
      }
    }

    // Check for missing required scopes
    if (!configurations[ConfigScope.USER]) {
      recommendations.push('Consider creating a user-level configuration for default settings');
    }

    return {
      isValid: issues.length === 0,
      issues,
      recommendations
    };
  }
}