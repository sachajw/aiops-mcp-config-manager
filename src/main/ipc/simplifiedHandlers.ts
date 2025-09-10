import { ipcMain } from 'electron';
import { configService } from '../services/UnifiedConfigService';

export function registerSimplifiedHandlers() {
  ipcMain.handle('config:detect', async () => {
    try {
      return await configService.detectClients();
    } catch (error) {
      console.error('Error detecting clients:', error);
      throw error;
    }
  });

  ipcMain.handle('config:read', async (_, clientName: string, scope: string = 'user') => {
    try {
      const config = await configService.readConfig(clientName, scope as any);
      const servers = configService.normalizeServers(config);
      return { success: true, data: servers };
    } catch (error) {
      console.error('Error reading config:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('config:write', async (_, clientName: string, scope: string, servers: any) => {
    try {
      const config = configService.denormalizeServers(servers, clientName);
      await configService.writeConfig(clientName, scope as any, config);
      return { success: true };
    } catch (error) {
      console.error('Error writing config:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('config:backup', async (_, clientName: string, scope: string = 'user') => {
    try {
      const backupPath = await configService.backupConfig(clientName, scope as any);
      return { success: true, backupPath };
    } catch (error) {
      console.error('Error backing up config:', error);
      return { success: false, error: (error as Error).message };
    }
  });
}