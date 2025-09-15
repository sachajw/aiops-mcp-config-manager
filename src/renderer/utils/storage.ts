/**
 * Centralized localStorage management to ensure consistency
 */

const STORAGE_KEYS = {
  APP_SETTINGS: 'mcp-app-settings',
  DISCOVERY_SETTINGS: 'mcp-discovery-settings',
  SERVER_CATALOG: 'mcp-server-catalog',
  CONFIG_PROFILES: 'mcp-config-profiles',
  PROJECT_DIRECTORY: 'mcp-project-directory',
} as const;

export class StorageManager {
  static getAppSettings() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.APP_SETTINGS);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Failed to load app settings:', error);
      return null;
    }
  }

  static setAppSettings(settings: any) {
    try {
      localStorage.setItem(STORAGE_KEYS.APP_SETTINGS, JSON.stringify(settings));
      return true;
    } catch (error) {
      console.error('Failed to save app settings:', error);
      return false;
    }
  }

  static getDiscoverySettings() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.DISCOVERY_SETTINGS);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Failed to load discovery settings:', error);
      return null;
    }
  }

  static setDiscoverySettings(settings: any) {
    try {
      localStorage.setItem(STORAGE_KEYS.DISCOVERY_SETTINGS, JSON.stringify(settings));
      return true;
    } catch (error) {
      console.error('Failed to save discovery settings:', error);
      return false;
    }
  }

  static getServerCatalog() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SERVER_CATALOG);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Failed to load server catalog:', error);
      return null;
    }
  }

  static setServerCatalog(catalog: any) {
    try {
      localStorage.setItem(STORAGE_KEYS.SERVER_CATALOG, JSON.stringify(catalog));
      return true;
    } catch (error) {
      console.error('Failed to save server catalog:', error);
      return false;
    }
  }

  static getConfigProfiles() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CONFIG_PROFILES);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Failed to load config profiles:', error);
      return null;
    }
  }

  static setConfigProfiles(profiles: any) {
    try {
      localStorage.setItem(STORAGE_KEYS.CONFIG_PROFILES, JSON.stringify(profiles));
      return true;
    } catch (error) {
      console.error('Failed to save config profiles:', error);
      return false;
    }
  }

  static getProjectDirectory() {
    return localStorage.getItem(STORAGE_KEYS.PROJECT_DIRECTORY) || null;
  }

  static setProjectDirectory(directory: string) {
    try {
      localStorage.setItem(STORAGE_KEYS.PROJECT_DIRECTORY, directory);
      return true;
    } catch (error) {
      console.error('Failed to save project directory:', error);
      return false;
    }
  }

  static clearAll() {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }
}

export default StorageManager;