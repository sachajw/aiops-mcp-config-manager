/**
 * usePersistence Hook
 * React hook for accessing the unified persistence layer
 */

import { useEffect, useState, useCallback } from 'react';

declare global {
  interface Window {
    electronAPI: any;
  }
}

interface PersistenceAPI {
  get: (category: string, key?: string) => Promise<any>;
  set: (category: string, key: string, value: any) => Promise<any>;
  delete: (category: string, key: string) => Promise<any>;
  clear: (category: string) => Promise<any>;
  getAll: () => Promise<any>;
  backup: () => Promise<any>;
  restore: (backupPath: string) => Promise<any>;
  export: (exportPath: string) => Promise<any>;
  import: (importPath: string) => Promise<any>;
  migrate: (data: Record<string, any>) => Promise<any>;
  info: () => Promise<any>;
}

export function usePersistence() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if persistence API is available
  useEffect(() => {
    if (window.electronAPI?.persistence) {
      setIsInitialized(true);
    } else {
      setError('Persistence API not available');
    }
  }, []);

  // Get data from persistence
  const get = useCallback(async (category: string, key?: string) => {
    if (!window.electronAPI?.persistence) {
      throw new Error('Persistence API not available');
    }

    try {
      const result = await window.electronAPI.persistence.get(category, key);
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to get data');
      }
    } catch (error) {
      console.error('[usePersistence] Failed to get data:', error);
      throw error;
    }
  }, []);

  // Set data in persistence
  const set = useCallback(async (category: string, key: string, value: any) => {
    if (!window.electronAPI?.persistence) {
      throw new Error('Persistence API not available');
    }

    try {
      const result = await window.electronAPI.persistence.set(category, key, value);
      if (!result.success) {
        throw new Error(result.error || 'Failed to set data');
      }
    } catch (error) {
      console.error('[usePersistence] Failed to set data:', error);
      throw error;
    }
  }, []);

  // Delete data from persistence
  const deleteData = useCallback(async (category: string, key: string) => {
    if (!window.electronAPI?.persistence) {
      throw new Error('Persistence API not available');
    }

    try {
      const result = await window.electronAPI.persistence.delete(category, key);
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete data');
      }
    } catch (error) {
      console.error('[usePersistence] Failed to delete data:', error);
      throw error;
    }
  }, []);

  // Clear entire category
  const clear = useCallback(async (category: string) => {
    if (!window.electronAPI?.persistence) {
      throw new Error('Persistence API not available');
    }

    try {
      const result = await window.electronAPI.persistence.clear(category);
      if (!result.success) {
        throw new Error(result.error || 'Failed to clear category');
      }
    } catch (error) {
      console.error('[usePersistence] Failed to clear category:', error);
      throw error;
    }
  }, []);

  // Migrate localStorage data to persistence
  const migrateFromLocalStorage = useCallback(async () => {
    if (!window.electronAPI?.persistence) {
      throw new Error('Persistence API not available');
    }

    try {
      console.log('[usePersistence] Starting localStorage migration');

      // Collect all localStorage data
      const localStorageData: Record<string, any> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key);
          if (value) {
            try {
              // Try to parse as JSON
              localStorageData[key] = JSON.parse(value);
            } catch {
              // If not JSON, store as string
              localStorageData[key] = value;
            }
          }
        }
      }

      console.log('[usePersistence] Found localStorage items:', Object.keys(localStorageData).length);

      // Migrate to persistence
      const result = await window.electronAPI.persistence.migrate(localStorageData);
      if (!result.success) {
        throw new Error(result.error || 'Failed to migrate data');
      }

      console.log('[usePersistence] Migration complete');

      // Clear localStorage after successful migration
      localStorage.clear();
      console.log('[usePersistence] localStorage cleared');

      return true;
    } catch (error) {
      console.error('[usePersistence] Migration failed:', error);
      throw error;
    }
  }, []);

  // Get database info
  const getInfo = useCallback(async () => {
    if (!window.electronAPI?.persistence) {
      throw new Error('Persistence API not available');
    }

    try {
      const result = await window.electronAPI.persistence.info();
      if (result.success) {
        return result.info;
      } else {
        throw new Error(result.error || 'Failed to get info');
      }
    } catch (error) {
      console.error('[usePersistence] Failed to get info:', error);
      throw error;
    }
  }, []);

  // Create backup
  const createBackup = useCallback(async () => {
    if (!window.electronAPI?.persistence) {
      throw new Error('Persistence API not available');
    }

    try {
      const result = await window.electronAPI.persistence.backup();
      if (result.success) {
        return result.backupPath;
      } else {
        throw new Error(result.error || 'Failed to create backup');
      }
    } catch (error) {
      console.error('[usePersistence] Failed to create backup:', error);
      throw error;
    }
  }, []);

  return {
    isInitialized,
    error,
    get,
    set,
    delete: deleteData,
    clear,
    migrateFromLocalStorage,
    getInfo,
    createBackup
  };
}

// Helper functions for common operations

export async function getPersistenceValue(category: string, key: string, defaultValue: any = null) {
  try {
    const result = await window.electronAPI?.persistence?.get(category, key);
    if (result?.success && result.data !== undefined) {
      return result.data;
    }
    return defaultValue;
  } catch (error) {
    console.error(`[getPersistenceValue] Failed to get ${category}/${key}:`, error);
    return defaultValue;
  }
}

export async function setPersistenceValue(category: string, key: string, value: any) {
  try {
    const result = await window.electronAPI?.persistence?.set(category, key, value);
    return result?.success || false;
  } catch (error) {
    console.error(`[setPersistenceValue] Failed to set ${category}/${key}:`, error);
    return false;
  }
}