import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import * as toml from '@iarna/toml';
import JSON5 from 'json5';

export interface MCPServer {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  type?: string;
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
      user: path.join(os.homedir(), '.claude.json'),
      project: path.join(process.cwd(), '.mcp.json'),
      format: 'json5' as const
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
      workspace: path.join(process.cwd(), '.vscode', 'mcp.json'),
      user: this.getVSCodeSettingsPath(),
      format: 'json' as const
    }
  };

  private getVSCodeSettingsPath(): string {
    const platform = process.platform;
    const homeDir = os.homedir();
    
    switch (platform) {
      case 'win32':
        return path.join(process.env.APPDATA || '', 'Code', 'User', 'settings.json');
      case 'darwin':
        return path.join(homeDir, 'Library', 'Application Support', 'Code', 'User', 'settings.json');
      default:
        return path.join(homeDir, '.config', 'Code', 'User', 'settings.json');
    }
  }

  private resolvePath(clientName: string, scope?: ConfigScope): string {
    const client = this.configLocations[clientName as keyof typeof this.configLocations];
    if (!client) throw new Error(`Unknown client: ${clientName}`);

    const platform = process.platform;
    
    if (clientName === 'claude-desktop') {
      const claudeClient = client as typeof this.configLocations['claude-desktop'];
      return platform === 'win32' ? claudeClient.windows : claudeClient.mac;
    }

    if (clientName === 'vscode') {
      const vscodeClient = client as typeof this.configLocations['vscode'];
      return scope === 'project' ? vscodeClient.workspace : vscodeClient.user;
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
        const configPath = this.resolvePath(name, 'user');
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
          const parsed = toml.parse(content);
          return parsed as MCPConfig;
        default:
          throw new Error(`Unsupported format: ${format}`);
      }
    } catch (error) {
      console.error(`Error parsing ${format}:`, error);
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
        return toml.stringify(config as any);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  async readConfig(clientName: string, scope: ConfigScope = 'user'): Promise<MCPConfig> {
    try {
      const configPath = this.resolvePath(clientName, scope);
      console.log(`[UnifiedConfigService] Reading config for ${clientName} from: ${configPath}`);
      
      if (!await fs.pathExists(configPath)) {
        console.log(`[UnifiedConfigService] Config file does not exist: ${configPath}`);
        return {};
      }

      const content = await fs.readFile(configPath, 'utf-8');
      const client = this.configLocations[clientName as keyof typeof this.configLocations];
      
      const config = this.parseContent(content, client.format);
      const servers = this.normalizeServers(config);
      console.log(`[UnifiedConfigService] Found ${Object.keys(servers).length} MCP servers for ${clientName}`);
      
      return config;
    } catch (error) {
      console.error(`Error reading config for ${clientName}:`, error);
      return {};
    }
  }

  async writeConfig(clientName: string, scope: ConfigScope, config: MCPConfig): Promise<void> {
    try {
      const configPath = this.resolvePath(clientName, scope);
      const client = this.configLocations[clientName as keyof typeof this.configLocations];
      
      await fs.ensureDir(path.dirname(configPath));
      
      const content = this.formatContent(config, client.format);
      await fs.writeFile(configPath, content, 'utf-8');
    } catch (error) {
      console.error(`Error writing config for ${clientName}:`, error);
      throw error;
    }
  }

  async backupConfig(clientName: string, scope: ConfigScope = 'user'): Promise<string> {
    const configPath = this.resolvePath(clientName, scope);
    const backupPath = `${configPath}.backup.${Date.now()}`;
    
    if (await fs.pathExists(configPath)) {
      await fs.copy(configPath, backupPath);
      return backupPath;
    }
    
    return '';
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
    } else if (clientName === 'vscode') {
      return { servers };
    } else {
      return { mcpServers: servers };
    }
  }
}

export const configService = new UnifiedConfigService();