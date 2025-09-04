import * as os from 'os';
import * as path from 'path';
import { MacOSPathResolver } from '../src/main/utils/pathResolver';
import { ClientType, ConfigScope } from '../src/shared/types';

describe('MacOSPathResolver', () => {
  const homeDir = os.homedir();

  describe('getHomeDirectory', () => {
    it('should return the user home directory', () => {
      const result = MacOSPathResolver.getHomeDirectory();
      expect(result).toBe(homeDir);
    });
  });

  describe('getApplicationSupportPath', () => {
    it('should return correct Application Support path', () => {
      const result = MacOSPathResolver.getApplicationSupportPath('TestApp');
      const expected = path.join(homeDir, 'Library', 'Application Support', 'TestApp');
      expect(result).toBe(expected);
    });
  });

  describe('getUserConfigPath', () => {
    it('should return correct user config path', () => {
      const result = MacOSPathResolver.getUserConfigPath('TestApp');
      const expected = path.join(homeDir, '.testapp');
      expect(result).toBe(expected);
    });
  });

  describe('expandTildeInPath', () => {
    it('should expand tilde to home directory', () => {
      const result = MacOSPathResolver.expandTildeInPath('~/Documents/config.json');
      const expected = path.join(homeDir, 'Documents', 'config.json');
      expect(result).toBe(expected);
    });

    it('should return path unchanged if no tilde', () => {
      const testPath = '/absolute/path/config.json';
      const result = MacOSPathResolver.expandTildeInPath(testPath);
      expect(result).toBe(testPath);
    });
  });

  describe('getClientConfigurationPaths', () => {
    it('should return correct paths for Claude Desktop', () => {
      const result = MacOSPathResolver.getClientConfigurationPaths(ClientType.CLAUDE_DESKTOP);
      
      expect(result.primary).toBe(
        path.join(homeDir, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json')
      );
      expect(result.alternatives).toEqual([]);
      expect(result.scopePaths[ConfigScope.USER]).toBe(
        path.join(homeDir, '.config', 'claude', 'claude_desktop_config.json')
      );
      expect(result.scopePaths[ConfigScope.GLOBAL]).toBe('/etc/claude/claude_desktop_config.json');
    });

    it('should return correct paths for Claude Code', () => {
      const result = MacOSPathResolver.getClientConfigurationPaths(ClientType.CLAUDE_CODE);
      
      expect(result.primary).toBe(
        path.join(homeDir, '.claude', 'claude_code_config.json')
      );
      expect(result.alternatives).toContain(
        path.join(homeDir, '.config', 'claude', 'claude_code_config.json')
      );
    });

    it('should return correct paths for Codex', () => {
      const result = MacOSPathResolver.getClientConfigurationPaths(ClientType.CODEX);
      
      expect(result.primary).toBe(
        path.join(homeDir, '.codex', 'config.json')
      );
      expect(result.alternatives).toContain(
        path.join(homeDir, 'Library', 'Application Support', 'Codex', 'config.json')
      );
    });

    it('should return correct paths for VS Code', () => {
      const result = MacOSPathResolver.getClientConfigurationPaths(ClientType.VS_CODE);
      
      expect(result.primary).toBe(
        path.join(homeDir, 'Library', 'Application Support', 'Code', 'User', 'settings.json')
      );
      expect(result.alternatives).toContain(
        path.join(homeDir, '.vscode', 'settings.json')
      );
    });

    it('should return correct paths for Gemini Desktop', () => {
      const result = MacOSPathResolver.getClientConfigurationPaths(ClientType.GEMINI_DESKTOP);
      
      expect(result.primary).toBe(
        path.join(homeDir, 'Library', 'Application Support', 'Gemini', 'config.json')
      );
      expect(result.scopePaths[ConfigScope.USER]).toBe(
        path.join(homeDir, '.config', 'gemini', 'config.json')
      );
    });

    it('should return correct paths for Gemini CLI', () => {
      const result = MacOSPathResolver.getClientConfigurationPaths(ClientType.GEMINI_CLI);
      
      expect(result.primary).toBe(
        path.join(homeDir, '.gemini', 'config.json')
      );
      expect(result.alternatives).toContain(
        path.join(homeDir, '.config', 'gemini', 'config.json')
      );
    });

    it('should throw error for unsupported client type', () => {
      expect(() => {
        MacOSPathResolver.getClientConfigurationPaths('UNSUPPORTED' as ClientType);
      }).toThrow('Unsupported client type: UNSUPPORTED');
    });
  });

  describe('resolveAbsolutePath', () => {
    it('should return absolute path unchanged', () => {
      const absolutePath = '/absolute/path/config.json';
      const result = MacOSPathResolver.resolveAbsolutePath(absolutePath);
      expect(result).toBe(absolutePath);
    });

    it('should resolve relative path from current directory', () => {
      const relativePath = 'config.json';
      const result = MacOSPathResolver.resolveAbsolutePath(relativePath);
      expect(result).toBe(path.resolve(process.cwd(), relativePath));
    });

    it('should resolve relative path from base path', () => {
      const relativePath = 'config.json';
      const basePath = '/custom/base';
      const result = MacOSPathResolver.resolveAbsolutePath(relativePath, basePath);
      expect(result).toBe(path.resolve(basePath, relativePath));
    });

    it('should expand tilde before resolving', () => {
      const tildePath = '~/config.json';
      const result = MacOSPathResolver.resolveAbsolutePath(tildePath);
      expect(result).toBe(path.join(homeDir, 'config.json'));
    });
  });

  describe('getBackupDirectoryPath', () => {
    it('should return correct backup directory path', () => {
      const result = MacOSPathResolver.getBackupDirectoryPath();
      const expected = path.join(homeDir, 'Library', 'Application Support', 'MCP-Config-Manager', 'backups');
      expect(result).toBe(expected);
    });
  });

  describe('getAppDataPath', () => {
    it('should return correct app data path', () => {
      const result = MacOSPathResolver.getAppDataPath();
      const expected = path.join(homeDir, 'Library', 'Application Support', 'MCP-Config-Manager');
      expect(result).toBe(expected);
    });
  });
});