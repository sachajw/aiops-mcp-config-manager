import { ipcMain, shell, dialog } from 'electron';
import { configService } from '../services/UnifiedConfigService';

export function registerSimplifiedHandlers() {
  // config:detect is now handled in handlers.ts for consistency

  ipcMain.handle('config:read', async (_, clientName: string, scope: string = 'user', projectDirectory?: string) => {
    try {
      console.log(`[IPC] config:read called with clientName: ${clientName}, scope: ${scope}, projectDirectory: ${projectDirectory}`);
      const config = await configService.readConfig(clientName, scope as any, projectDirectory);
      const { configPath, ...configData } = config;
      const servers = configService.normalizeServers(configData);
      return { success: true, data: servers, configPath };
    } catch (error) {
      console.error('Error reading config:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('config:write', async (_, clientName: string, scope: string, servers: any, projectDirectory?: string) => {
    try {
      const config = configService.denormalizeServers(servers, clientName);
      await configService.writeConfig(clientName, scope as any, config, projectDirectory);
      return { success: true };
    } catch (error) {
      console.error('Error writing config:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('config:backup', async (_, clientName: string, scope: string = 'user', projectDirectory?: string) => {
    try {
      const backupPath = await configService.backupConfig(clientName, scope as any, projectDirectory);
      return { success: true, backupPath };
    } catch (error) {
      console.error('Error backing up config:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('shell:showItemInFolder', async (_, filePath: string) => {
    try {
      shell.showItemInFolder(filePath);
      return { success: true };
    } catch (error) {
      console.error('Error opening file location:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('dialog:selectDirectory', async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
        title: 'Select Project Directory',
        buttonLabel: 'Select Directory'
      });
      
      if (!result.canceled && result.filePaths.length > 0) {
        return { success: true, path: result.filePaths[0] };
      }
      
      return { success: false, canceled: true };
    } catch (error) {
      console.error('Error selecting directory:', error);
      return { success: false, error: (error as Error).message };
    }
  });
}