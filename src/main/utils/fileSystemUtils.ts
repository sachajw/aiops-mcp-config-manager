import * as fs from 'fs-extra';
import * as path from 'path';
import JSON5 from 'json5';
import { MacOSPathResolver } from './pathResolver';

/**
 * Custom error types for file system operations
 */
export class FileSystemError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly path?: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'FileSystemError';
  }
}

export class PermissionError extends FileSystemError {
  constructor(path: string, operation: string, originalError?: Error) {
    super(
      `Permission denied: Cannot ${operation} file at ${path}`,
      'PERMISSION_DENIED',
      path,
      originalError
    );
    this.name = 'PermissionError';
  }
}

export class FileNotFoundError extends FileSystemError {
  constructor(path: string, originalError?: Error) {
    super(
      `File not found: ${path}`,
      'FILE_NOT_FOUND',
      path,
      originalError
    );
    this.name = 'FileNotFoundError';
  }
}

export class InvalidJsonError extends FileSystemError {
  constructor(path: string, parseError: string, originalError?: Error) {
    super(
      `Invalid JSON in file ${path}: ${parseError}`,
      'INVALID_JSON',
      path,
      originalError
    );
    this.name = 'InvalidJsonError';
  }
}

/**
 * File system utilities for configuration management
 */
export class FileSystemUtils {
  /**
   * Check if a file exists and is accessible
   */
  static async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if a directory exists and is accessible
   */
  static async directoryExists(dirPath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(dirPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Check if a file is readable
   */
  static async isReadable(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath, fs.constants.R_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if a file is writable
   */
  static async isWritable(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath, fs.constants.W_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Ensure directory exists, create if it doesn't
   */
  static async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.ensureDir(dirPath);
    } catch (error: any) {
      if (error.code === 'EACCES' || error.code === 'EPERM') {
        throw new PermissionError(dirPath, 'create directory', error);
      }
      throw new FileSystemError(
        `Failed to create directory: ${dirPath}`,
        error.code || 'UNKNOWN_ERROR',
        dirPath,
        error
      );
    }
  }

  /**
   * Read and parse JSON configuration file
   */
  static async readJsonFile<T = any>(filePath: string): Promise<T> {
    const absolutePath = MacOSPathResolver.resolveAbsolutePath(filePath);
    
    try {
      // Check if file exists
      if (!(await this.fileExists(absolutePath))) {
        throw new FileNotFoundError(absolutePath);
      }

      // Check if file is readable
      if (!(await this.isReadable(absolutePath))) {
        throw new PermissionError(absolutePath, 'read');
      }

      // Read file content
      const content = await fs.readFile(absolutePath, 'utf-8');
      
      // Parse JSON (using JSON5 for flexibility with comments)
      try {
        return JSON5.parse(content) as T;
      } catch (parseError: any) {
        throw new InvalidJsonError(absolutePath, parseError.message, parseError);
      }
    } catch (error: any) {
      // Re-throw our custom errors
      if (error instanceof FileSystemError) {
        throw error;
      }

      // Handle Node.js file system errors
      switch (error.code) {
        case 'ENOENT':
          throw new FileNotFoundError(absolutePath, error);
        case 'EACCES':
        case 'EPERM':
          throw new PermissionError(absolutePath, 'read', error);
        default:
          throw new FileSystemError(
            `Failed to read file: ${absolutePath}`,
            error.code || 'UNKNOWN_ERROR',
            absolutePath,
            error
          );
      }
    }
  }

  /**
   * Write JSON configuration to file
   */
  static async writeJsonFile(filePath: string, data: any, options?: {
    createBackup?: boolean;
    indent?: number;
  }): Promise<void> {
    const absolutePath = MacOSPathResolver.resolveAbsolutePath(filePath);
    const { createBackup = true, indent = 2 } = options || {};
    
    try {
      // Ensure parent directory exists
      const parentDir = path.dirname(absolutePath);
      await this.ensureDirectory(parentDir);

      // Create backup if file exists and backup is requested
      if (createBackup && await this.fileExists(absolutePath)) {
        await this.createBackup(absolutePath);
      }

      // Check write permissions for existing file or parent directory
      const targetPath = await this.fileExists(absolutePath) ? absolutePath : parentDir;
      if (!(await this.isWritable(targetPath))) {
        throw new PermissionError(absolutePath, 'write');
      }

      // Convert data to JSON string
      const jsonContent = JSON.stringify(data, null, indent);
      
      // Write to temporary file first, then rename (atomic operation)
      const tempPath = `${absolutePath}.tmp`;
      await fs.writeFile(tempPath, jsonContent, 'utf-8');
      await fs.rename(tempPath, absolutePath);
      
    } catch (error: any) {
      // Re-throw our custom errors
      if (error instanceof FileSystemError) {
        throw error;
      }

      // Handle Node.js file system errors
      switch (error.code) {
        case 'EACCES':
        case 'EPERM':
          throw new PermissionError(absolutePath, 'write', error);
        case 'ENOSPC':
          throw new FileSystemError(
            `No space left on device: ${absolutePath}`,
            'NO_SPACE',
            absolutePath,
            error
          );
        default:
          throw new FileSystemError(
            `Failed to write file: ${absolutePath}`,
            error.code || 'UNKNOWN_ERROR',
            absolutePath,
            error
          );
      }
    }
  }

  /**
   * Create a backup of a configuration file
   */
  static async createBackup(filePath: string): Promise<string> {
    const absolutePath = MacOSPathResolver.resolveAbsolutePath(filePath);
    
    if (!(await this.fileExists(absolutePath))) {
      throw new FileNotFoundError(absolutePath);
    }

    // Generate backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = MacOSPathResolver.getBackupDirectoryPath();
    const fileName = path.basename(absolutePath);
    const backupPath = path.join(backupDir, `${fileName}.${timestamp}.backup`);

    try {
      // Ensure backup directory exists
      await this.ensureDirectory(backupDir);
      
      // Copy file to backup location
      await fs.copy(absolutePath, backupPath);
      
      return backupPath;
    } catch (error: any) {
      throw new FileSystemError(
        `Failed to create backup: ${error.message}`,
        error.code || 'BACKUP_FAILED',
        absolutePath,
        error
      );
    }
  }

  /**
   * List backup files for a given configuration file
   */
  static async listBackups(filePath: string): Promise<Array<{
    path: string;
    timestamp: Date;
    size: number;
  }>> {
    const fileName = path.basename(MacOSPathResolver.resolveAbsolutePath(filePath));
    const backupDir = MacOSPathResolver.getBackupDirectoryPath();
    
    try {
      if (!(await this.fileExists(backupDir))) {
        return [];
      }

      const files = await fs.readdir(backupDir);
      const backupFiles = files.filter(file => 
        file.startsWith(fileName) && file.endsWith('.backup')
      );

      const backups = await Promise.all(
        backupFiles.map(async (file) => {
          const backupPath = path.join(backupDir, file);
          const stats = await fs.stat(backupPath);
          
          // Extract timestamp from filename (format: YYYY-MM-DDTHH-MM-SS-sssZ)
          const timestampMatch = file.match(/\.(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z)\.backup$/);
          let timestamp: Date;
          if (timestampMatch) {
            // Convert back to ISO format: YYYY-MM-DDTHH:MM:SS.sssZ
            const isoString = timestampMatch[1]
              .replace(/T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z/, 'T$1:$2:$3.$4Z');
            timestamp = new Date(isoString);
          } else {
            timestamp = stats.mtime;
          }

          return {
            path: backupPath,
            timestamp,
            size: stats.size
          };
        })
      );

      // Sort by timestamp, newest first
      return backups.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    } catch (error: any) {
      throw new FileSystemError(
        `Failed to list backups: ${error.message}`,
        error.code || 'LIST_BACKUPS_FAILED',
        backupDir,
        error
      );
    }
  }

  /**
   * Restore a configuration file from backup
   */
  static async restoreFromBackup(backupPath: string, targetPath: string): Promise<void> {
    const absoluteBackupPath = MacOSPathResolver.resolveAbsolutePath(backupPath);
    const absoluteTargetPath = MacOSPathResolver.resolveAbsolutePath(targetPath);
    
    try {
      if (!(await this.fileExists(absoluteBackupPath))) {
        throw new FileNotFoundError(absoluteBackupPath);
      }

      // Create backup of current file before restoring
      if (await this.fileExists(absoluteTargetPath)) {
        await this.createBackup(absoluteTargetPath);
      }

      // Ensure target directory exists
      await this.ensureDirectory(path.dirname(absoluteTargetPath));
      
      // Copy backup to target location
      await fs.copy(absoluteBackupPath, absoluteTargetPath);
      
    } catch (error: any) {
      if (error instanceof FileSystemError) {
        throw error;
      }
      
      throw new FileSystemError(
        `Failed to restore from backup: ${error.message}`,
        error.code || 'RESTORE_FAILED',
        absoluteTargetPath,
        error
      );
    }
  }

  /**
   * Get file statistics
   */
  static async getFileStats(filePath: string): Promise<{
    size: number;
    modified: Date;
    created: Date;
    isFile: boolean;
    isDirectory: boolean;
  }> {
    const absolutePath = MacOSPathResolver.resolveAbsolutePath(filePath);
    
    try {
      const stats = await fs.stat(absolutePath);
      
      return {
        size: stats.size,
        modified: stats.mtime,
        created: stats.birthtime,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory()
      };
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new FileNotFoundError(absolutePath, error);
      }
      
      throw new FileSystemError(
        `Failed to get file stats: ${absolutePath}`,
        error.code || 'STAT_FAILED',
        absolutePath,
        error
      );
    }
  }

  /**
   * Clean up old backup files
   */
  static async cleanupOldBackups(maxAge: number = 30, maxCount: number = 10): Promise<number> {
    const backupDir = MacOSPathResolver.getBackupDirectoryPath();
    
    try {
      if (!(await this.fileExists(backupDir))) {
        return 0;
      }

      const files = await fs.readdir(backupDir);
      const backupFiles = files.filter(file => file.endsWith('.backup'));
      
      if (backupFiles.length === 0) {
        return 0;
      }

      // Get file stats for all backups
      const backupsWithStats = await Promise.all(
        backupFiles.map(async (file) => {
          const filePath = path.join(backupDir, file);
          const stats = await fs.stat(filePath);
          return { file, path: filePath, mtime: stats.mtime };
        })
      );

      // Sort by modification time, newest first
      backupsWithStats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

      const now = new Date();
      const maxAgeMs = maxAge * 24 * 60 * 60 * 1000; // Convert days to milliseconds
      let deletedCount = 0;

      // Delete files that are too old or exceed max count
      for (let i = 0; i < backupsWithStats.length; i++) {
        const backup = backupsWithStats[i];
        const age = now.getTime() - backup.mtime.getTime();
        
        if (i >= maxCount || age > maxAgeMs) {
          await fs.remove(backup.path);
          deletedCount++;
        }
      }

      return deletedCount;
    } catch (error: any) {
      throw new FileSystemError(
        `Failed to cleanup old backups: ${error.message}`,
        error.code || 'CLEANUP_FAILED',
        backupDir,
        error
      );
    }
  }
}