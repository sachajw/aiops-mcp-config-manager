/**
 * Client IPC Handler
 * Handles all client discovery and management operations
 */

import { BaseHandler } from './BaseHandler';
import { container } from '../../container';
import { MCPClient } from '../../../shared/types';
import { ApplicationError, ErrorCategory, ErrorSeverity } from '../../../shared/utils/ErrorHandler';

export class ClientHandler extends BaseHandler {
  constructor() {
    super('clients');
  }

  /**
   * Register all client-related IPC handlers
   */
  register(): void {
    const clientDetector = container.getClientDetector();

    // Discover all clients
    this.handle<[], MCPClient[]>('discover', async () => {
      console.log('Discovering clients using ClientDetector...');
      const result = await clientDetector.detectClients();
      console.log(`Found ${result.clients.length} clients`);
      return result.clients;
    });

    // Validate a specific client
    this.handle<[string], boolean>('validateClient', async (_, clientId: string) => {
      const client = await clientDetector.detectClient(clientId);
      if (!client) {
        return false;
      }
      const validation = await clientDetector.validateClient(client);
      return validation.isValid;
    });

    // Check if client is active
    this.handle<[string], boolean>('isActive', async (_, clientId: string) => {
      return clientDetector.isClientActive(clientId);
    });

    // Get client details
    this.handle<[string], MCPClient | null>('getDetails', async (_, clientId: string) => {
      const result = await clientDetector.detectClients();
      return result.clients.find((c: MCPClient) => c.id === clientId) || null;
    });

    // Refresh client statuses
    this.handle<[], MCPClient[]>('refreshStatuses', async () => {
      const result = await clientDetector.detectClients();
      // Force cache refresh if using V2
      const v2 = container.get<any>('clientDetectorV2');
      if (v2 && typeof v2.clearCache === 'function') {
        v2.clearCache();
      }
      return result.clients;
    });

    console.log('[ClientHandler] Registered all client handlers');
  }
}