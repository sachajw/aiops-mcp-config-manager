/**
 * Settings IPC Handler
 * Handles application settings persistence and retrieval
 */

import { BaseHandler } from './BaseHandler';
import * as fs from 'fs-extra';
import * as path from 'path';
import { app } from 'electron';

interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  autoSave: boolean;
  backupRetentionDays: number;
  maxBackups: number;
  enableTelemetry: boolean;
  defaultScope: string;
  showAdvancedOptions: boolean;
  animationsEnabled: boolean;
  fontSize: 'small' | 'medium' | 'large';
  language: string;
}

export class SettingsHandler extends BaseHandler {
  private settingsPath: string;

  constructor() {
    super('settings');
    // Store settings in user data directory
    this.settingsPath = path.join(app.getPath('userData'), 'app-settings.json');
  }

  /**
   * Register all settings-related IPC handlers
   */
  register(): void {
    // Load settings
    this.handle<[], AppSettings>(
      'load',
      async () => {
        console.log('[SettingsHandler] Loading settings from:', this.settingsPath);
        try {
          if (await fs.pathExists(this.settingsPath)) {
            const settings = await fs.readJson(this.settingsPath);
            console.log('[SettingsHandler] Settings loaded successfully');
            return settings;
          } else {
            console.log('[SettingsHandler] Settings file not found, returning null');
            return null;
          }
        } catch (error) {
          console.error('[SettingsHandler] Failed to load settings:', error);
          throw error;
        }
      }
    );

    // Save settings
    this.handle<[AppSettings], void>(
      'save',
      async (_, settings: AppSettings) => {
        console.log('[SettingsHandler] Saving settings to:', this.settingsPath);
        try {
          // Ensure directory exists
          await fs.ensureDir(path.dirname(this.settingsPath));

          // Write settings with pretty formatting
          await fs.writeJson(this.settingsPath, settings, { spaces: 2 });

          console.log('[SettingsHandler] Settings saved successfully');
        } catch (error) {
          console.error('[SettingsHandler] Failed to save settings:', error);
          throw error;
        }
      }
    );

    // Reset settings (delete settings file)
    this.handle<[], void>(
      'reset',
      async () => {
        console.log('[SettingsHandler] Resetting settings');
        try {
          if (await fs.pathExists(this.settingsPath)) {
            await fs.remove(this.settingsPath);
            console.log('[SettingsHandler] Settings file removed');
          }
        } catch (error) {
          console.error('[SettingsHandler] Failed to reset settings:', error);
          throw error;
        }
      }
    );

    // Get settings file path (for debugging)
    this.handle<[], string>(
      'getPath',
      async () => {
        return this.settingsPath;
      }
    );

    console.log('[SettingsHandler] Registered all settings handlers');
  }
}