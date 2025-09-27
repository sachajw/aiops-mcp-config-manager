/**
 * System IPC Handler
 * Handles system-level operations like backups, file operations, and utilities
 */

import { BaseHandler } from './BaseHandler';
import { container } from '../../container';
import { shell, ipcMain } from 'electron';
import { Configuration } from '../../../shared/types';
import * as chokidar from 'chokidar';
import * as path from 'path';

export class SystemHandler extends BaseHandler {
  private fileWatchers: Map<string, chokidar.FSWatcher> = new Map();

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
      async (event, paths: string[]) => {
        console.log('[FileMonitor] Starting file watch for:', paths);

        for (const filePath of paths) {
          // Skip if already watching this path
          if (this.fileWatchers.has(filePath)) {
            console.log(`[FileMonitor] Already watching: ${filePath}`);
            continue;
          }

          try {
            // Create a new watcher for this path
            const watcher = chokidar.watch(filePath, {
              persistent: true,
              ignoreInitial: true,
              awaitWriteFinish: {
                stabilityThreshold: 500,
                pollInterval: 100
              }
            });

            // Set up event handlers
            watcher
              .on('change', () => {
                console.log(`[FileMonitor] File changed: ${filePath}`);
                // Notify all renderer windows about the file change
                event.sender.send('file:changed', {
                  path: filePath,
                  type: 'change',
                  timestamp: new Date().toISOString()
                });
              })
              .on('add', () => {
                console.log(`[FileMonitor] File added: ${filePath}`);
                event.sender.send('file:changed', {
                  path: filePath,
                  type: 'add',
                  timestamp: new Date().toISOString()
                });
              })
              .on('unlink', () => {
                console.log(`[FileMonitor] File removed: ${filePath}`);
                event.sender.send('file:changed', {
                  path: filePath,
                  type: 'unlink',
                  timestamp: new Date().toISOString()
                });
              })
              .on('error', (error) => {
                console.error(`[FileMonitor] Watch error for ${filePath}:`, error);
              });

            // Store the watcher
            this.fileWatchers.set(filePath, watcher);
            console.log(`[FileMonitor] Now watching: ${filePath}`);
          } catch (error) {
            console.error(`[FileMonitor] Failed to watch ${filePath}:`, error);
          }
        }
      }
    );

    this.handle<[string[]], void>(
      'files:unwatch',
      async (_, paths: string[]) => {
        console.log('[FileMonitor] Stopping file watch for:', paths);

        for (const filePath of paths) {
          const watcher = this.fileWatchers.get(filePath);
          if (watcher) {
            await watcher.close();
            this.fileWatchers.delete(filePath);
            console.log(`[FileMonitor] Stopped watching: ${filePath}`);
          } else {
            console.log(`[FileMonitor] Not watching: ${filePath}`);
          }
        }
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

    this.handle<[], string>(
      'system:getCurrentWorkingDirectory',
      async () => {
        return process.cwd();
      }
    );

    console.log('[SystemHandler] Registered all system handlers');
  }

  /**
   * Override unregister to cleanup file watchers
   */
  unregister(): void {
    console.log('[SystemHandler] Cleaning up file watchers...');

    // Close all file watchers
    for (const [path, watcher] of this.fileWatchers.entries()) {
      watcher.close().catch(error => {
        console.error(`[FileMonitor] Error closing watcher for ${path}:`, error);
      });
    }
    this.fileWatchers.clear();

    // Call parent unregister
    super.unregister();
    console.log('[SystemHandler] Cleanup complete');
  }
}