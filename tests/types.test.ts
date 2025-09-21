import { describe, it, expect } from '@jest/globals';
import {
  ClientType,
  ConfigScope,
  ClientStatus,
  TestStatus,
  ValidationUtils,
  MCPServerSchema,
  MCPClientSchema,
  ConfigurationSchema
} from '../src/shared/types';
import { DEFAULT_SERVER_CONFIG, CLIENT_DISPLAY_NAMES } from '../src/shared/constants';

describe('Core Data Models and Types', () => {
  describe('Enums', () => {
    it('should have correct ClientType values', () => {
      expect(ClientType.CLAUDE_DESKTOP).toBe('claude-desktop');
      expect(ClientType.CLAUDE_CODE).toBe('claude-code');
      expect(ClientType.CODEX).toBe('codex-cli');
      expect(ClientType.VS_CODE).toBe('vscode');
      expect(ClientType.GEMINI_DESKTOP).toBe('gemini-desktop');
      expect(ClientType.GEMINI_CLI).toBe('gemini-cli');
    });

    it('should have correct ConfigScope values', () => {
      expect(ConfigScope.GLOBAL).toBe('global');
      expect(ConfigScope.USER).toBe('user');
      expect(ConfigScope.LOCAL).toBe('local');
      expect(ConfigScope.PROJECT).toBe('project');
    });

    it('should have correct ClientStatus values', () => {
      expect(ClientStatus.ACTIVE).toBe('active');
      expect(ClientStatus.INACTIVE).toBe('inactive');
      expect(ClientStatus.ERROR).toBe('error');
      expect(ClientStatus.UNKNOWN).toBe('unknown');
    });

    it('should have correct TestStatus values', () => {
      expect(TestStatus.PENDING).toBe('pending');
      expect(TestStatus.SUCCESS).toBe('success');
      expect(TestStatus.FAILED).toBe('failed');
      expect(TestStatus.TIMEOUT).toBe('timeout');
    });
  });

  describe('Validation Schemas', () => {
    describe('MCPServerSchema', () => {
      it('should validate a valid server configuration', () => {
        const validServer = {
          name: 'test-server',
          command: 'node',
          args: ['server.js'],
          env: { NODE_ENV: 'production' },
          scope: ConfigScope.USER,
          enabled: true
        };

        const result = MCPServerSchema.safeParse(validServer);
        expect(result.success).toBe(true);
      });

      it('should reject server with missing required fields', () => {
        const invalidServer = {
          command: 'node',
          args: ['server.js']
          // missing name and scope
        };

        const result = MCPServerSchema.safeParse(invalidServer);
        expect(result.success).toBe(false);
      });

      it('should apply default values', () => {
        const serverWithDefaults = {
          name: 'test-server',
          command: 'node',
          scope: ConfigScope.USER
        };

        const result = MCPServerSchema.safeParse(serverWithDefaults);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.args).toEqual([]);
          expect(result.data.env).toEqual({});
          expect(result.data.enabled).toBe(true);
        }
      });
    });

    describe('MCPClientSchema', () => {
      it('should validate a valid client configuration', () => {
        const validClient = {
          id: 'claude-desktop-1',
          name: 'Claude Desktop',
          type: ClientType.CLAUDE_DESKTOP,
          configPaths: {
            primary: '/path/to/config.json',
            alternatives: [],
            scopePaths: {
              [ConfigScope.GLOBAL]: '/etc/config.json',
              [ConfigScope.USER]: '~/.config.json',
              [ConfigScope.LOCAL]: './config.json',
              [ConfigScope.PROJECT]: './project.json'
            }
          },
          status: ClientStatus.ACTIVE,
          isActive: true
        };

        const result = MCPClientSchema.safeParse(validClient);
        expect(result.success).toBe(true);
      });

      it('should reject client with invalid type', () => {
        const invalidClient = {
          id: 'test-client',
          name: 'Test Client',
          type: 'invalid-type',
          configPaths: {
            primary: '/path/to/config.json',
            alternatives: [],
            scopePaths: {}
          },
          status: ClientStatus.ACTIVE,
          isActive: true
        };

        const result = MCPClientSchema.safeParse(invalidClient);
        expect(result.success).toBe(false);
      });
    });

    describe('ConfigurationSchema', () => {
      it('should validate a complete configuration', () => {
        const validConfig = {
          mcpServers: {
            'test-server': {
              name: 'test-server',
              command: 'node',
              args: ['server.js'],
              env: {},
              scope: ConfigScope.USER,
              enabled: true
            }
          },
          metadata: {
            lastModified: new Date(),
            version: '1.0.0',
            scope: ConfigScope.USER
          }
        };

        const result = ConfigurationSchema.safeParse(validConfig);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('ValidationUtils', () => {
    describe('validateServer', () => {
      it('should validate a correct server configuration', () => {
        const validServer = {
          name: 'test-server',
          command: 'node',
          args: ['server.js'],
          env: {},
          scope: ConfigScope.USER,
          enabled: true
        };

        const result = ValidationUtils.validateServer(validServer);
        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
      });

      it('should return errors for invalid server configuration', () => {
        const invalidServer = {
          name: '', // empty name should fail
          command: 'node'
        };

        const result = ValidationUtils.validateServer(invalidServer);
        expect(result.success).toBe(false);
        expect(result.errors).toBeDefined();
        expect(result.errors!.length).toBeGreaterThan(0);
      });
    });

    describe('isValidJSON', () => {
      it('should return true for valid JSON', () => {
        expect(ValidationUtils.isValidJSON('{"key": "value"}')).toBe(true);
        expect(ValidationUtils.isValidJSON('[]')).toBe(true);
        expect(ValidationUtils.isValidJSON('null')).toBe(true);
      });

      it('should return false for invalid JSON', () => {
        expect(ValidationUtils.isValidJSON('{"key": value}')).toBe(false);
        expect(ValidationUtils.isValidJSON('{')).toBe(false);
        expect(ValidationUtils.isValidJSON('undefined')).toBe(false);
      });
    });

    describe('validateEnvVars', () => {
      it('should validate correct environment variables', () => {
        const result = ValidationUtils.validateEnvVars('{"NODE_ENV": "production", "PORT": "3000"}');
        expect(result.success).toBe(true);
      });

      it('should accept empty string', () => {
        const result = ValidationUtils.validateEnvVars('');
        expect(result.success).toBe(true);
      });

      it('should reject non-object JSON', () => {
        const result = ValidationUtils.validateEnvVars('["not", "an", "object"]');
        expect(result.success).toBe(false);
        expect(result.errors).toContain('Environment variables must be a JSON object');
      });

      it('should reject invalid JSON', () => {
        const result = ValidationUtils.validateEnvVars('{"invalid": json}');
        expect(result.success).toBe(false);
        expect(result.errors).toContain('Invalid JSON format for environment variables');
      });
    });

    describe('validateArgs', () => {
      it('should validate correct arguments array', () => {
        const result = ValidationUtils.validateArgs('["--port", "3000", "--verbose"]');
        expect(result.success).toBe(true);
      });

      it('should accept empty string', () => {
        const result = ValidationUtils.validateArgs('');
        expect(result.success).toBe(true);
      });

      it('should reject non-array JSON', () => {
        const result = ValidationUtils.validateArgs('{"not": "an array"}');
        expect(result.success).toBe(false);
        expect(result.errors).toContain('Arguments must be a JSON array');
      });

      it('should reject array with non-string elements', () => {
        const result = ValidationUtils.validateArgs('[123, "valid", true]');
        expect(result.success).toBe(false);
        expect(result.errors).toContain('Argument at index 0 must be a string');
        expect(result.errors).toContain('Argument at index 2 must be a string');
      });
    });
  });

  describe('Constants', () => {
    it('should have display names for all client types', () => {
      Object.values(ClientType).forEach(clientType => {
        expect(CLIENT_DISPLAY_NAMES[clientType]).toBeDefined();
        expect(typeof CLIENT_DISPLAY_NAMES[clientType]).toBe('string');
      });
    });

    it('should have valid default server configuration', () => {
      const serverConfig = {
        ...DEFAULT_SERVER_CONFIG,
        name: 'test-server',
        command: 'node'
      };
      
      const result = ValidationUtils.validateServer(serverConfig);
      if (!result.success) {
        console.log('Validation errors:', result.errors);
      }
      expect(result.success).toBe(true);
    });
  });
});