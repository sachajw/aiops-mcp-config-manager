import { contextBridge, ipcRenderer } from 'electron'
import { MCPClient, Configuration, MCPServer, ServerTestResult } from '../shared/types'
import { ConfigScope } from '../shared/types/enums'
import type { ElectronAPI } from '../shared/types/electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Simplified API methods
  detectClients: () => ipcRenderer.invoke('config:detect'),
  readConfig: (clientName: string, scope: string, projectDirectory?: string) => 
    ipcRenderer.invoke('config:read', clientName, scope, projectDirectory),
  writeConfig: (clientName: string, scope: string, servers: any, projectDirectory?: string) =>
    ipcRenderer.invoke('config:write', clientName, scope, servers, projectDirectory),
  backupConfig: (clientName: string, scope: string, projectDirectory?: string) =>
    ipcRenderer.invoke('config:backup', clientName, scope, projectDirectory),
  showItemInFolder: (filePath: string) =>
    ipcRenderer.invoke('shell:showItemInFolder', filePath),
  selectDirectory: () =>
    ipcRenderer.invoke('dialog:selectDirectory'),
    
  // Original API methods (keep for backward compatibility)
  // App methods
  getVersion: () => ipcRenderer.invoke('app:getVersion'),

  // Client discovery methods
  discoverClients: () => ipcRenderer.invoke('clients:discover'),
  validateClient: (clientId: string) => ipcRenderer.invoke('clients:validateClient', clientId),

  // Configuration methods
  loadConfiguration: (clientId: string, scope?: ConfigScope) => 
    ipcRenderer.invoke('config:load', clientId, scope),
  saveConfiguration: (clientId: string, config: Configuration, scope?: ConfigScope) => 
    ipcRenderer.invoke('config:save', clientId, config, scope),
  resolveConfiguration: (clientId: string) => 
    ipcRenderer.invoke('config:resolve', clientId),
  validateConfiguration: (config: Configuration) => 
    ipcRenderer.invoke('config:validate', config),
  getAvailableScopes: (clientId: string) => 
    ipcRenderer.invoke('config:getScopes', clientId),

  // Server testing methods
  testServer: (serverConfig: MCPServer) => ipcRenderer.invoke('server:test', serverConfig),
  testCommand: (command: string, args?: string[]) => 
    ipcRenderer.invoke('server:testCommand', command, args),
  validateEnvironment: (serverConfig: MCPServer) => 
    ipcRenderer.invoke('server:validateEnvironment', serverConfig),

  // Backup and recovery methods
  createBackup: (clientId: string, config: Configuration) => 
    ipcRenderer.invoke('backup:create', clientId, config),
  restoreBackup: (backupId: string) => 
    ipcRenderer.invoke('backup:restore', backupId),
  listBackups: (clientId?: string) => 
    ipcRenderer.invoke('backup:list', clientId),
  deleteBackup: (backupId: string) => 
    ipcRenderer.invoke('backup:delete', backupId),

  // File monitoring methods
  watchFiles: (paths: string[]) => ipcRenderer.invoke('files:watch', paths),
  unwatchFiles: (paths: string[]) => ipcRenderer.invoke('files:unwatch', paths),

  // Bulk operation methods
  syncConfigurations: (sourceClientId: string, targetClientIds: string[]) => 
    ipcRenderer.invoke('bulk:syncConfigurations', sourceClientId, targetClientIds),
  enableServers: (clientId: string, serverNames: string[]) => 
    ipcRenderer.invoke('bulk:enableServers', clientId, serverNames),
  disableServers: (clientId: string, serverNames: string[]) => 
    ipcRenderer.invoke('bulk:disableServers', clientId, serverNames),

  // Utility methods
  validateJson: (jsonString: string) => ipcRenderer.invoke('utils:validateJson', jsonString),
  formatJson: (jsonString: string) => ipcRenderer.invoke('utils:formatJson', jsonString),
  
  // System methods
  openExternal: (url: string) => ipcRenderer.invoke('system:openExternal', url),

  // MCP Discovery methods
  discovery: {
    fetchCatalog: (forceRefresh?: boolean, settings?: any) =>
      ipcRenderer.invoke('discovery:fetchCatalog', forceRefresh, settings),
    getInstalledServers: () =>
      ipcRenderer.invoke('discovery:getInstalledServers'),
    isServerInstalled: (serverId: string) =>
      ipcRenderer.invoke('discovery:isServerInstalled', serverId),
    installServer: (serverId: string) =>
      ipcRenderer.invoke('discovery:installServer', serverId),
    uninstallServer: (serverId: string) =>
      ipcRenderer.invoke('discovery:uninstallServer', serverId),
    getInstallationState: (serverId: string) =>
      ipcRenderer.invoke('discovery:getInstallationState', serverId),
    updateSettings: (settings: any) =>
      ipcRenderer.invoke('discovery:updateSettings', settings),
    getSettings: () =>
      ipcRenderer.invoke('discovery:getSettings'),
  },

  // Server Catalog methods (for Visual Workspace)
  getCatalogServers: () => ipcRenderer.invoke('catalog:getServers'),
  searchCatalogServers: (query: string) => ipcRenderer.invoke('catalog:searchServers', query),
  getCatalogServersByCategory: (category: string) => ipcRenderer.invoke('catalog:getServersByCategory', category),
  getPopularServers: (limit?: number) => ipcRenderer.invoke('catalog:getPopularServers', limit),

  // Metrics methods (for Visual Workspace)
  getServerMetrics: (serverName: string, serverConfig?: any) => ipcRenderer.invoke('metrics:getServerMetrics', serverName, serverConfig),
  getTotalMetrics: (serverNames: string[]) => ipcRenderer.invoke('metrics:getTotal', serverNames),

  // Connection monitoring
  getConnectionStatus: (serverName: string) => ipcRenderer.invoke('connection:getStatus', serverName),
  connectToServer: (serverName: string, config: any) => ipcRenderer.invoke('connection:connect', serverName, config),
  disconnectFromServer: (serverName: string) => ipcRenderer.invoke('connection:disconnect', serverName)
})

