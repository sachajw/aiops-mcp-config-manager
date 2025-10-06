/**
 * PersistenceService Tests
 * Test the unified persistence layer implementation
 */

import { PersistenceService } from '../PersistenceService';
import * as fs from 'fs-extra';
import * as path from 'path';
import { app } from 'electron';

// Mock electron app
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn(() => '/tmp/test-mcp-config')
  }
}));

jest.mock('fs-extra');

describe('PersistenceService', () => {
  let service: PersistenceService;
  const testDbPath = '/tmp/test-mcp-config/database.json';
  const testBackupDir = '/tmp/test-mcp-config/backups';

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton
    (PersistenceService as any).instance = null;

    // Mock fs operations
    (fs.pathExists as jest.Mock).mockResolvedValue(false);
    (fs.ensureDir as jest.Mock).mockResolvedValue(undefined);
    (fs.writeJson as jest.Mock).mockResolvedValue(undefined);
    (fs.readFile as jest.Mock).mockResolvedValue('{}');

    service = PersistenceService.getInstance();
  });

  describe('Database Initialization', () => {
    it('should create database file if it does not exist', async () => {
      // Initialize the service
      await service.initialize();

      expect(fs.ensureDir).toHaveBeenCalledWith(expect.stringContaining('test-mcp-config'));
      expect(fs.writeJson).toHaveBeenCalledWith(
        testDbPath,
        expect.objectContaining({
          version: 2,
          configs: {},
          canvas: {},
          metrics: {},
          preferences: {},
          clients: {},
          discovery: {},
          profiles: {},
          lastModified: expect.any(Number),
          backups: []
        }),
        { spaces: 2 }
      );
    });

    it('should load existing database file', async () => {
      const existingData = {
        version: 2,
        configs: { test: 'data' },
        lastModified: Date.now()
      };

      (fs.pathExists as jest.Mock).mockResolvedValue(true);
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(existingData));

      await service.initialize();

      const data = await service.getAll();
      expect(data.configs).toEqual({ test: 'data' });
    });

    it('should handle corrupted database file', async () => {
      (fs.pathExists as jest.Mock).mockResolvedValue(true);
      (fs.readFile as jest.Mock).mockResolvedValue('invalid json');
      (fs.copy as jest.Mock).mockResolvedValue(undefined);

      await service.initialize();

      // Should create backup of corrupted file
      expect(fs.copy).toHaveBeenCalledWith(
        testDbPath,
        expect.stringContaining('corrupted')
      );

      // Should create new database
      expect(fs.writeJson).toHaveBeenCalled();
    });
  });

  describe('Data Operations', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should set and get data by category and key', async () => {
      const testData = { name: 'test-server', enabled: true };

      await service.set('configs', 'test-key', testData);
      const result = await service.get('configs', 'test-key');

      expect(result).toEqual(testData);
    });

    it('should get entire category when no key provided', async () => {
      await service.set('configs', 'key1', { data: 1 });
      await service.set('configs', 'key2', { data: 2 });

      const result = await service.get('configs');

      expect(result).toEqual({
        key1: { data: 1 },
        key2: { data: 2 }
      });
    });

    it('should delete data by key', async () => {
      await service.set('configs', 'test-key', { data: 'test' });
      await service.delete('configs', 'test-key');

      const result = await service.get('configs', 'test-key');
      expect(result).toBeUndefined();
    });

    it('should clear entire category', async () => {
      await service.set('configs', 'key1', { data: 1 });
      await service.set('configs', 'key2', { data: 2 });

      await service.clear('configs');

      const result = await service.get('configs');
      expect(result).toEqual({});
    });

    it('should debounce saves', async () => {
      jest.useFakeTimers();

      // Make multiple rapid changes
      await service.set('configs', 'key1', { data: 1 });
      await service.set('configs', 'key2', { data: 2 });
      await service.set('configs', 'key3', { data: 3 });

      // Should not save immediately
      expect(fs.writeJson).toHaveBeenCalledTimes(1); // Only initial creation

      // Fast-forward debounce timer
      jest.advanceTimersByTime(1000);

      // Now should save
      expect(fs.writeJson).toHaveBeenCalledTimes(2);

      jest.useRealTimers();
    });
  });

  describe('Backup Operations', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should create backup with timestamp', async () => {
      const backupPath = await service.backup();

      expect(fs.ensureDir).toHaveBeenCalledWith(testBackupDir);
      expect(fs.copy).toHaveBeenCalledWith(
        testDbPath,
        expect.stringMatching(/backup-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.json$/)
      );
      expect(backupPath).toMatch(/backup-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.json$/);
    });

    it('should limit number of backups', async () => {
      const mockBackups = Array.from({ length: 15 }, (_, i) =>
        `backup-2025-01-${String(i + 1).padStart(2, '0')}_12-00-00.json`
      );

      (fs.readdir as jest.Mock).mockResolvedValue(mockBackups);
      (fs.stat as jest.Mock).mockImplementation((file) => ({
        mtime: new Date(`2025-01-${file.match(/\d{2}/)[0]}`)
      }));
      (fs.unlink as jest.Mock).mockResolvedValue(undefined);

      await service.backup();

      // Should delete oldest backups (keeping only MAX_BACKUPS)
      expect(fs.unlink).toHaveBeenCalledTimes(5); // 15 - 10 = 5
    });

    it('should restore from backup', async () => {
      const backupData = {
        version: 2,
        configs: { restored: 'data' },
        lastModified: Date.now()
      };

      (fs.pathExists as jest.Mock).mockResolvedValue(true);
      (fs.readJson as jest.Mock).mockResolvedValue(backupData);

      await service.restore('/tmp/backup.json');

      const data = await service.getAll();
      expect(data.configs).toEqual({ restored: 'data' });
    });
  });

  describe('Migration', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should migrate localStorage data to persistence', async () => {
      const localStorageData = {
        'visualWorkspace_nodes': JSON.stringify([{ id: '1', position: { x: 100, y: 100 } }]),
        'visualWorkspace_edges': JSON.stringify([{ id: 'e1', source: '1', target: '2' }]),
        'preferences_theme': 'dark',
        'preferences_autoSave': 'true'
      };

      await service.migrate(localStorageData);

      // Check canvas migration
      const canvasData = await service.get('canvas');
      expect(canvasData).toHaveProperty('visualWorkspace_nodes');
      expect(canvasData).toHaveProperty('visualWorkspace_edges');

      // Check preferences migration
      const prefsData = await service.get('preferences');
      expect(prefsData).toHaveProperty('theme', 'dark');
      expect(prefsData).toHaveProperty('autoSave', 'true');
    });

    it('should migrate version 1 to version 2 database', async () => {
      const v1Data = {
        version: 1,
        data: {
          configs: { old: 'format' }
        }
      };

      (fs.pathExists as jest.Mock).mockResolvedValue(true);
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(v1Data));

      await service.initialize();

      const data = await service.getAll();
      expect(data.version).toBe(2);
      expect(data.configs).toEqual({ old: 'format' });
    });
  });

  describe('Export/Import', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should export database to specified path', async () => {
      await service.set('configs', 'test', { data: 'export' });

      await service.export('/tmp/export.json');

      expect(fs.writeJson).toHaveBeenCalledWith(
        '/tmp/export.json',
        expect.objectContaining({
          configs: { test: { data: 'export' } }
        }),
        { spaces: 2 }
      );
    });

    it('should import database from file', async () => {
      const importData = {
        version: 2,
        configs: { imported: 'data' },
        lastModified: Date.now()
      };

      (fs.pathExists as jest.Mock).mockResolvedValue(true);
      (fs.readJson as jest.Mock).mockResolvedValue(importData);

      await service.import('/tmp/import.json');

      const data = await service.getAll();
      expect(data.configs).toEqual({ imported: 'data' });
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should handle file system errors gracefully', async () => {
      (fs.writeJson as jest.Mock).mockRejectedValue(new Error('Permission denied'));

      await expect(service.set('configs', 'test', { data: 'test' }))
        .rejects
        .toThrow('Failed to save database');
    });

    it('should validate category names', async () => {
      await expect(service.set('invalid_category' as any, 'key', {}))
        .rejects
        .toThrow('Invalid category');
    });

    it('should handle missing keys gracefully', async () => {
      const result = await service.get('configs', 'non-existent-key');
      expect(result).toBeUndefined();
    });
  });

  describe('Database Info', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should provide database statistics', async () => {
      await service.set('configs', 'key1', { data: 1 });
      await service.set('configs', 'key2', { data: 2 });
      await service.set('canvas', 'nodes', [1, 2, 3]);

      const info = await service.getInfo();

      expect(info).toEqual({
        version: 2,
        location: testDbPath,
        size: expect.any(Number),
        lastModified: expect.any(Number),
        backupCount: 0,
        categories: {
          configs: 2,
          canvas: 1,
          metrics: 0,
          preferences: 0,
          clients: 0,
          discovery: 0,
          profiles: 0
        }
      });
    });
  });
});