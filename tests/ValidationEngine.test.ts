import { ValidationEngine } from '../src/main/services/ValidationEngine';
import { ClientType, ValidationSeverity } from '../src/shared/types/enums';
import { Configuration } from '../src/shared/types/configuration';
import { MCPServer } from '../src/shared/types/server';
import { promises as fs } from 'fs';
import { existsSync } from 'fs';

// Mock fs module
jest.mock('fs', () => ({
  promises: {
    stat: jest.fn(),
    readdir: jest.fn()
  },
  existsSync: jest.fn()
}));

const mockFs = fs as jest.Mocked<typeof fs>;
const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;

describe('ValidationEngine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock PATH environment variable
    process.env.PATH = '/usr/bin:/bin:/usr/local/bin';
  });

  const createTestServer = (overrides: Partial<MCPServer> = {}): MCPServer => ({
    name: 'test-server',
    command: 'node',
    args: ['server.js'],
    env: { NODE_ENV: 'production' },
    scope: 'user',
    enabled: true,
    ...overrides
  });

  const createTestConfig = (servers: Record<string, MCPServer> = {}): Configuration => ({
    mcpServers: servers,
    metadata: {
      lastModified: new Date(),
      version: '1.0.0',
      scope: 'user'
    }
  });

  describe('validateConfiguration', () => {
    it('should validate a correct configuration', async () => {
      const config = createTestConfig({
        'test-server': createTestServer()
      });

      const result = await ValidationEngine.validateConfiguration(config, {
        clientType: ClientType.CLAUDE_DESKTOP,
        checkFileSystem: false,
        checkCommands: false
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required fields', async () => {
      const config = createTestConfig({
        'invalid-server': createTestServer({ command: '' })
      });

      const result = await ValidationEngine.validateConfiguration(config, {
        clientType: ClientType.CLAUDE_DESKTOP,
        checkFileSystem: false,
        checkCommands: false
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'REQUIRED_FIELD')).toBe(true);
    });

    it('should detect duplicate server names', async () => {
      const config = createTestConfig({
        'Test-Server': createTestServer({ name: 'Test-Server' }),
        'test-server': createTestServer({ name: 'test-server' })
      });

      const result = await ValidationEngine.validateConfiguration(config, {
        clientType: ClientType.CLAUDE_DESKTOP,
        checkFileSystem: false,
        checkCommands: false
      });

      expect(result.warnings.some(w => w.code === 'DUPLICATE_NAMES')).toBe(true);
    });

    it('should validate empty configuration', async () => {
      const config = createTestConfig({});

      const result = await ValidationEngine.validateConfiguration(config, {
        clientType: ClientType.CLAUDE_DESKTOP,
        checkFileSystem: false,
        checkCommands: false
      });

      expect(result.warnings.some(w => w.code === 'EMPTY_CONFIGURATION')).toBe(true);
    });
  });

  describe('validateServer', () => {
    it('should validate a correct server', async () => {
      const server = createTestServer();

      const result = await ValidationEngine.validateServer(server, 'test-server', {
        clientType: ClientType.CLAUDE_DESKTOP,
        checkFileSystem: false,
        checkCommands: false
      });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid argument types', async () => {
      const server = createTestServer({
        args: ['valid', 123 as any, true as any]
      });

      const result = await ValidationEngine.validateServer(server, 'test-server', {
        clientType: ClientType.CLAUDE_DESKTOP,
        checkFileSystem: false,
        checkCommands: false
      });

      expect(result.errors.some(e => e.code === 'INVALID_TYPE')).toBe(true);
    });

    it('should detect dangerous arguments', async () => {
      const server = createTestServer({
        args: ['--rm', '--force', 'sudo rm -rf /']
      });

      const result = await ValidationEngine.validateServer(server, 'test-server', {
        clientType: ClientType.CLAUDE_DESKTOP,
        checkFileSystem: false,
        checkCommands: false
      });

      expect(result.warnings.some(w => w.code === 'DANGEROUS_ARGUMENT')).toBe(true);
    });

    it('should validate environment variable names', async () => {
      const server = createTestServer({
        env: {
          'VALID_VAR': 'value',
          'invalid var': 'value',
          '123_INVALID': 'value'
        }
      });

      const result = await ValidationEngine.validateServer(server, 'test-server', {
        clientType: ClientType.CLAUDE_DESKTOP,
        checkFileSystem: false,
        checkCommands: false
      });

      expect(result.errors.some(e => e.code === 'INVALID_ENV_VAR_NAME')).toBe(true);
    });

    it('should detect sensitive data in environment variables', async () => {
      const server = createTestServer({
        env: {
          'API_SECRET': 'sk-1234567890abcdef',
          'PASSWORD': 'secret123',
          'TOKEN': 'ghp_1234567890abcdef1234567890abcdef12'
        }
      });

      const result = await ValidationEngine.validateServer(server, 'test-server', {
        clientType: ClientType.CLAUDE_DESKTOP,
        checkFileSystem: false,
        checkCommands: false
      });

      expect(result.warnings.some(w => w.code === 'SENSITIVE_DATA')).toBe(true);
    });

    it('should validate auto-approve tools', async () => {
      const server = createTestServer({
        autoApprove: ['valid-tool', 123 as any, 'invalid*[pattern']
      });

      const result = await ValidationEngine.validateServer(server, 'test-server', {
        clientType: ClientType.CLAUDE_DESKTOP,
        checkFileSystem: false,
        checkCommands: false
      });

      expect(result.errors.some(e => e.code === 'INVALID_TYPE')).toBe(true);
      expect(result.warnings.some(w => w.code === 'INVALID_GLOB_PATTERN')).toBe(true);
    });

    describe('with file system checks', () => {
      it('should validate existing command', async () => {
        mockExistsSync.mockReturnValue(true);
        mockFs.stat.mockResolvedValue({
          mode: parseInt('755', 8),
          isDirectory: () => false
        } as any);

        const server = createTestServer({ command: '/usr/bin/node' });

        const result = await ValidationEngine.validateServer(server, 'test-server', {
          clientType: ClientType.CLAUDE_DESKTOP,
          checkFileSystem: true,
          checkCommands: true
        });

        expect(result.isValid).toBe(true);
      });

      it('should detect non-existent command', async () => {
        mockExistsSync.mockReturnValue(false);

        const server = createTestServer({ command: '/nonexistent/command' });

        const result = await ValidationEngine.validateServer(server, 'test-server', {
          clientType: ClientType.CLAUDE_DESKTOP,
          checkFileSystem: true,
          checkCommands: true
        });

        expect(result.errors.some(e => e.code === 'COMMAND_NOT_FOUND')).toBe(true);
      });

      it('should detect non-executable command', async () => {
        mockExistsSync.mockReturnValue(true);
        mockFs.stat.mockResolvedValue({
          mode: parseInt('644', 8), // Not executable
          isDirectory: () => false
        } as any);

        const server = createTestServer({ command: '/usr/bin/data' });

        const result = await ValidationEngine.validateServer(server, 'test-server', {
          clientType: ClientType.CLAUDE_DESKTOP,
          checkFileSystem: true,
          checkCommands: true
        });

        expect(result.warnings.some(w => w.code === 'COMMAND_NOT_EXECUTABLE')).toBe(true);
      });

      it('should validate working directory', async () => {
        mockFs.stat.mockResolvedValue({
          isDirectory: () => true
        } as any);
        mockFs.readdir.mockResolvedValue([]);

        const server = createTestServer({ cwd: '/tmp' });

        const result = await ValidationEngine.validateServer(server, 'test-server', {
          clientType: ClientType.CLAUDE_DESKTOP,
          checkFileSystem: true,
          checkCommands: false
        });

        expect(result.isValid).toBe(true);
      });

      it('should detect non-existent working directory', async () => {
        mockFs.stat.mockRejectedValue(new Error('ENOENT'));

        const server = createTestServer({ cwd: '/nonexistent' });

        const result = await ValidationEngine.validateServer(server, 'test-server', {
          clientType: ClientType.CLAUDE_DESKTOP,
          checkFileSystem: true,
          checkCommands: false
        });

        expect(result.warnings.some(w => w.code === 'DIRECTORY_NOT_FOUND')).toBe(true);
      });

      it('should detect inaccessible working directory', async () => {
        mockFs.stat.mockResolvedValue({
          isDirectory: () => true
        } as any);
        mockFs.readdir.mockRejectedValue(new Error('EACCES'));

        const server = createTestServer({ cwd: '/root' });

        const result = await ValidationEngine.validateServer(server, 'test-server', {
          clientType: ClientType.CLAUDE_DESKTOP,
          checkFileSystem: true,
          checkCommands: false
        });

        expect(result.errors.some(e => e.code === 'DIRECTORY_NOT_ACCESSIBLE')).toBe(true);
      });
    });
  });

  describe('client-specific validation', () => {
    it('should warn about unsupported features in Claude Desktop', async () => {
      const config = createTestConfig({
        'claude-server': createTestServer({
          autoApprove: ['tool1', 'tool2']
        })
      });

      const result = await ValidationEngine.validateConfiguration(config, {
        clientType: ClientType.CLAUDE_DESKTOP,
        checkFileSystem: false,
        checkCommands: false
      });

      expect(result.warnings.some(w => w.code === 'UNSUPPORTED_FEATURE')).toBe(true);
    });

    it('should warn about performance issues in Codex', async () => {
      const largeEnv: Record<string, string> = {};
      for (let i = 0; i < 15; i++) {
        largeEnv[`VAR_${i}`] = `value_${i}`;
      }

      const config = createTestConfig({
        'codex-server': createTestServer({ env: largeEnv })
      });

      const result = await ValidationEngine.validateConfiguration(config, {
        clientType: ClientType.CODEX,
        checkFileSystem: false,
        checkCommands: false
      });

      expect(result.warnings.some(w => w.code === 'PERFORMANCE_WARNING')).toBe(true);
    });

    it('should warn about too many servers in VS Code', async () => {
      const servers: Record<string, MCPServer> = {};
      for (let i = 0; i < 25; i++) {
        servers[`server-${i}`] = createTestServer({ name: `server-${i}` });
      }

      const config = createTestConfig(servers);

      const result = await ValidationEngine.validateConfiguration(config, {
        clientType: ClientType.VS_CODE,
        checkFileSystem: false,
        checkCommands: false
      });

      expect(result.warnings.some(w => w.code === 'PERFORMANCE_WARNING')).toBe(true);
    });
  });

  describe('port conflict detection', () => {
    it('should detect port conflicts between servers', async () => {
      const config = createTestConfig({
        'server1': createTestServer({
          name: 'server1',
          args: ['--port', '3000']
        }),
        'server2': createTestServer({
          name: 'server2',
          env: { PORT: '3000' }
        })
      });

      const result = await ValidationEngine.validateConfiguration(config, {
        clientType: ClientType.CLAUDE_DESKTOP,
        checkFileSystem: false,
        checkCommands: false
      });

      expect(result.warnings.some(w => w.code === 'PORT_CONFLICT')).toBe(true);
    });

    it('should extract ports from various argument formats', async () => {
      const config = createTestConfig({
        'server1': createTestServer({
          name: 'server1',
          args: ['--port=8080']
        }),
        'server2': createTestServer({
          name: 'server2',
          args: ['http://localhost:8080']
        })
      });

      const result = await ValidationEngine.validateConfiguration(config, {
        clientType: ClientType.CLAUDE_DESKTOP,
        checkFileSystem: false,
        checkCommands: false
      });

      expect(result.warnings.some(w => w.code === 'PORT_CONFLICT')).toBe(true);
    });
  });

  describe('command suggestions', () => {
    it('should suggest similar commands for typos', async () => {
      mockExistsSync.mockReturnValue(false);

      const server = createTestServer({ command: 'nod' }); // typo for 'node'

      const result = await ValidationEngine.validateServer(server, 'test-server', {
        clientType: ClientType.CLAUDE_DESKTOP,
        checkFileSystem: true,
        checkCommands: true
      });

      expect(result.errors.some(e => e.code === 'COMMAND_NOT_FOUND')).toBe(true);
      expect(result.warnings.some(w => w.code === 'COMMAND_SUGGESTION')).toBe(true);
    });

    it('should suggest commands for partial matches', async () => {
      mockExistsSync.mockReturnValue(false);

      const server = createTestServer({ command: 'py' }); // partial for 'python'

      const result = await ValidationEngine.validateServer(server, 'test-server', {
        clientType: ClientType.CLAUDE_DESKTOP,
        checkFileSystem: true,
        checkCommands: true
      });

      expect(result.warnings.some(w => w.code === 'COMMAND_SUGGESTION')).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle configuration with no mcpServers field', async () => {
      const config = {
        metadata: {
          lastModified: new Date(),
          version: '1.0.0',
          scope: 'user' as const
        }
      } as any;

      const result = await ValidationEngine.validateConfiguration(config, {
        clientType: ClientType.CLAUDE_DESKTOP,
        checkFileSystem: false,
        checkCommands: false
      });

      expect(result.errors.some(e => e.code === 'REQUIRED_FIELD')).toBe(true);
    });

    it('should handle server with null/undefined values', async () => {
      const server = {
        name: 'test-server',
        command: 'node',
        args: null,
        env: undefined,
        scope: 'user',
        enabled: true
      } as any;

      const result = await ValidationEngine.validateServer(server, 'test-server', {
        clientType: ClientType.CLAUDE_DESKTOP,
        checkFileSystem: false,
        checkCommands: false
      });

      expect(result.isValid).toBe(true);
    });

    it('should handle file system errors gracefully', async () => {
      mockExistsSync.mockReturnValue(true);
      mockFs.stat.mockRejectedValue(new Error('Permission denied'));

      const server = createTestServer({ command: '/usr/bin/node' });

      const result = await ValidationEngine.validateServer(server, 'test-server', {
        clientType: ClientType.CLAUDE_DESKTOP,
        checkFileSystem: true,
        checkCommands: true
      });

      // Should not throw, but may not validate command properly
      expect(result).toBeDefined();
    });
  });
});