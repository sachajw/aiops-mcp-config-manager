import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs-extra';
import * as path from 'path';
import { 
  MCPClient, 
  ClientDetectionResult, 
  ClientDetectionError, 
  ClientValidationResult, 
  ClientStatusResult 
} from '../../shared/types/client';
import { ClientType, ClientStatus } from '../../shared/types/enums';
import { MacOSPathResolver } from '../utils/pathResolver';
import { FileSystemUtils } from '../utils/fileSystemUtils';

const execAsync = promisify(exec);

/**
 * Client detection patterns for different MCP clients
 */
interface ClientDetectionPattern {
  type: ClientType;
  name: string;
  executablePaths: string[];
  configPaths: string[];
  processNames: string[];
  bundleIdentifiers?: string[];
  versionCommands?: string[];
}

/**
 * MCP Client Discovery System
 * Handles detection, status checking, and version detection for supported MCP clients
 */
export class ClientDetector {
  private static readonly CLIENT_PATTERNS: ClientDetectionPattern[] = [
    {
      type: ClientType.CLAUDE_DESKTOP,
      name: 'Claude Desktop',
      executablePaths: [
        '/Applications/Claude.app/Contents/MacOS/Claude',
        '/Applications/Claude Desktop.app/Contents/MacOS/Claude Desktop'
      ],
      configPaths: [
        '~/Library/Application Support/Claude/claude_desktop_config.json'
      ],
      processNames: ['Claude', 'Claude Desktop'],
      bundleIdentifiers: ['com.anthropic.claude', 'com.anthropic.claude-desktop'],
      versionCommands: []
    },
    {
      type: ClientType.CLAUDE_CODE,
      name: 'Claude Code',
      executablePaths: [
        '/usr/local/bin/claude-code',
        '/opt/homebrew/bin/claude-code',
        '~/.local/bin/claude-code'
      ],
      configPaths: [
        '~/.claude/claude_code_config.json',
        '~/.config/claude/claude_code_config.json'
      ],
      processNames: ['claude-code'],
      versionCommands: ['claude-code --version']
    },
    {
      type: ClientType.CODEX,
      name: 'Codex',
      executablePaths: [
        '/Applications/Codex.app/Contents/MacOS/Codex',
        '/usr/local/bin/codex',
        '/opt/homebrew/bin/codex'
      ],
      configPaths: [
        '~/.codex/config.json',
        '~/Library/Application Support/Codex/config.json'
      ],
      processNames: ['Codex', 'codex'],
      bundleIdentifiers: ['com.codex.app'],
      versionCommands: ['codex --version']
    },
    {
      type: ClientType.VS_CODE,
      name: 'Visual Studio Code',
      executablePaths: [
        '/Applications/Visual Studio Code.app/Contents/MacOS/Electron',
        '/usr/local/bin/code',
        '/opt/homebrew/bin/code'
      ],
      configPaths: [
        '~/Library/Application Support/Code/User/settings.json',
        '~/.vscode/settings.json'
      ],
      processNames: ['Visual Studio Code', 'code', 'Code'],
      bundleIdentifiers: ['com.microsoft.VSCode'],
      versionCommands: ['code --version']
    },
    {
      type: ClientType.CURSOR,
      name: 'Cursor',
      executablePaths: [
        '/Applications/Cursor.app/Contents/MacOS/Cursor',
        '/usr/local/bin/cursor',
        '/opt/homebrew/bin/cursor'
      ],
      configPaths: [
        '~/Library/Application Support/Cursor/User/settings.json',
        '~/.cursor/settings.json'
      ],
      processNames: ['Cursor', 'cursor'],
      bundleIdentifiers: ['com.todesktop.230313mzl4w4u92'],
      versionCommands: ['cursor --version']
    },
    {
      type: ClientType.GEMINI_DESKTOP,
      name: 'Gemini Desktop',
      executablePaths: [
        '/Applications/Gemini Desktop.app/Contents/MacOS/Gemini Desktop',
        '/Applications/Gemini.app/Contents/MacOS/Gemini'
      ],
      configPaths: [
        '~/Library/Application Support/Gemini/config.json',
        '~/Library/Application Support/Gemini Desktop/config.json'
      ],
      processNames: ['Gemini Desktop', 'Gemini'],
      bundleIdentifiers: ['com.gemini.desktop', 'com.gemini.app'],
      versionCommands: []
    },
    {
      type: ClientType.GEMINI_CLI,
      name: 'Gemini CLI',
      executablePaths: [
        '/usr/local/bin/gemini',
        '/opt/homebrew/bin/gemini',
        '~/.local/bin/gemini'
      ],
      configPaths: [
        '~/.gemini/config.json',
        '~/.config/gemini/config.json'
      ],
      processNames: ['gemini'],
      versionCommands: ['gemini --version']
    }
  ];

  /**
   * Discover all installed MCP clients
   */
  static async discoverClients(): Promise<ClientDetectionResult> {
    const clients: MCPClient[] = [];
    const errors: ClientDetectionError[] = [];
    const detectedAt = new Date();

    for (const pattern of this.CLIENT_PATTERNS) {
      try {
        const client = await this.detectClient(pattern);
        if (client) {
          clients.push(client);
        }
      } catch (error: any) {
        errors.push({
          clientType: pattern.type,
          message: error.message,
          path: pattern.executablePaths[0]
        });
      }
    }

    return {
      clients,
      errors,
      detectedAt
    };
  }

  /**
   * Detect a specific client based on its pattern
   */
  private static async detectClient(pattern: ClientDetectionPattern): Promise<MCPClient | null> {
    // Check for executable existence
    const executablePath = await this.findExecutable(pattern.executablePaths);
    
    // Check for configuration files
    const configPath = await this.findConfigFile(pattern.configPaths);
    
    // If neither executable nor config exists, client is not installed
    if (!executablePath && !configPath) {
      return null;
    }

    // Get configuration paths
    const configPaths = MacOSPathResolver.getClientConfigurationPaths(pattern.type);
    
    // Create client object
    const client: MCPClient = {
      id: pattern.type,
      name: pattern.name,
      type: pattern.type,
      configPaths,
      status: ClientStatus.UNKNOWN,
      isActive: false,
      executablePath,
      lastSeen: new Date()
    };

    // Check client status
    const statusResult = await this.checkClientStatus(client, pattern);
    client.status = statusResult.status;
    client.isActive = statusResult.status === ClientStatus.ACTIVE;

    // Detect version if possible
    try {
      const version = await this.detectClientVersion(client, pattern);
      if (version) {
        client.version = version;
      }
    } catch (error) {
      // Version detection is optional, don't fail if it doesn't work
      console.warn(`Failed to detect version for ${pattern.name}:`, error);
    }

    // Validate client
    const validationResult = await this.validateClient(client);
    if (!validationResult.isValid) {
      client.status = ClientStatus.ERROR;
      client.metadata = {
        validationErrors: validationResult.errors
      };
    }

    return client;
  }

  /**
   * Find the first existing executable from a list of paths
   */
  private static async findExecutable(paths: string[]): Promise<string | undefined> {
    for (const execPath of paths) {
      const expandedPath = MacOSPathResolver.expandTildeInPath(execPath);
      try {
        if (await FileSystemUtils.fileExists(expandedPath)) {
          // Check if it's executable
          const stats = await fs.stat(expandedPath);
          if (stats.isFile() && (stats.mode & parseInt('111', 8))) {
            return expandedPath;
          }
        }
      } catch (error) {
        // Continue to next path
        continue;
      }
    }
    return undefined;
  }

  /**
   * Find the first existing configuration file from a list of paths
   */
  private static async findConfigFile(paths: string[]): Promise<string | undefined> {
    for (const configPath of paths) {
      const expandedPath = MacOSPathResolver.expandTildeInPath(configPath);
      try {
        if (await FileSystemUtils.fileExists(expandedPath)) {
          return expandedPath;
        }
      } catch (error) {
        // Continue to next path
        continue;
      }
    }
    return undefined;
  }

  /**
   * Check if a client is currently active/running
   */
  static async checkClientStatus(
    client: MCPClient, 
    pattern?: ClientDetectionPattern
  ): Promise<ClientStatusResult> {
    const checkedAt = new Date();
    
    try {
      // Get the pattern if not provided
      const clientPattern = pattern || this.CLIENT_PATTERNS.find(p => p.type === client.type);
      if (!clientPattern) {
        return {
          status: ClientStatus.UNKNOWN,
          checkedAt,
          details: 'Unknown client type'
        };
      }

      // Check if process is running using ps command
      const processNames = clientPattern.processNames;
      for (const processName of processNames) {
        try {
          const { stdout } = await execAsync(`pgrep -f "${processName}"`);
          const pids = stdout.trim().split('\n').filter(pid => pid.length > 0);
          
          if (pids.length > 0) {
            return {
              status: ClientStatus.ACTIVE,
              pid: parseInt(pids[0], 10),
              checkedAt,
              details: `Process found: ${processName} (PID: ${pids[0]})`
            };
          }
        } catch (error) {
          // pgrep returns non-zero exit code when no processes found
          continue;
        }
      }

      // For macOS apps, also check using system_profiler for bundle identifiers
      if (clientPattern.bundleIdentifiers) {
        for (const bundleId of clientPattern.bundleIdentifiers) {
          try {
            const { stdout } = await execAsync(
              `system_profiler SPApplicationsDataType -json | grep -A 5 -B 5 "${bundleId}"`
            );
            if (stdout.includes(bundleId)) {
              // App is installed, but we need to check if it's running
              try {
                const { stdout: psOutput } = await execAsync(
                  `ps aux | grep -i "${bundleId}" | grep -v grep`
                );
                if (psOutput.trim()) {
                  return {
                    status: ClientStatus.ACTIVE,
                    checkedAt,
                    details: `Bundle active: ${bundleId}`
                  };
                }
              } catch (error) {
                // Not running, but installed
              }
            }
          } catch (error) {
            // Continue to next bundle identifier
            continue;
          }
        }
      }

      // Check if configuration file exists and is recent
      const configExists = await FileSystemUtils.fileExists(client.configPaths.primary);
      if (configExists) {
        return {
          status: ClientStatus.INACTIVE,
          checkedAt,
          details: 'Configuration found but process not running'
        };
      }

      return {
        status: ClientStatus.INACTIVE,
        checkedAt,
        details: 'Client installed but not active'
      };

    } catch (error: any) {
      return {
        status: ClientStatus.ERROR,
        checkedAt,
        details: `Status check failed: ${error.message}`
      };
    }
  }

  /**
   * Detect client version
   */
  private static async detectClientVersion(
    client: MCPClient, 
    pattern: ClientDetectionPattern
  ): Promise<string | undefined> {
    // Try version commands first
    if (pattern.versionCommands && pattern.versionCommands.length > 0) {
      for (const versionCmd of pattern.versionCommands) {
        try {
          const { stdout } = await execAsync(versionCmd, { timeout: 5000 });
          const version = this.parseVersionFromOutput(stdout);
          if (version) {
            return version;
          }
        } catch (error) {
          // Continue to next version command
          continue;
        }
      }
    }

    // Try to get version from executable if it exists
    if (client.executablePath) {
      try {
        const { stdout } = await execAsync(`"${client.executablePath}" --version`, { timeout: 5000 });
        const version = this.parseVersionFromOutput(stdout);
        if (version) {
          return version;
        }
      } catch (error) {
        // Version command might not be supported
      }

      // For macOS apps, try to get version from Info.plist
      if (client.executablePath.includes('.app/')) {
        try {
          const appPath = client.executablePath.split('.app/')[0] + '.app';
          const plistPath = path.join(appPath, 'Contents', 'Info.plist');
          
          if (await FileSystemUtils.fileExists(plistPath)) {
            const { stdout } = await execAsync(`plutil -p "${plistPath}" | grep CFBundleShortVersionString`);
            const versionMatch = stdout.match(/"([^"]+)"/);
            if (versionMatch) {
              return versionMatch[1];
            }
          }
        } catch (error) {
          // Info.plist parsing failed
        }
      }
    }

    return undefined;
  }

  /**
   * Parse version string from command output
   */
  private static parseVersionFromOutput(output: string): string | undefined {
    // Common version patterns
    const patterns = [
      /version\s+(\d+\.\d+\.\d+)/i,
      /v(\d+\.\d+\.\d+)/i,
      /(\d+\.\d+\.\d+)/,
      /(\d+\.\d+)/
    ];

    for (const pattern of patterns) {
      const match = output.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return undefined;
  }

  /**
   * Validate a detected client
   */
  static async validateClient(client: MCPClient): Promise<ClientValidationResult> {
    const errors: string[] = [];
    const capabilities: string[] = [];

    try {
      // Check if configuration file is readable
      if (await FileSystemUtils.fileExists(client.configPaths.primary)) {
        try {
          await FileSystemUtils.readJsonFile(client.configPaths.primary);
          capabilities.push('configuration-readable');
        } catch (error: any) {
          errors.push(`Configuration file is not readable: ${error.message}`);
        }
      }

      // Check if executable is accessible (if exists)
      if (client.executablePath) {
        try {
          const stats = await fs.stat(client.executablePath);
          if (stats.isFile() && (stats.mode & parseInt('111', 8))) {
            capabilities.push('executable-accessible');
          } else {
            errors.push('Executable file is not executable');
          }
        } catch (error: any) {
          errors.push(`Executable is not accessible: ${error.message}`);
        }
      }

      // Check if client supports MCP (look for mcpServers in config)
      if (await FileSystemUtils.fileExists(client.configPaths.primary)) {
        try {
          const config = await FileSystemUtils.readJsonFile(client.configPaths.primary);
          if (config && typeof config === 'object' && 'mcpServers' in config) {
            capabilities.push('mcp-support');
          } else {
            errors.push('Configuration does not contain mcpServers section');
          }
        } catch (error) {
          // Already handled above
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        capabilities
      };

    } catch (error: any) {
      return {
        isValid: false,
        errors: [`Validation failed: ${error.message}`],
        capabilities
      };
    }
  }

  /**
   * Get detailed client information
   */
  static async getClientDetails(clientId: string): Promise<MCPClient | null> {
    const detectionResult = await this.discoverClients();
    return detectionResult.clients.find(client => client.id === clientId) || null;
  }

  /**
   * Refresh client status for all detected clients
   */
  static async refreshClientStatuses(clients: MCPClient[]): Promise<MCPClient[]> {
    const refreshedClients: MCPClient[] = [];

    for (const client of clients) {
      const pattern = this.CLIENT_PATTERNS.find(p => p.type === client.type);
      if (pattern) {
        const statusResult = await this.checkClientStatus(client, pattern);
        const refreshedClient: MCPClient = {
          ...client,
          status: statusResult.status,
          isActive: statusResult.status === ClientStatus.ACTIVE,
          lastSeen: new Date()
        };

        if (statusResult.pid) {
          refreshedClient.metadata = {
            ...refreshedClient.metadata,
            pid: statusResult.pid
          };
        }

        refreshedClients.push(refreshedClient);
      } else {
        refreshedClients.push(client);
      }
    }

    return refreshedClients;
  }

  /**
   * Check compatibility of a client with MCP version
   */
  static async checkCompatibility(client: MCPClient, _mcpVersion?: string): Promise<{
    isCompatible: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Basic compatibility checks
    if (!client.version) {
      issues.push('Client version could not be determined');
      recommendations.push('Update client to latest version');
    }

    // Check if configuration format is supported
    try {
      if (await FileSystemUtils.fileExists(client.configPaths.primary)) {
        const config = await FileSystemUtils.readJsonFile(client.configPaths.primary);
        
        // Check for required MCP configuration structure
        if (!config || typeof config !== 'object') {
          issues.push('Invalid configuration file format');
        } else if (!('mcpServers' in config)) {
          issues.push('Configuration missing mcpServers section');
          recommendations.push('Initialize MCP configuration in client');
        }
      }
    } catch (error: any) {
      issues.push(`Configuration validation failed: ${error.message}`);
    }

    return {
      isCompatible: issues.length === 0,
      issues,
      recommendations
    };
  }
}