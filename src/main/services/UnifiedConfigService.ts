import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import * as toml from '@iarna/toml';
import JSON5 from 'json5';

export interface MCPServer {
  // Local server config
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  
  // Remote server config
  url?: string;
  headers?: Record<string, string>;
  
  // Common fields
  type?: 'local' | 'remote' | 'stdio' | 'http' | 'sse';
  description?: string;
}

export interface MCPConfig {
  mcpServers?: Record<string, MCPServer>;
  servers?: Record<string, MCPServer>;
  mcp_servers?: Record<string, any>;
}

export interface DetectedClient {
  name: string;
  displayName: string;
  installed: boolean;
  configPath?: string;
  format: 'json' | 'json5' | 'toml';
}

type ConfigScope = 'user' | 'project' | 'system';

class UnifiedConfigService {
  private configLocations = {
    'claude-desktop': {
      displayName: 'Claude Desktop',
      mac: path.join(os.homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json'),
      windows: path.join(process.env.APPDATA || '', 'Claude', 'claude_desktop_config.json'),
      format: 'json' as const
    },
    'claude-code': {
      displayName: 'Claude Code',
      user: [
        path.join(os.homedir(), '.claude.json'), // Primary recommended location
        path.join(os.homedir(), '.claude_code_config.json'), // Alternative location
        path.join(os.homedir(), '.claude', 'settings.local.json') // User-specific local
      ],
      project: (projectDir?: string) => [
        path.join(projectDir || process.cwd(), '.mcp.json'), // Project root MCP config
        path.join(projectDir || process.cwd(), '.claude', 'settings.local.json') // Project-specific
      ],
      format: 'json' as const
    },
    'gemini-cli': {
      displayName: 'Gemini CLI',
      user: path.join(os.homedir(), '.gemini', 'settings.json'),
      project: path.join(process.cwd(), '.gemini', 'settings.json'),
      system: '/etc/gemini-cli/settings.json',
      format: 'json' as const
    },
    'codex-cli': {
      displayName: 'Codex CLI',
      user: path.join(os.homedir(), '.codex', 'config.toml'),
      format: 'toml' as const
    },
    'vscode': {
      displayName: 'VS Code',
      project: path.join(process.cwd(), '.vscode', 'mcp.json'),
      user: path.join(os.homedir(), '.vscode', 'mcp.json'),
      format: 'json' as const
    },
    'cursor': {
      displayName: 'Cursor',
      user: path.join(os.homedir(), 'Library', 'Application Support', 'Cursor', 'User', 'settings.json'),
      project: path.join(process.cwd(), '.cursor', 'settings.json'),
      format: 'json' as const
    },
    'kiro': {
      displayName: 'Kiro',
      user: path.join(os.homedir(), '.kiro', 'settings', 'mcp.json'),
      project: path.join(process.cwd(), '.kiro', 'settings', 'mcp.json'),
      mac: path.join(os.homedir(), 'Library', 'Application Support', 'Kiro', 'mcp.json'),
      format: 'json' as const
    },
    'windsurf': {
      displayName: 'Windsurf',
      user: path.join(os.homedir(), 'Library', 'Application Support', 'Windsurf', 'User', 'settings.json'),
      project: path.join(process.cwd(), '.windsurf', 'settings.json'),
      mac: path.join(os.homedir(), '.windsurf', 'settings.json'),
      format: 'json' as const
    }
  };


  private async resolvePath(clientName: string, scope?: ConfigScope, projectDirectory?: string): Promise<string> {
    const client = this.configLocations[clientName as keyof typeof this.configLocations];
    if (!client) throw new Error(`Unknown client: ${clientName}`);

    const platform = process.platform;
    
    if (clientName === 'claude-desktop') {
      const claudeClient = client as typeof this.configLocations['claude-desktop'];
      return platform === 'win32' ? claudeClient.windows : claudeClient.mac;
    }

    if (clientName === 'vscode') {
      const vscodeClient = client as typeof this.configLocations['vscode'];
      if (scope === 'project' && projectDirectory) {
        return path.join(projectDirectory, '.vscode', 'mcp.json');
      }
      return scope === 'project' ? vscodeClient.project : vscodeClient.user;
    }

    if (clientName === 'cursor') {
      const cursorClient = client as typeof this.configLocations['cursor'];
      if (scope === 'project' && projectDirectory) {
        return path.join(projectDirectory, '.cursor', 'settings.json');
      }
      return scope === 'project' ? cursorClient.project : cursorClient.user;
    }

    if (clientName === 'kiro') {
      const kiroClient = client as typeof this.configLocations['kiro'];
      
      // Handle project scope
      if (scope === 'project' && projectDirectory) {
        // Always return the project path for project scope, even if it doesn't exist yet
        const projectPath = path.join(projectDirectory, '.kiro', 'settings', 'mcp.json');
        return projectPath;
      }
      
      // Handle user scope
      const userPath = kiroClient.user;
      if (await fs.pathExists(userPath)) {
        return userPath;
      }
      return kiroClient.mac || userPath;
    }

    if (clientName === 'windsurf') {
      const windsurfClient = client as typeof this.configLocations['windsurf'];
      
      // Handle project scope
      if (scope === 'project' && projectDirectory) {
        // Always return the project path for project scope, even if it doesn't exist yet
        const projectPath = path.join(projectDirectory, '.windsurf', 'settings.json');
        return projectPath;
      }
      
      // Handle user scope
      const userPath = windsurfClient.user;
      if (await fs.pathExists(userPath)) {
        return userPath;
      }
      return windsurfClient.mac || userPath;
    }

    // Handle Claude Code with multiple possible paths
    if (clientName === 'claude-code') {
      const claudeCodeClient = client as typeof this.configLocations['claude-code'];
      let paths: string[] = [];
      
      if (scope === 'project' && claudeCodeClient.project) {
        paths = claudeCodeClient.project(projectDirectory);
      } else if (scope === 'system' && 'system' in claudeCodeClient) {
        paths = [(claudeCodeClient as any).system];
      } else {
        paths = claudeCodeClient.user;
      }
      
      // Check each path and return first existing one
      for (const p of paths) {
        if (await fs.pathExists(p)) {
          return p;
        }
      }
      
      // If none exist, return the first path (for creating new configs)
      return paths[0];
    }

    // Handle other clients with project support
    if (scope === 'project' && projectDirectory) {
      if (clientName === 'gemini-cli') {
        return path.join(projectDirectory, '.gemini', 'settings.json');
      }
    }

    if (scope === 'project' && 'project' in client) {
      return (client as any).project;
    } else if (scope === 'system' && 'system' in client) {
      return (client as any).system;
    } else if ('user' in client) {
      return (client as any).user;
    }

    const firstPath = Object.values(client).find(val => typeof val === 'string' && val.includes('/'));
    if (firstPath) return firstPath as string;

    throw new Error(`No valid path found for ${clientName} with scope ${scope}`);
  }

  async detectClients(): Promise<DetectedClient[]> {
    const clients: DetectedClient[] = [];
    console.log('[UnifiedConfigService] Starting client detection...');

    for (const [name, config] of Object.entries(this.configLocations)) {
      try {
        const configPath = await this.resolvePath(name, 'user');
        const exists = await fs.pathExists(configPath);
        
        console.log(`[UnifiedConfigService] Checking ${name} at ${configPath}: ${exists ? 'FOUND' : 'NOT FOUND'}`);
        
        clients.push({
          name,
          displayName: config.displayName,
          installed: exists,
          configPath: exists ? configPath : undefined,
          format: config.format
        });
      } catch (error) {
        console.log(`[UnifiedConfigService] Error checking ${name}: ${error}`);
        clients.push({
          name,
          displayName: config.displayName,
          installed: false,
          format: config.format
        });
      }
    }

    console.log(`[UnifiedConfigService] Detection complete. Found ${clients.filter(c => c.installed).length} installed clients`);
    return clients;
  }

  private parseContent(content: string, format: 'json' | 'json5' | 'toml'): MCPConfig {
    try {
      switch (format) {
        case 'json':
          return JSON.parse(content);
        case 'json5':
          return JSON5.parse(content);
        case 'toml':
          // TOML parsing requires special handling
          try {
            const parsed = toml.parse(content);
            // Convert TOML structure to expected MCPConfig format
            // TOML may have different structure than JSON
            if (parsed.mcp_servers || parsed.servers || parsed.mcpServers) {
              return parsed as MCPConfig;
            }
            // Wrap in expected structure if needed
            return { mcpServers: parsed } as MCPConfig;
          } catch (tomlError) {
            console.error(`TOML parse error: ${tomlError}`);
            // Try to provide helpful error message
            if (tomlError instanceof Error) {
              throw new Error(`Invalid TOML format: ${tomlError.message}`);
            }
            throw tomlError;
          }
        default:
          throw new Error(`Unsupported format: ${format}`);
      }
    } catch (error) {
      console.error(`Error parsing ${format}:`, error);
      // Return empty config instead of crashing
      return {};
    }
  }

  private formatContent(config: MCPConfig, format: 'json' | 'json5' | 'toml'): string {
    switch (format) {
      case 'json':
        return JSON.stringify(config, null, 2);
      case 'json5':
        return JSON5.stringify(config, null, 2);
      case 'toml':
        try {
          // Ensure config is in a format that TOML can handle
          // Remove undefined values and functions
          const cleanConfig = JSON.parse(JSON.stringify(config));

          // TOML requires proper structure
          if (!cleanConfig.mcpServers && !cleanConfig.servers && !cleanConfig.mcp_servers) {
            console.warn('Config may not have expected structure for TOML');
          }

          return toml.stringify(cleanConfig as any);
        } catch (tomlError) {
          console.error('TOML stringify error:', tomlError);
          // Fallback to JSON if TOML fails
          console.warn('Falling back to JSON format due to TOML error');
          return JSON.stringify(config, null, 2);
        }
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  async readConfig(clientName: string, scope: ConfigScope = 'user', projectDirectory?: string): Promise<MCPConfig & { configPath?: string }> {
    try {
      // If project scope is requested but no directory provided, return empty config
      if (scope === 'project' && !projectDirectory) {
        console.log(`[UnifiedConfigService] Project scope requested but no projectDirectory provided`);
        return { 
          configPath: undefined,
          servers: {},
          mcpServers: {}
        };
      }

      const configPath = await this.resolvePath(clientName, scope, projectDirectory);
      console.log(`[UnifiedConfigService] Reading config for ${clientName} from: ${configPath}`);
      
      if (!await fs.pathExists(configPath)) {
        console.log(`[UnifiedConfigService] Config file does not exist: ${configPath}`);
        return { configPath };
      }

      const content = await fs.readFile(configPath, 'utf-8');
      const client = this.configLocations[clientName as keyof typeof this.configLocations];
      
      const config = this.parseContent(content, client.format);
      const servers = this.normalizeServers(config);
      console.log(`[UnifiedConfigService] Found ${Object.keys(servers).length} MCP servers for ${clientName}`);
      
      return { ...config, configPath };
    } catch (error) {
      console.error(`Error reading config for ${clientName}:`, error);
      return {};
    }
  }

  async writeConfig(clientName: string, scope: ConfigScope, config: MCPConfig, projectDirectory?: string): Promise<void> {
    try {
      const configPath = await this.resolvePath(clientName, scope, projectDirectory);
      const client = this.configLocations[clientName as keyof typeof this.configLocations];
      
      await fs.ensureDir(path.dirname(configPath));
      
      // For VS Code and other clients that may have other settings,
      // we need to merge, not replace
      let finalConfig = config;
      
      if (await fs.pathExists(configPath)) {
        const existingContent = await fs.readFile(configPath, 'utf-8');
        const existingConfig = this.parseContent(existingContent, client.format);
        
        // Merge configs - preserve existing settings and only update MCP servers
        finalConfig = { ...existingConfig };
        
        // Update the appropriate MCP server field based on client
        if (clientName === 'vscode' || clientName === 'cursor') {
          // VS Code and Cursor might use 'mcp.servers' or just 'servers'
          if ((existingConfig as any)['mcp.servers']) {
            (finalConfig as any)['mcp.servers'] = config.servers || config.mcpServers;
          } else {
            finalConfig.servers = config.servers || config.mcpServers;
          }
        } else if (clientName === 'codex-cli') {
          finalConfig.mcp_servers = config.mcp_servers || config.mcpServers;
        } else {
          // Default: update mcpServers
          finalConfig.mcpServers = config.mcpServers || config.servers;
        }
      }
      
      const content = this.formatContent(finalConfig, client.format);
      await fs.writeFile(configPath, content, 'utf-8');
    } catch (error) {
      console.error(`Error writing config for ${clientName}:`, error);
      throw error;
    }
  }

  async backupConfig(clientName: string, scope: ConfigScope = 'user', projectDirectory?: string): Promise<string> {
    const configPath = await this.resolvePath(clientName, scope, projectDirectory);
    
    if (!await fs.pathExists(configPath)) {
      console.log(`[UnifiedConfigService] No config file to backup at: ${configPath}`);
      return '';
    }
    
    // Create timestamp in format: YYYY-MM-DD_HH-mm-ss
    const now = new Date();
    const timestamp = now.getFullYear() + 
      '-' + String(now.getMonth() + 1).padStart(2, '0') +
      '-' + String(now.getDate()).padStart(2, '0') +
      '_' + String(now.getHours()).padStart(2, '0') +
      '-' + String(now.getMinutes()).padStart(2, '0') +
      '-' + String(now.getSeconds()).padStart(2, '0');
    
    // Create backup directory in user's home
    const backupDir = path.join(os.homedir(), '.mcp-config-backups', clientName);
    await fs.ensureDir(backupDir);
    
    // Create backup filename with timestamp
    const configFileName = path.basename(configPath);
    const backupFileName = `${configFileName}.backup_${timestamp}`;
    const backupPath = path.join(backupDir, backupFileName);
    
    // Copy the file to backup location
    await fs.copy(configPath, backupPath);
    console.log(`[UnifiedConfigService] Created backup at: ${backupPath}`);
    
    // Clean up old backups (keep only last 10)
    const backups = await fs.readdir(backupDir);
    const configBackups = backups
      .filter(f => f.startsWith(configFileName))
      .sort()
      .reverse();
    
    if (configBackups.length > 10) {
      for (const oldBackup of configBackups.slice(10)) {
        const oldBackupPath = path.join(backupDir, oldBackup);
        await fs.remove(oldBackupPath);
        console.log(`[UnifiedConfigService] Removed old backup: ${oldBackup}`);
      }
    }
    
    return backupPath;
  }

  normalizeServers(config: MCPConfig): Record<string, MCPServer> {
    if (config.mcpServers) {
      return config.mcpServers;
    } else if (config.servers) {
      return config.servers;
    } else if (config.mcp_servers) {
      const normalized: Record<string, MCPServer> = {};
      for (const [name, server] of Object.entries(config.mcp_servers)) {
        if (typeof server === 'object' && server !== null) {
          normalized[name] = server as MCPServer;
        }
      }
      return normalized;
    }
    return {};
  }

  denormalizeServers(servers: Record<string, MCPServer>, clientName: string): MCPConfig {
    const client = this.configLocations[clientName as keyof typeof this.configLocations];
    
    if (clientName === 'codex-cli') {
      return { mcp_servers: servers };
    } else if (clientName === 'vscode' || clientName === 'cursor') {
      return { servers };
    } else {
      return { mcpServers: servers };
    }
  }
}

export { UnifiedConfigService };