import { InstallationService } from '../InstallationService';
import { spawn } from 'child_process';
import * as fs from 'fs-extra';
import * as path from 'path';
import { app } from 'electron';
import { EventEmitter } from 'events';

// Mock dependencies
jest.mock('child_process');
jest.mock('fs-extra');
jest.mock('electron', () => ({
  app: {
    getPath: jest.fn()
  }
}));

describe('InstallationService', () => {
  let installationService: InstallationService;
  let mockSpawnProcess: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock app.getPath
    (app.getPath as jest.Mock).mockReturnValue('/mock/user/data');

    // Mock fs operations
    (fs.pathExists as jest.Mock).mockResolvedValue(false);
    (fs.readJson as jest.Mock).mockResolvedValue({});
    (fs.writeJson as jest.Mock).mockResolvedValue(undefined);
    (fs.ensureDir as jest.Mock).mockResolvedValue(undefined);
    (fs.remove as jest.Mock).mockResolvedValue(undefined);

    // Create mock spawn process
    mockSpawnProcess = new EventEmitter();
    mockSpawnProcess.stdout = new EventEmitter();
    mockSpawnProcess.stderr = new EventEmitter();
    mockSpawnProcess.stdin = { write: jest.fn(), end: jest.fn() };
    mockSpawnProcess.kill = jest.fn();

    (spawn as jest.Mock).mockReturnValue(mockSpawnProcess);

    installationService = new InstallationService();
  });

  describe('constructor and initialization', () => {
    it('should set default installation path', () => {
      expect(app.getPath).toHaveBeenCalledWith('userData');
      expect(fs.pathExists).toHaveBeenCalledWith(
        path.join('/mock/user/data', 'mcp-servers', 'installed.json')
      );
    });

    it('should load existing installed servers', async () => {
      const mockInstalledData = {
        'server-1': {
          serverId: 'server-1',
          packageName: '@mcp/server-1',
          version: '1.0.0',
          installDate: '2025-01-20T10:00:00Z',
          installPath: '/mock/path',
          type: 'npm'
        }
      };

      (fs.pathExists as jest.Mock).mockResolvedValue(true);
      (fs.readJson as jest.Mock).mockResolvedValue(mockInstalledData);

      // Create new instance to trigger load
      const service = new InstallationService();
      await new Promise(resolve => setTimeout(resolve, 10)); // Wait for async load

      expect(fs.readJson).toHaveBeenCalled();
    });

    it('should handle load errors gracefully', async () => {
      (fs.pathExists as jest.Mock).mockResolvedValue(true);
      (fs.readJson as jest.Mock).mockRejectedValue(new Error('Read error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const service = new InstallationService();
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(consoleSpy).toHaveBeenCalledWith(
        '[InstallationService] Failed to load installed servers:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('installServer', () => {
    it('should route npm installations correctly', async () => {
      const installPromise = installationService.installServer('test-server', 'npm:@mcp/test');

      // Simulate successful npm install
      mockSpawnProcess.stdout.emit('data', '{"dependencies": {}}');
      mockSpawnProcess.emit('close', 0);

      const result = await installPromise;

      expect(spawn).toHaveBeenCalledWith(
        expect.stringContaining('npm'),
        expect.arrayContaining(['list', '-g', '@mcp/test', '--json']),
        expect.any(Object)
      );
    });

    it('should route pip installations correctly', async () => {
      const installPromise = installationService.installServer('test-server', 'pip:mcp-test');

      // Simulate pip check
      mockSpawnProcess.emit('close', 1); // Not found

      // Wait for next spawn (install)
      await new Promise(resolve => setTimeout(resolve, 10));

      // Simulate successful install
      if ((spawn as jest.Mock).mock.calls.length > 1) {
        const installProcess = new EventEmitter();
        installProcess.stdout = new EventEmitter();
        installProcess.stderr = new EventEmitter();
        (spawn as jest.Mock).mockReturnValueOnce(installProcess);

        installProcess.stdout.emit('data', 'Successfully installed');
        installProcess.emit('close', 0);
      }

      const result = await installPromise;

      expect(spawn).toHaveBeenCalledWith(
        'pip',
        expect.arrayContaining(['show', 'mcp-test']),
        expect.any(Object)
      );
    });

    it('should route git installations correctly', async () => {
      const installPromise = installationService.installServer(
        'test-server',
        'git:https://github.com/test/repo.git'
      );

      // Simulate successful clone
      mockSpawnProcess.emit('close', 0);

      const result = await installPromise;

      expect(spawn).toHaveBeenCalledWith(
        'git',
        expect.arrayContaining(['clone', 'https://github.com/test/repo.git']),
        expect.any(Object)
      );
    });

    it('should handle unknown source types', async () => {
      const result = await installationService.installServer('test-server', 'unknown:something');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown installation source type');
    });
  });

  describe('npm installation', () => {
    it('should detect globally installed npm packages', async () => {
      const installPromise = installationService.installServer('test-server', 'npm:@mcp/test');

      // Simulate package already installed globally
      mockSpawnProcess.stdout.emit('data', JSON.stringify({
        dependencies: {
          '@mcp/test': { version: '1.0.0' }
        }
      }));
      mockSpawnProcess.emit('close', 0);

      const result = await installPromise;

      expect(result.success).toBe(true);
      expect(result.version).toBe('1.0.0');
    });

    it('should install npm package locally if not global', async () => {
      let callCount = 0;
      (spawn as jest.Mock).mockImplementation((cmd, args) => {
        callCount++;
        const process = new EventEmitter();
        process.stdout = new EventEmitter();
        process.stderr = new EventEmitter();

        if (callCount === 1) {
          // First call: check global - not found
          setTimeout(() => {
            process.stdout.emit('data', '{}');
            process.emit('close', 0);
          }, 10);
        } else if (callCount === 2) {
          // Second call: local install
          setTimeout(() => {
            process.stdout.emit('data', 'added 1 package');
            process.emit('close', 0);
          }, 10);
        }

        return process;
      });

      const result = await installationService.installServer('test-server', 'npm:@mcp/test');

      expect(result.success).toBe(true);
      expect(spawn).toHaveBeenCalledTimes(2);
      expect(spawn).toHaveBeenNthCalledWith(2,
        'npm',
        expect.arrayContaining(['install', '@mcp/test']),
        expect.any(Object)
      );
    });

    it('should handle npm installation errors', async () => {
      const installPromise = installationService.installServer('test-server', 'npm:@mcp/test');

      // Simulate check failure
      mockSpawnProcess.stderr.emit('data', 'npm ERR! network error');
      mockSpawnProcess.emit('close', 1);

      const result = await installPromise;

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to check npm package');
    });
  });

  describe('pip installation', () => {
    it('should check and install pip packages', async () => {
      let callCount = 0;
      (spawn as jest.Mock).mockImplementation((cmd, args) => {
        callCount++;
        const process = new EventEmitter();
        process.stdout = new EventEmitter();
        process.stderr = new EventEmitter();

        if (callCount === 1) {
          // First call: check - not found
          setTimeout(() => {
            process.emit('close', 1);
          }, 10);
        } else if (callCount === 2) {
          // Second call: install
          setTimeout(() => {
            process.stdout.emit('data', 'Successfully installed mcp-test-1.0.0');
            process.emit('close', 0);
          }, 10);
        }

        return process;
      });

      const result = await installationService.installServer('test-server', 'pip:mcp-test');

      expect(result.success).toBe(true);
      expect(result.version).toBe('1.0.0');
    });

    it('should detect already installed pip packages', async () => {
      const installPromise = installationService.installServer('test-server', 'pip:mcp-test');

      // Simulate package already installed
      mockSpawnProcess.stdout.emit('data', 'Version: 2.0.0\nLocation: /usr/local/lib');
      mockSpawnProcess.emit('close', 0);

      const result = await installPromise;

      expect(result.success).toBe(true);
      expect(result.version).toBe('2.0.0');
    });
  });

  describe('git installation', () => {
    it('should clone git repositories', async () => {
      const installPromise = installationService.installServer(
        'test-server',
        'git:https://github.com/test/repo.git'
      );

      // Simulate successful clone
      mockSpawnProcess.stdout.emit('data', 'Cloning into...');
      mockSpawnProcess.emit('close', 0);

      const result = await installPromise;

      expect(result.success).toBe(true);
      expect(fs.ensureDir).toHaveBeenCalled();
    });

    it('should handle git clone errors', async () => {
      const installPromise = installationService.installServer(
        'test-server',
        'git:https://github.com/test/repo.git'
      );

      // Simulate clone failure
      mockSpawnProcess.stderr.emit('data', 'fatal: repository not found');
      mockSpawnProcess.emit('close', 128);

      const result = await installPromise;

      expect(result.success).toBe(false);
      expect(result.error).toContain('Git clone failed');
    });
  });

  describe('uninstallServer', () => {
    it('should uninstall npm packages', async () => {
      // Setup: Add installed server
      await installationService['installedServers'].set('test-server', {
        serverId: 'test-server',
        packageName: '@mcp/test',
        version: '1.0.0',
        installDate: new Date(),
        installPath: '/mock/path',
        type: 'npm'
      });

      const uninstallPromise = installationService.uninstallServer('test-server');

      // Simulate successful uninstall
      mockSpawnProcess.emit('close', 0);

      const result = await uninstallPromise;

      expect(result.success).toBe(true);
      expect(spawn).toHaveBeenCalledWith(
        'npm',
        expect.arrayContaining(['uninstall', '-g', '@mcp/test']),
        expect.any(Object)
      );
    });

    it('should handle uninstall of non-existent server', async () => {
      const result = await installationService.uninstallServer('non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Server not found');
    });

    it('should remove git cloned directories', async () => {
      // Setup: Add git-installed server
      await installationService['installedServers'].set('test-server', {
        serverId: 'test-server',
        packageName: 'https://github.com/test/repo.git',
        version: 'main',
        installDate: new Date(),
        installPath: '/mock/path/git/test-server',
        type: 'git'
      });

      const result = await installationService.uninstallServer('test-server');

      expect(result.success).toBe(true);
      expect(fs.remove).toHaveBeenCalledWith('/mock/path/git/test-server');
    });
  });

  describe('getInstalledServers', () => {
    it('should return list of installed servers', async () => {
      // Setup: Add multiple servers
      const server1 = {
        serverId: 'server-1',
        packageName: '@mcp/server-1',
        version: '1.0.0',
        installDate: new Date(),
        installPath: '/path1',
        type: 'npm' as const
      };

      const server2 = {
        serverId: 'server-2',
        packageName: 'mcp-server-2',
        version: '2.0.0',
        installDate: new Date(),
        installPath: '/path2',
        type: 'pip' as const
      };

      await installationService['installedServers'].set('server-1', server1);
      await installationService['installedServers'].set('server-2', server2);

      const installed = installationService.getInstalledServers();

      expect(installed).toHaveLength(2);
      expect(installed).toContainEqual(server1);
      expect(installed).toContainEqual(server2);
    });

    it('should return empty array when no servers installed', () => {
      const installed = installationService.getInstalledServers();
      expect(installed).toEqual([]);
    });
  });

  describe('checkInstalled', () => {
    it('should check if npm package is installed', async () => {
      const checkPromise = installationService.checkInstalled('npm:@mcp/test');

      // Simulate package found
      mockSpawnProcess.stdout.emit('data', JSON.stringify({
        dependencies: {
          '@mcp/test': { version: '1.0.0' }
        }
      }));
      mockSpawnProcess.emit('close', 0);

      const result = await checkPromise;

      expect(result.installed).toBe(true);
      expect(result.version).toBe('1.0.0');
    });

    it('should check if pip package is installed', async () => {
      const checkPromise = installationService.checkInstalled('pip:mcp-test');

      // Simulate package found
      mockSpawnProcess.stdout.emit('data', 'Version: 2.0.0');
      mockSpawnProcess.emit('close', 0);

      const result = await checkPromise;

      expect(result.installed).toBe(true);
      expect(result.version).toBe('2.0.0');
    });

    it('should return not installed for missing packages', async () => {
      const checkPromise = installationService.checkInstalled('npm:@mcp/missing');

      // Simulate package not found
      mockSpawnProcess.stdout.emit('data', '{}');
      mockSpawnProcess.emit('close', 0);

      const result = await checkPromise;

      expect(result.installed).toBe(false);
    });
  });

  describe('persistence', () => {
    it('should save installed servers to disk', async () => {
      const server = {
        serverId: 'test-server',
        packageName: '@mcp/test',
        version: '1.0.0',
        installDate: new Date(),
        installPath: '/mock/path',
        type: 'npm' as const
      };

      await installationService['installedServers'].set('test-server', server);
      await installationService['saveInstalledServers']();

      expect(fs.writeJson).toHaveBeenCalledWith(
        path.join('/mock/user/data', 'mcp-servers', 'installed.json'),
        { 'test-server': server },
        { spaces: 2 }
      );
    });

    it('should handle save errors gracefully', async () => {
      (fs.writeJson as jest.Mock).mockRejectedValue(new Error('Write error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await installationService['saveInstalledServers']();

      expect(consoleSpy).toHaveBeenCalledWith(
        '[InstallationService] Failed to save installed servers:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('error handling', () => {
    it('should handle spawn errors', async () => {
      (spawn as jest.Mock).mockImplementation(() => {
        throw new Error('Spawn failed');
      });

      const result = await installationService.installServer('test-server', 'npm:@mcp/test');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to check npm package');
    });

    it('should handle missing package names', async () => {
      const result = await installationService.installServer('test-server', 'npm:');

      expect(result.success).toBe(false);
    });

    it('should cleanup on installation failure', async () => {
      let callCount = 0;
      (spawn as jest.Mock).mockImplementation(() => {
        callCount++;
        const process = new EventEmitter();
        process.stdout = new EventEmitter();
        process.stderr = new EventEmitter();

        if (callCount === 1) {
          // Check: not found
          setTimeout(() => process.emit('close', 1), 10);
        } else {
          // Install: fail
          setTimeout(() => {
            process.stderr.emit('data', 'Installation failed');
            process.emit('close', 1);
          }, 10);
        }

        return process;
      });

      const result = await installationService.installServer('test-server', 'npm:@mcp/test');

      expect(result.success).toBe(false);
      expect(installationService['installedServers'].has('test-server')).toBe(false);
    });
  });
});