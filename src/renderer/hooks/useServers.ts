/**
 * React hook for fetching and managing real server data
 * NO MOCK DATA - All data comes from backend services
 */

import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/apiService';
import { MCPServer } from '@/shared/types';

export interface UseServersResult {
  servers: MCPServer[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  connectServer: (serverId: string, clientId: string) => Promise<void>;
  disconnectServer: (serverId: string) => Promise<void>;
  addServer: (clientId: string, server: Partial<MCPServer>) => Promise<void>;
  updateServer: (serverId: string, updates: Partial<MCPServer>) => Promise<void>;
  removeServer: (serverId: string, clientId: string) => Promise<void>;
  getServerMetrics: (serverId: string) => Promise<any>;
  getServerStatus: (serverId: string) => Promise<any>;
}

export function useServers(clientId?: string): UseServersResult {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchServers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch real servers from backend
      const result = await apiService.listServers(clientId);

      if (result.success && result.servers) {
        setServers(result.servers);
      } else {
        throw new Error(result.error || 'Failed to fetch servers');
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      console.error('Failed to fetch servers:', err);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  const connectServer = useCallback(async (serverId: string, clientId: string) => {
    try {
      const result = await apiService.connectServer(serverId, clientId);

      if (!result.success) {
        throw new Error(result.error || 'Failed to connect server');
      }

      // Refetch to get updated state
      await fetchServers();
    } catch (err) {
      console.error(`Failed to connect server ${serverId}:`, err);
      throw err;
    }
  }, [fetchServers]);

  const disconnectServer = useCallback(async (serverId: string) => {
    try {
      const result = await apiService.disconnectServer(serverId);

      if (!result.success) {
        throw new Error(result.error || 'Failed to disconnect server');
      }

      // Refetch to get updated state
      await fetchServers();
    } catch (err) {
      console.error(`Failed to disconnect server ${serverId}:`, err);
      throw err;
    }
  }, [fetchServers]);

  const addServer = useCallback(async (clientId: string, server: Partial<MCPServer>) => {
    try {
      const result = await apiService.addServer(clientId, server);

      if (!result.success) {
        throw new Error(result.error || 'Failed to add server');
      }

      // Refetch to get updated state
      await fetchServers();
    } catch (err) {
      console.error('Failed to add server:', err);
      throw err;
    }
  }, [fetchServers]);

  const updateServer = useCallback(async (serverId: string, updates: Partial<MCPServer>) => {
    try {
      const result = await apiService.updateServer(serverId, updates);

      if (!result.success) {
        throw new Error(result.error || 'Failed to update server');
      }

      // Refetch to get updated state
      await fetchServers();
    } catch (err) {
      console.error(`Failed to update server ${serverId}:`, err);
      throw err;
    }
  }, [fetchServers]);

  const removeServer = useCallback(async (serverId: string, clientId: string) => {
    try {
      const result = await apiService.removeServer(serverId, clientId);

      if (!result.success) {
        throw new Error(result.error || 'Failed to remove server');
      }

      // Refetch to get updated state
      await fetchServers();
    } catch (err) {
      console.error(`Failed to remove server ${serverId}:`, err);
      throw err;
    }
  }, [fetchServers]);

  const getServerMetrics = useCallback(async (serverId: string) => {
    try {
      const result = await apiService.getServerMetrics(serverId);

      if (result.success) {
        return result.metrics;
      } else {
        throw new Error(result.error || 'Failed to fetch server metrics');
      }
    } catch (err) {
      console.error(`Failed to fetch metrics for server ${serverId}:`, err);
      throw err;
    }
  }, []);

  const getServerStatus = useCallback(async (serverId: string) => {
    try {
      const result = await apiService.getServerStatus(serverId);

      if (result.success) {
        return result.status;
      } else {
        throw new Error(result.error || 'Failed to fetch server status');
      }
    } catch (err) {
      console.error(`Failed to fetch status for server ${serverId}:`, err);
      throw err;
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  // Subscribe to server events for real-time updates
  useEffect(() => {
    const unsubscribe = apiService.subscribeToServerEvents((event) => {
      // Refetch servers when server events occur
      fetchServers();
    });

    return unsubscribe;
  }, [fetchServers]);

  return {
    servers,
    loading,
    error,
    refetch: fetchServers,
    connectServer,
    disconnectServer,
    addServer,
    updateServer,
    removeServer,
    getServerMetrics,
    getServerStatus
  };
}

/**
 * Hook for a specific server
 */
export function useServer(serverId: string) {
  const [server, setServer] = useState<MCPServer | null>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchServerDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch server status and metrics in parallel
      const [statusResult, metricsResult] = await Promise.all([
        apiService.getServerStatus(serverId),
        apiService.getServerMetrics(serverId)
      ]);

      if (statusResult.success) {
        setStatus(statusResult.status);
      }

      if (metricsResult.success) {
        setMetrics(metricsResult.metrics);
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

  // Subscribe to server events for this specific server
  useEffect(() => {
    const unsubscribe = apiService.subscribeToServerEvents((event) => {
      if (event.serverId === serverId) {
        fetchServerDetails();
      }
    });

    return unsubscribe;
  }, [serverId, fetchServerDetails]);

  return {
    server,
    metrics,
    status,
    loading,
    error,
    refetch: fetchServerDetails
  };
}