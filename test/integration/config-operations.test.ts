import { ConfigurationService } from '../../src/main/services/ConfigurationService';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

describe('Configuration Operations Integration Tests', () => {
  let testDir: string;
  let service: ConfigurationService;
  let testConfigPath: string;

  beforeAll(async () => {
    // Create isolated test directory
    testDir = path.join(os.tmpdir(), `mcp-test-${Date.now()}`);
    await fs.ensureDir(testDir);

    // Initialize service
    service = new ConfigurationService();

    // Set test config path
    testConfigPath = path.join(testDir, 'test-config.json');
  });

  afterAll(async () => {
    // Clean up test directory
    await fs.remove(testDir);
  });

  beforeEach(async () => {
    // Clear test directory before each test
    await fs.emptyDir(testDir);
  });

  describe('Configuration Save Operations', () => {
    test('should create new configuration file', async () => {
      const config = {
        mcpServers: {
          'test-server': {
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-memory'],
          },
        },
      };

      await service.saveConfiguration(testConfigPath, config);

      const fileExists = await fs.pathExists(testConfigPath);
      expect(fileExists).toBe(true);

      const savedConfig = await fs.readJson(testConfigPath);
      expect(savedConfig).toEqual(config);
    });

    test('should preserve formatting when saving', async () => {
      const config = {
        mcpServers: {
          'formatted-server': {
            command: 'node',
            args: ['server.js'],
            env: {
              PORT: '3000',
              DEBUG: 'true',
            },
          },
        },
      };

      await service.saveConfiguration(testConfigPath, config);

      const fileContent = await fs.readFile(testConfigPath, 'utf-8');
      expect(fileContent).toContain('  '); // Check for indentation
      expect(fileContent).not.toContain('\t'); // No tabs
    });

    test('should create backup before overwriting', async () => {
      const originalConfig = {
        mcpServers: {
          'original': {
            command: 'original-command',
          },
        },
      };

      const newConfig = {
        mcpServers: {
          'new': {
            command: 'new-command',
          },
        },
      };

      // Save original
      await service.saveConfiguration(testConfigPath, originalConfig);

      // Save new (should create backup)
      await service.saveConfiguration(testConfigPath, newConfig);

      // Check backup exists
      const backupFiles = await fs.readdir(testDir);
      const backupFile = backupFiles.find(f => f.includes('.backup.'));
      expect(backupFile).toBeDefined();

      if (backupFile) {
        const backupContent = await fs.readJson(path.join(testDir, backupFile));
        expect(backupContent).toEqual(originalConfig);
      }
    });
  });

  describe('Configuration Update Operations', () => {
    test('should add server to existing configuration', async () => {
      const initialConfig = {
        mcpServers: {
          'existing': {
            command: 'npx',
            args: ['existing-server'],
          },
        },
      };

      await fs.writeJson(testConfigPath, initialConfig);

      await service.addServer(testConfigPath, {
        name: 'new-server',
        command: 'node',
        args: ['new-server.js'],
      });

      const updatedConfig = await fs.readJson(testConfigPath);
      expect(updatedConfig.mcpServers).toHaveProperty('existing');
      expect(updatedConfig.mcpServers).toHaveProperty('new-server');
      expect(Object.keys(updatedConfig.mcpServers)).toHaveLength(2);
    });

    test('should update existing server configuration', async () => {
      const initialConfig = {
        mcpServers: {
          'update-me': {
            command: 'old-command',
            args: ['old-arg'],
          },
        },
      };

      await fs.writeJson(testConfigPath, initialConfig);

      await service.updateServer(testConfigPath, 'update-me', {
        command: 'new-command',
        args: ['new-arg1', 'new-arg2'],
        env: { NEW_ENV: 'value' },
      });

      const updatedConfig = await fs.readJson(testConfigPath);
      expect(updatedConfig.mcpServers['update-me'].command).toBe('new-command');
      expect(updatedConfig.mcpServers['update-me'].args).toEqual(['new-arg1', 'new-arg2']);
      expect(updatedConfig.mcpServers['update-me'].env).toEqual({ NEW_ENV: 'value' });
    });

    test('should remove server from configuration', async () => {
      const initialConfig = {
        mcpServers: {
          'keep-me': {
            command: 'keep',
          },
          'remove-me': {
            command: 'remove',
          },
        },
      };

      await fs.writeJson(testConfigPath, initialConfig);

      await service.removeServer(testConfigPath, 'remove-me');

      const updatedConfig = await fs.readJson(testConfigPath);
      expect(updatedConfig.mcpServers).toHaveProperty('keep-me');
      expect(updatedConfig.mcpServers).not.toHaveProperty('remove-me');
      expect(Object.keys(updatedConfig.mcpServers)).toHaveLength(1);
    });
  });

  describe('Configuration Sync Operations', () => {
    test('should sync servers between configurations', async () => {
      const sourceConfig = {
        mcpServers: {
          'server1': { command: 'cmd1' },
          'server2': { command: 'cmd2' },
          'server3': { command: 'cmd3' },
        },
      };

      const targetConfig = {
        mcpServers: {
          'existing': { command: 'existing-cmd' },
        },
      };

      const sourcePath = path.join(testDir, 'source.json');
      const targetPath = path.join(testDir, 'target.json');

      await fs.writeJson(sourcePath, sourceConfig);
      await fs.writeJson(targetPath, targetConfig);

      // Sync server1 and server2 to target
      await service.syncConfigurations(sourcePath, targetPath, ['server1', 'server2']);

      const updatedTarget = await fs.readJson(targetPath);
      expect(updatedTarget.mcpServers).toHaveProperty('existing');
      expect(updatedTarget.mcpServers).toHaveProperty('server1');
      expect(updatedTarget.mcpServers).toHaveProperty('server2');
      expect(updatedTarget.mcpServers).not.toHaveProperty('server3');
    });

    test('should handle sync conflicts', async () => {
      const sourceConfig = {
        mcpServers: {
          'conflict-server': {
            command: 'source-command',
            args: ['source-arg'],
          },
        },
      };

      const targetConfig = {
        mcpServers: {
          'conflict-server': {
            command: 'target-command',
            args: ['target-arg'],
          },
        },
      };

      const sourcePath = path.join(testDir, 'source.json');
      const targetPath = path.join(testDir, 'target.json');

      await fs.writeJson(sourcePath, sourceConfig);
      await fs.writeJson(targetPath, targetConfig);

      // Sync with overwrite
      await service.syncConfigurations(
        sourcePath,
        targetPath,
        ['conflict-server'],
        { overwrite: true }
      );

      const updatedTarget = await fs.readJson(targetPath);
      expect(updatedTarget.mcpServers['conflict-server'].command).toBe('source-command');
      expect(updatedTarget.mcpServers['conflict-server'].args).toEqual(['source-arg']);
    });
  });

  describe('Configuration Import/Export', () => {
    test('should export configuration with metadata', async () => {
      const config = {
        mcpServers: {
          'export-me': {
            command: 'export-command',
            args: ['arg1', 'arg2'],
          },
        },
      };

      await fs.writeJson(testConfigPath, config);

      const exported = await service.exportConfiguration(testConfigPath);

      expect(exported).toHaveProperty('config');
      expect(exported).toHaveProperty('metadata');
      expect(exported.config).toEqual(config);
      expect(exported.metadata).toHaveProperty('exportedAt');
      expect(exported.metadata).toHaveProperty('version');
      expect(exported.metadata).toHaveProperty('source', testConfigPath);
    });

    test('should import configuration from export', async () => {
      const exportData = {
        config: {
          mcpServers: {
            'imported-server': {
              command: 'imported-command',
              args: ['imported-arg'],
              env: { IMPORTED: 'true' },
            },
          },
        },
        metadata: {
          exportedAt: new Date().toISOString(),
          version: '1.0.0',
          source: 'original-source.json',
        },
      };

      const importPath = path.join(testDir, 'import-target.json');

      await service.importConfiguration(importPath, exportData);

      const importedConfig = await fs.readJson(importPath);
      expect(importedConfig).toEqual(exportData.config);
    });

    test('should merge imported configuration', async () => {
      const existingConfig = {
        mcpServers: {
          'existing-server': {
            command: 'existing',
          },
        },
      };

      const importData = {
        config: {
          mcpServers: {
            'imported-server': {
              command: 'imported',
            },
          },
        },
        metadata: {
          exportedAt: new Date().toISOString(),
          version: '1.0.0',
        },
      };

      await fs.writeJson(testConfigPath, existingConfig);

      await service.importConfiguration(testConfigPath, importData, { merge: true });

      const mergedConfig = await fs.readJson(testConfigPath);
      expect(mergedConfig.mcpServers).toHaveProperty('existing-server');
      expect(mergedConfig.mcpServers).toHaveProperty('imported-server');
      expect(Object.keys(mergedConfig.mcpServers)).toHaveLength(2);
    });
  });

  describe('Configuration Validation', () => {
    test('should validate server configuration', async () => {
      const validServer = {
        name: 'valid-server',
        command: 'npx',
        args: ['@modelcontextprotocol/server-memory'],
      };

      const result = await service.validateServer(validServer);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should detect invalid server configuration', async () => {
      const invalidServer = {
        name: '',
        command: '',
        args: [],
      };

      const result = await service.validateServer(invalidServer);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors).toContain(expect.stringMatching(/name/i));
      expect(result.errors).toContain(expect.stringMatching(/command/i));
    });

    test('should validate environment variables', async () => {
      const serverWithEnv = {
        name: 'env-server',
        command: 'node',
        args: ['server.js'],
        env: {
          PORT: '3000',
          DEBUG: 'true',
          INVALID_KEY: '', // Empty value should fail
        },
      };

      const result = await service.validateServer(serverWithEnv);
      expect(result.warnings).toContain(expect.stringMatching(/empty.*environment/i));
    });
  });

  describe('Error Recovery', () => {
    test('should recover from corrupted configuration', async () => {
      // Write corrupted JSON
      await fs.writeFile(testConfigPath, '{ invalid json }', 'utf-8');

      // Try to load - should fail
      await expect(service.loadConfiguration(testConfigPath)).rejects.toThrow();

      // Should be able to create new config
      const newConfig = {
        mcpServers: {
          'recovery': {
            command: 'recovered',
          },
        },
      };

      await service.saveConfiguration(testConfigPath, newConfig, { force: true });

      const recovered = await fs.readJson(testConfigPath);
      expect(recovered).toEqual(newConfig);
    });

    test('should handle concurrent modifications', async () => {
      const config = {
        mcpServers: {
          'concurrent': {
            command: 'initial',
          },
        },
      };

      await fs.writeJson(testConfigPath, config);

      // Simulate concurrent modifications
      const promises = [
        service.updateServer(testConfigPath, 'concurrent', { command: 'update1' }),
        service.updateServer(testConfigPath, 'concurrent', { command: 'update2' }),
        service.updateServer(testConfigPath, 'concurrent', { command: 'update3' }),
      ];

      await Promise.allSettled(promises);

      // At least one should succeed
      const finalConfig = await fs.readJson(testConfigPath);
      expect(finalConfig.mcpServers.concurrent.command).toMatch(/update[123]/);
    });
  });

  describe('Permission Handling', () => {
    test('should handle read-only configuration files', async () => {
      const config = {
        mcpServers: {
          'readonly': {
            command: 'test',
          },
        },
      };

      await fs.writeJson(testConfigPath, config);

      // Make file read-only
      await fs.chmod(testConfigPath, 0o444);

      // Try to update - should fail gracefully
      await expect(
        service.updateServer(testConfigPath, 'readonly', { command: 'new' })
      ).rejects.toThrow(/permission/i);

      // Restore permissions for cleanup
      await fs.chmod(testConfigPath, 0o644);
    });

    test('should create parent directories with proper permissions', async () => {
      const nestedPath = path.join(testDir, 'nested', 'deep', 'config.json');

      const config = {
        mcpServers: {
          'nested': {
            command: 'test',
          },
        },
      };

      await service.saveConfiguration(nestedPath, config);

      expect(await fs.pathExists(nestedPath)).toBe(true);

      const stats = await fs.stat(path.dirname(nestedPath));
      expect(stats.isDirectory()).toBe(true);
    });
  });
});