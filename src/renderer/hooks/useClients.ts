/**
 * React hook for fetching and managing real client data
 * NO MOCK DATA - All data comes from backend services
 */

import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/apiService';
import { MCPClient } from '@/shared/types';

export interface UseClientsResult {
  clients: MCPClient[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  detectClients: () => Promise<void>;
  getClientConfig: (clientId: string) => Promise<any>;
  updateClientConfig: (clientId: string, config: any) => Promise<void>;
}

export function useClients(): UseClientsResult {
  const [clients, setClients] = useState<MCPClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch real clients from backend
      const result = await apiService.discoverClients();

      if (result.success && result.clients) {
        setClients(result.clients);
      } else {
        throw new Error(result.error || 'Failed to fetch clients');
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      console.error('Failed to fetch clients:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const detectClients = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Detect installed clients
      const result = await apiService.discoverClients();

      if (result.success && result.clients) {
        setClients(result.clients);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to detect clients'));
      console.error('Failed to detect clients:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const getClientConfig = useCallback(async (clientId: string) => {
    try {
      const result = await apiService.getClientConfig(clientId);

      if (result.success) {
        return result.config;
      } else {
        throw new Error(result.error || 'Failed to fetch client config');
      }
    } catch (err) {
      console.error(`Failed to fetch config for client ${clientId}:`, err);
      throw err;
    }
  }, []);

  const updateClientConfig = useCallback(async (clientId: string, config: any) => {
    try {
      const result = await apiService.setClientConfig(clientId, config);

      if (!result.success) {
        throw new Error(result.error || 'Failed to update client config');
      }

      // Refetch clients to get updated state
      await fetchClients();
    } catch (err) {
      console.error(`Failed to update config for client ${clientId}:`, err);
      throw err;
    }
  }, [fetchClients]);

  // Initial fetch
  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Subscribe to client events for real-time updates
  useEffect(() => {
    const unsubscribe = apiService.subscribeToClientEvents((event) => {
      // Refetch clients when client events occur
      fetchClients();
    });

    return unsubscribe;
  }, [fetchClients]);

  return {
    clients,
    loading,
    error,
    refetch: fetchClients,
    detectClients,
    getClientConfig,
    updateClientConfig
  };
}

/**
 * Hook for a specific client
 */
export function useClient(clientId: string) {
  const [client, setClient] = useState<MCPClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchClient = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await apiService.getClientInfo(clientId);

      if (result.success && result.client) {
        setClient(result.client);
      } else {
        throw new Error(result.error || 'Failed to fetch client');
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      console.error(`Failed to fetch client ${clientId}:`, err);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    if (clientId) {
      fetchClient();
    }
  }, [clientId, fetchClient]);

  return {
    client,
    loading,
    error,
    refetch: fetchClient
  };
}