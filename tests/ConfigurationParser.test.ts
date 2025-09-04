import { ConfigurationParser, ClientConfigSchemas } from '../src/main/services/ConfigurationParser';
import { ClientType } from '../src/shared/types/enums';
import { promises as fs } from 'fs';
import { join } from 'path';

// Mock fs module
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn()
  }
}));

const mockFs = fs as jest.Mocked<typeof fs>;

describe('ConfigurationParser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('parseContent', () => {
    it('should parse valid Claude Desktop configuration', () => {
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

      const result = ConfigurationParser.parseContent(content, ClientType.CLAUDE_DESKTOP);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.mcpServers['test-server']).toEqual({
        name: 'test-server',
        command: 'node',
        args: ['server.js'],
        env: { NODE_ENV: 'production' },
        scope: 'user',
        enabled: true,
        autoApprove: []
      });
    });

    it('should parse JSON5 with comments and trailing commas', () => {
      const content = `{
        // MCP Server Configuration
        "mcpServers": {
          "test-server": {
            "command": "python",
            "args": ["main.py"], // Python script
            "env": {
              "DEBUG": "true",
            }, // trailing comma
          },
        }
      }`;

      const result = ConfigurationParser.parseContent(content, ClientType.CLAUDE_DESKTOP);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.mcpServers['test-server'].command).toBe('python');
    });

    it('should handle Codex format with different field names', () => {
      const content = `{
        "servers": {
          "codex-server": {
            "command": "uvx",
            "arguments": ["package@latest"],
            "environment": {
              "API_KEY": "secret"
            },
            "workingDirectory": "/tmp",
            "enabled": true
          }
        }
      }`;

      const result = ConfigurationParser.parseContent(content, ClientType.CODEX);

      expect(result.success).toBe(true);
      expect(result.data!.mcpServers['codex-server']).toEqual({
        name: 'codex-server',
        command: 'uvx',
        args: ['package@latest'],
        env: { API_KEY: 'secret' },
        cwd: '/tmp',
        scope: 'user',
        enabled: true
      });
    });

    it('should handle VS Code format', () => {
      const content = `{
        "mcp.servers": {
          "vscode-server": {
            "command": "npm",
            "args": ["start"],
            "env": {
              "PORT": "3000"
            },
            "enabled": false
          }
        }
      }`;

      const result = ConfigurationParser.parseContent(content, ClientType.VS_CODE);

      expect(result.success).toBe(true);
      expect(result.data!.mcpServers['vscode-server'].enabled).toBe(false);
    });

    it('should return syntax error for invalid JSON5', () => {
      const content = `{
        "mcpServers": {
          "test-server": {
            "command": "node"
            "args": ["server.js"] // missing comma
          }
        }
      }`;

      const result = ConfigurationParser.parseContent(content, ClientType.CLAUDE_DESKTOP);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('SYNTAX_ERROR');
      expect(result.errors[0].field).toBe('syntax');
    });

    it('should validate required fields', () => {
      const content = `{
        "mcpServers": {
          "invalid-server": {
            "args": ["server.js"]
          }
        }
      }`;

      const result = ConfigurationParser.parseContent(content, ClientType.CLAUDE_DESKTOP);

      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.field.includes('command'))).toBe(true);
    });

    it('should detect duplicate server names (case-insensitive)', () => {
      const content = `{
        "mcpServers": {
          "Test-Server": {
            "command": "node"
          },
          "test-server": {
            "command": "python"
          }
        }
      }`;

      const result = ConfigurationParser.parseContent(content, ClientType.CLAUDE_DESKTOP);

      expect(result.warnings.some(w => w.code === 'DUPLICATE_NAME')).toBe(true);
    });

    it('should warn about relative paths in commands', () => {
      const content = `{
        "mcpServers": {
          "relative-server": {
            "command": "../bin/server"
          }
        }
      }`;

      const result = ConfigurationParser.parseContent(content, ClientType.CLAUDE_DESKTOP);

      expect(result.warnings.some(w => w.code === 'RELATIVE_PATH')).toBe(true);
    });

    it('should validate environment variable names', () => {
      const content = `{
        "mcpServers": {
          "env-server": {
            "command": "node",
            "env": {
              "VALID_VAR": "value",
              "invalid var": "value",
              "123_INVALID": "value"
            }
          }
        }
      }`;

      const result = ConfigurationParser.parseContent(content, ClientType.CLAUDE_DESKTOP);

      expect(result.warnings.some(w => w.field.includes('invalid var'))).toBe(true);
    });

    it('should validate argument types', () => {
      const content = `{
        "mcpServers": {
          "args-server": {
            "command": "node",
            "args": ["valid", 123, true]
          }
        }
      }`;

      const result = ConfigurationParser.parseContent(content, ClientType.CLAUDE_DESKTOP);

      expect(result.errors.some(e => e.code === 'ARG_TYPE')).toBe(true);
    });
  });

  describe('parseFile', () => {
    it('should read and parse file successfully', async () => {
      const content = `{
        "mcpServers": {
          "file-server": {
            "command": "node",
            "args": ["app.js"]
          }
        }
      }`;

      mockFs.readFile.mockResolvedValue(content);

      const result = await ConfigurationParser.parseFile('/path/to/config.json', ClientType.CLAUDE_DESKTOP);

      expect(result.success).toBe(true);
      expect(result.data!.mcpServers['file-server']).toBeDefined();
      expect(mockFs.readFile).toHaveBeenCalledWith('/path/to/config.json', 'utf-8');
    });

    it('should handle file read errors', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'));

      const result = await ConfigurationParser.parseFile('/nonexistent/config.json', ClientType.CLAUDE_DESKTOP);

      expect(result.success).toBe(false);
      expect(result.errors[0].code).toBe('FILE_READ_ERROR');
    });
  });

  describe('formatForClient', () => {
    it('should format configuration for Claude Desktop', () => {
      const config = {
        mcpServers: {
          'test-server': {
            name: 'test-server',
            command: 'node',
            args: ['server.js'],
            env: { NODE_ENV: 'production' },
            scope: 'user' as const,
            enabled: true,
            autoApprove: ['tool1']
          }
        },
        metadata: {
          lastModified: new Date(),
          version: '1.0.0',
          scope: 'user' as const
        }
      };

      const formatted = ConfigurationParser.formatForClient(config, ClientType.CLAUDE_DESKTOP);
      const parsed = JSON.parse(formatted);

      expect(parsed.mcpServers['test-server']).toEqual({
        command: 'node',
        args: ['server.js'],
        env: { NODE_ENV: 'production' },
        autoApprove: ['tool1']
      });
      expect(parsed.mcpServers['test-server'].disabled).toBeUndefined();
    });

    it('should format configuration for Codex', () => {
      const config = {
        mcpServers: {
          'codex-server': {
            name: 'codex-server',
            command: 'python',
            args: ['main.py'],
            env: { DEBUG: 'true' },
            cwd: '/app',
            scope: 'user' as const,
            enabled: false
          }
        },
        metadata: {
          lastModified: new Date(),
          version: '1.0.0',
          scope: 'user' as const
        }
      };

      const formatted = ConfigurationParser.formatForClient(config, ClientType.CODEX);
      const parsed = JSON.parse(formatted);

      expect(parsed.servers['codex-server']).toEqual({
        command: 'python',
        arguments: ['main.py'],
        environment: { DEBUG: 'true' },
        workingDirectory: '/app',
        enabled: false
      });
    });

    it('should omit empty arrays and objects', () => {
      const config = {
        mcpServers: {
          'minimal-server': {
            name: 'minimal-server',
            command: 'node',
            args: [],
            env: {},
            scope: 'user' as const,
            enabled: true
          }
        },
        metadata: {
          lastModified: new Date(),
          version: '1.0.0',
          scope: 'user' as const
        }
      };

      const formatted = ConfigurationParser.formatForClient(config, ClientType.CLAUDE_DESKTOP);
      const parsed = JSON.parse(formatted);

      expect(parsed.mcpServers['minimal-server']).toEqual({
        command: 'node'
      });
      expect(parsed.mcpServers['minimal-server'].args).toBeUndefined();
      expect(parsed.mcpServers['minimal-server'].env).toBeUndefined();
    });
  });

  describe('validateSyntax', () => {
    it('should validate correct JSON5 syntax', () => {
      const content = `{
        // Comment
        "key": "value",
        "array": [1, 2, 3,], // trailing comma
      }`;

      const result = ConfigurationParser.validateSyntax(content);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect syntax errors', () => {
      const content = `{
        "key": "value"
        "missing": "comma"
      }`;

      const result = ConfigurationParser.validateSyntax(content);

      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe('SYNTAX_ERROR');
    });
  });
});

describe('ClientConfigSchemas', () => {
  it('should validate Claude Desktop schema', () => {
    const validConfig = {
      mcpServers: {
        'test-server': {
          command: 'node',
          args: ['server.js'],
          env: { NODE_ENV: 'production' }
        }
      }
    };

    const result = ClientConfigSchemas.CLAUDE_DESKTOP.safeParse(validConfig);
    expect(result.success).toBe(true);
  });

  it('should reject invalid Claude Desktop schema', () => {
    const invalidConfig = {
      mcpServers: {
        'test-server': {
          // missing command
          args: ['server.js']
        }
      }
    };

    const result = ClientConfigSchemas.CLAUDE_DESKTOP.safeParse(invalidConfig);
    expect(result.success).toBe(false);
  });

  it('should validate Codex schema', () => {
    const validConfig = {
      servers: {
        'codex-server': {
          command: 'python',
          arguments: ['main.py'],
          environment: { DEBUG: 'true' },
          enabled: true
        }
      }
    };

    const result = ClientConfigSchemas.CODEX.safeParse(validConfig);
    expect(result.success).toBe(true);
  });

  it('should get correct schema for client type', () => {
    expect(ClientConfigSchemas.getSchema(ClientType.CLAUDE_DESKTOP)).toBe(ClientConfigSchemas.CLAUDE_DESKTOP);
    expect(ClientConfigSchemas.getSchema(ClientType.CODEX)).toBe(ClientConfigSchemas.CODEX);
    expect(ClientConfigSchemas.getSchema(ClientType.VS_CODE)).toBe(ClientConfigSchemas.VS_CODE);
  });

  it('should throw error for unsupported client type', () => {
    expect(() => {
      ClientConfigSchemas.getSchema('UNSUPPORTED' as ClientType);
    }).toThrow('Unsupported client type');
  });
});