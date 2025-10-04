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
    scopePaths: Record<ConfigScope, string | null>;
  } {
    const homeDir = this.getHomeDirectory();
    
    switch (clientType) {
      case ClientType.CLAUDE_DESKTOP:
        return {
          primary: join(this.getApplicationSupportPath('Claude'), 'claude_desktop_config.json'),
          alternatives: [],
          scopePaths: {
            [ConfigScope.GLOBAL]: null, // Claude Desktop doesn't support global scope
            [ConfigScope.USER]: join(this.getApplicationSupportPath('Claude'), 'claude_desktop_config.json'),
            [ConfigScope.LOCAL]: null, // Claude Desktop doesn't support local scope
            [ConfigScope.PROJECT]: null // Claude Desktop doesn't support project scope
          }
        };

      case ClientType.CLAUDE_CODE:
        return {
          primary: join(homeDir, '.claude.json'), // Most reliable per official docs
          alternatives: [
            join(homeDir, '.claude', 'settings.local.json'),
            join(process.cwd(), '.mcp.json') // Project-level config
          ],
          scopePaths: {
            [ConfigScope.GLOBAL]: null, // Claude Code doesn't support global scope
            [ConfigScope.USER]: join(homeDir, '.claude.json'),
            [ConfigScope.LOCAL]: null, // Not clearly documented
            [ConfigScope.PROJECT]: join(process.cwd(), '.mcp.json') // Project root, version-controlled
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
          primary: join(this.getApplicationSupportPath('Code'), 'User', 'mcp.json'), // User MCP config
          alternatives: [
            join(process.cwd(), '.vscode', 'mcp.json') // Workspace MCP config
          ],
          scopePaths: {
            [ConfigScope.GLOBAL]: null, // VS Code doesn't use global MCP config
            [ConfigScope.USER]: join(this.getApplicationSupportPath('Code'), 'User', 'mcp.json'), // User profile mcp.json
            [ConfigScope.LOCAL]: null, // Not applicable for VS Code
            [ConfigScope.PROJECT]: join(process.cwd(), '.vscode', 'mcp.json') // Workspace-specific MCP config
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

      case ClientType.CURSOR:
        return {
          primary: join(homeDir, '.cursor', 'mcp.json'), // User config at ~/.cursor/mcp.json
          alternatives: [
            join(process.cwd(), '.cursor', 'mcp.json') // Project config
          ],
          scopePaths: {
            [ConfigScope.GLOBAL]: null, // Cursor doesn't have system-wide config
            [ConfigScope.USER]: join(homeDir, '.cursor', 'mcp.json'), // ~/.cursor/mcp.json for user scope
            [ConfigScope.LOCAL]: null, // Not applicable
            [ConfigScope.PROJECT]: join(process.cwd(), '.cursor', 'mcp.json') // Project-specific in .cursor/mcp.json
          }
        };

      case ClientType.WINDSURF:
        return {
          primary: join(this.getApplicationSupportPath('Windsurf'), 'mcp_config.json'),
          alternatives: [],
          scopePaths: {
            [ConfigScope.GLOBAL]: null, // Windsurf doesn't support global scope
            [ConfigScope.USER]: join(this.getApplicationSupportPath('Windsurf'), 'mcp_config.json'),
            [ConfigScope.LOCAL]: null, // Not documented
            [ConfigScope.PROJECT]: null // Project scope unclear from documentation
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