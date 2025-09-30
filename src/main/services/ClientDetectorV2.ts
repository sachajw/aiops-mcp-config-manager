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
import { cacheManager } from '../../shared/utils/CacheManager';
import { errorHandler, ApplicationError, ErrorCategory, ErrorSeverity } from '../../shared/utils/ErrorHandler';

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
 * Instance-based MCP Client Discovery System with Caching
 * Improved version with better performance and error handling
 */
export class ClientDetectorV2 {
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
      executablePaths: [],
      configPaths: [
        '~/.claude/claude_code_config.json',
        '~/.claude.json'
      ],
      processNames: [],
      versionCommands: []
    },
    {
      type: ClientType.CODEX,
      name: 'Codex',
      executablePaths: [],
      configPaths: [
        '~/.codex/config.json',
        '~/Library/Application Support/Codex/config.json',
        '~/.codex/config.toml'
      ],
      processNames: ['Codex'],
      versionCommands: []
    },
    {
      type: ClientType.VS_CODE,
      name: 'VS Code',
      executablePaths: [
        '/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code'
      ],
      configPaths: [
        '~/.vscode/mcp.json',
        '~/.vscode/settings.json'
      ],
      processNames: ['Code', 'Electron'],
      bundleIdentifiers: ['com.microsoft.VSCode'],
      versionCommands: ['code --version']
    },
    {
      type: ClientType.GEMINI_DESKTOP,
      name: 'Gemini Desktop',
      executablePaths: [
        '/Applications/Gemini.app/Contents/MacOS/Gemini',
        '/Applications/Gemini Desktop.app/Contents/MacOS/Gemini Desktop'
      ],
      configPaths: [
        '~/Library/Application Support/Gemini/config.json'
      ],
      processNames: ['Gemini', 'Gemini Desktop'],
      bundleIdentifiers: ['com.google.gemini'],
      versionCommands: []
    },
    {
      type: ClientType.GEMINI_CLI,
      name: 'Gemini CLI',
      executablePaths: [],
      configPaths: [
        '~/.gemini/config.json',
        '~/.gemini/settings.json'
      ],
      processNames: [],
      versionCommands: []
    }
  ];

  private readonly CACHE_TTL = 30000; // 30 seconds
  private readonly DISCOVERY_CACHE_KEY = 'client:discovery';
  private readonly CLIENT_CACHE_PREFIX = 'client:details:';

  constructor() {
    // Use singleton cacheManager
  }

  /**
   * Discover all MCP clients with caching
   */
  async discoverClients(): Promise<ClientDetectionResult> {
    try {
      // Try to get from cache first
      const cached = await cacheManager.get(
        this.DISCOVERY_CACHE_KEY,
        async () => this.performDiscovery(),
        { ttl: this.CACHE_TTL }
      );

      return cached;
    } catch (error) {
      const appError = new ApplicationError(
        'Failed to discover MCP clients',
        ErrorCategory.CLIENT,
        ErrorSeverity.HIGH
      ).withContext({ error });

      errorHandler.handle(appError);

      return {
        clients: [],
        errors: [{clientType: 'claude-desktop' as any, message: appError.message} as ClientDetectionError],
        detectedAt: new Date()
      };
    }
  }

  /**
   * Perform actual client discovery (called by cache)
   */
  private async performDiscovery(): Promise<ClientDetectionResult> {
    console.log('[ClientDetectorV2] Starting client discovery...');
    const clients: MCPClient[] = [];
    const errors: ClientDetectionError[] = [];

    for (const pattern of ClientDetectorV2.CLIENT_PATTERNS) {
      try {
        const client = await this.detectSingleClient(pattern);
        if (client) {
          clients.push(client);
          console.log(`[ClientDetectorV2] Detected ${pattern.name}`);
        }
      } catch (error) {
        errors.push({
          clientType: pattern.type,
          message: error instanceof Error ? error.message : 'Unknown error'
          // timestamp: new Date()
        });
        console.error(`[ClientDetectorV2] Failed to detect ${pattern.name}:`, error);
      }
    }

    console.log(`[ClientDetectorV2] Discovery complete: ${clients.length} clients found`);
    return { clients, errors, detectedAt: new Date() };
  }

  /**
   * Check if a file exists without triggering macOS Launch Services
   * Uses fs.access with read-only flag to avoid launching associated apps
   */
  private async fileExistsReadOnly(filePath: string): Promise<boolean> {
    try {
      // Use Node's fs.constants.R_OK (read permission) to check existence
      // This is less intrusive than fs.pathExists and won't trigger Launch Services
      await fs.access(filePath, fs.constants.R_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Detect a single client
   */
  private async detectSingleClient(pattern: ClientDetectionPattern): Promise<MCPClient | null> {
    // Check for config file existence
    // Bug-022 Fix: Use read-only file access to prevent triggering Launch Services
    let configPath: string | null = null;
    let installed = false;

    console.log(`[ClientDetectorV2] Checking ${pattern.name} config paths (read-only mode)`);
    for (const path of pattern.configPaths) {
      const resolvedPath = MacOSPathResolver.expandTildeInPath(path);
      if (await this.fileExistsReadOnly(resolvedPath)) {
        configPath = resolvedPath;
        installed = true;
        console.log(`[ClientDetectorV2] Found config at ${resolvedPath} (no app launch triggered)`);
        break;
      }
    }

    // Check for executable (if paths provided)
    let executablePath: string | null = null;
    for (const path of pattern.executablePaths) {
      const resolvedPath = MacOSPathResolver.expandTildeInPath(path);
      if (await this.fileExistsReadOnly(resolvedPath)) {
        executablePath = resolvedPath;
        installed = true;
        break;
      }
    }

    if (!installed) {
      return null;
    }

    // Check if client is active
    const isActive = await this.checkClientActive(pattern);

    // Get version if possible
    const version = await this.getClientVersion(pattern);

    const client: MCPClient = {
      id: pattern.type,
      type: pattern.type,
      name: pattern.name,
      isActive,
      status: isActive ? ClientStatus.ACTIVE : ClientStatus.INACTIVE,
      version: version || undefined,
      configPaths: {
        primary: configPath || pattern.configPaths[0],
        alternatives: pattern.configPaths.map(p => MacOSPathResolver.expandTildeInPath(p)),
        scopePaths: {
          global: '',
          user: configPath || pattern.configPaths[0],
          local: '',
          project: ''
        }
      },
      executablePath: executablePath || undefined,
      lastSeen: new Date(),
      metadata: {
        installed,
        lastDetected: new Date(),
        detectionMethod: 'file_system'
      }
    };

    return client;
  }

  /**
   * Check if a client is currently active
   */
  private async checkClientActive(pattern: ClientDetectionPattern): Promise<boolean> {
    try {
      // Check running processes
      for (const processName of pattern.processNames) {
        const { stdout } = await execAsync(`ps aux | grep -i "${processName}" | grep -v grep`);
        if (stdout.trim()) {
          return true;
        }
      }

      // Check bundle identifiers on macOS
      if (pattern.bundleIdentifiers && process.platform === 'darwin') {
        for (const bundleId of pattern.bundleIdentifiers) {
          const { stdout } = await execAsync(`osascript -e 'tell application "System Events" to (name of processes) contains "${pattern.name}"'`);
          if (stdout.trim() === 'true') {
            return true;
          }
        }
      }
    } catch {
      // Process not found
    }

    return false;
  }

  /**
   * Get client version
   */
  private async getClientVersion(pattern: ClientDetectionPattern): Promise<string | null> {
    try {
      if (pattern.versionCommands && pattern.versionCommands.length > 0) {
        const { stdout } = await execAsync(pattern.versionCommands[0]);
        const versionMatch = stdout.match(/(\d+\.\d+\.\d+)/);
        return versionMatch ? versionMatch[1] : null;
      }

      // Try to get version from app bundle on macOS
      if (pattern.executablePaths.length > 0 && process.platform === 'darwin') {
        const appPath = pattern.executablePaths[0].replace(/\/Contents\/.*$/, '');
        const plistPath = path.join(appPath, 'Contents', 'Info.plist');

        if (await fs.pathExists(plistPath)) {
          const { stdout } = await execAsync(`defaults read "${plistPath}" CFBundleShortVersionString 2>/dev/null`);
          return stdout.trim() || null;
        }
      }
    } catch {
      // Version detection failed
    }

    return null;
  }

  /**
   * Get details for a specific client with caching
   */
  async getClientDetails(clientId: string): Promise<MCPClient | null> {
    const cacheKey = `${this.CLIENT_CACHE_PREFIX}${clientId}`;

    return cacheManager.get(
      cacheKey,
      async () => {
        const result = await this.discoverClients();
        return result.clients.find(c => c.id === clientId) || null;
      },
      { ttl: this.CACHE_TTL }
    );
  }

  /**
   * Validate a client configuration
   */
  async validateClient(client: MCPClient): Promise<ClientValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check config file exists
    if (!await fs.pathExists(client.configPaths.primary)) {
      errors.push(`Configuration file not found: ${client.configPaths.primary}`);
    }

    // Check executable if provided
    if (client.executablePath && !await fs.pathExists(client.executablePath)) {
      warnings.push(`Executable not found: ${client.executablePath}`);
    }

    // Validate config file permissions
    try {
      await fs.access(client.configPaths.primary, fs.constants.R_OK | fs.constants.W_OK);
    } catch {
      errors.push(`No read/write access to configuration file`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      // warnings,
      // suggestions: errors.length > 0 ? [
      //   'Ensure the client is properly installed',
      //   'Check file permissions',
      //   'Try reinstalling the client'
      // ] : []
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    cacheManager.clear();
  }

  /**
   * Check client compatibility
   */
  async checkCompatibility(client: MCPClient, mcpVersion?: string): Promise<{
    compatible: boolean;
    reason?: string;
  }> {
    // Add version compatibility checking logic here
    return { compatible: true };
  }
}

// Export singleton instance for backward compatibility
export const clientDetectorV2 = new ClientDetectorV2();