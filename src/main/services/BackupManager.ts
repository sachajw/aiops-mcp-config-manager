import * as fs from 'fs-extra';
import * as path from 'path';
import * as crypto from 'crypto';
import { 
  MCPClient,
  Configuration
} from '../../shared/types';
import { MacOSPathResolver } from '../utils/pathResolver';
import { FileSystemUtils } from '../utils/fileSystemUtils';
import { ConfigurationParser } from './ConfigurationParser';

/**
 * Backup metadata
 */
export interface Backup {
  /** Backup file path */
  path: string;
  /** Original file path that was backed up */
  originalPath: string;
  /** Backup creation timestamp */
  timestamp: Date;
  /** Backup file size in bytes */
  size: number;
  /** Checksum of backed up content */
  checksum: string;
  /** Client associated with the backup */
  client?: MCPClient;
  /** Backup type */
  type: BackupType;
  /** Optional description */
  description?: string;
}

/**
 * Backup types
 */
export enum BackupType {
  /** Automatic backup before save */
  AUTO_SAVE = 'auto-save',
  /** Manual backup requested by user */
  MANUAL = 'manual',
  /** Backup before import operation */
  PRE_IMPORT = 'pre-import',
  /** Backup before bulk operation */
  PRE_BULK = 'pre-bulk',
  /** Emergency backup due to error */
  EMERGENCY = 'emergency'
}

/**
 * Backup restoration result
 */
export interface RestoreResult {
  /** Whether restoration was successful */
  success: boolean;
  /** Restored file path */
  restoredPath?: string;
  /** Error message if restoration failed */
  error?: string;
  /** Backup that was created of current file before restore */
  backupOfCurrent?: string;
}

/**
 * Backup cleanup statistics
 */
export interface CleanupStats {
  /** Number of backups deleted */
  deletedCount: number;
  /** Total size freed in bytes */
  sizeFreed: number;
  /** Number of backups retained */
  retainedCount: number;
  /** Cleanup duration in milliseconds */
  duration: number;
}

/**
 * Comprehensive backup and recovery system for MCP configurations
 */
export class BackupManager {
  private static readonly BACKUP_DIR = MacOSPathResolver.getBackupDirectoryPath();
  private static readonly METADATA_FILE = 'backup-metadata.json';

  /**
   * Create backup of configuration file
   */
  static async createBackup(
    filePath: string,
    type: BackupType = BackupType.MANUAL,
    client?: MCPClient,
    description?: string
  ): Promise<Backup> {
    const absolutePath = MacOSPathResolver.resolveAbsolutePath(filePath);
    
    if (!await FileSystemUtils.fileExists(absolutePath)) {
      throw new Error(`Cannot backup non-existent file: ${absolutePath}`);
    }

    const timestamp = new Date();
    const timestampStr = timestamp.toISOString().replace(/[:.]/g, '-');
    const fileName = path.basename(absolutePath);
    
    // Create backup filename with type prefix
    const backupFileName = `${type}_${fileName}_${timestampStr}.backup`;
    const backupPath = path.join(this.BACKUP_DIR, backupFileName);

    // Ensure backup directory exists
    await fs.ensureDir(this.BACKUP_DIR);

    // Calculate file checksum and size
    const stats = await fs.stat(absolutePath);
    const content = await fs.readFile(absolutePath);
    const checksum = crypto.createHash('sha256').update(content).digest('hex');

    // Create backup
    await fs.copy(absolutePath, backupPath);

    const backup: Backup = {
      path: backupPath,
      originalPath: absolutePath,
      timestamp,
      size: stats.size,
      checksum,
      client,
      type,
      description
    };

    // Update backup metadata
    await this.updateBackupMetadata(backup);

    return backup;
  }

  /**
   * List all backups, optionally filtered by file path or client
   */
  static async listBackups(filter?: {
    originalPath?: string;
    client?: MCPClient;
    type?: BackupType;
    since?: Date;
    limit?: number;
  }): Promise<Backup[]> {
    const metadata = await this.loadBackupMetadata();
    let backups = Object.values(metadata);

    // Apply filters
    if (filter) {
      if (filter.originalPath) {
        backups = backups.filter(b => b.originalPath === filter.originalPath);
      }
      
      if (filter.client) {
        backups = backups.filter(b => b.client?.id === filter.client?.id);
      }
      
      if (filter.type) {
        backups = backups.filter(b => b.type === filter.type);
      }
      
      if (filter.since) {
        backups = backups.filter(b => b.timestamp >= filter.since!);
      }
    }

    // Sort by timestamp, newest first
    backups.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply limit
    if (filter?.limit) {
      backups = backups.slice(0, filter.limit);
    }

    return backups;
  }

  /**
   * Restore configuration from backup
   */
  static async restoreFromBackup(
    backup: Backup,
    targetPath?: string,
    createBackupOfCurrent = true
  ): Promise<RestoreResult> {
    const restorePath = targetPath || backup.originalPath;
    
    try {
      // Verify backup file exists
      if (!await FileSystemUtils.fileExists(backup.path)) {
        return {
          success: false,
          error: `Backup file not found: ${backup.path}`
        };
      }

      // Verify backup integrity
      const isValid = await this.verifyBackupIntegrity(backup);
      if (!isValid) {
        return {
          success: false,
          error: 'Backup file integrity check failed'
        };
      }

      let backupOfCurrent: string | undefined;

      // Create backup of current file if it exists
      if (createBackupOfCurrent && await FileSystemUtils.fileExists(restorePath)) {
        try {
          const currentBackup = await this.createBackup(
            restorePath,
            BackupType.PRE_IMPORT,
            backup.client,
            'Backup before restore operation'
          );
          backupOfCurrent = currentBackup.path;
        } catch (error) {
          console.warn('Failed to backup current file before restore:', error);
        }
      }

      // Ensure target directory exists
      await fs.ensureDir(path.dirname(restorePath));

      // Restore the backup
      await fs.copy(backup.path, restorePath);

      // Validate the restored configuration
      try {
        if (backup.client) {
          const parseResult = await ConfigurationParser.parseConfiguration(restorePath);
          if (!parseResult.success) {
            throw new Error(`Restored configuration is invalid: ${parseResult.errors?.join(', ')}`);
          }
        }
      } catch (error) {
        console.warn('Restored configuration validation warning:', error);
      }

      return {
        success: true,
        restoredPath: restorePath,
        backupOfCurrent
      };

    } catch (error: any) {
      return {
        success: false,
        error: `Restore failed: ${error.message}`
      };
    }
  }

  /**
   * Delete backup files
   */
  static async deleteBackups(backupPaths: string[]): Promise<{
    deleted: string[];
    failed: Array<{ path: string; error: string }>;
  }> {
    const deleted: string[] = [];
    const failed: Array<{ path: string; error: string }> = [];

    for (const backupPath of backupPaths) {
      try {
        await fs.remove(backupPath);
        deleted.push(backupPath);
        
        // Remove from metadata
        await this.removeFromBackupMetadata(backupPath);
      } catch (error: any) {
        failed.push({
          path: backupPath,
          error: error.message
        });
      }
    }

    return { deleted, failed };
  }

  /**
   * Clean up old backups based on retention policies
   */
  static async cleanupOldBackups(options: {
    maxAge?: number; // days
    maxCount?: number; // per original file
    maxTotalSize?: number; // bytes
    dryRun?: boolean;
  } = {}): Promise<CleanupStats> {
    const startTime = Date.now();
    const { 
      maxAge = 30, 
      maxCount = 20, 
      maxTotalSize = 100 * 1024 * 1024, // 100MB
      dryRun = false 
    } = options;

    const allBackups = await this.listBackups();
    const now = new Date();
    const maxAgeMs = maxAge * 24 * 60 * 60 * 1000;
    
    let toDelete: Backup[] = [];
    let totalSize = 0;

    // Group backups by original file path
    const backupsByFile = new Map<string, Backup[]>();
    for (const backup of allBackups) {
      totalSize += backup.size;
      const backups = backupsByFile.get(backup.originalPath) || [];
      backups.push(backup);
      backupsByFile.set(backup.originalPath, backups);
    }

    // Apply retention policies
    for (const [originalPath, backups] of backupsByFile) {
      // Sort by timestamp, newest first
      backups.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      // Keep manual backups longer
      const manualBackups = backups.filter(b => b.type === BackupType.MANUAL);
      const autoBackups = backups.filter(b => b.type !== BackupType.MANUAL);

      // Apply count limits
      if (autoBackups.length > maxCount) {
        toDelete.push(...autoBackups.slice(maxCount));
      }

      // Apply age limits
      for (const backup of backups) {
        const age = now.getTime() - backup.timestamp.getTime();
        if (age > maxAgeMs && backup.type !== BackupType.MANUAL) {
          if (!toDelete.includes(backup)) {
            toDelete.push(backup);
          }
        }
      }
    }

    // Apply total size limit (delete oldest first)
    if (totalSize > maxTotalSize) {
      const sortedByAge = [...allBackups].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      let currentSize = totalSize;
      
      for (const backup of sortedByAge) {
        if (currentSize <= maxTotalSize) break;
        
        if (!toDelete.includes(backup) && backup.type !== BackupType.MANUAL) {
          toDelete.push(backup);
          currentSize -= backup.size;
        }
      }
    }

    // Remove duplicates
    toDelete = Array.from(new Set(toDelete));

    let deletedCount = 0;
    let sizeFreed = 0;

    if (!dryRun && toDelete.length > 0) {
      const deleteResult = await this.deleteBackups(toDelete.map(b => b.path));
      deletedCount = deleteResult.deleted.length;
      sizeFreed = toDelete
        .filter(b => deleteResult.deleted.includes(b.path))
        .reduce((sum, b) => sum + b.size, 0);
    } else {
      deletedCount = toDelete.length;
      sizeFreed = toDelete.reduce((sum, b) => sum + b.size, 0);
    }

    return {
      deletedCount,
      sizeFreed,
      retainedCount: allBackups.length - deletedCount,
      duration: Date.now() - startTime
    };
  }

  /**
   * Verify backup file integrity
   */
  static async verifyBackupIntegrity(backup: Backup): Promise<boolean> {
    try {
      if (!await FileSystemUtils.fileExists(backup.path)) {
        return false;
      }

      const content = await fs.readFile(backup.path);
      const currentChecksum = crypto.createHash('sha256').update(content).digest('hex');
      
      return currentChecksum === backup.checksum;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get backup statistics
   */
  static async getBackupStatistics(): Promise<{
    totalBackups: number;
    totalSize: number;
    backupsByType: Record<BackupType, number>;
    oldestBackup?: Date;
    newestBackup?: Date;
    averageSize: number;
  }> {
    const backups = await this.listBackups();
    
    const stats = {
      totalBackups: backups.length,
      totalSize: backups.reduce((sum, b) => sum + b.size, 0),
      backupsByType: {} as Record<BackupType, number>,
      averageSize: 0
    };

    // Count by type
    for (const type of Object.values(BackupType)) {
      stats.backupsByType[type] = backups.filter(b => b.type === type).length;
    }

    // Calculate average size
    if (backups.length > 0) {
      stats.averageSize = stats.totalSize / backups.length;
      
      const timestamps = backups.map(b => b.timestamp);
      return {
        ...stats,
        oldestBackup: new Date(Math.min(...timestamps.map(d => d.getTime()))),
        newestBackup: new Date(Math.max(...timestamps.map(d => d.getTime())))
      };
    }

    return stats;
  }

  /**
   * Export backup metadata for transfer to another system
   */
  static async exportBackupMetadata(): Promise<{
    metadata: Record<string, Backup>;
    exportedAt: Date;
    version: string;
  }> {
    const metadata = await this.loadBackupMetadata();
    
    return {
      metadata,
      exportedAt: new Date(),
      version: '1.0.0'
    };
  }

  /**
   * Load backup metadata from disk
   */
  private static async loadBackupMetadata(): Promise<Record<string, Backup>> {
    const metadataPath = path.join(this.BACKUP_DIR, this.METADATA_FILE);
    
    try {
      if (await FileSystemUtils.fileExists(metadataPath)) {
        const metadata = await FileSystemUtils.readJsonFile(metadataPath);
        
        // Convert timestamp strings back to Date objects
        for (const backup of Object.values(metadata) as Backup[]) {
          backup.timestamp = new Date(backup.timestamp);
        }
        
        return metadata;
      }
    } catch (error) {
      console.warn('Failed to load backup metadata, initializing empty:', error);
    }
    
    return {};
  }

  /**
   * Save backup metadata to disk
   */
  private static async saveBackupMetadata(metadata: Record<string, Backup>): Promise<void> {
    const metadataPath = path.join(this.BACKUP_DIR, this.METADATA_FILE);
    
    await fs.ensureDir(this.BACKUP_DIR);
    await FileSystemUtils.writeJsonFile(metadataPath, metadata, { createBackup: false });
  }

  /**
   * Update backup metadata with new backup
   */
  private static async updateBackupMetadata(backup: Backup): Promise<void> {
    const metadata = await this.loadBackupMetadata();
    metadata[backup.path] = backup;
    await this.saveBackupMetadata(metadata);
  }

  /**
   * Remove backup from metadata
   */
  private static async removeFromBackupMetadata(backupPath: string): Promise<void> {
    const metadata = await this.loadBackupMetadata();
    delete metadata[backupPath];
    await this.saveBackupMetadata(metadata);
  }
}