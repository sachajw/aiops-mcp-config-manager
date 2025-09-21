import { BackupManager, BackupType, Backup, RestoreResult, CleanupStats } from '../BackupManager';
import { MacOSPathResolver } from '../../utils/pathResolver';
import { FileSystemUtils } from '../../utils/fileSystemUtils';
import { ConfigurationParser } from '../ConfigurationParser';
import * as fs from 'fs-extra';
import * as crypto from 'crypto';
import * as path from 'path';

// Mock dependencies
jest.mock('../../utils/pathResolver', () => ({
  MacOSPathResolver: {
    getBackupDirectoryPath: jest.fn(() => '/mock/backup/dir'),
    resolveAbsolutePath: jest.fn(p => p)
  }
}));
jest.mock('../../utils/fileSystemUtils');
jest.mock('../ConfigurationParser');
jest.mock('fs-extra');
jest.mock('crypto');

describe('BackupManager', () => {
  const mockBackupDir = '/mock/backup/dir';
  const mockMetadataFile = 'backup-metadata.json';
  const mockTestFile = '/path/to/test-config.json';
  const mockBackupPath = '/mock/backup/dir/manual_test-config.json_2025-01-20T10-00-00-000Z.backup';

  const mockBackup: Backup = {
    path: mockBackupPath,
    originalPath: mockTestFile,
    timestamp: new Date('2025-01-20T10:00:00Z'),
    size: 1024,
    checksum: 'abcd1234',
    type: BackupType.MANUAL,
    description: 'Test backup'
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock FileSystemUtils
    (FileSystemUtils.fileExists as jest.Mock).mockResolvedValue(true);
    (FileSystemUtils.readJsonFile as jest.Mock).mockResolvedValue({});
    (FileSystemUtils.writeJsonFile as jest.Mock).mockResolvedValue(undefined);

    // Mock fs-extra
    (fs.ensureDir as jest.Mock).mockResolvedValue(undefined);
    (fs.stat as jest.Mock).mockResolvedValue({ size: 1024 });
    (fs.readFile as jest.Mock).mockResolvedValue(Buffer.from('test content'));
    (fs.copy as jest.Mock).mockResolvedValue(undefined);
    (fs.remove as jest.Mock).mockResolvedValue(undefined);

    // Mock crypto
    const mockHash = {
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockReturnValue('abcd1234')
    };
    (crypto.createHash as jest.Mock).mockReturnValue(mockHash);

    // Mock ConfigurationParser
    (ConfigurationParser.parseConfiguration as jest.Mock).mockResolvedValue({
      success: true,
      errors: []
    });
  });

  describe('createBackup', () => {
    it('should create backup successfully with default parameters', async () => {
      const result = await BackupManager.createBackup(mockTestFile);

      expect(result).toMatchObject({
        originalPath: mockTestFile,
        size: 1024,
        checksum: 'abcd1234',
        type: BackupType.MANUAL
      });

      expect(fs.ensureDir).toHaveBeenCalledWith(mockBackupDir);
      expect(fs.copy).toHaveBeenCalledWith(mockTestFile, expect.stringContaining('.backup'));
      expect(FileSystemUtils.writeJsonFile).toHaveBeenCalled();
    });

    it('should create backup with custom type and description', async () => {
      const client = { id: 'claude-desktop', name: 'Claude Desktop' };

      const result = await BackupManager.createBackup(
        mockTestFile,
        BackupType.AUTO_SAVE,
        client,
        'Auto-save backup'
      );

      expect(result.type).toBe(BackupType.AUTO_SAVE);
      expect(result.client).toEqual(client);
      expect(result.description).toBe('Auto-save backup');
    });

    it('should throw error when file does not exist', async () => {
      (FileSystemUtils.fileExists as jest.Mock).mockResolvedValue(false);

      await expect(BackupManager.createBackup('/nonexistent/file.json'))
        .rejects.toThrow('Cannot backup non-existent file: /nonexistent/file.json');
    });

    it('should generate correct backup filename with timestamp', async () => {
      const fixedDate = new Date('2025-01-20T10:30:45.123Z');
      jest.spyOn(global, 'Date').mockImplementation(() => fixedDate);

      await BackupManager.createBackup(mockTestFile, BackupType.PRE_IMPORT);

      expect(fs.copy).toHaveBeenCalledWith(
        mockTestFile,
        expect.stringContaining('pre-import_test-config.json_2025-01-20T10-30-45-123Z.backup')
      );

      jest.restoreAllMocks();
    });

    it('should calculate correct checksum and file size', async () => {
      const testContent = Buffer.from('test configuration content');
      (fs.readFile as jest.Mock).mockResolvedValue(testContent);
      (fs.stat as jest.Mock).mockResolvedValue({ size: 2048 });

      const mockHash = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('newchecksum')
      };
      (crypto.createHash as jest.Mock).mockReturnValue(mockHash);

      const result = await BackupManager.createBackup(mockTestFile);

      expect(crypto.createHash).toHaveBeenCalledWith('sha256');
      expect(mockHash.update).toHaveBeenCalledWith(testContent);
      expect(result.size).toBe(2048);
      expect(result.checksum).toBe('newchecksum');
    });

    it('should handle backup directory creation failure', async () => {
      (fs.ensureDir as jest.Mock).mockRejectedValue(new Error('Permission denied'));

      await expect(BackupManager.createBackup(mockTestFile))
        .rejects.toThrow('Permission denied');
    });
  });

  describe('listBackups', () => {
    const mockBackups = {
      '/backup1.backup': {
        path: '/backup1.backup',
        originalPath: '/config1.json',
        timestamp: new Date('2025-01-20T10:00:00Z'),
        size: 1024,
        checksum: 'hash1',
        type: BackupType.MANUAL,
        client: { id: 'claude-desktop', name: 'Claude Desktop' }
      },
      '/backup2.backup': {
        path: '/backup2.backup',
        originalPath: '/config2.json',
        timestamp: new Date('2025-01-20T11:00:00Z'),
        size: 2048,
        checksum: 'hash2',
        type: BackupType.AUTO_SAVE
      }
    };

    beforeEach(() => {
      (FileSystemUtils.readJsonFile as jest.Mock).mockResolvedValue(mockBackups);
    });

    it('should list all backups when no filter provided', async () => {
      const result = await BackupManager.listBackups();

      expect(result).toHaveLength(2);
      expect(result[0].timestamp.getTime()).toBeGreaterThan(result[1].timestamp.getTime()); // Newest first
    });

    it('should filter backups by original path', async () => {
      const result = await BackupManager.listBackups({
        originalPath: '/config1.json'
      });

      expect(result).toHaveLength(1);
      expect(result[0].originalPath).toBe('/config1.json');
    });

    it('should filter backups by client', async () => {
      const result = await BackupManager.listBackups({
        client: { id: 'claude-desktop', name: 'Claude Desktop' }
      });

      expect(result).toHaveLength(1);
      expect(result[0].client?.id).toBe('claude-desktop');
    });

    it('should filter backups by type', async () => {
      const result = await BackupManager.listBackups({
        type: BackupType.AUTO_SAVE
      });

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(BackupType.AUTO_SAVE);
    });

    it('should filter backups by date range', async () => {
      const since = new Date('2025-01-20T10:30:00Z');

      const result = await BackupManager.listBackups({ since });

      expect(result).toHaveLength(1);
      expect(result[0].timestamp.getTime()).toBeGreaterThanOrEqual(since.getTime());
    });

    it('should apply limit to results', async () => {
      const result = await BackupManager.listBackups({ limit: 1 });

      expect(result).toHaveLength(1);
    });

    it('should handle missing metadata file gracefully', async () => {
      (FileSystemUtils.fileExists as jest.Mock).mockResolvedValue(false);

      const result = await BackupManager.listBackups();

      expect(result).toEqual([]);
    });

    it('should combine multiple filters', async () => {
      const result = await BackupManager.listBackups({
        type: BackupType.MANUAL,
        since: new Date('2025-01-20T09:00:00Z'),
        limit: 5
      });

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(BackupType.MANUAL);
    });
  });

  describe('restoreFromBackup', () => {
    it('should restore backup successfully to original location', async () => {
      const result = await BackupManager.restoreFromBackup(mockBackup);

      expect(result.success).toBe(true);
      expect(result.restoredPath).toBe(mockTestFile);
      expect(fs.copy).toHaveBeenCalledWith(mockBackupPath, mockTestFile);
    });

    it('should restore backup to custom target path', async () => {
      const targetPath = '/custom/restore/path.json';

      const result = await BackupManager.restoreFromBackup(mockBackup, targetPath);

      expect(result.success).toBe(true);
      expect(result.restoredPath).toBe(targetPath);
      expect(fs.copy).toHaveBeenCalledWith(mockBackupPath, targetPath);
    });

    it('should create backup of current file before restore', async () => {
      const result = await BackupManager.restoreFromBackup(mockBackup);

      expect(result.success).toBe(true);
      expect(result.backupOfCurrent).toBeDefined();
      expect(fs.copy).toHaveBeenCalledTimes(2); // One for current backup, one for restore
    });

    it('should skip current file backup when requested', async () => {
      const result = await BackupManager.restoreFromBackup(mockBackup, undefined, false);

      expect(result.success).toBe(true);
      expect(result.backupOfCurrent).toBeUndefined();
      expect(fs.copy).toHaveBeenCalledTimes(1); // Only restore
    });

    it('should fail when backup file does not exist', async () => {
      (FileSystemUtils.fileExists as jest.Mock)
        .mockResolvedValueOnce(false); // Backup file doesn't exist

      const result = await BackupManager.restoreFromBackup(mockBackup);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Backup file not found');
    });

    it('should fail when backup integrity check fails', async () => {
      // Mock different checksum for integrity failure
      const mockHash = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('different-checksum')
      };
      (crypto.createHash as jest.Mock).mockReturnValue(mockHash);

      const result = await BackupManager.restoreFromBackup(mockBackup);

      expect(result.success).toBe(false);
      expect(result.error).toContain('integrity check failed');
    });

    it('should handle restore operation failure', async () => {
      (fs.copy as jest.Mock).mockRejectedValue(new Error('Copy failed'));

      const result = await BackupManager.restoreFromBackup(mockBackup);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Restore failed: Copy failed');
    });

    it('should validate restored configuration', async () => {
      const backupWithClient = { ...mockBackup, client: { id: 'claude-desktop' } };

      await BackupManager.restoreFromBackup(backupWithClient);

      expect(ConfigurationParser.parseConfiguration).toHaveBeenCalledWith(mockTestFile);
    });

    it('should continue even if configuration validation warns', async () => {
      (ConfigurationParser.parseConfiguration as jest.Mock).mockResolvedValue({
        success: false,
        errors: ['Invalid config']
      });

      const result = await BackupManager.restoreFromBackup(mockBackup);

      expect(result.success).toBe(true); // Should still succeed
      expect(result.restoredPath).toBe(mockTestFile);
    });
  });

  describe('deleteBackups', () => {
    it('should delete all specified backups successfully', async () => {
      const backupPaths = ['/backup1.backup', '/backup2.backup'];

      const result = await BackupManager.deleteBackups(backupPaths);

      expect(result.deleted).toEqual(backupPaths);
      expect(result.failed).toEqual([]);
      expect(fs.remove).toHaveBeenCalledTimes(2);
    });

    it('should handle partial deletion failures', async () => {
      const backupPaths = ['/backup1.backup', '/backup2.backup'];
      (fs.remove as jest.Mock)
        .mockResolvedValueOnce(undefined) // First succeeds
        .mockRejectedValueOnce(new Error('Delete failed')); // Second fails

      const result = await BackupManager.deleteBackups(backupPaths);

      expect(result.deleted).toEqual(['/backup1.backup']);
      expect(result.failed).toEqual([{
        path: '/backup2.backup',
        error: 'Delete failed'
      }]);
    });

    it('should update metadata for successfully deleted backups', async () => {
      const backupPaths = ['/backup1.backup'];
      const initialMetadata = {
        '/backup1.backup': mockBackup,
        '/backup2.backup': { ...mockBackup, path: '/backup2.backup' }
      };

      (FileSystemUtils.readJsonFile as jest.Mock).mockResolvedValue(initialMetadata);

      await BackupManager.deleteBackups(backupPaths);

      // Should save metadata without the deleted backup
      const writeCall = (FileSystemUtils.writeJsonFile as jest.Mock).mock.calls[0];
      expect(writeCall[0]).toContain(mockMetadataFile);
      const savedMetadata = writeCall[1];
      expect(Object.keys(savedMetadata)).not.toContain('/backup1.backup');
      expect(Object.keys(savedMetadata)).toContain('/backup2.backup');
    });
  });

  describe('cleanupOldBackups', () => {
    const createMockBackup = (overrides: Partial<Backup>): Backup => ({
      path: `/backup${Date.now()}.backup`,
      originalPath: '/config.json',
      timestamp: new Date(),
      size: 1024,
      checksum: 'hash',
      type: BackupType.AUTO_SAVE,
      ...overrides
    });

    it('should delete old backups beyond maxAge', async () => {
      const oldDate = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000); // 35 days ago
      const recentDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000); // 5 days ago

      const mockBackups = {
        old: createMockBackup({ timestamp: oldDate, path: '/old.backup' }),
        recent: createMockBackup({ timestamp: recentDate, path: '/recent.backup' })
      };

      (FileSystemUtils.readJsonFile as jest.Mock).mockResolvedValue(mockBackups);

      const result = await BackupManager.cleanupOldBackups({ maxAge: 30 });

      expect(result.deletedCount).toBe(1);
      expect(result.retainedCount).toBe(1);
      expect(fs.remove).toHaveBeenCalledWith('/old.backup');
    });

    it('should delete excess backups beyond maxCount per file', async () => {
      const backups: Record<string, Backup> = {};

      // Create 25 auto backups for same file (maxCount default is 20)
      for (let i = 0; i < 25; i++) {
        const timestamp = new Date(Date.now() - i * 60 * 60 * 1000); // Each hour older
        backups[`backup${i}`] = createMockBackup({
          path: `/backup${i}.backup`,
          timestamp,
          originalPath: '/same-config.json'
        });
      }

      (FileSystemUtils.readJsonFile as jest.Mock).mockResolvedValue(backups);

      const result = await BackupManager.cleanupOldBackups({ maxCount: 20 });

      expect(result.deletedCount).toBe(5); // Should delete 5 oldest
    });

    it('should preserve manual backups from age-based cleanup', async () => {
      const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000); // 100 days ago

      const mockBackups = {
        oldManual: createMockBackup({
          timestamp: oldDate,
          path: '/old-manual.backup',
          type: BackupType.MANUAL
        }),
        oldAuto: createMockBackup({
          timestamp: oldDate,
          path: '/old-auto.backup',
          type: BackupType.AUTO_SAVE
        })
      };

      (FileSystemUtils.readJsonFile as jest.Mock).mockResolvedValue(mockBackups);

      const result = await BackupManager.cleanupOldBackups({ maxAge: 30 });

      expect(result.deletedCount).toBe(1); // Only auto backup deleted
      expect(fs.remove).toHaveBeenCalledWith('/old-auto.backup');
      expect(fs.remove).not.toHaveBeenCalledWith('/old-manual.backup');
    });

    it('should handle total size limit by deleting oldest first', async () => {
      const backups: Record<string, Backup> = {};

      // Create backups totaling 150MB (maxTotalSize default is 100MB)
      for (let i = 0; i < 3; i++) {
        const timestamp = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        backups[`backup${i}`] = createMockBackup({
          path: `/backup${i}.backup`,
          timestamp,
          size: 50 * 1024 * 1024 // 50MB each
        });
      }

      (FileSystemUtils.readJsonFile as jest.Mock).mockResolvedValue(backups);

      const result = await BackupManager.cleanupOldBackups({
        maxTotalSize: 100 * 1024 * 1024 // 100MB
      });

      expect(result.deletedCount).toBe(1); // Should delete oldest backup
      expect(result.sizeFreed).toBe(50 * 1024 * 1024);
    });

    it('should perform dry run without actual deletion', async () => {
      const oldDate = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000);
      const mockBackups = {
        old: createMockBackup({ timestamp: oldDate })
      };

      (FileSystemUtils.readJsonFile as jest.Mock).mockResolvedValue(mockBackups);

      const result = await BackupManager.cleanupOldBackups({
        maxAge: 30,
        dryRun: true
      });

      expect(result.deletedCount).toBe(1);
      expect(fs.remove).not.toHaveBeenCalled(); // No actual deletion
    });

    it('should calculate cleanup duration', async () => {
      const result = await BackupManager.cleanupOldBackups();

      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(typeof result.duration).toBe('number');
    });
  });

  describe('verifyBackupIntegrity', () => {
    it('should return true for valid backup', async () => {
      const result = await BackupManager.verifyBackupIntegrity(mockBackup);

      expect(result).toBe(true);
      expect(crypto.createHash).toHaveBeenCalledWith('sha256');
    });

    it('should return false when backup file does not exist', async () => {
      (FileSystemUtils.fileExists as jest.Mock).mockResolvedValue(false);

      const result = await BackupManager.verifyBackupIntegrity(mockBackup);

      expect(result).toBe(false);
    });

    it('should return false when checksum does not match', async () => {
      const mockHash = {
        update: jest.fn().mockReturnThis(),
        digest: jest.fn().mockReturnValue('different-checksum')
      };
      (crypto.createHash as jest.Mock).mockReturnValue(mockHash);

      const result = await BackupManager.verifyBackupIntegrity(mockBackup);

      expect(result).toBe(false);
    });

    it('should handle file read errors gracefully', async () => {
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('Read error'));

      const result = await BackupManager.verifyBackupIntegrity(mockBackup);

      expect(result).toBe(false);
    });
  });

  describe('getBackupStatistics', () => {
    it('should calculate correct statistics', async () => {
      const mockBackups = {
        backup1: createMockBackup({ type: BackupType.MANUAL, size: 1024 }),
        backup2: createMockBackup({ type: BackupType.AUTO_SAVE, size: 2048 }),
        backup3: createMockBackup({ type: BackupType.MANUAL, size: 512 })
      };

      (FileSystemUtils.readJsonFile as jest.Mock).mockResolvedValue(mockBackups);

      const stats = await BackupManager.getBackupStatistics();

      expect(stats.totalBackups).toBe(3);
      expect(stats.totalSize).toBe(3584); // 1024 + 2048 + 512
      expect(stats.averageSize).toBe(3584 / 3);
      expect(stats.backupsByType[BackupType.MANUAL]).toBe(2);
      expect(stats.backupsByType[BackupType.AUTO_SAVE]).toBe(1);
      expect(stats.oldestBackup).toBeDefined();
      expect(stats.newestBackup).toBeDefined();
    });

    it('should handle empty backup list', async () => {
      (FileSystemUtils.readJsonFile as jest.Mock).mockResolvedValue({});

      const stats = await BackupManager.getBackupStatistics();

      expect(stats.totalBackups).toBe(0);
      expect(stats.totalSize).toBe(0);
      expect(stats.averageSize).toBe(0);
      expect(stats.oldestBackup).toBeUndefined();
      expect(stats.newestBackup).toBeUndefined();
    });
  });

  describe('exportBackupMetadata', () => {
    it('should export metadata with version info', async () => {
      const mockMetadata = { backup1: mockBackup };
      (FileSystemUtils.readJsonFile as jest.Mock).mockResolvedValue(mockMetadata);

      const exported = await BackupManager.exportBackupMetadata();

      expect(exported.metadata).toEqual(mockMetadata);
      expect(exported.version).toBe('1.0.0');
      expect(exported.exportedAt).toBeInstanceOf(Date);
    });
  });

  // Helper function for backup creation tests
  const createMockBackup = (overrides: Partial<Backup>): Backup => ({
    path: `/backup${Math.random()}.backup`,
    originalPath: '/config.json',
    timestamp: new Date(),
    size: 1024,
    checksum: 'hash',
    type: BackupType.AUTO_SAVE,
    ...overrides
  });

  describe('private methods integration', () => {
    it('should handle metadata loading and saving correctly', async () => {
      // Test the integration of metadata operations
      const testBackup = await BackupManager.createBackup(mockTestFile);

      // Verify metadata was saved during backup creation
      const writeCall = (FileSystemUtils.writeJsonFile as jest.Mock).mock.calls.find(call =>
        call[0].includes(mockMetadataFile)
      );
      expect(writeCall).toBeDefined();
      const savedMetadata = writeCall[1];
      expect(Object.keys(savedMetadata)).toContain(testBackup.path);
      expect(savedMetadata[testBackup.path]).toMatchObject({
        originalPath: mockTestFile,
        path: testBackup.path
      });
    });

    it('should handle metadata corruption gracefully', async () => {
      (FileSystemUtils.readJsonFile as jest.Mock).mockRejectedValue(new Error('Corrupted JSON'));
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const backups = await BackupManager.listBackups();

      expect(backups).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to load backup metadata, initializing empty:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('error handling edge cases', () => {
    it('should handle concurrent backup operations', async () => {
      // Simulate multiple concurrent backup creations
      const promises = [
        BackupManager.createBackup('/file1.json'),
        BackupManager.createBackup('/file2.json'),
        BackupManager.createBackup('/file3.json')
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.path).toBeDefined();
        expect(result.timestamp).toBeInstanceOf(Date);
      });
    });

    it('should handle backup operations with special characters in paths', async () => {
      const specialPath = '/path/with spaces/and-special_chars.json';

      const result = await BackupManager.createBackup(specialPath);

      expect(result.originalPath).toBe(specialPath);
      expect(result.path).toContain('.backup');
    });

    it('should handle very large backup files', async () => {
      const largeSize = 1024 * 1024 * 1024; // 1GB
      (fs.stat as jest.Mock).mockResolvedValue({ size: largeSize });

      const result = await BackupManager.createBackup(mockTestFile);

      expect(result.size).toBe(largeSize);
    });
  });
});