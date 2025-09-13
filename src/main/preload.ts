import { contextBridge, ipcRenderer } from 'electron'
import { MCPClient, Configuration, MCPServer, ServerTestResult } from '../shared/types'
import { ConfigScope } from '../shared/types/enums'

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
})

// Type definitions for the exposed API
export interface ElectronAPI {
  // App methods
  getVersion: () => Promise<string>
  
  // Client discovery methods
  discoverClients: () => Promise<MCPClient[]>
  validateClient: (clientId: string) => Promise<boolean>
  
  // Configuration methods
  loadConfiguration: (clientId: string, scope?: ConfigScope) => Promise<Configuration | null>
  saveConfiguration: (clientId: string, config: Configuration, scope?: ConfigScope) => Promise<void>
  resolveConfiguration: (clientId: string) => Promise<any>
  validateConfiguration: (config: Configuration) => Promise<any>
  getAvailableScopes: (clientId: string) => Promise<ConfigScope[]>
  
  // Server testing methods
  testServer: (serverConfig: MCPServer) => Promise<ServerTestResult>
  testCommand: (command: string, args?: string[]) => Promise<any>
  validateEnvironment: (serverConfig: MCPServer) => Promise<any>
  
  // Backup and recovery methods
  createBackup: (clientId: string, config: Configuration) => Promise<string>
  restoreBackup: (backupId: string) => Promise<Configuration>
  listBackups: (clientId?: string) => Promise<any[]>
  deleteBackup: (backupId: string) => Promise<void>
  
  // File monitoring methods
  watchFiles: (paths: string[]) => Promise<void>
  unwatchFiles: (paths: string[]) => Promise<void>
  
  // Bulk operation methods
  syncConfigurations: (sourceClientId: string, targetClientIds: string[]) => Promise<any[]>
  enableServers: (clientId: string, serverNames: string[]) => Promise<void>
  disableServers: (clientId: string, serverNames: string[]) => Promise<void>
  
  // Utility methods
  validateJson: (jsonString: string) => Promise<{ valid: boolean; errors: string[] }>
  formatJson: (jsonString: string) => Promise<string>
  
  // System methods
  openExternal: (url: string) => Promise<boolean>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
