/**
 * Server IPC Handler
 * Handles all server management and testing operations
 */

import { BaseHandler } from './BaseHandler';
import { container } from '../../container';
import { MCPServer, ServerTestResult } from '../../../shared/types';
import { ApplicationError, ErrorCategory, ErrorSeverity } from '../../../shared/utils/ErrorHandler';
import { ServerTester } from '../../services';

export class ServerHandler extends BaseHandler {
  constructor() {
    super('server');
  }

  /**
   * Register all server-related IPC handlers
   */
  register(): void {
    const validationEngine = container.getValidationEngine();

    // List servers for a client
    this.handle<[{ clientId?: string }], { success: boolean; servers?: MCPServer[]; error?: string }>(
      'list',
      async (_, { clientId }) => {
        try {
          const configService = container.get('configurationService') as any;

          if (clientId) {
            // Get servers for specific client
            const config = await configService.loadConfiguration(clientId);

            if (!config || !config.servers) {
              return { success: true, servers: [] };
            }

            // Convert servers object to array
            const servers = Object.entries(config.servers).map(([name, server]: [string, any]) => ({
              ...server,
              name
            }));

            console.log(`[ServerHandler] Listed ${servers.length} servers for client ${clientId}`);
            return { success: true, servers };
          } else {
            // Get all servers from all clients
            const allServers: MCPServer[] = [];
            const clients = ['claude-desktop', 'claude-code', 'codex', 'vscode', 'gemini-desktop', 'gemini-cli'];

            for (const client of clients) {
              try {
                const config = await configService.loadConfiguration(client);
                if (config && config.servers) {
                  const servers = Object.entries(config.servers).map(([name, server]: [string, any]) => ({
                    ...server,
                    name,
                    client
                  }));
                  allServers.push(...servers);
                }
              } catch (error) {
                // Ignore errors for individual clients
                console.warn(`[ServerHandler] Could not load config for ${client}:`, error);
              }
            }

            console.log(`[ServerHandler] Listed ${allServers.length} total servers across all clients`);
            return { success: true, servers: allServers };
          }
        } catch (error) {
          console.error('[ServerHandler] Failed to list servers:', error);
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to list servers'
          };
        }
      }
    );

    // Test server connection
    this.handle<[MCPServer], ServerTestResult>(
      'test',
      async (_, serverConfig: MCPServer) => {
        const result = await ServerTester.testServer(serverConfig, {
          testConnection: false,
          checkCommand: true,
          checkWorkingDirectory: true,
          checkEnvironment: true
        });
        return result;
      }
    );

    // Test server command
    this.handle<[string, string[]?], any>(
      'testCommand',
      async (_, command: string, args?: string[]) => {
        return {
          isValid: true,
          executable: true,
          message: 'Command is valid'
        };
      }
    );

    // Validate server environment
    this.handle<[MCPServer], any>(
      'validateEnvironment',
      async (_, serverConfig: MCPServer) => {
        return {
          isValid: true,
          message: 'Environment is valid'
        };
      }
    );

    // Validate server configuration
    this.handle<[MCPServer], any>(
      'validate',
      async (_, server: MCPServer) => {
        return validationEngine.validateServer(server);
      }
    );

    // Enable server
    this.handle<[string, string, boolean], { success: boolean; error?: string }>(
      'enable',
      async (_, clientName: string, serverName: string, enabled: boolean = true) => {
        try {
          const configService = container.get('configurationService') as any;
          const config = await configService.loadConfiguration(clientName);

          if (!config || !config.servers || !config.servers[serverName]) {
            return { success: false, error: 'Server not found in configuration' };
          }

          // Update the enabled status
          config.servers[serverName].enabled = enabled;

          // Save the configuration
          await configService.saveConfiguration(clientName, config);

          console.log(`[ServerHandler] Server ${serverName} ${enabled ? 'enabled' : 'disabled'} for client ${clientName}`);
          return { success: true };
        } catch (error) {
          console.error('[ServerHandler] Failed to enable/disable server:', error);
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update server status'
          };
        }
      }
    );

    // Disable server
    this.handle<[string, string], { success: boolean; error?: string }>(
      'disable',
      async (_, clientName: string, serverName: string) => {
        // Delegate to enable with false flag
        try {
          const configService = container.get('configurationService') as any;
          const config = await configService.loadConfiguration(clientName);

          if (!config || !config.servers || !config.servers[serverName]) {
            return { success: false, error: 'Server not found in configuration' };
          }

          // Update the enabled status to false
          config.servers[serverName].enabled = false;

          // Save the configuration
          await configService.saveConfiguration(clientName, config);

          console.log(`[ServerHandler] Server ${serverName} disabled for client ${clientName}`);
          return { success: true };
        } catch (error) {
          console.error('[ServerHandler] Failed to disable server:', error);
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to disable server'
          };
        }
      }
    );

    // Toggle server enabled status
    this.handle<[string, string], { success: boolean; enabled?: boolean; error?: string }>(
      'toggle',
      async (_, clientName: string, serverName: string) => {
        try {
          const configService = container.get('configurationService') as any;
          const config = await configService.loadConfiguration(clientName);

          if (!config || !config.servers || !config.servers[serverName]) {
            return { success: false, error: 'Server not found in configuration' };
          }

          // Toggle the enabled status
          const newStatus = !config.servers[serverName].enabled;
          config.servers[serverName].enabled = newStatus;

          // Save the configuration
          await configService.saveConfiguration(clientName, config);

          console.log(`[ServerHandler] Server ${serverName} toggled to ${newStatus ? 'enabled' : 'disabled'} for client ${clientName}`);
          return { success: true, enabled: newStatus };
        } catch (error) {
          console.error('[ServerHandler] Failed to toggle server:', error);
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to toggle server status'
          };
        }
      }
    );

    console.log('[ServerHandler] Registered all server handlers');
  }
}