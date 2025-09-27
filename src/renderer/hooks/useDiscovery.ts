/**
 * React hook for fetching and managing real discovery data
 * NO MOCK DATA - All data comes from backend services
 */

import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/apiService';
import { NewModels } from '@/shared/types';

type DiscoveredServer = NewModels.DiscoveredServer;
type ServerCategory = NewModels.ServerCategory;

export interface UseDiscoveryResult {
  servers: DiscoveredServer[];
  categories: ServerCategory[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  refreshCatalog: () => Promise<void>;
  searchServers: (query: string) => Promise<DiscoveredServer[]>;
  getServerDetails: (serverId: string) => Promise<any>;
  installServer: (serverId: string, clientId: string) => Promise<void>;
  uninstallServer: (serverId: string) => Promise<void>;
  getServersByCategory: (category: ServerCategory) => Promise<DiscoveredServer[]>;
  installedServerIds: string[];
}

export function useDiscovery(): UseDiscoveryResult {
  const [servers, setServers] = useState<DiscoveredServer[]>([]);
  const [categories, setCategories] = useState<ServerCategory[]>([]);
  const [installedServerIds, setInstalledServerIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCatalog = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch real catalog from backend
      const [catalogResult, categoriesResult] = await Promise.all([
        apiService.getCatalog(),
        apiService.getCategories()
      ]);

      if (catalogResult.success && catalogResult.catalog) {
        setServers(catalogResult.catalog.servers ?? []);
        setInstalledServerIds(catalogResult.catalog.installed ?? []);
      } else {
        throw new Error(catalogResult.error || 'Failed to fetch catalog');
      }

      if (categoriesResult.success && categoriesResult.categories) {
        setCategories(categoriesResult.categories);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      console.error('Failed to fetch discovery catalog:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshCatalog = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await apiService.refreshCatalog();

      if (result.success && result.catalog) {
        setServers(result.catalog.servers ?? []);
        setInstalledServerIds(result.catalog.installed ?? []);
      } else {
        throw new Error(result.error || 'Failed to refresh catalog');
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to refresh catalog'));
      console.error('Failed to refresh catalog:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const searchServers = useCallback(async (query: string): Promise<DiscoveredServer[]> => {
    try {
      const result = await apiService.searchDiscoveryServers(query);

      if (result.success && result.servers) {
        return result.servers;
      } else {
        throw new Error(result.error || 'Failed to search servers');
      }
    } catch (err) {
      console.error('Failed to search servers:', err);
      throw err;
    }
  }, []);

  const getServerDetails = useCallback(async (serverId: string) => {
    try {
      const result = await apiService.getServerDetails(serverId);

      if (result.success && result.details) {
        return result.details;
      } else {
        throw new Error(result.error || 'Failed to fetch server details');
      }
    } catch (err) {
      console.error(`Failed to fetch details for server ${serverId}:`, err);
      throw err;
    }
  }, []);

  const installServer = useCallback(async (serverId: string, clientId: string) => {
    try {
      const result = await apiService.installDiscoveryServer(serverId, clientId);

      if (!result.success) {
        throw new Error(result.error || 'Failed to install server');
      }

      // Update installed list
      setInstalledServerIds(prev => [...prev, serverId]);
    } catch (err) {
      console.error(`Failed to install server ${serverId}:`, err);
      throw err;
    }
  }, []);

  const uninstallServer = useCallback(async (serverId: string) => {
    try {
      const result = await apiService.uninstallDiscoveryServer(serverId);

      if (!result.success) {
        throw new Error(result.error || 'Failed to uninstall server');
      }

      // Update installed list
      setInstalledServerIds(prev => prev.filter(id => id !== serverId));
    } catch (err) {
      console.error(`Failed to uninstall server ${serverId}:`, err);
      throw err;
    }
  }, []);

  const getServersByCategory = useCallback(async (category: ServerCategory): Promise<DiscoveredServer[]> => {
    try {
      const result = await apiService.getServersByCategory(category);

      if (result.success && result.servers) {
        return result.servers;
      } else {
        throw new Error(result.error || 'Failed to fetch servers by category');
      }
    } catch (err) {
      console.error(`Failed to fetch servers for category ${category}:`, err);
      throw err;
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  return {
    servers,
    categories,
    installedServerIds,
    loading,
    error,
    refetch: fetchCatalog,
    refreshCatalog,
    searchServers,
    getServerDetails,
    installServer,
    uninstallServer,
    getServersByCategory
  };
}

/**
 * Hook for a specific discovered server
 */
export function useDiscoveredServer(serverId: string) {
  const [server, setServer] = useState<DiscoveredServer | null>(null);
  const [details, setDetails] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchServerDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await apiService.getServerDetails(serverId);

      if (result.success && result.server) {
        setServer(result.server);
        setDetails(result.details);
        setIsInstalled(result.isInstalled ?? false);
      } else {
        throw new Error(result.error || 'Failed to fetch server details');
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      console.error(`Failed to fetch server details for ${serverId}:`, err);
    } finally {
      setLoading(false);
    }
  }, [serverId]);

  useEffect(() => {
    if (serverId) {
      fetchServerDetails();
    }
  }, [serverId, fetchServerDetails]);

  return {
    server,
    details,
    isInstalled,
    loading,
    error,
    refetch: fetchServerDetails
  };
}

/**
 * Hook for server categories
 */
export function useServerCategories() {
  const [categories, setCategories] = useState<ServerCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await apiService.getCategories();

      if (result.success && result.categories) {
        setCategories(result.categories);
      } else {
        throw new Error(result.error || 'Failed to fetch categories');
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      console.error('Failed to fetch categories:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return {
    categories,
    loading,
    error,
    refetch: fetchCategories
  };
}