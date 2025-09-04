import { ClientDetector } from '../src/main/services/ClientDetector';
import { ClientType, ClientStatus } from '../src/shared/types/enums';
import { FileSystemUtils } from '../src/main/utils/fileSystemUtils';
import { MacOSPathResolver } from '../src/main/utils/pathResolver';
import * as fs from 'fs-extra';

// Mock the exec function first
const mockExecAsync = jest.fn();

// Mock child_process and util
jest.mock('child_process', () => ({
  exec: jest.fn()
}));

jest.mock('util', () => ({
  promisify: () => mockExecAsync
}));

// Mock other dependencies
jest.mock('fs-extra');
jest.mock('../src/main/utils/fileSystemUtils');
jest.mock('../src/main/utils/pathResolver');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockFileSystemUtils = FileSystemUtils as jest.Mocked<typeof FileSystemUtils>;
const mockMacOSPathResolver = MacOSPathResolver as jest.Mocked<typeof MacOSPathResolver>;

describe.skip('ClientDetector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockMacOSPathResolver.expandTildeInPath.mockImplementation((path: string) => {
      return path.replace('~', '/Users/testuser');
    });
    
    mockMacOSPathResolver.getClientConfigurationPaths.mockReturnValue({
      primary: '/Users/testuser/Library/Application Support/Claude/claude_desktop_config.json',
      alternatives: [],
      scopePaths: {
        global: '/etc/claude/claude_desktop_config.json',
        user: '/Users/testuser/.config/claude/claude_desktop_config.json',
        local: '/Users/testuser/project/.claude/claude_desktop_config.json',
        project: '/Users/testuser/project/claude_desktop.config.json'
      }
    });
  });

  describe('discoverClients', () => {
    it('should discover installed clients successfully', async () => {
      // Mock Claude Desktop as installed and running
      mockFileSystemUtils.fileExists
        .mockResolvedValueOnce(true) // executable exists
        .mockResolvedValueOnce(true); // config exists
      
      mockFs.stat.mockResolvedValue({
        isFile: () => true,
        mode: parseInt('755', 8) // executable permissions
      } as any);

      // Mock process check (pgrep returns PID)
      mockExecAsync
        .mockResolvedValueOnce({ stdout: '1234\n', stderr: '' }) // pgrep
        .mockResolvedValueOnce({ stdout: 'Claude Desktop v1.2.3\n', stderr: '' }); // version

      // Mock config validation
      mockFileSystemUtils.readJsonFile.mockResolvedValue({
        mcpServers: {}
      });

      const result = await ClientDetector.discoverClients();

      expect(result.clients).toHaveLength(1);
      expect(result.clients[0]).toMatchObject({
        type: ClientType.CLAUDE_DESKTOP,
        name: 'Claude Desktop',
        status: ClientStatus.ACTIVE,
        isActive: true,
        version: '1.2.3'
      });
      expect(result.errors).toHaveLength(0);
    });

    it('should handle clients that are not installed', async () => {
      // Mock no clients installed
      mockFileSystemUtils.fileExists.mockResolvedValue(false);

      const result = await ClientDetector.discoverClients();

      expect(result.clients).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should capture detection errors', async () => {
      // Mock file system error for executable check
      mockFileSystemUtils.fileExists
        .mockRejectedValueOnce(new Error('Permission denied')) // executable check fails
        .mockRejectedValueOnce(new Error('Permission denied')); // config check fails

      const result = await ClientDetector.discoverClients();

      expect(result.clients).toHaveLength(0);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toMatchObject({
        clientType: expect.any(String),
        message: expect.stringContaining('Permission denied')
      });
    });
  });

  describe('checkClientStatus', () => {
    const mockClient = {
      id: 'claude-desktop',
      name: 'Claude Desktop',
      type: ClientType.CLAUDE_DESKTOP,
      configPaths: {
        primary: '/Users/testuser/Library/Application Support/Claude/claude_desktop_config.json',
        alternatives: [],
        scopePaths: {}
      },
      status: ClientStatus.UNKNOWN,
      isActive: false
    };

    it('should detect active client process', async () => {
      // Mock pgrep finding process
      mockExecAsync.mockResolvedValue({ stdout: '1234\n', stderr: '' });

      const result = await ClientDetector.checkClientStatus(mockClient);

      expect(result.status).toBe(ClientStatus.ACTIVE);
      expect(result.pid).toBe(1234);
      expect(result.details).toContain('Process found');
    });

    it('should detect inactive client with config', async () => {
      // Mock pgrep not finding process
      const error = new Error('No matching processes');
      (error as any).code = 1;
      mockExecAsync.mockRejectedValue(error);

      // Mock config file exists
      mockFileSystemUtils.fileExists.mockResolvedValue(true);

      const result = await ClientDetector.checkClientStatus(mockClient);

      expect(result.status).toBe(ClientStatus.INACTIVE);
      expect(result.details).toContain('Configuration found but process not running');
    });

    it('should handle status check errors', async () => {
      // Mock exec throwing error
      mockExecAsync.mockRejectedValue(new Error('Command failed'));
      mockFileSystemUtils.fileExists.mockRejectedValue(new Error('File system error'));

      const result = await ClientDetector.checkClientStatus(mockClient);

      expect(result.status).toBe(ClientStatus.ERROR);
      expect(result.details).toContain('Status check failed');
    });
  });

  describe('validateClient', () => {
    const mockClient = {
      id: 'claude-desktop',
      name: 'Claude Desktop',
      type: ClientType.CLAUDE_DESKTOP,
      configPaths: {
        primary: '/Users/testuser/Library/Application Support/Claude/claude_desktop_config.json',
        alternatives: [],
        scopePaths: {}
      },
      status: ClientStatus.UNKNOWN,
      isActive: false,
      executablePath: '/Applications/Claude.app/Contents/MacOS/Claude'
    };

    it('should validate client with valid configuration', async () => {
      // Mock config file exists and is readable
      mockFileSystemUtils.fileExists.mockResolvedValue(true);
      mockFileSystemUtils.readJsonFile.mockResolvedValue({
        mcpServers: {}
      });

      // Mock executable is accessible
      mockFs.stat.mockResolvedValue({
        isFile: () => true,
        mode: parseInt('755', 8)
      } as any);

      const result = await ClientDetector.validateClient(mockClient);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.capabilities).toContain('configuration-readable');
      expect(result.capabilities).toContain('executable-accessible');
      expect(result.capabilities).toContain('mcp-support');
    });

    it('should detect invalid configuration', async () => {
      // Mock config file exists but is invalid
      mockFileSystemUtils.fileExists.mockResolvedValue(true);
      mockFileSystemUtils.readJsonFile.mockResolvedValue({
        // Missing mcpServers
        someOtherConfig: {}
      });

      // Mock executable is accessible
      mockFs.stat.mockResolvedValue({
        isFile: () => true,
        mode: parseInt('755', 8)
      } as any);

      const result = await ClientDetector.validateClient(mockClient);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Configuration does not contain mcpServers section');
    });

    it('should detect inaccessible executable', async () => {
      // Mock config is valid
      mockFileSystemUtils.fileExists.mockResolvedValue(true);
      mockFileSystemUtils.readJsonFile.mockResolvedValue({
        mcpServers: {}
      });

      // Mock executable is not executable
      mockFs.stat.mockResolvedValue({
        isFile: () => true,
        mode: parseInt('644', 8) // no execute permissions
      } as any);

      const result = await ClientDetector.validateClient(mockClient);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Executable file is not executable');
    });
  });

  describe('refreshClientStatuses', () => {
    it('should refresh status for multiple clients', async () => {
      const mockClients = [
        {
          id: 'claude-desktop',
          name: 'Claude Desktop',
          type: ClientType.CLAUDE_DESKTOP,
          configPaths: {
            primary: '/path/to/config.json',
            alternatives: [],
            scopePaths: {}
          },
          status: ClientStatus.UNKNOWN,
          isActive: false
        },
        {
          id: 'claude-code',
          name: 'Claude Code',
          type: ClientType.CLAUDE_CODE,
          configPaths: {
            primary: '/path/to/config.json',
            alternatives: [],
            scopePaths: {}
          },
          status: ClientStatus.UNKNOWN,
          isActive: false
        }
      ];

      // Mock first client as active, second as inactive
      const error = new Error('No matching processes');
      (error as any).code = 1;
      
      mockExecAsync
        .mockResolvedValueOnce({ stdout: '1234\n', stderr: '' }) // first client active
        .mockRejectedValueOnce(error); // second client inactive
      
      mockFileSystemUtils.fileExists.mockResolvedValue(false);

      const result = await ClientDetector.refreshClientStatuses(mockClients);

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe(ClientStatus.ACTIVE);
      expect(result[0].isActive).toBe(true);
      expect(result[1].status).toBe(ClientStatus.INACTIVE);
      expect(result[1].isActive).toBe(false);
    });
  });

  describe('checkCompatibility', () => {
    const mockClient = {
      id: 'claude-desktop',
      name: 'Claude Desktop',
      type: ClientType.CLAUDE_DESKTOP,
      version: '1.2.3',
      configPaths: {
        primary: '/path/to/config.json',
        alternatives: [],
        scopePaths: {}
      },
      status: ClientStatus.ACTIVE,
      isActive: true
    };

    it('should report compatible client', async () => {
      mockFileSystemUtils.fileExists.mockResolvedValue(true);
      mockFileSystemUtils.readJsonFile.mockResolvedValue({
        mcpServers: {}
      });

      const result = await ClientDetector.checkCompatibility(mockClient);

      expect(result.isCompatible).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should detect compatibility issues', async () => {
      const clientWithoutVersion = { ...mockClient, version: undefined };
      
      mockFileSystemUtils.fileExists.mockResolvedValue(true);
      mockFileSystemUtils.readJsonFile.mockResolvedValue({
        // Missing mcpServers
        someOtherConfig: {}
      });

      const result = await ClientDetector.checkCompatibility(clientWithoutVersion);

      expect(result.isCompatible).toBe(false);
      expect(result.issues).toContain('Client version could not be determined');
      expect(result.issues).toContain('Configuration missing mcpServers section');
      expect(result.recommendations).toContain('Update client to latest version');
      expect(result.recommendations).toContain('Initialize MCP configuration in client');
    });
  });

  describe('version detection', () => {
    it('should parse version from command output', async () => {
      // This tests the private parseVersionFromOutput method indirectly
      mockFileSystemUtils.fileExists
        .mockResolvedValueOnce(true) // executable exists
        .mockResolvedValueOnce(true); // config exists
      
      mockFs.stat.mockResolvedValue({
        isFile: () => true,
        mode: parseInt('755', 8)
      } as any);

      // Mock version command
      mockExecAsync
        .mockResolvedValueOnce({ stdout: '1234\n', stderr: '' }) // pgrep
        .mockResolvedValueOnce({ stdout: 'Claude Desktop version 2.1.0\n', stderr: '' }); // version
      mockFileSystemUtils.readJsonFile.mockResolvedValue({ mcpServers: {} });

      const result = await ClientDetector.discoverClients();

      expect(result.clients[0]?.version).toBe('2.1.0');
    });

    it('should handle version detection failures gracefully', async () => {
      mockFileSystemUtils.fileExists
        .mockResolvedValueOnce(true) // executable exists
        .mockResolvedValueOnce(true); // config exists
      
      mockFs.stat.mockResolvedValue({
        isFile: () => true,
        mode: parseInt('755', 8)
      } as any);

      // Mock version command failure
      mockExecAsync
        .mockResolvedValueOnce({ stdout: '1234\n', stderr: '' }) // pgrep
        .mockRejectedValueOnce(new Error('Command not found')); // version fails
      mockFileSystemUtils.readJsonFile.mockResolvedValue({ mcpServers: {} });

      const result = await ClientDetector.discoverClients();

      // Should still detect client even if version detection fails
      expect(result.clients).toHaveLength(1);
      expect(result.clients[0]?.version).toBeUndefined();
    });
  });
});