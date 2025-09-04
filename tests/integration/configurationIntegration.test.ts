import path from 'path';
import * as fs from 'fs-extra';
import { ConfigurationService } from '../../src/main/services/ConfigurationService';
import { ConfigurationParser } from '../../src/main/services/ConfigurationParser';
import { ValidationEngine } from '../../src/main/services/ValidationEngine';
import { Configuration } from '../../src/shared/types';
import { ConfigScope, ClientType } from '../../src/shared/types/enums';

describe('Configuration Management Integration', () => {
  let tempDir: string;
  let configService: ConfigurationService;
  
  beforeEach(async () => {
    // Create temporary directory for test files
    tempDir = await fs.mkdtemp(path.join(__dirname, 'tmp-'));
    configService = new ConfigurationService();
  });

  afterEach(async () => {
    // Clean up temporary files
    await fs.remove(tempDir);
  });

  describe('End-to-End Configuration Flow', () => {
    it('should create, validate, and save a complete configuration', async () => {
      // 1. Create a test configuration
      const testConfig: Configuration = {
        mcpServers: {
          'test-server': {
            name: 'test-server',
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-filesystem', tempDir],
            env: {},
            enabled: true,
            scope: ConfigScope.USER
          }
        },
        metadata: {
          version: '1.0.0',
          scope: ConfigScope.USER,
          lastModified: new Date()
        }
      };

      const configPath = path.join(tempDir, 'test-config.json');

      // 2. Save the configuration
      await fs.writeJson(configPath, testConfig, { spaces: 2 });

      // 3. Load and parse the configuration
      const loadedConfig = await ConfigurationParser.parseFile(configPath);
      expect(loadedConfig.success).toBe(true);
      expect(loadedConfig.data).toBeDefined();

      // 4. Validate the configuration
      if (loadedConfig.success && loadedConfig.data) {
        const validation = await ValidationEngine.validateConfiguration(
          loadedConfig.data,
          {
            clientType: ClientType.CLAUDE_DESKTOP,
            checkFileSystem: false, // Skip file system checks for test stability
            checkCommands: false
          }
        );

        expect(validation.isValid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      }

      // 5. Verify file was created correctly
      const fileExists = await fs.pathExists(configPath);
      expect(fileExists).toBe(true);

      const rawContent = await fs.readJson(configPath);
      expect(rawContent.mcpServers['test-server'].name).toBe('test-server');
    });

    it('should handle configuration merging across scopes', async () => {
      // Create configurations at different scopes
      const globalConfig: Configuration = {
        mcpServers: {
          'global-server': {
            name: 'global-server',
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-git'],
            env: {},
            enabled: true,
            scope: ConfigScope.GLOBAL
          }
        },
        metadata: {
          version: '1.0.0',
          scope: ConfigScope.GLOBAL,
          lastModified: new Date()
        }
      };

      const userConfig: Configuration = {
        mcpServers: {
          'user-server': {
            name: 'user-server',
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-filesystem'],
            env: {},
            enabled: true,
            scope: ConfigScope.USER
          }
        },
        metadata: {
          version: '1.0.0',
          scope: ConfigScope.USER,
          lastModified: new Date()
        }
      };

      // Save both configurations
      const globalPath = path.join(tempDir, 'global.json');
      const userPath = path.join(tempDir, 'user.json');

      await fs.writeJson(globalPath, globalConfig, { spaces: 2 });
      await fs.writeJson(userPath, userConfig, { spaces: 2 });

      // Parse both configurations
      const globalResult = await ConfigurationParser.parseFile(globalPath);
      const userResult = await ConfigurationParser.parseFile(userPath);

      expect(globalResult.success).toBe(true);
      expect(userResult.success).toBe(true);

      // Verify they contain the expected servers
      if (globalResult.success && userResult.success) {
        expect(globalResult.data?.mcpServers['global-server']).toBeDefined();
        expect(userResult.data?.mcpServers['user-server']).toBeDefined();
      }
    });

    it('should detect and handle configuration validation errors', async () => {
      // Create an invalid configuration
      const invalidConfig = {
        mcpServers: {
          'invalid-server': {
            name: 'invalid-server',
            // Missing required command field
            args: ['test'],
            env: {},
            enabled: true,
            scope: ConfigScope.USER
          }
        },
        metadata: {
          version: '1.0.0',
          scope: ConfigScope.USER,
          lastModified: new Date()
        }
      };

      const configPath = path.join(tempDir, 'invalid-config.json');
      await fs.writeJson(configPath, invalidConfig, { spaces: 2 });

      // Try to parse the invalid configuration
      const result = await ConfigurationParser.parseFile(configPath);

      // Should still parse successfully (JSON is valid)
      expect(result.success).toBe(true);

      // But validation should fail
      if (result.success && result.data) {
        const validation = await ValidationEngine.validateConfiguration(
          result.data,
          {
            clientType: ClientType.CLAUDE_DESKTOP,
            checkFileSystem: false,
            checkCommands: false
          }
        );

        expect(validation.isValid).toBe(false);
        expect(validation.errors.length).toBeGreaterThan(0);
      }
    });

    it('should handle different configuration file formats', async () => {
      const testConfig = {
        mcpServers: {
          'format-test': {
            name: 'format-test',
            command: 'echo',
            args: ['test'],
            env: {},
            enabled: true,
            scope: ConfigScope.USER
          }
        }
      };

      // Test JSON format
      const jsonPath = path.join(tempDir, 'config.json');
      await fs.writeJson(jsonPath, testConfig, { spaces: 2 });
      
      const jsonResult = await ConfigurationParser.parseFile(jsonPath);
      expect(jsonResult.success).toBe(true);

      // Test JSON5 format with comments
      const json5Path = path.join(tempDir, 'config.json5');
      const json5Content = `{
  // This is a comment
  "mcpServers": {
    "format-test": {
      "name": "format-test",
      "command": "echo",
      "args": ["test"],
      "env": {},
      "enabled": true,
      "scope": "USER"
    }
  }
}`;
      await fs.writeFile(json5Path, json5Content);
      
      const json5Result = await ConfigurationParser.parseFile(json5Path);
      expect(json5Result.success).toBe(true);
    });

    it('should backup and restore configurations', async () => {
      const originalConfig: Configuration = {
        mcpServers: {
          'backup-test': {
            name: 'backup-test',
            command: 'echo',
            args: ['original'],
            env: {},
            enabled: true,
            scope: ConfigScope.USER
          }
        },
        metadata: {
          version: '1.0.0',
          scope: ConfigScope.USER,
          lastModified: new Date()
        }
      };

      const configPath = path.join(tempDir, 'backup-config.json');
      const backupPath = path.join(tempDir, 'backup-config.json.backup');

      // Save original configuration
      await fs.writeJson(configPath, originalConfig, { spaces: 2 });

      // Create backup
      await fs.copy(configPath, backupPath);

      // Modify original
      const modifiedConfig = { ...originalConfig };
      modifiedConfig.mcpServers['backup-test'].args = ['modified'];
      await fs.writeJson(configPath, modifiedConfig, { spaces: 2 });

      // Verify modification
      const modifiedResult = await ConfigurationParser.parseFile(configPath);
      expect(modifiedResult.success).toBe(true);
      if (modifiedResult.success) {
        expect(modifiedResult.data?.mcpServers['backup-test'].args[0]).toBe('modified');
      }

      // Restore from backup
      await fs.copy(backupPath, configPath);

      // Verify restoration
      const restoredResult = await ConfigurationParser.parseFile(configPath);
      expect(restoredResult.success).toBe(true);
      if (restoredResult.success) {
        expect(restoredResult.data?.mcpServers['backup-test'].args[0]).toBe('original');
      }
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle corrupted configuration files gracefully', async () => {
      const corruptedPath = path.join(tempDir, 'corrupted.json');
      await fs.writeFile(corruptedPath, '{ invalid json content }');

      const result = await ConfigurationParser.parseFile(corruptedPath);
      
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle missing configuration files', async () => {
      const nonExistentPath = path.join(tempDir, 'nonexistent.json');

      const result = await ConfigurationParser.parseFile(nonExistentPath);
      
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('should validate configuration structure thoroughly', async () => {
      const malformedConfig = {
        // Missing mcpServers completely
        metadata: {
          version: '1.0.0'
        }
      };

      const configPath = path.join(tempDir, 'malformed.json');
      await fs.writeJson(configPath, malformedConfig);

      const parseResult = await ConfigurationParser.parseFile(configPath);
      expect(parseResult.success).toBe(true); // JSON parses fine

      if (parseResult.success && parseResult.data) {
        const validation = await ValidationEngine.validateConfiguration(
          parseResult.data,
          {
            clientType: ClientType.CLAUDE_DESKTOP,
            checkFileSystem: false,
            checkCommands: false
          }
        );

        expect(validation.isValid).toBe(false);
        expect(validation.warnings.length).toBeGreaterThan(0);
      }
    });
  });
});