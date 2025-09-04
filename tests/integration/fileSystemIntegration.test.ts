import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { MacOSPathResolver, FileSystemUtils } from '../../src/main/utils';
import { ClientType, ConfigScope } from '../../src/shared/types';

describe('File System Integration Tests', () => {
  let tempDir: string;
  let originalGetBackupDirectoryPath: any;

  beforeEach(async () => {
    // Create temporary directory for tests
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mcp-integration-test-'));
    
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

  it('should handle complete configuration workflow', async () => {
    // Simulate Claude Desktop configuration
    const configPaths = MacOSPathResolver.getClientConfigurationPaths(ClientType.CLAUDE_DESKTOP);
    const testConfigPath = path.join(tempDir, 'claude_desktop_config.json');
    
    // Initial configuration
    const initialConfig = {
      mcpServers: {
        "filesystem": {
          "command": "npx",
          "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
          "env": {}
        }
      }
    };

    // Write initial configuration
    await FileSystemUtils.writeJsonFile(testConfigPath, initialConfig);
    
    // Verify file was created
    expect(await FileSystemUtils.fileExists(testConfigPath)).toBe(true);
    
    // Read and verify configuration
    const readConfig = await FileSystemUtils.readJsonFile(testConfigPath);
    expect(readConfig).toEqual(initialConfig);
    
    // Update configuration (should create backup)
    const updatedConfig = {
      ...initialConfig,
      mcpServers: {
        ...initialConfig.mcpServers,
        "git": {
          "command": "npx",
          "args": ["-y", "@modelcontextprotocol/server-git", "--repository", "."],
          "env": {}
        }
      }
    };
    
    await FileSystemUtils.writeJsonFile(testConfigPath, updatedConfig);
    
    // Verify backup was created
    const backups = await FileSystemUtils.listBackups(testConfigPath);
    expect(backups.length).toBe(1);
    
    // Verify updated configuration
    const finalConfig = await FileSystemUtils.readJsonFile(testConfigPath);
    expect(finalConfig.mcpServers.git).toBeDefined();
    expect(finalConfig.mcpServers.filesystem).toBeDefined();
    
    // Test restoration from backup
    await FileSystemUtils.restoreFromBackup(backups[0].path, testConfigPath);
    const restoredConfig = await FileSystemUtils.readJsonFile(testConfigPath);
    expect(restoredConfig).toEqual(initialConfig);
  });

  it('should handle path resolution for different clients', () => {
    const homeDir = os.homedir();
    
    // Test Claude Desktop paths
    const claudeDesktopPaths = MacOSPathResolver.getClientConfigurationPaths(ClientType.CLAUDE_DESKTOP);
    expect(claudeDesktopPaths.primary).toContain('Library/Application Support/Claude');
    expect(claudeDesktopPaths.scopePaths[ConfigScope.USER]).toContain('.config/claude');
    
    // Test Claude Code paths
    const claudeCodePaths = MacOSPathResolver.getClientConfigurationPaths(ClientType.CLAUDE_CODE);
    expect(claudeCodePaths.primary).toContain('.claude');
    expect(claudeCodePaths.alternatives.length).toBeGreaterThan(0);
    
    // Test path expansion
    const tildePath = '~/test/config.json';
    const expandedPath = MacOSPathResolver.expandTildeInPath(tildePath);
    expect(expandedPath).toBe(path.join(homeDir, 'test/config.json'));
    
    // Test absolute path resolution
    const relativePath = 'config.json';
    const absolutePath = MacOSPathResolver.resolveAbsolutePath(relativePath);
    expect(path.isAbsolute(absolutePath)).toBe(true);
  });

  it('should handle error scenarios gracefully', async () => {
    const nonExistentPath = path.join(tempDir, 'nonexistent', 'config.json');
    
    // Test reading non-existent file
    await expect(FileSystemUtils.readJsonFile(nonExistentPath))
      .rejects.toThrow('File not found');
    
    // Test invalid JSON
    const invalidJsonPath = path.join(tempDir, 'invalid.json');
    await fs.writeFile(invalidJsonPath, '{ invalid json content }');
    
    await expect(FileSystemUtils.readJsonFile(invalidJsonPath))
      .rejects.toThrow('Invalid JSON');
    
    // Test backup of non-existent file
    await expect(FileSystemUtils.createBackup(nonExistentPath))
      .rejects.toThrow('File not found');
  });

  it('should handle backup cleanup correctly', async () => {
    const testConfigPath = path.join(tempDir, 'test-config.json');
    const testData = { test: true };
    
    // Create initial file
    await fs.writeFile(testConfigPath, JSON.stringify(testData));
    
    // Create multiple backups
    for (let i = 0; i < 5; i++) {
      await FileSystemUtils.createBackup(testConfigPath);
      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    // Verify all backups were created
    const backupsBefore = await FileSystemUtils.listBackups(testConfigPath);
    expect(backupsBefore.length).toBe(5);
    
    // Clean up keeping only 2 most recent
    const deletedCount = await FileSystemUtils.cleanupOldBackups(30, 2);
    expect(deletedCount).toBe(3);
    
    // Verify only 2 backups remain
    const backupsAfter = await FileSystemUtils.listBackups(testConfigPath);
    expect(backupsAfter.length).toBe(2);
    
    // Verify they are the most recent ones (sorted by timestamp descending)
    expect(backupsAfter[0].timestamp.getTime()).toBeGreaterThanOrEqual(backupsAfter[1].timestamp.getTime());
  });
});