/**
 * System IPC Handler
 * Handles system-level operations like backups, file operations, and utilities
 */

import { BaseHandler } from './BaseHandler';
import { container } from '../../container';
import { shell } from 'electron';
import { Configuration } from '../../../shared/types';

export class SystemHandler extends BaseHandler {
  constructor() {
    super('');  // No prefix for system handlers
  }

  /**
   * Register all system-related IPC handlers
   */
  register(): void {
    const backupManager = container.getBackupManager();

    // App handlers
    this.handle<[], string>('app:getVersion', async () => {
      return require('../../../../package.json').version;
    });

    // Backup handlers
    this.handle<[string, Configuration], string>(
      'backup:create',
      async (_, clientId: string, configuration: Configuration) => {
        console.log(`Creating backup for ${clientId}`);
        return backupManager.createBackup(clientId, configuration);
      }
    );

    this.handle<[string], any>(
      'backup:restore',
      async (_, backupId: string) => {
        console.log(`Restoring backup ${backupId}`);
        return backupManager.restoreBackup(backupId);
      }
    );

    this.handle<[string?], any[]>(
      'backup:list',
      async (_, clientId?: string) => {
        return backupManager.listBackups(clientId);
      }
    );

    this.handle<[string], void>(
      'backup:delete',
      async (_, backupId: string) => {
        console.log(`Deleting backup ${backupId}`);
        await backupManager.deleteBackup(backupId);
      }
    );

    // File monitoring handlers
    this.handle<[string[]], void>(
      'files:watch',
      async (_, paths: string[]) => {
        console.log('File watching requested for:', paths);
        // TODO: Implement file monitoring
      }
    );

    this.handle<[string[]], void>(
      'files:unwatch',
      async (_, paths: string[]) => {
        console.log('File unwatching requested for:', paths);
        // TODO: Implement file monitoring
      }
    );

    // Bulk operation handlers
    this.handle<[string, string[]], any[]>(
      'bulk:syncConfigurations',
      async (_, sourceClientId: string, targetClientIds: string[]) => {
        console.log(`Syncing from ${sourceClientId} to:`, targetClientIds);
        return targetClientIds.map(clientId => ({ clientId, success: true }));
      }
    );

    this.handle<[string, string[]], void>(
      'bulk:enableServers',
      async (_, clientId: string, serverNames: string[]) => {
        console.log(`Enabling servers for ${clientId}:`, serverNames);
        // TODO: Implement bulk operations
      }
    );

    this.handle<[string, string[]], void>(
      'bulk:disableServers',
      async (_, clientId: string, serverNames: string[]) => {
        console.log(`Disabling servers for ${clientId}:`, serverNames);
        // TODO: Implement bulk operations
      }
    );

    // Utility handlers
    this.handle<[string], any>(
      'utils:validateJson',
      async (_, jsonString: string) => {
        try {
          JSON.parse(jsonString);
          return { valid: true, errors: [] };
        } catch (error) {
          return {
            valid: false,
            errors: [error instanceof Error ? error.message : 'Invalid JSON']
          };
        }
      }
    );

    this.handle<[string], string>(
      'utils:formatJson',
      async (_, jsonString: string) => {
        const parsed = JSON.parse(jsonString);
        return JSON.stringify(parsed, null, 2);
      }
    );

    // System utilities
    this.handle<[string], boolean>(
      'system:openExternal',
      async (_, url: string) => {
        try {
          await shell.openExternal(url);
          return true;
        } catch (error) {
          console.error('Failed to open external URL:', error);
          return false;
        }
      }
    );

    console.log('[SystemHandler] Registered all system handlers');
  }
}