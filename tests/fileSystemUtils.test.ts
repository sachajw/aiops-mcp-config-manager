import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { 
  FileSystemUtils, 
  FileSystemError, 
  PermissionError, 
  FileNotFoundError, 
  InvalidJsonError 
} from '../src/main/utils/fileSystemUtils';
import { MacOSPathResolver } from '../src/main/utils/pathResolver';

describe('FileSystemUtils', () => {
  let tempDir: string;
  let testFilePath: string;
  let originalGetBackupDirectoryPath: any;

  beforeEach(async () => {
    // Create temporary directory for tests
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-config-test-'));
    testFilePath = path.join(tempDir, 'test-config.json');
    
    // Mock backup directory to use temp directory
    originalGetBackupDirectoryPath = MacOSPathResolver.getBackupDirectoryPath;
    MacOSPathResolver.getBackupDirectoryPath = jest.fn(() => path.join(tempDir, 'backups'));
  });

  afterEach(async () => {
    // Restore original method
    MacOSPathResolver.getBackupDirectoryPath = originalGetBackupDirectoryPath;
    
    // Clean up temporary directory
    await fs.remove(tempDir);
  });

  describe('fileExists', () => {
    it('should return true for existing files', async () => {
      await fs.writeFile(testFilePath, '{}');
      const exists = await FileSystemUtils.fileExists(testFilePath);
      expect(exists).toBe(true);
    });

    it('should return false for non-existing files', async () => {
      const exists = await FileSystemUtils.fileExists(path.join(tempDir, 'nonexistent.json'));
      expect(exists).toBe(false);
    });
  });

  describe('readJsonFile', () => {
    it('should read and parse valid JSON file', async () => {
      const testData = { mcpServers: { test: { command: 'echo' } } };
      await fs.writeFile(testFilePath, JSON.stringify(testData, null, 2));
      
      const result = await FileSystemUtils.readJsonFile(testFilePath);
      expect(result).toEqual(testData);
    });

    it('should read and parse JSON5 file with comments', async () => {
      const json5Content = `{
        // This is a comment
        "mcpServers": {
          "test": {
            "command": "echo", // Another comment
          }
        }
      }`;
      await fs.writeFile(testFilePath, json5Content);
      
      const result = await FileSystemUtils.readJsonFile(testFilePath);
      expect(result.mcpServers.test.command).toBe('echo');
    });

    it('should throw FileNotFoundError for non-existing files', async () => {
      await expect(FileSystemUtils.readJsonFile(path.join(tempDir, 'nonexistent.json')))
        .rejects.toThrow(FileNotFoundError);
    });

    it('should throw InvalidJsonError for malformed JSON', async () => {
      await fs.writeFile(testFilePath, '{ invalid json }');
      
      await expect(FileSystemUtils.readJsonFile(testFilePath))
        .rejects.toThrow(InvalidJsonError);
    });
  });

  describe('writeJsonFile', () => {
    it('should write JSON data to file', async () => {
      const testData = { mcpServers: { test: { command: 'echo' } } };
      
      await FileSystemUtils.writeJsonFile(testFilePath, testData);
      
      const content = await fs.readFile(testFilePath, 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed).toEqual(testData);
    });

    it('should create parent directories if they do not exist', async () => {
      const nestedPath = path.join(tempDir, 'nested', 'deep', 'config.json');
      const testData = { test: true };
      
      await FileSystemUtils.writeJsonFile(nestedPath, testData);
      
      const exists = await FileSystemUtils.fileExists(nestedPath);
      expect(exists).toBe(true);
    });

    it('should create backup by default when overwriting existing file', async () => {
      const originalData = { original: true };
      const newData = { updated: true };
      
      // Write original file
      await fs.writeFile(testFilePath, JSON.stringify(originalData));
      
      // Overwrite with new data
      await FileSystemUtils.writeJsonFile(testFilePath, newData);
      
      // Check that backup was created
      const backups = await FileSystemUtils.listBackups(testFilePath);
      expect(backups.length).toBeGreaterThan(0);
    });

    it('should skip backup when createBackup option is false', async () => {
      const originalData = { original: true };
      const newData = { updated: true };
      
      // Write original file
      await fs.writeFile(testFilePath, JSON.stringify(originalData));
      
      // Overwrite with new data without backup
      await FileSystemUtils.writeJsonFile(testFilePath, newData, { createBackup: false });
      
      // Check that no backup was created
      const backups = await FileSystemUtils.listBackups(testFilePath);
      expect(backups.length).toBe(0);
    });
  });

  describe('createBackup', () => {
    it('should create backup file with timestamp', async () => {
      const testData = { test: true };
      await fs.writeFile(testFilePath, JSON.stringify(testData));
      
      const backupPath = await FileSystemUtils.createBackup(testFilePath);
      
      expect(await FileSystemUtils.fileExists(backupPath)).toBe(true);
      expect(backupPath).toContain('.backup');
    });

    it('should throw FileNotFoundError for non-existing files', async () => {
      await expect(FileSystemUtils.createBackup(path.join(tempDir, 'nonexistent.json')))
        .rejects.toThrow(FileNotFoundError);
    });
  });

  describe('listBackups', () => {
    it('should list backup files sorted by timestamp', async () => {
      const testData = { test: true };
      await fs.writeFile(testFilePath, JSON.stringify(testData));
      
      // Create multiple backups with small delays
      await FileSystemUtils.createBackup(testFilePath);
      await new Promise(resolve => setTimeout(resolve, 10));
      await FileSystemUtils.createBackup(testFilePath);
      await new Promise(resolve => setTimeout(resolve, 10));
      await FileSystemUtils.createBackup(testFilePath);
      
      const backups = await FileSystemUtils.listBackups(testFilePath);
      
      expect(backups.length).toBe(3);
      expect(backups[0].timestamp.getTime()).toBeGreaterThanOrEqual(backups[1].timestamp.getTime());
      expect(backups[1].timestamp.getTime()).toBeGreaterThanOrEqual(backups[2].timestamp.getTime());
    });

    it('should return empty array for files with no backups', async () => {
      const backups = await FileSystemUtils.listBackups(path.join(tempDir, 'nonexistent.json'));
      expect(backups).toEqual([]);
    });
  });

  describe('restoreFromBackup', () => {
    it('should restore file from backup', async () => {
      const originalData = { original: true };
      const modifiedData = { modified: true };
      
      // Create original file and backup
      await fs.writeFile(testFilePath, JSON.stringify(originalData));
      const backupPath = await FileSystemUtils.createBackup(testFilePath);
      
      // Modify original file
      await FileSystemUtils.writeJsonFile(testFilePath, modifiedData, { createBackup: false });
      
      // Verify file was modified
      const modifiedContent = await FileSystemUtils.readJsonFile(testFilePath);
      expect(modifiedContent).toEqual(modifiedData);
      
      // Restore from backup
      await FileSystemUtils.restoreFromBackup(backupPath, testFilePath);
      
      // Verify restoration
      const restoredData = await FileSystemUtils.readJsonFile(testFilePath);
      expect(restoredData).toEqual(originalData);
    });
  });

  describe('getFileStats', () => {
    it('should return file statistics', async () => {
      const testData = { test: true };
      await fs.writeFile(testFilePath, JSON.stringify(testData));
      
      const stats = await FileSystemUtils.getFileStats(testFilePath);
      
      expect(stats.size).toBeGreaterThan(0);
      expect(stats.isFile).toBe(true);
      expect(stats.isDirectory).toBe(false);
      expect(typeof stats.modified.getTime).toBe('function');
      expect(typeof stats.created.getTime).toBe('function');
    });

    it('should throw FileNotFoundError for non-existing files', async () => {
      await expect(FileSystemUtils.getFileStats(path.join(tempDir, 'nonexistent.json')))
        .rejects.toThrow(FileNotFoundError);
    });
  });

  describe('cleanupOldBackups', () => {
    it('should remove old backup files', async () => {
      const testData = { test: true };
      await fs.writeFile(testFilePath, JSON.stringify(testData));
      
      // Create several backups
      for (let i = 0; i < 5; i++) {
        await FileSystemUtils.createBackup(testFilePath);
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      const backupsBefore = await FileSystemUtils.listBackups(testFilePath);
      expect(backupsBefore.length).toBe(5);
      
      // Clean up keeping only 2 most recent
      const deletedCount = await FileSystemUtils.cleanupOldBackups(30, 2);
      
      const backupsAfter = await FileSystemUtils.listBackups(testFilePath);
      expect(backupsAfter.length).toBe(2);
      expect(deletedCount).toBe(3);
    });
  });
});