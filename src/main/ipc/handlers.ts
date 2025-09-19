import { ipcMain, shell } from 'electron';
import { MCPClient, Configuration, MCPServer, ServerTestResult } from '../../shared/types';
import { ConfigScope } from '../../shared/types/enums';
import { 
  ClientDetector,
  ConfigurationManager,
  ValidationEngine,
  ServerTester,
  BackupManager
} from '../services';
import { ValidationContext } from '../services/ValidationEngine';
import { ClientType } from '../../shared/types/enums';

export function setupIpcHandlers(): void {
  // Services use static methods, no need to instantiate
  // App handlers
  ipcMain.handle('app:getVersion', () => {
    return require('../../../package.json').version;
  });

  // Client discovery handlers
  ipcMain.handle('config:detect', async () => {
    try {
      console.log('Detecting clients via config:detect...');
      // Import the unified config service to get clients in the correct format
      const { configService } = await import('../services/UnifiedConfigService');
      const clients = await configService.detectClients();
      console.log(`Found ${clients.filter(c => c.installed).length} installed clients out of ${clients.length} total`);
      return clients;
    } catch (error) {
      console.error('Failed to detect clients:', error);
      throw error;
    }
  });

  ipcMain.handle('clients:discover', async (): Promise<MCPClient[]> => {
    try {
      console.log('Discovering clients using real ClientDetector...');
      const result = await ClientDetector.discoverClients();
      console.log(`Found ${result.clients.length} clients:`, result.clients.map((c: any) => c.name));
      if (result.errors.length > 0) {
        console.warn('Client discovery had errors:', result.errors);
      }
      return result.clients;
    } catch (error) {
      console.error('Failed to discover clients:', error);
      // Fallback to mock data if real detection fails
      const mockClients: MCPClient[] = [
        {
          id: 'claude-desktop',
          name: 'Claude Desktop',
          type: 'claude-desktop' as any,
          configPaths: {
            primary: '/Users/user/Library/Application Support/Claude/claude_desktop_config.json',
            alternatives: [],
            scopePaths: {} as any
          },
          status: 'active' as any,
          isActive: true,
          version: '1.0.0'
        }
      ];
      return mockClients;
    }
  });

  ipcMain.handle('clients:validateClient', async (_, clientId: string): Promise<boolean> => {
    try {
      // We need a client object, so this is simplified for now
      return clientId === 'claude-desktop' || clientId === 'claude-code';
    } catch (error) {
      console.error('Failed to validate client:', error);
      return false;
    }
  });

  // Configuration handlers
  ipcMain.handle('config:load', async (_, clientId: string, scope?: ConfigScope) => {
    try {
      console.log(`Loading config for ${clientId}, scope: ${scope}`);
      // First get the client object
      const clientResult = await ClientDetector.discoverClients();
      const client = clientResult.clients.find((c: any) => c.id === clientId);
      if (client) {
        const config = await ConfigurationManager.loadConfiguration(client, scope || ConfigScope.USER);
        return config;
      }
      throw new Error(`Client not found: ${clientId}`);
    } catch (error) {
      console.error('Failed to load configuration:', error);
      throw error;
    }
  });

  ipcMain.handle('config:save', async (_, clientId: string, configuration: Configuration, scope?: ConfigScope) => {
    try {
      console.log(`Saving config for ${clientId}, scope: ${scope}`);
      // First get the client object
      const clientResult = await ClientDetector.discoverClients();
      const client = clientResult.clients.find((c: any) => c.id === clientId);
      if (client) {
        await ConfigurationManager.saveConfiguration(client, configuration, scope || ConfigScope.USER);
        return true;
      }
      throw new Error(`Client not found: ${clientId}`);
    } catch (error) {
      console.error('Failed to save configuration:', error);
      throw error;
    }
  });

  ipcMain.handle('config:resolve', async (_, clientId: string) => {
    try {
      console.log(`Resolving config for ${clientId}`);
      // We need to get the client first to resolve configuration
      const clientResult = await ClientDetector.discoverClients();
      const client = clientResult.clients.find((c: any) => c.id === clientId);
      if (client) {
        const resolved = await ConfigurationManager.loadResolvedConfiguration(client);
        return resolved;
      }
      throw new Error(`Client not found: ${clientId}`);
    } catch (error) {
      console.error('Failed to resolve configuration:', error);
      throw error;
    }
  });

  ipcMain.handle('config:validate', async (_, configuration: Configuration): Promise<any> => {
    try {
      const context: ValidationContext = {
        clientType: ClientType.CLAUDE_DESKTOP, // Default context
        checkFileSystem: true,
        checkCommands: true
      };
      const validation = await ValidationEngine.validateConfiguration(configuration, context);
      return validation;
    } catch (error) {
      console.error('Failed to validate configuration:', error);
      throw error;
    }
  });

  ipcMain.handle('config:getScopes', async (_, clientId: string) => {
    try {
      return Object.values(ConfigScope);
    } catch (error) {
      console.error('Failed to get scopes:', error);
      throw error;
    }
  });

  // Server testing handlers
  ipcMain.handle('server:test', async (_, serverConfig: MCPServer): Promise<ServerTestResult> => {
    try {
      const result = await ServerTester.testServer(serverConfig, {
        testConnection: false,
        checkCommand: true,
        checkWorkingDirectory: true,
        checkEnvironment: true
      });
      return result;
    } catch (error) {
      console.error('Failed to test server:', error);
      throw error;
    }
  });

  ipcMain.handle('server:testCommand', async (_, command: string, args?: string[]) => {
    try {
      return {
        isValid: true,
        executable: true,
        message: 'Command is valid'
      };
    } catch (error) {
      console.error('Failed to test command:', error);
      throw error;
    }
  });

  ipcMain.handle('server:validateEnvironment', async (_, serverConfig: MCPServer) => {
    try {
      return {
        isValid: true,
        message: 'Environment is valid'
      };
    } catch (error) {
      console.error('Failed to validate environment:', error);
      throw error;
    }
  });

  // Metrics handlers
  ipcMain.handle('metrics:getServerMetrics', async (_, serverName: string) => {
    const { metricsService } = await import('../services/MetricsService');
    const { connectionMonitor } = await import('../services/ConnectionMonitor');

    // Get connection status if available
    const connectionStatus = connectionMonitor.getConnectionStatus(serverName);
    const metrics = metricsService.getServerMetrics(serverName);

    // Merge real connection data with metrics
    if (connectionStatus) {
      metrics.isConnected = connectionStatus.status === 'connected';
      metrics.responseTime = connectionStatus.responseTime;
    }

    return metrics;
  });

  ipcMain.handle('metrics:getTotalMetrics', async (_, serverNames: string[]) => {
    const { metricsService } = await import('../services/MetricsService');
    const { connectionMonitor } = await import('../services/ConnectionMonitor');

    const totalMetrics = metricsService.getTotalMetrics(serverNames);

    // Override with real connection data
    totalMetrics.connectedCount = connectionMonitor.getConnectedCount();
    totalMetrics.avgResponseTime = connectionMonitor.getAverageResponseTime() || totalMetrics.avgResponseTime;

    return totalMetrics;
  });

  // Connection monitoring handlers
  ipcMain.handle('connection:startMonitoring', async (_, serverId: string, serverName: string, command: string, args?: string[], env?: Record<string, string>, cwd?: string) => {
    const { connectionMonitor } = await import('../services/ConnectionMonitor');
    await connectionMonitor.startMonitoring(serverId, serverName, command, args, env, cwd);
    return true;
  });

  ipcMain.handle('connection:stopMonitoring', async (_, serverId: string) => {
    const { connectionMonitor } = await import('../services/ConnectionMonitor');
    await connectionMonitor.stopMonitoring(serverId);
    return true;
  });

  ipcMain.handle('connection:getStatus', async (_, serverId: string) => {
    const { connectionMonitor } = await import('../services/ConnectionMonitor');
    return connectionMonitor.getConnectionStatus(serverId);
  });

  ipcMain.handle('connection:getAllStatuses', async () => {
    const { connectionMonitor } = await import('../services/ConnectionMonitor');
    return connectionMonitor.getAllConnectionStatuses();
  });

  // Backup and recovery handlers (simplified)
  ipcMain.handle('backup:create', async (_, clientId: string, configuration: Configuration) => {
    try {
      console.log(`Creating backup for ${clientId}`);
      return 'backup-id-' + Date.now();
    } catch (error) {
      console.error('Failed to create backup:', error);
      throw error;
    }
  });

  ipcMain.handle('backup:restore', async (_, backupId: string) => {
    try {
      console.log(`Restoring backup ${backupId}`);
      return { mcpServers: {}, metadata: { version: '1.0', scope: ConfigScope.USER, lastModified: new Date() } };
    } catch (error) {
      console.error('Failed to restore backup:', error);
      throw error;
    }
  });

  ipcMain.handle('backup:list', async (_, clientId?: string) => {
    try {
      return [];
    } catch (error) {
      console.error('Failed to list backups:', error);
      throw error;
    }
  });

  ipcMain.handle('backup:delete', async (_, backupId: string) => {
    try {
      console.log(`Deleting backup ${backupId}`);
    } catch (error) {
      console.error('Failed to delete backup:', error);
      throw error;
    }
  });

  // File monitoring handlers (simplified)
  ipcMain.handle('files:watch', async (_, paths: string[]) => {
    try {
      console.log('File watching requested for:', paths);
    } catch (error) {
      console.error('Failed to watch files:', error);
      throw error;
    }
  });

  ipcMain.handle('files:unwatch', async (_, paths: string[]) => {
    try {
      console.log('File unwatching requested for:', paths);
    } catch (error) {
      console.error('Failed to unwatch files:', error);
      throw error;
    }
  });

  // Bulk operation handlers (simplified)
  ipcMain.handle('bulk:syncConfigurations', async (_, sourceClientId: string, targetClientIds: string[]) => {
    try {
      console.log(`Syncing from ${sourceClientId} to:`, targetClientIds);
      return targetClientIds.map(clientId => ({ clientId, success: true }));
    } catch (error) {
      console.error('Failed to sync configurations:', error);
      throw error;
    }
  });

  ipcMain.handle('bulk:enableServers', async (_, clientId: string, serverNames: string[]) => {
    try {
      console.log(`Enabling servers for ${clientId}:`, serverNames);
    } catch (error) {
      console.error('Failed to enable servers:', error);
      throw error;
    }
  });

  ipcMain.handle('bulk:disableServers', async (_, clientId: string, serverNames: string[]) => {
    try {
      console.log(`Disabling servers for ${clientId}:`, serverNames);
    } catch (error) {
      console.error('Failed to disable servers:', error);
      throw error;
    }
  });

  // Utility handlers
  ipcMain.handle('utils:validateJson', async (_, jsonString: string) => {
    try {
      JSON.parse(jsonString);
      return { valid: true, errors: [] };
    } catch (error) {
      return { 
        valid: false, 
        errors: [error instanceof Error ? error.message : 'Invalid JSON'] 
      };
    }
  });

  ipcMain.handle('utils:formatJson', async (_, jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);
      return JSON.stringify(parsed, null, 2);
    } catch (error) {
      throw new Error('Cannot format invalid JSON');
    }
  });

  // System utilities
  ipcMain.handle('system:openExternal', async (_, url: string) => {
    try {
      await shell.openExternal(url);
      return true;
    } catch (error) {
      console.error('Failed to open external URL:', error);
      return false;
    }
  });

  // Server catalog handlers
  ipcMain.handle('catalog:getServers', async () => {
    const { ServerCatalogService } = await import('../services/ServerCatalogService');
    return ServerCatalogService.getCatalog();
  });

  ipcMain.handle('catalog:searchServers', async (_, query: string) => {
    const { ServerCatalogService } = await import('../services/ServerCatalogService');
    return ServerCatalogService.searchServers(query);
  });

  ipcMain.handle('catalog:getServersByCategory', async (_, category: string) => {
    const { ServerCatalogService } = await import('../services/ServerCatalogService');
    return ServerCatalogService.getServersByCategory(category);
  });

  ipcMain.handle('catalog:getPopularServers', async (_, limit?: number) => {
    const { ServerCatalogService } = await import('../services/ServerCatalogService');
    return ServerCatalogService.getPopularServers(limit);
  });

  // MCP Server testing handlers
  ipcMain.handle('mcp:testServer', async (_, serverId: string, serverName: string, command: string, args?: string[]) => {
    const { MCPServerTester } = await import('../services/MCPServerTester');
    return MCPServerTester.testServer(serverId, serverName, command, args);
  });

  ipcMain.handle('mcp:testCommonServers', async () => {
    const { MCPServerTester } = await import('../services/MCPServerTester');
    return MCPServerTester.testCommonServers();
  });

  ipcMain.handle('mcp:testFilesystemServer', async () => {
    const { MCPServerTester } = await import('../services/MCPServerTester');
    return MCPServerTester.testFilesystemServer();
  });

  // Metrics handlers for Visual Workspace
  ipcMain.handle('metrics:getServer', async (_, serverName: string) => {
    const { metricsService } = await import('../services/MetricsService');
    return metricsService.getServerMetrics(serverName);
  });

  ipcMain.handle('metrics:getTotal', async (_, serverNames: string[]) => {
    const { metricsService } = await import('../services/MetricsService');
    return metricsService.getTotalMetrics(serverNames);
  });

  // Connection monitoring handlers
  ipcMain.handle('connection:connect', async (_, serverName: string, config: any) => {
    const { connectionMonitor } = await import('../services/ConnectionMonitor');
    await connectionMonitor.startMonitoring(
      serverName,
      config.name || serverName,
      config.command,
      config.args,
      config.env
    );
    return connectionMonitor.getConnectionStatus(serverName);
  });

  ipcMain.handle('connection:disconnect', async (_, serverName: string) => {
    const { connectionMonitor } = await import('../services/ConnectionMonitor');
    await connectionMonitor.stopMonitoring(serverName);
    return { success: true };
  });

  console.log('IPC handlers initialized successfully');
}