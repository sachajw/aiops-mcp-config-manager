import chokidar from 'chokidar';
import * as crypto from 'crypto';
import { EventEmitter } from 'events';
import { 
  MCPClient,
  Configuration
} from '../../shared/types';
import { FileChangeType } from '../../shared/types/enums';
import { FileSystemUtils } from '../utils/fileSystemUtils';
import { ConfigurationParser } from './ConfigurationParser';

/**
 * File change event data
 */
export interface FileChangeEvent {
  /** Path of the changed file */
  path: string;
  /** Type of change */
  changeType: FileChangeType;
  /** Timestamp when change was detected */
  timestamp: Date;
  /** Client associated with the file */
  client?: MCPClient;
  /** File checksum before change (if available) */
  previousChecksum?: string;
  /** File checksum after change */
  currentChecksum?: string;
}

/**
 * External change detection result
 */
export interface ExternalChange {
  /** Configuration file path */
  path: string;
  /** Associated client */
  client: MCPClient;
  /** Change type */
  changeType: FileChangeType;
  /** Whether the change conflicts with unsaved local changes */
  hasConflict: boolean;
  /** Current configuration from file */
  currentConfig?: Configuration;
  /** Previous configuration (cached) */
  previousConfig?: Configuration;
}

/**
 * File conflict information
 */
export interface FileConflict {
  /** File path */
  path: string;
  /** Associated client */
  client: MCPClient;
  /** Local unsaved changes */
  localChanges: Configuration;
  /** External file changes */
  externalChanges: Configuration;
  /** Base configuration (last saved state) */
  baseConfig: Configuration;
}

/**
 * File system monitoring service for configuration files
 * Detects external changes and handles conflicts
 */
export class FileMonitor extends EventEmitter {
  private watchers: Map<string, chokidar.FSWatcher> = new Map();
  private watchedPaths: Set<string> = new Set();
  private checksums: Map<string, string> = new Map();
  private clients: Map<string, MCPClient> = new Map();
  private isMonitoring = false;

  /**
   * Start monitoring configuration files for the given clients
   */
  async startMonitoring(clients: MCPClient[]): Promise<void> {
    if (this.isMonitoring) {
      await this.stopMonitoring();
    }

    this.isMonitoring = true;
    this.clients.clear();

    // Index clients by their configuration paths
    for (const client of clients) {
      this.clients.set(client.configPaths.primary, client);
      
      // Also index alternative paths
      for (const altPath of client.configPaths.alternatives) {
        this.clients.set(altPath, client);
      }

      // Index scope-specific paths
      for (const scopePath of Object.values(client.configPaths.scopePaths)) {
        this.clients.set(scopePath, client);
      }
    }

    // Collect all unique paths to watch
    const pathsToWatch = new Set<string>();
    for (const client of clients) {
      pathsToWatch.add(client.configPaths.primary);
      client.configPaths.alternatives.forEach(path => pathsToWatch.add(path));
      Object.values(client.configPaths.scopePaths).forEach(path => pathsToWatch.add(path));
    }

    // Calculate initial checksums for existing files
    for (const path of pathsToWatch) {
      if (await FileSystemUtils.fileExists(path)) {
        const checksum = await this.calculateFileChecksum(path);
        this.checksums.set(path, checksum);
      }
    }

    // Set up file watchers
    await this.watchConfigurationFiles(Array.from(pathsToWatch));

    this.emit('monitoring-started', { paths: Array.from(pathsToWatch) });
  }

  /**
   * Stop monitoring all configuration files
   */
  async stopMonitoring(): Promise<void> {
    // Close all watchers
    for (const [path, watcher] of this.watchers) {
      await watcher.close();
    }

    this.watchers.clear();
    this.watchedPaths.clear();
    this.checksums.clear();
    this.clients.clear();
    this.isMonitoring = false;

    this.emit('monitoring-stopped');
  }

  /**
   * Watch configuration files for changes
   */
  private async watchConfigurationFiles(paths: string[]): Promise<void> {
    for (const path of paths) {
      if (this.watchedPaths.has(path)) {
        continue; // Already watching this path
      }

      try {
        const watcher = chokidar.watch(path, {
          persistent: true,
          ignoreInitial: true,
          awaitWriteFinish: {
            stabilityThreshold: 100,
            pollInterval: 10
          },
          usePolling: false
        });

        // Set up event handlers
        watcher
          .on('add', (filePath) => this.handleFileChange(filePath, FileChangeType.CREATED))
          .on('change', (filePath) => this.handleFileChange(filePath, FileChangeType.MODIFIED))
          .on('unlink', (filePath) => this.handleFileChange(filePath, FileChangeType.DELETED))
          .on('error', (error) => this.emit('error', { path, error }));

        this.watchers.set(path, watcher);
        this.watchedPaths.add(path);

      } catch (error) {
        console.warn(`Failed to watch configuration file: ${path}`, error);
        this.emit('watch-error', { path, error });
      }
    }
  }

  /**
   * Handle file system changes
   */
  private async handleFileChange(path: string, changeType: FileChangeType): Promise<void> {
    try {
      const client = this.clients.get(path);
      const previousChecksum = this.checksums.get(path);
      let currentChecksum: string | undefined;

      // Calculate current checksum for existing files
      if (changeType !== FileChangeType.DELETED && await FileSystemUtils.fileExists(path)) {
        currentChecksum = await this.calculateFileChecksum(path);
        
        // Skip if checksum hasn't changed (avoid duplicate events)
        if (currentChecksum === previousChecksum) {
          return;
        }
        
        this.checksums.set(path, currentChecksum);
      } else {
        this.checksums.delete(path);
      }

      const changeEvent: FileChangeEvent = {
        path,
        changeType,
        timestamp: new Date(),
        client,
        previousChecksum,
        currentChecksum
      };

      this.emit('file-changed', changeEvent);

      // Emit more specific events
      switch (changeType) {
        case FileChangeType.CREATED:
          this.emit('file-created', changeEvent);
          break;
        case FileChangeType.MODIFIED:
          this.emit('file-modified', changeEvent);
          break;
        case FileChangeType.DELETED:
          this.emit('file-deleted', changeEvent);
          break;
      }

    } catch (error) {
      this.emit('error', { path, error, changeType });
    }
  }

  /**
   * Detect external changes that might conflict with local changes
   */
  async detectExternalChanges(): Promise<ExternalChange[]> {
    const changes: ExternalChange[] = [];

    for (const [path, client] of this.clients) {
      try {
        if (!await FileSystemUtils.fileExists(path)) {
          continue;
        }

        const currentChecksum = await this.calculateFileChecksum(path);
        const previousChecksum = this.checksums.get(path);

        if (currentChecksum !== previousChecksum) {
          let currentConfig: Configuration | undefined;
          
          try {
            const parseResult = await ConfigurationParser.parseConfiguration(path);
            if (parseResult.success) {
              currentConfig = parseResult.configuration;
            }
          } catch (error) {
            console.warn(`Failed to parse changed configuration: ${path}`, error);
          }

          const change: ExternalChange = {
            path,
            client,
            changeType: FileChangeType.MODIFIED,
            hasConflict: false, // Will be determined by caller based on local state
            currentConfig
          };

          changes.push(change);
          this.checksums.set(path, currentChecksum);
        }
      } catch (error) {
        console.warn(`Failed to detect changes for: ${path}`, error);
      }
    }

    return changes;
  }

  /**
   * Resolve file conflicts using specified strategy
   */
  async resolveConflicts(conflicts: FileConflict[], strategy: 'keep-local' | 'use-external' | 'merge'): Promise<void> {
    for (const conflict of conflicts) {
      try {
        switch (strategy) {
          case 'keep-local':
            // Save local changes, overwriting external changes
            await FileSystemUtils.writeJsonFile(conflict.path, conflict.localChanges);
            break;

          case 'use-external':
            // No action needed - external changes are already in the file
            // Just update our checksum
            const checksum = await this.calculateFileChecksum(conflict.path);
            this.checksums.set(conflict.path, checksum);
            break;

          case 'merge':
            // Attempt to merge configurations
            const merged = await this.mergeConfigurations(
              conflict.baseConfig,
              conflict.localChanges,
              conflict.externalChanges
            );
            await FileSystemUtils.writeJsonFile(conflict.path, merged);
            break;
        }

        this.emit('conflict-resolved', { path: conflict.path, strategy });

      } catch (error) {
        this.emit('conflict-resolution-error', { path: conflict.path, error });
      }
    }
  }

  /**
   * Add a new path to monitoring
   */
  async addPath(path: string, client: MCPClient): Promise<void> {
    if (!this.isMonitoring) {
      throw new Error('File monitoring is not active');
    }

    this.clients.set(path, client);
    
    if (await FileSystemUtils.fileExists(path)) {
      const checksum = await this.calculateFileChecksum(path);
      this.checksums.set(path, checksum);
    }

    await this.watchConfigurationFiles([path]);
    this.emit('path-added', { path, client });
  }

  /**
   * Remove a path from monitoring
   */
  async removePath(path: string): Promise<void> {
    const watcher = this.watchers.get(path);
    if (watcher) {
      await watcher.close();
      this.watchers.delete(path);
    }

    this.watchedPaths.delete(path);
    this.checksums.delete(path);
    this.clients.delete(path);

    this.emit('path-removed', { path });
  }

  /**
   * Get current monitoring status
   */
  getMonitoringStatus(): {
    isMonitoring: boolean;
    watchedPaths: string[];
    clientCount: number;
  } {
    return {
      isMonitoring: this.isMonitoring,
      watchedPaths: Array.from(this.watchedPaths),
      clientCount: new Set(this.clients.values()).size
    };
  }

  /**
   * Refresh checksums for all watched files
   */
  async refreshChecksums(): Promise<void> {
    const refreshPromises: Promise<void>[] = [];

    for (const path of this.watchedPaths) {
      refreshPromises.push(
        (async () => {
          try {
            if (await FileSystemUtils.fileExists(path)) {
              const checksum = await this.calculateFileChecksum(path);
              this.checksums.set(path, checksum);
            } else {
              this.checksums.delete(path);
            }
          } catch (error) {
            console.warn(`Failed to refresh checksum for: ${path}`, error);
          }
        })()
      );
    }

    await Promise.all(refreshPromises);
    this.emit('checksums-refreshed');
  }

  /**
   * Calculate file checksum for change detection
   */
  private async calculateFileChecksum(path: string): Promise<string> {
    try {
      const content = await FileSystemUtils.readJsonFile(path);
      const normalized = JSON.stringify(content, null, 2);
      return crypto.createHash('md5').update(normalized).digest('hex');
    } catch (error) {
      // If we can't read as JSON, hash the raw content
      const fs = require('fs-extra');
      const content = await fs.readFile(path, 'utf-8');
      return crypto.createHash('md5').update(content).digest('hex');
    }
  }

  /**
   * Merge configurations in case of conflicts
   */
  private async mergeConfigurations(
    base: Configuration,
    local: Configuration,
    external: Configuration
  ): Promise<Configuration> {
    // Simple merge strategy: combine servers from both configurations
    // Local changes take precedence for conflicts
    const merged: Configuration = {
      mcpServers: {
        ...external.mcpServers,
        ...local.mcpServers
      },
      metadata: {
        ...local.metadata,
        lastModified: new Date()
      }
    };

    return merged;
  }
}