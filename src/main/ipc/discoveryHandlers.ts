import { ipcMain } from 'electron';
import { McpDiscoveryService } from '../services/McpDiscoveryService';
import {
  McpServerCatalog,
  InstallationState,
  InstalledServer,
  McpDiscoverySettings
} from '../../shared/types/mcp-discovery';

let discoveryService: McpDiscoveryService | null = null;

/**
 * Initialize the discovery service
 */
function getDiscoveryService(): McpDiscoveryService {
  if (!discoveryService) {
    discoveryService = new McpDiscoveryService();
  }
  return discoveryService;
}

/**
 * Register IPC handlers for MCP Discovery
 */
export function registerDiscoveryHandlers(): void {
  console.log('[IPC] Registering MCP Discovery handlers');

  // Fetch catalog
  ipcMain.handle('discovery:fetchCatalog', async (event, forceRefresh = false, settings?: Partial<McpDiscoverySettings>): Promise<McpServerCatalog> => {
    try {
      console.log('[IPC] discovery:fetchCatalog called with forceRefresh:', forceRefresh, 'settings:', settings);

      // If settings are provided, recreate the service with new settings
      if (settings) {
        discoveryService = new McpDiscoveryService(settings);
      }

      const service = getDiscoveryService();
      return await service.fetchCatalog(forceRefresh);
    } catch (error) {
      console.error('[IPC] Failed to fetch catalog:', error);
      throw error;
    }
  });

  // Get installed servers
  ipcMain.handle('discovery:getInstalledServers', async (): Promise<InstalledServer[]> => {
    try {
      console.log('[IPC] discovery:getInstalledServers called');
      const service = getDiscoveryService();
      return service.getInstalledServers();
    } catch (error) {
      console.error('[IPC] Failed to get installed servers:', error);
      throw error;
    }
  });

  // Check if server is installed
  ipcMain.handle('discovery:isServerInstalled', async (event, serverId: string): Promise<boolean> => {
    try {
      console.log('[IPC] discovery:isServerInstalled called for:', serverId);
      const service = getDiscoveryService();
      return service.isServerInstalled(serverId);
    } catch (error) {
      console.error('[IPC] Failed to check server installation:', error);
      throw error;
    }
  });

  // Install server
  ipcMain.handle('discovery:installServer', async (event, serverId: string): Promise<void> => {
    try {
      console.log('[IPC] discovery:installServer called for:', serverId);
      const service = getDiscoveryService();
      await service.installServer(serverId);
    } catch (error) {
      console.error('[IPC] Failed to install server:', error);
      throw error;
    }
  });

  // Uninstall server
  ipcMain.handle('discovery:uninstallServer', async (event, serverId: string): Promise<void> => {
    try {
      console.log('[IPC] discovery:uninstallServer called for:', serverId);
      const service = getDiscoveryService();
      await service.uninstallServer(serverId);
    } catch (error) {
      console.error('[IPC] Failed to uninstall server:', error);
      throw error;
    }
  });

  // Get installation state
  ipcMain.handle('discovery:getInstallationState', async (event, serverId: string): Promise<InstallationState | undefined> => {
    try {
      console.log('[IPC] discovery:getInstallationState called for:', serverId);
      const service = getDiscoveryService();
      return service.getInstallationState(serverId);
    } catch (error) {
      console.error('[IPC] Failed to get installation state:', error);
      throw error;
    }
  });

  // Update discovery settings
  ipcMain.handle('discovery:updateSettings', async (event, settings: Partial<McpDiscoverySettings>): Promise<void> => {
    try {
      console.log('[IPC] discovery:updateSettings called with:', settings);
      // Recreate the service with new settings
      discoveryService = new McpDiscoveryService(settings);
    } catch (error) {
      console.error('[IPC] Failed to update discovery settings:', error);
      throw error;
    }
  });

  // Get current discovery settings
  ipcMain.handle('discovery:getSettings', async (): Promise<McpDiscoverySettings> => {
    try {
      console.log('[IPC] discovery:getSettings called');
      const service = getDiscoveryService();
      return service.getSettings();
    } catch (error) {
      console.error('[IPC] Failed to get discovery settings:', error);
      throw error;
    }
  });

  // Get installation logs for a server
  ipcMain.handle('discovery:getInstallationLogs', async (event, serverId: string): Promise<string[]> => {
    try {
      console.log('[IPC] discovery:getInstallationLogs called for:', serverId);
      const service = getDiscoveryService();
      return service.getInstallationLogs(serverId);
    } catch (error) {
      console.error('[IPC] Failed to get installation logs:', error);
      throw error;
    }
  });
}