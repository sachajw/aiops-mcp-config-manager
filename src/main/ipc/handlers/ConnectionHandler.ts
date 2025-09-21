/**
 * Connection IPC Handler
 * Handles server connection monitoring and management
 */

import { BaseHandler } from './BaseHandler';

export class ConnectionHandler extends BaseHandler {
  constructor() {
    super('connection');
  }

  /**
   * Register all connection-related IPC handlers
   */
  register(): void {
    // Start monitoring a server connection
    this.handle<[string, string, string, string[]?, Record<string, string>?, string?], boolean>(
      'startMonitoring',
      async (_, serverId: string, serverName: string, command: string, args?: string[], env?: Record<string, string>, cwd?: string) => {
        const { connectionMonitor } = await import('../../services/ConnectionMonitor');
        await connectionMonitor.startMonitoring(serverId, serverName, command, args, env, cwd);
        return true;
      }
    );

    // Stop monitoring a server connection
    this.handle<[string], boolean>(
      'stopMonitoring',
      async (_, serverId: string) => {
        const { connectionMonitor } = await import('../../services/ConnectionMonitor');
        await connectionMonitor.stopMonitoring(serverId);
        return true;
      }
    );

    // Get connection status for a server
    this.handle<[string], any>(
      'getStatus',
      async (_, serverId: string) => {
        const { connectionMonitor } = await import('../../services/ConnectionMonitor');
        return connectionMonitor.getConnectionStatus(serverId);
      }
    );

    // Get all connection statuses
    this.handle<[], any>(
      'getAllStatuses',
      async () => {
        const { connectionMonitor } = await import('../../services/ConnectionMonitor');
        return connectionMonitor.getAllConnectionStatuses();
      }
    );

    // Connect to a server
    this.handle<[string, any], any>(
      'connect',
      async (_, serverName: string, config: any) => {
        const { connectionMonitor } = await import('../../services/ConnectionMonitor');
        await connectionMonitor.startMonitoring(
          serverName,
          config.name || serverName,
          config.command,
          config.args,
          config.env
        );
        return connectionMonitor.getConnectionStatus(serverName);
      }
    );

    // Disconnect from a server
    this.handle<[string], any>(
      'disconnect',
      async (_, serverName: string) => {
        const { connectionMonitor } = await import('../../services/ConnectionMonitor');
        await connectionMonitor.stopMonitoring(serverName);
        return { success: true };
      }
    );

    console.log('[ConnectionHandler] Registered all connection handlers');
  }
}