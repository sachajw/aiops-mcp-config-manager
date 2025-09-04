import { ConfigurationService } from '../src/main/services/ConfigurationService';
import { ClientType } from '../src/shared/types/enums';
import { Configuration } from '../src/shared/types/configuration';
import { promises as fs } from 'fs';

// Mock fs module
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn()
  }
}));

const mockFs = fs as jest.Mocked<typeof fs>;

describe('ConfigurationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createTestConfig = (): Configuration => ({
    mcpServers: {
      'test-server': {
        name: 'test-server',
        command: 'node',
        args: ['server.js'],
        env: { NODE_ENV: 'production' },
        scope: 'user',
        enabled: true
      }
    },
    metadata: {
      lastModified: new Date(),
      version: '1.0.0',
      scope: 'user'
    }
  });

  describe('loadConfiguration', () => {
    it('should load and validate configuration successfully', async () => {
      const content = `{
        "mcpServers": {
          "test-server": {
            "command": "node",
            "args": ["server.js"],
            "env": {
              "NODE_ENV": "production"
            }
          }
        }
      }`;

      mockFs.readFile.mockResolvedValue(content);

      const result = await ConfigurationService.loadConfiguration(
        '/path/to/config.json',
        ClientType.CLAUDE_DESKTOP,
        { checkFileSystem: false, checkCommands: false }
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.mcpServers['test-server']).toBeDefined();
    });

    it('should handle file read errors', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'));

      const result = await ConfigurationService.loadConfiguration(
        '/nonexistent/config.json',
        ClientType.CLAUDE_DESKTOP
      );

      expect(result.success).toBe(false);
      expect(result.errors[0].code).toBe('FILE_READ_ERROR');
    });

    it('should combine parse and validation errors', async () => {
      const content = `{
        "mcpServers": {
          "invalid-server": {
            "args": ["server.js"]
          }
        }
      }`;

      mockFs.readFile.mockResolvedValue(content);

      const result = await ConfigurationService.loadConfiguration(
        '/path/to/config.json',
        ClientType.CLAUDE_DESKTOP,
        { checkFileSystem: false, checkCommands: false }
      );

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('parseAndValidate', () => {
    it('should parse and validate content successfully', async () => {
      const content = `{
        "mcpServers": {
          "test-server": {
            "command": "node",
            "args": ["server.js"]
          }
        }
      }`;

      const result = await ConfigurationService.parseAndValidate(
        content,
        ClientType.CLAUDE_DESKTOP
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should handle syntax errors', async () => {
      const content = `{
        "mcpServers": {
          "test-server": {
            "command": "node"
            "args": ["server.js"]
          }
        }
      }`;

      const result = await ConfigurationService.parseAndValidate(
        content,
        ClientType.CLAUDE_DESKTOP
      );

      expect(result.success).toBe(false);
      expect(result.errors[0].code).toBe('SYNTAX_ERROR');
    });

    it('should validate configuration structure', async () => {
      const content = `{
        "mcpServers": {
          "invalid-server": {
            "args": ["server.js"]
          }
        }
      }`;

      const result = await ConfigurationService.parseAndValidate(
        content,
        ClientType.CLAUDE_DESKTOP
      );

      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.field.includes('command'))).toBe(true);
    });
  });

  describe('saveConfiguration', () => {
    it('should save valid configuration successfully', async () => {
      const config = createTestConfig();
      mockFs.writeFile.mockResolvedValue(undefined);

      const result = await ConfigurationService.saveConfiguration(
        config,
        '/path/to/config.json',
        ClientType.CLAUDE_DESKTOP,
        { checkFileSystem: false, checkCommands: false }
      );

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('should reject invalid configuration', async () => {
      const invalidConfig = {
        ...createTestConfig(),
        mcpServers: {
          'invalid-server': {
            name: 'invalid-server',
            command: '', // Empty command
            args: [],
            env: {},
            scope: 'user' as const,
            enabled: true
          }
        }
      };

      const result = await ConfigurationService.saveConfiguration(
        invalidConfig,
        '/path/to/config.json',
        ClientType.CLAUDE_DESKTOP,
        { checkFileSystem: false, checkCommands: false }
      );

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(mockFs.writeFile).not.toHaveBeenCalled();
    });

    it('should handle file write errors', async () => {
      const config = createTestConfig();
      mockFs.writeFile.mockRejectedValue(new Error('Permission denied'));

      const result = await ConfigurationService.saveConfiguration(
        config,
        '/path/to/config.json',
        ClientType.CLAUDE_DESKTOP,
        { checkFileSystem: false, checkCommands: false }
      );

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('Failed to save configuration');
    });
  });

  describe('validateSyntax', () => {
    it('should validate correct JSON5 syntax', () => {
      const content = `{
        // Comment
        "key": "value",
        "array": [1, 2, 3,], // trailing comma
      }`;

      const result = ConfigurationService.validateSyntax(content);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect syntax errors', () => {
      const content = `{
        "key": "value"
        "missing": "comma"
      }`;

      const result = ConfigurationService.validateSyntax(content);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('SYNTAX_ERROR');
    });
  });

  describe('formatForClient', () => {
    it('should format configuration for Claude Desktop', () => {
      const config = createTestConfig();

      const formatted = ConfigurationService.formatForClient(config, ClientType.CLAUDE_DESKTOP);
      const parsed = JSON.parse(formatted);

      expect(parsed.mcpServers['test-server']).toEqual({
        command: 'node',
        args: ['server.js'],
        env: { NODE_ENV: 'production' }
      });
    });

    it('should format configuration for Codex', () => {
      const config = createTestConfig();

      const formatted = ConfigurationService.formatForClient(config, ClientType.CODEX);
      const parsed = JSON.parse(formatted);

      expect(parsed.servers['test-server']).toEqual({
        command: 'node',
        arguments: ['server.js'],
        environment: { NODE_ENV: 'production' },
        enabled: true
      });
    });
  });

  describe('getSupportedClientTypes', () => {
    it('should return all supported client types', () => {
      const types = ConfigurationService.getSupportedClientTypes();

      expect(types).toContain(ClientType.CLAUDE_DESKTOP);
      expect(types).toContain(ClientType.CLAUDE_CODE);
      expect(types).toContain(ClientType.CODEX);
      expect(types).toContain(ClientType.VS_CODE);
      expect(types).toContain(ClientType.GEMINI_DESKTOP);
      expect(types).toContain(ClientType.GEMINI_CLI);
    });
  });

  describe('getDefaultValidationContext', () => {
    it('should return appropriate defaults for Claude Desktop', () => {
      const context = ConfigurationService.getDefaultValidationContext(ClientType.CLAUDE_DESKTOP);

      expect(context.checkFileSystem).toBe(true);
      expect(context.checkCommands).toBe(true);
    });

    it('should return appropriate defaults for VS Code', () => {
      const context = ConfigurationService.getDefaultValidationContext(ClientType.VS_CODE);

      expect(context.checkFileSystem).toBe(false);
      expect(context.checkCommands).toBe(false);
    });

    it('should return appropriate defaults for Codex', () => {
      const context = ConfigurationService.getDefaultValidationContext(ClientType.CODEX);

      expect(context.checkFileSystem).toBe(true);
      expect(context.checkCommands).toBe(true);
    });
  });

  describe('validateConfiguration', () => {
    it('should validate configuration with context', async () => {
      const config = createTestConfig();

      const result = await ConfigurationService.validateConfiguration(config, {
        clientType: ClientType.CLAUDE_DESKTOP,
        checkFileSystem: false,
        checkCommands: false
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect validation errors', async () => {
      const invalidConfig = {
        ...createTestConfig(),
        mcpServers: {
          'invalid-server': {
            name: 'invalid-server',
            command: '', // Empty command
            args: [],
            env: {},
            scope: 'user' as const,
            enabled: true
          }
        }
      };

      const result = await ConfigurationService.validateConfiguration(invalidConfig, {
        clientType: ClientType.CLAUDE_DESKTOP,
        checkFileSystem: false,
        checkCommands: false
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});