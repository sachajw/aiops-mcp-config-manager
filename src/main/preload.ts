import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // App methods
  getVersion: () => ipcRenderer.invoke('app:getVersion'),

  // Configuration methods (to be implemented)
  // loadConfiguration: (clientId: string) => ipcRenderer.invoke('config:load', clientId),
  // saveConfiguration: (clientId: string, config: any) => ipcRenderer.invoke('config:save', clientId, config),

  // File system methods (to be implemented)
  // watchFiles: (paths: string[]) => ipcRenderer.invoke('fs:watch', paths),

  // Server testing methods (to be implemented)
  // testServer: (serverConfig: any) => ipcRenderer.invoke('server:test', serverConfig),
})

// Type definitions for the exposed API
export interface ElectronAPI {
  getVersion: () => Promise<string>
  // Additional methods will be typed here as they're implemented
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
