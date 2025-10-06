/**
 * Persistence IPC Handler
 * Handles all persistence-related IPC operations
 */

import { BaseHandler } from './BaseHandler';
import { getPersistenceService } from '../../services/PersistenceService';

export class PersistenceHandler extends BaseHandler {
  constructor() {
    super('persistence');
  }

  /**
   * Register all persistence-related IPC handlers
   */
  register(): void {
    const persistenceService = getPersistenceService();

    // Get data from a category
    this.handle<[string, string?], any>(
      'get',
      async (_, category: string, key?: string) => {
        console.log(`[PersistenceHandler] Getting data from ${category}${key ? `/${key}` : ''}`);
        try {
          const result = await persistenceService.get(category as any, key);
          return { success: true, data: result };
        } catch (error) {
          console.error('[PersistenceHandler] Failed to get data:', error);
          return { success: false, error: (error as Error).message };
        }
      }
    );

    // Set data in a category
    this.handle<[string, string, any], { success: boolean; error?: string }>(
      'set',
      async (_, category: string, key: string, value: any) => {
        console.log(`[PersistenceHandler] Setting data in ${category}/${key}`);
        try {
          await persistenceService.set(category as any, key, value);
          return { success: true };
        } catch (error) {
          console.error('[PersistenceHandler] Failed to set data:', error);
          return { success: false, error: (error as Error).message };
        }
      }
    );

    // Delete data from a category
    this.handle<[string, string], { success: boolean; error?: string }>(
      'delete',
      async (_, category: string, key: string) => {
        console.log(`[PersistenceHandler] Deleting ${category}/${key}`);
        try {
          await persistenceService.delete(category as any, key);
          return { success: true };
        } catch (error) {
          console.error('[PersistenceHandler] Failed to delete data:', error);
          return { success: false, error: (error as Error).message };
        }
      }
    );

    // Clear entire category
    this.handle<[string], { success: boolean; error?: string }>(
      'clear',
      async (_, category: string) => {
        console.log(`[PersistenceHandler] Clearing category ${category}`);
        try {
          await persistenceService.clear(category as any);
          return { success: true };
        } catch (error) {
          console.error('[PersistenceHandler] Failed to clear category:', error);
          return { success: false, error: (error as Error).message };
        }
      }
    );

    // Get all data
    this.handle<[], any>(
      'getAll',
      async () => {
        console.log('[PersistenceHandler] Getting all data');
        try {
          const data = await persistenceService.getAll();
          return { success: true, data };
        } catch (error) {
          console.error('[PersistenceHandler] Failed to get all data:', error);
          return { success: false, error: (error as Error).message };
        }
      }
    );

    // Create backup
    this.handle<[], { success: boolean; backupPath?: string; error?: string }>(
      'backup',
      async () => {
        console.log('[PersistenceHandler] Creating backup');
        try {
          const backupPath = await persistenceService.createBackup();
          return { success: true, backupPath };
        } catch (error) {
          console.error('[PersistenceHandler] Failed to create backup:', error);
          return { success: false, error: (error as Error).message };
        }
      }
    );

    // Restore from backup
    this.handle<[string], { success: boolean; error?: string }>(
      'restore',
      async (_, backupPath: string) => {
        console.log('[PersistenceHandler] Restoring from backup:', backupPath);
        try {
          await persistenceService.restoreFromBackup(backupPath);
          return { success: true };
        } catch (error) {
          console.error('[PersistenceHandler] Failed to restore from backup:', error);
          return { success: false, error: (error as Error).message };
        }
      }
    );

    // Export database to file
    this.handle<[string], { success: boolean; error?: string }>(
      'export',
      async (_, exportPath: string) => {
        console.log('[PersistenceHandler] Exporting to:', exportPath);
        try {
          await persistenceService.export(exportPath);
          return { success: true };
        } catch (error) {
          console.error('[PersistenceHandler] Failed to export:', error);
          return { success: false, error: (error as Error).message };
        }
      }
    );

    // Import database from file
    this.handle<[string], { success: boolean; error?: string }>(
      'import',
      async (_, importPath: string) => {
        console.log('[PersistenceHandler] Importing from:', importPath);
        try {
          await persistenceService.import(importPath);
          return { success: true };
        } catch (error) {
          console.error('[PersistenceHandler] Failed to import:', error);
          return { success: false, error: (error as Error).message };
        }
      }
    );

    // Migrate localStorage data
    this.handle<[Record<string, any>], { success: boolean; error?: string }>(
      'migrate',
      async (_, data: Record<string, any>) => {
        console.log('[PersistenceHandler] Migrating localStorage data');
        try {
          await persistenceService.migrateFromLocalStorage(data);
          return { success: true };
        } catch (error) {
          console.error('[PersistenceHandler] Failed to migrate data:', error);
          return { success: false, error: (error as Error).message };
        }
      }
    );

    // Get database info
    this.handle<[], any>(
      'info',
      async () => {
        console.log('[PersistenceHandler] Getting database info');
        try {
          const dbPath = persistenceService.getDbPath();
          const backupDir = persistenceService.getBackupDir();
          const data = await persistenceService.getAll();

          return {
            success: true,
            info: {
              dbPath,
              backupDir,
              version: data.version,
              lastModified: data.lastModified,
              backups: data.backups?.length || 0,
              categories: Object.keys(data).filter(k => !['version', 'lastModified', 'backups'].includes(k))
            }
          };
        } catch (error) {
          console.error('[PersistenceHandler] Failed to get info:', error);
          return { success: false, error: (error as Error).message };
        }
      }
    );

    console.log('[PersistenceHandler] Registered all persistence handlers');
  }
}