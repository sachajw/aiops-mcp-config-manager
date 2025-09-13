export interface ElectronAPI {
  detectClients: () => Promise<any[]>;
  readConfig: (clientName: string, scope: string) => Promise<any>;
  writeConfig: (clientName: string, scope: string, servers: any) => Promise<any>;
  backupConfig: (clientName: string, scope: string) => Promise<any>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}