/**
 * MCP Discovery Feature Types
 * Defines data structures for the MCP server discovery and installation system
 */

export interface McpServerCatalog {
  servers: McpServerEntry[];
  categories: string[];
  lastUpdated: Date;
  version: string;
}

export interface McpServerEntry {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  repository?: string;
  downloadUrl?: string;
  npmPackage?: string;
  category: string[];
  tags?: string[];
  dependencies?: string[];
  compatibility: {
    clients: string[];
    platforms: string[];
    minNodeVersion?: string;
  };
  stats: {
    downloads: number;
    stars: number;
    lastUpdated: string;
  };
  installation: {
    type: 'npm' | 'git' | 'download' | 'manual' | 'remote';
    command?: string;
    instructions?: string;
  };
  config?: {
    command: string;
    args?: string[];
    env?: Record<string, string>;
  };
}

export interface InstallationState {
  serverId: string;
  status: 'idle' | 'pending' | 'downloading' | 'installing' | 'configuring' | 'completed' | 'failed';
  progress: number;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}

export interface InstalledServer {
  serverId: string;
  name: string;
  version: string;
  installedAt: Date;
  location: string;
  configuredClients: string[];
}

export interface McpDiscoverySettings {
  catalogUrl: string;
  catalogSource: 'registry' | 'github'; // Choose one source
  autoRefresh: boolean; // Auto-refresh catalog on interval
  refreshInterval: number; // minutes between auto-refreshes
  installLocation: string;
  cacheExpiry: number; // minutes before cache is considered stale
}

export const DEFAULT_MCP_DISCOVERY_SETTINGS: McpDiscoverySettings = {
  catalogUrl: 'https://registry.modelcontextprotocol.io/v0/servers',
  catalogSource: 'registry',
  autoRefresh: false,
  refreshInterval: 60, // 1 hour
  installLocation: '~/.mcp/servers',
  cacheExpiry: 60 // 1 hour
};

export type ServerCategory =
  | 'AI & Language Models'
  | 'Development Tools'
  | 'Data & Analytics'
  | 'Productivity'
  | 'File Management'
  | 'APIs & Integration'
  | 'Security'
  | 'Communication'
  | 'Custom'
  | 'Other';

export interface ServerFilter {
  searchText?: string;
  categories?: string[];
  tags?: string[];
  showInstalled?: boolean;
  sortBy?: 'name' | 'downloads' | 'stars' | 'date';
  sortOrder?: 'asc' | 'desc';
}