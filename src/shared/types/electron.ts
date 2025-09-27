/**
 * Unified Electron API type definitions
 * This file defines the complete window.electronAPI interface used throughout the app
 */

import { MCPServer } from './server';

export interface ElectronAPI {
  // Client operations
  discoverClients: () => Promise<any[]>;
  detectClients: () => Promise<any[]>;

  // Configuration operations
  loadConfiguration: (clientId: string, scope?: string) => Promise<any>;
  resolveConfiguration: (clientId: string) => Promise<any>;
  saveConfiguration: (clientId: string, config: any, scope?: string) => Promise<boolean>;
  validateConfiguration: (config: any) => Promise<any>;

  // Simplified config operations
  readConfig: (clientName: string, scope: string, projectDirectory?: string) => Promise<{
    success: boolean;
    data?: Record<string, MCPServer>;
    configPath?: string;
    error?: string;
  }>;
  writeConfig: (clientName: string, scope: string, servers: Record<string, MCPServer>, projectDirectory?: string) => Promise<{
    success: boolean;
    error?: string;
  }>;
  backupConfig: (clientName: string, scope: string, projectDirectory?: string) => Promise<{
    success: boolean;
    backupPath?: string;
  }>;

  // Directory operations
  selectDirectory: () => Promise<{
    success: boolean;
    path?: string;
  }>;

  // Server testing
  testServer?: (serverConfig: any) => Promise<any>;

  // System operations
  openExternal: (url: string) => Promise<void>;
  showItemInFolder: (filePath: string) => Promise<void>;
  getCurrentWorkingDirectory: () => Promise<string>;

  // Metrics operations
  getTotalMetrics: (serverNames: string[]) => Promise<{
    totalTokens: number;
    totalTools: number;
    avgResponseTime: number;
    connectedCount: number;
  }>;
  getServerMetrics: (serverName: string, serverConfig?: any) => Promise<any>;

  // Catalog operations
  getCatalogServers: () => Promise<any>;
  searchCatalogServers: (query: string) => Promise<any>;
  getCatalogServersByCategory: (category: string) => Promise<any>;
  getPopularServers: (limit?: number) => Promise<any>;

  // Connection operations
  getConnectionStatus: (serverName: string) => Promise<any>;
  connectToServer: (serverName: string, config: any) => Promise<any>;
  disconnectFromServer: (serverName: string) => Promise<any>;

  // Settings operations
  loadSettings: () => Promise<any>;
  saveSettings: (settings: any) => Promise<void>;
  resetSettings: () => Promise<void>;
  getSettingsPath: () => Promise<string>;

  // Discovery operations
  discovery: {
    fetchCatalog: (forceRefresh?: boolean, settings?: any) => Promise<any>;
    getInstalledServers: () => Promise<any>;
    isServerInstalled: (serverId: string) => Promise<boolean>;
    installServer: (serverId: string) => Promise<void>;
    uninstallServer: (serverId: string) => Promise<void>;
    getInstallationState: (serverId: string) => Promise<any>;
    updateSettings: (settings: any) => Promise<void>;
    getSettings: () => Promise<any>;
    getInstallationLogs: (serverId: string) => Promise<string[]>;
    onInstallationOutput?: (callback: (event: any, data: {
      serverId: string;
      output: string;
      stream: 'stdout' | 'stderr';
      lastFiveLines: string[];
    }) => void) => () => void;
  };

  // Installation operations
  installation?: {
    install: (serverId: string, source: string) => Promise<any>;
    uninstall: (serverId: string) => Promise<any>;
    check: (packageName: string) => Promise<any>;
    getInstalled: () => Promise<any>;
    getInfo: (serverId: string) => Promise<any>;
    getVersion: (packageName: string) => Promise<any>;
  };

  // Additional IPC operations
  invoke?: (channel: string, data?: any) => Promise<any>;
  on?: (channel: string, callback: (event: any) => void) => () => void;
}

// Global type declaration
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};