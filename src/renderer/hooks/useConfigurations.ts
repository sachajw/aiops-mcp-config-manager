/**
 * React hook for fetching and managing real configuration data
 * NO MOCK DATA - All data comes from backend services
 */

import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/apiService';
import { Configuration, ConfigScope } from '@/shared/types';

export interface UseConfigurationsResult {
  configurations: Configuration[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  getConfiguration: (clientId: string, scope?: ConfigScope) => Promise<Configuration>;
  saveConfiguration: (clientId: string, config: Partial<Configuration>, scope: ConfigScope) => Promise<void>;
  updateConfiguration: (clientId: string, updates: Partial<Configuration>, scope: ConfigScope) => Promise<void>;
  deleteConfiguration: (clientId: string, scope: ConfigScope) => Promise<void>;
  validateConfiguration: (config: Partial<Configuration>) => Promise<any>;
  importConfiguration: (path: string, clientId: string, scope: ConfigScope) => Promise<void>;
  exportConfiguration: (clientId: string, scope: ConfigScope, path: string) => Promise<void>;
  syncConfigurations: (source: any, target: any, strategy: string) => Promise<void>;
}

export function useConfigurations(clientId?: string): UseConfigurationsResult {
  const [configurations, setConfigurations] = useState<Configuration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchConfigurations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch real configurations from backend
      const result = await apiService.getAllConfigurations(clientId);

      if (result.success && result.configs) {
        setConfigurations(result.configs);
      } else {
        throw new Error(result.error || 'Failed to fetch configurations');
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      console.error('Failed to fetch configurations:', err);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  const getConfiguration = useCallback(async (clientId: string, scope?: ConfigScope) => {
    try {
      const result = await apiService.getConfiguration(clientId, scope);

      if (result.success && result.config) {
        return result.config;
      } else {
        throw new Error(result.error || 'Failed to fetch configuration');
      }
    } catch (err) {
      console.error(`Failed to fetch configuration for client ${clientId}:`, err);
      throw err;
    }
  }, []);

  const saveConfiguration = useCallback(async (
    clientId: string,
    config: Partial<Configuration>,
    scope: ConfigScope
  ) => {
    try {
      const result = await apiService.saveConfiguration(clientId, config, scope) as { success: boolean; error?: string };

      if (!result.success) {
        throw new Error(result.error || 'Failed to save configuration');
      }

      // Refetch to get updated state
      await fetchConfigurations();
    } catch (err) {
      console.error(`Failed to save configuration for client ${clientId}:`, err);
      throw err;
    }
  }, [fetchConfigurations]);

  const updateConfiguration = useCallback(async (
    clientId: string,
    updates: Partial<Configuration>,
    scope: ConfigScope
  ) => {
    try {
      const result = await apiService.updateConfiguration(clientId, updates, scope);

      if (!result.success) {
        throw new Error(result.error || 'Failed to update configuration');
      }

      // Refetch to get updated state
      await fetchConfigurations();
    } catch (err) {
      console.error(`Failed to update configuration for client ${clientId}:`, err);
      throw err;
    }
  }, [fetchConfigurations]);

  const deleteConfiguration = useCallback(async (clientId: string, scope: ConfigScope) => {
    try {
      const result = await apiService.deleteConfiguration(clientId, scope);

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete configuration');
      }

      // Refetch to get updated state
      await fetchConfigurations();
    } catch (err) {
      console.error(`Failed to delete configuration for client ${clientId}:`, err);
      throw err;
    }
  }, [fetchConfigurations]);

  const validateConfiguration = useCallback(async (config: Partial<Configuration>) => {
    try {
      const result = await apiService.validateConfiguration(config);

      if (result.success) {
        return result.validation;
      } else {
        throw new Error(result.error || 'Failed to validate configuration');
      }
    } catch (err) {
      console.error('Failed to validate configuration:', err);
      throw err;
    }
  }, []);

  const importConfiguration = useCallback(async (
    path: string,
    clientId: string,
    scope: ConfigScope
  ) => {
    try {
      const result = await apiService.importConfiguration(path, clientId, scope);

      if (!result.success) {
        throw new Error(result.error || 'Failed to import configuration');
      }

      // Refetch to get updated state
      await fetchConfigurations();
    } catch (err) {
      console.error('Failed to import configuration:', err);
      throw err;
    }
  }, [fetchConfigurations]);

  const exportConfiguration = useCallback(async (
    clientId: string,
    scope: ConfigScope,
    path: string
  ) => {
    try {
      const result = await apiService.exportConfiguration(clientId, scope, path);

      if (!result.success) {
        throw new Error(result.error || 'Failed to export configuration');
      }
    } catch (err) {
      console.error('Failed to export configuration:', err);
      throw err;
    }
  }, []);

  const syncConfigurations = useCallback(async (
    source: any,
    target: any,
    strategy: string
  ) => {
    try {
      const result = await apiService.syncConfiguration(source, target, strategy);

      if (!result.success) {
        throw new Error(result.error || 'Failed to sync configurations');
      }

      // Refetch to get updated state
      await fetchConfigurations();
    } catch (err) {
      console.error('Failed to sync configurations:', err);
      throw err;
    }
  }, [fetchConfigurations]);

  // Initial fetch
  useEffect(() => {
    fetchConfigurations();
  }, [fetchConfigurations]);

  // Subscribe to configuration events for real-time updates
  useEffect(() => {
    const unsubscribe = apiService.subscribeToConfigEvents((event) => {
      // Refetch configurations when config events occur
      fetchConfigurations();
    });

    return unsubscribe;
  }, [fetchConfigurations]);

  return {
    configurations,
    loading,
    error,
    refetch: fetchConfigurations,
    getConfiguration,
    saveConfiguration,
    updateConfiguration,
    deleteConfiguration,
    validateConfiguration,
    importConfiguration,
    exportConfiguration,
    syncConfigurations
  };
}

/**
 * Hook for a specific configuration
 */
export function useConfiguration(clientId: string, scope: ConfigScope) {
  const [configuration, setConfiguration] = useState<Configuration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchConfiguration = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await apiService.getConfiguration(clientId, scope);

      if (result.success && result.config) {
        setConfiguration(result.config);
      } else {
        throw new Error(result.error || 'Failed to fetch configuration');
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      console.error(`Failed to fetch configuration for ${clientId}/${scope}:`, err);
    } finally {
      setLoading(false);
    }
  }, [clientId, scope]);

  useEffect(() => {
    if (clientId && scope) {
      fetchConfiguration();
    }
  }, [clientId, scope, fetchConfiguration]);

  // Subscribe to configuration events for this specific config
  useEffect(() => {
    const unsubscribe = apiService.subscribeToConfigEvents((event) => {
      if (event.clientId === clientId && event.scope === scope) {
        fetchConfiguration();
      }
    });

    return unsubscribe;
  }, [clientId, scope, fetchConfiguration]);

  return {
    configuration,
    loading,
    error,
    refetch: fetchConfiguration
  };
}