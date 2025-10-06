/**
 * PersistenceService
 * Unified persistence layer for all application data
 * Replaces localStorage with a file-based JSON database
 */

import * from 'fs-extra';
import * as path from 'path';
import { app } from 'electron';

interface DatabaseSchema {
  version: number;
  configs: Record<string, any>;      // Server configurations
  canvas: Record<string, any>;       // Visual workspace states
  metrics: Record<string, any>;      // Cached server metrics
  preferences: Record<string, any>;  // User settings
  clients: Record<string, any>;      // Detected clients
  discovery: Record<string, any>;    // Discovery settings and catalog
  profiles: Record<string, any>;     // Configuration profiles
  lastModified: number;
  backups: string[];                 // List of backup file paths
}

export class PersistenceService {
  private static instance: PersistenceService;
  private dbPath: string;
  private backupDir: string;
  private db: DatabaseSchema;
  private saveDebounceTimer: NodeJS.Timeout | null = null;
  private readonly SAVE_DEBOUNCE_MS = 1000;
  private readonly MAX_BACKUPS = 10;
  private readonly BACKUP_RETENTION_DAYS = 10;

  private constructor() {
    // Get app data path
    const appDataPath = app.getPath('userData');
    this.dbPath = path.join(appDataPath, 'database.json');
    this.backupDir = path.join(appDataPath, 'backups');

    // Initialize with empty database
    this.db = this.createEmptyDatabase();

    // Load database on startup
    this.loadDatabase();
  }

  public static getInstance(): PersistenceService {
    if (!PersistenceService.instance) {
      PersistenceService.instance = new PersistenceService();
    }
    return PersistenceService.instance;
  }

  private createEmptyDatabase(): DatabaseSchema {
    return {
      version: 2,
      configs: {},
      canvas: {},
      metrics: {},
      preferences: {},
      clients: {},
      discovery: {},
      profiles: {},
      lastModified: Date.now(),
      backups: []
    };
  }

  private async loadDatabase(): Promise<void> {
    try {
      console.log('[PersistenceService] Loading database from:', this.dbPath);

      if (await fs.pathExists(this.dbPath)) {
        const data = await fs.readFile(this.dbPath, 'utf-8');
        const parsed = JSON.parse(data);

        // Validate and migrate if needed
        this.db = this.migrateDatabase(parsed);
        console.log('[PersistenceService] Database loaded successfully');
      } else {
        console.log('[PersistenceService] No existing database, creating new one');
        await this.saveDatabase();
      }
    } catch (error) {
      console.error('[PersistenceService] Failed to load database:', error);
      // Create backup of corrupted database
      await this.backupCorruptedDatabase();
      // Start with fresh database
      this.db = this.createEmptyDatabase();
      await this.saveDatabase();
    }
  }

  private migrateDatabase(data: any): DatabaseSchema {
    // Handle version migrations
    if (!data.version || data.version < 2) {
      console.log('[PersistenceService] Migrating database from version', data.version || 1, 'to version 2');

      // Version 1 -> 2 migration
      const migrated = this.createEmptyDatabase();

      // Copy existing data
      if (data.configs) migrated.configs = data.configs;
      if (data.canvas) migrated.canvas = data.canvas;
      if (data.metrics) migrated.metrics = data.metrics;
      if (data.preferences) migrated.preferences = data.preferences;
      if (data.clients) migrated.clients = data.clients;
      if (data.discovery) migrated.discovery = data.discovery;
      if (data.profiles) migrated.profiles = data.profiles;

      return migrated;
    }

    return data as DatabaseSchema;
  }

  private async saveDatabase(): Promise<void> {
    // Clear any pending save timer
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
    }

    // Debounce saves to prevent excessive disk writes
    this.saveDebounceTimer = setTimeout(async () => {
      try {
        console.log('[PersistenceService] Saving database to disk');

        // Update last modified
        this.db.lastModified = Date.now();

        // Ensure directory exists
        await fs.ensureDir(path.dirname(this.dbPath));

        // Write atomically (write to temp file then rename)
        const tempPath = `${this.dbPath}.tmp`;
        await fs.writeFile(tempPath, JSON.stringify(this.db, null, 2));
        await fs.rename(tempPath, this.dbPath);

        console.log('[PersistenceService] Database saved successfully');
      } catch (error) {
        console.error('[PersistenceService] Failed to save database:', error);
        throw error;
      }
    }, this.SAVE_DEBOUNCE_MS);
  }

  private async backupDatabase(): Promise<string> {
    try {
      await fs.ensureDir(this.backupDir);

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(this.backupDir, `database-${timestamp}.json`);

      await fs.copy(this.dbPath, backupPath);
      console.log('[PersistenceService] Backup created at:', backupPath);

      // Add to backups list
      this.db.backups.push(backupPath);

      // Clean old backups
      await this.cleanOldBackups();

      return backupPath;
    } catch (error) {
      console.error('[PersistenceService] Failed to create backup:', error);
      throw error;
    }
  }

  private async backupCorruptedDatabase(): Promise<void> {
    try {
      if (await fs.pathExists(this.dbPath)) {
        const corruptedPath = `${this.dbPath}.corrupted.${Date.now()}`;
        await fs.move(this.dbPath, corruptedPath);
        console.log('[PersistenceService] Corrupted database backed up to:', corruptedPath);
      }
    } catch (error) {
      console.error('[PersistenceService] Failed to backup corrupted database:', error);
    }
  }

  private async cleanOldBackups(): Promise<void> {
    try {
      const files = await fs.readdir(this.backupDir);
      const backupFiles = files
        .filter(f => f.startsWith('database-') && f.endsWith('.json'))
        .map(f => ({
          name: f,
          path: path.join(this.backupDir, f),
          time: fs.statSync(path.join(this.backupDir, f)).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time); // Newest first

      // Remove backups older than retention period
      const cutoffTime = Date.now() - (this.BACKUP_RETENTION_DAYS * 24 * 60 * 60 * 1000);

      // Keep at least MAX_BACKUPS regardless of age
      let kept = 0;
      for (const backup of backupFiles) {
        kept++;
        if (kept > this.MAX_BACKUPS && backup.time < cutoffTime) {
          await fs.remove(backup.path);
          console.log('[PersistenceService] Removed old backup:', backup.name);
        }
      }

      // Update backups list
      this.db.backups = backupFiles.slice(0, this.MAX_BACKUPS).map(b => b.path);
    } catch (error) {
      console.error('[PersistenceService] Failed to clean old backups:', error);
    }
  }

  // Public API

  public async get(category: keyof DatabaseSchema, key?: string): Promise<any> {
    if (key) {
      return this.db[category]?.[key];
    }
    return this.db[category];
  }

  public async set(category: keyof DatabaseSchema, key: string, value: any): Promise<void> {
    if (!this.db[category]) {
      this.db[category] = {};
    }
    this.db[category][key] = value;
    await this.saveDatabase();
  }

  public async delete(category: keyof DatabaseSchema, key: string): Promise<void> {
    if (this.db[category]) {
      delete this.db[category][key];
      await this.saveDatabase();
    }
  }

  public async clear(category: keyof DatabaseSchema): Promise<void> {
    this.db[category] = {};
    await this.saveDatabase();
  }

  public async getAll(): Promise<DatabaseSchema> {
    return { ...this.db };
  }

  public async createBackup(): Promise<string> {
    return this.backupDatabase();
  }

  public async restoreFromBackup(backupPath: string): Promise<void> {
    try {
      console.log('[PersistenceService] Restoring from backup:', backupPath);

      if (await fs.pathExists(backupPath)) {
        // Backup current database first
        await this.backupDatabase();

        // Load backup
        const data = await fs.readFile(backupPath, 'utf-8');
        const parsed = JSON.parse(data);

        // Validate and restore
        this.db = this.migrateDatabase(parsed);
        await this.saveDatabase();

        console.log('[PersistenceService] Restored successfully from backup');
      } else {
        throw new Error(`Backup file not found: ${backupPath}`);
      }
    } catch (error) {
      console.error('[PersistenceService] Failed to restore from backup:', error);
      throw error;
    }
  }

  public async exportToFile(exportPath: string): Promise<void> {
    try {
      await fs.writeFile(exportPath, JSON.stringify(this.db, null, 2));
      console.log('[PersistenceService] Exported database to:', exportPath);
    } catch (error) {
      console.error('[PersistenceService] Failed to export database:', error);
      throw error;
    }
  }

  public async importFromFile(importPath: string): Promise<void> {
    try {
      // Backup current database first
      await this.backupDatabase();

      const data = await fs.readFile(importPath, 'utf-8');
      const parsed = JSON.parse(data);

      // Validate and import
      this.db = this.migrateDatabase(parsed);
      await this.saveDatabase();

      console.log('[PersistenceService] Imported database from:', importPath);
    } catch (error) {
      console.error('[PersistenceService] Failed to import database:', error);
      throw error;
    }
  }

  // Migration helpers for localStorage data

  public async migrateFromLocalStorage(data: Record<string, any>): Promise<void> {
    console.log('[PersistenceService] Migrating localStorage data');

    // Map localStorage keys to database categories
    const mapping: Record<string, [keyof DatabaseSchema, string]> = {
      'mcp-app-settings': ['preferences', 'app'],
      'mcp-client-paths': ['preferences', 'clientPaths'],
      'mcpDiscoverySettings': ['discovery', 'settings'],
      'mcp-server-catalog': ['discovery', 'catalog'],
      'mcp-config-profiles': ['profiles', 'all'],
      'mcp-project-directory': ['preferences', 'projectDirectory'],
      // Visual workspace data
      'visualWorkspace_claude-desktop_nodes': ['canvas', 'claude-desktop_nodes'],
      'visualWorkspace_claude-desktop_edges': ['canvas', 'claude-desktop_edges'],
      // Add more mappings as needed
    };

    for (const [localStorageKey, value] of Object.entries(data)) {
      if (mapping[localStorageKey]) {
        const [category, key] = mapping[localStorageKey];
        await this.set(category, key, value);
      } else if (localStorageKey.startsWith('visualWorkspace_')) {
        // Handle dynamic visual workspace keys
        await this.set('canvas', localStorageKey.replace('visualWorkspace_', ''), value);
      }
    }

    console.log('[PersistenceService] Migration complete');
  }

  public getDbPath(): string {
    return this.dbPath;
  }

  public getBackupDir(): string {
    return this.backupDir;
  }
}

// Export singleton instance getter
export const getPersistenceService = (): PersistenceService => {
  return PersistenceService.getInstance();
};