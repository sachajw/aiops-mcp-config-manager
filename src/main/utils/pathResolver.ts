import { homedir } from 'os';
import { join, resolve } from 'path';
import { ClientType, ConfigScope } from '../../shared/types';

/**
 * macOS-specific path resolver for MCP client configurations
 */
export class MacOSPathResolver {
  /**
   * Get the user's home directory
   */
  static getHomeDirectory(): string {
    return homedir();
  }

  /**
   * Resolve Application Support directory path
   */
  static getApplicationSupportPath(appName: string): string {
    return join(this.getHomeDirectory(), 'Library', 'Application Support', appName);
  }

  /**
   * Resolve user config directory path
   */
  static getUserConfigPath(appName: string): string {
    return join(this.getHomeDirectory(), `.${appName.toLowerCase()}`);
  }

  /**
   * Expand tilde (~) in file paths
   */
  static expandTildeInPath(path: string): string {
    if (path.startsWith('~/')) {
      return join(this.getHomeDirectory(), path.slice(2));
    }
    return path;
  }

  /**
   * Get configuration paths for a specific MCP client
   */
  static getClientConfigurationPaths(clientType: ClientType): {
    primary: string;
    alternatives: string[];
    scopePaths: Record<ConfigScope, string>;
  } {
    const homeDir = this.getHomeDirectory();
    
    switch (clientType) {
      case ClientType.CLAUDE_DESKTOP:
        return {
          primary: join(this.getApplicationSupportPath('Claude'), 'claude_desktop_config.json'),
          alternatives: [],
          scopePaths: {
            [ConfigScope.GLOBAL]: '/etc/claude/claude_desktop_config.json',
            [ConfigScope.USER]: join(homeDir, '.config', 'claude', 'claude_desktop_config.json'),
            [ConfigScope.LOCAL]: join(process.cwd(), '.claude', 'claude_desktop_config.json'),
            [ConfigScope.PROJECT]: join(process.cwd(), 'claude_desktop.config.json')
          }
        };

      case ClientType.CLAUDE_CODE:
        return {
          primary: join(homeDir, '.claude', 'claude_code_config.json'),
          alternatives: [
            join(homeDir, '.config', 'claude', 'claude_code_config.json')
          ],
          scopePaths: {
            [ConfigScope.GLOBAL]: '/etc/claude/claude_code_config.json',
            [ConfigScope.USER]: join(homeDir, '.config', 'claude', 'claude_code_config.json'),
            [ConfigScope.LOCAL]: join(process.cwd(), '.claude', 'claude_code_config.json'),
            [ConfigScope.PROJECT]: join(process.cwd(), '.claude/mcp.json')
          }
        };

      case ClientType.CODEX:
        return {
          primary: join(homeDir, '.codex', 'config.json'),
          alternatives: [
            join(this.getApplicationSupportPath('Codex'), 'config.json')
          ],
          scopePaths: {
            [ConfigScope.GLOBAL]: '/etc/codex/config.json',
            [ConfigScope.USER]: join(homeDir, '.config', 'codex', 'config.json'),
            [ConfigScope.LOCAL]: join(process.cwd(), '.codex', 'config.json'),
            [ConfigScope.PROJECT]: join(process.cwd(), 'codex.config.json')
          }
        };

      case ClientType.VS_CODE:
        return {
          primary: join(this.getApplicationSupportPath('Code'), 'User', 'settings.json'),
          alternatives: [
            join(homeDir, '.vscode', 'settings.json')
          ],
          scopePaths: {
            [ConfigScope.GLOBAL]: '/etc/vscode/settings.json',
            [ConfigScope.USER]: join(this.getApplicationSupportPath('Code'), 'User', 'settings.json'),
            [ConfigScope.LOCAL]: join(process.cwd(), '.vscode', 'settings.json'),
            [ConfigScope.PROJECT]: join(process.cwd(), '.vscode', 'settings.json')
          }
        };

      case ClientType.GEMINI_DESKTOP:
        return {
          primary: join(this.getApplicationSupportPath('Gemini'), 'config.json'),
          alternatives: [],
          scopePaths: {
            [ConfigScope.GLOBAL]: '/etc/gemini/config.json',
            [ConfigScope.USER]: join(homeDir, '.config', 'gemini', 'config.json'),
            [ConfigScope.LOCAL]: join(process.cwd(), '.gemini', 'config.json'),
            [ConfigScope.PROJECT]: join(process.cwd(), 'gemini.config.json')
          }
        };

      case ClientType.GEMINI_CLI:
        return {
          primary: join(homeDir, '.gemini', 'config.json'),
          alternatives: [
            join(homeDir, '.config', 'gemini', 'config.json')
          ],
          scopePaths: {
            [ConfigScope.GLOBAL]: '/etc/gemini/config.json',
            [ConfigScope.USER]: join(homeDir, '.config', 'gemini', 'config.json'),
            [ConfigScope.LOCAL]: join(process.cwd(), '.gemini', 'config.json'),
            [ConfigScope.PROJECT]: join(process.cwd(), 'gemini.config.json')
          }
        };

      default:
        throw new Error(`Unsupported client type: ${clientType}`);
    }
  }

  /**
   * Resolve absolute path from potentially relative path
   */
  static resolveAbsolutePath(path: string, basePath?: string): string {
    const expandedPath = this.expandTildeInPath(path);
    
    if (resolve(expandedPath) === expandedPath) {
      // Already absolute
      return expandedPath;
    }
    
    // Resolve relative to base path or current working directory
    return resolve(basePath || process.cwd(), expandedPath);
  }

  /**
   * Get backup directory path for configuration files
   */
  static getBackupDirectoryPath(): string {
    return join(this.getApplicationSupportPath('MCP-Config-Manager'), 'backups');
  }

  /**
   * Get application data directory path
   */
  static getAppDataPath(): string {
    return this.getApplicationSupportPath('MCP-Config-Manager');
  }
}