import { create } from 'zustand';
import {
  McpServerCatalog,
  McpServerEntry,
  InstallationState,
  InstalledServer,
  ServerFilter
} from '@/shared/types/mcp-discovery';

interface DiscoveryState {
  // Catalog data
  catalog: McpServerCatalog | null;
  catalogLoading: boolean;
  catalogError: string | null;
  lastFetchTime: Date | null;

  // Installed servers
  installedServers: InstalledServer[];
  installedLoading: boolean;

  // Installation states
  installationStates: Map<string, InstallationState>;

  // UI state
  selectedServer: McpServerEntry | null;
  showServerDetails: boolean;
  filter: ServerFilter;

  // Actions
  fetchCatalog: (forceRefresh?: boolean) => Promise<void>;
  fetchInstalledServers: () => Promise<void>;
  installServer: (serverId: string) => Promise<void>;
  uninstallServer: (serverId: string) => Promise<void>;
  setSelectedServer: (server: McpServerEntry | null) => void;
  setShowServerDetails: (show: boolean) => void;
  setFilter: (filter: Partial<ServerFilter>) => void;
  getFilteredServers: () => McpServerEntry[];
  isServerInstalled: (serverId: string) => boolean;
  getInstallationState: (serverId: string) => InstallationState | undefined;
  clearError: () => void;
}

export const useDiscoveryStore = create<DiscoveryState>((set, get) => ({
  // Initial state
  catalog: null,
  catalogLoading: false,
  catalogError: null,
  lastFetchTime: null,
  installedServers: [],
  installedLoading: false,
  installationStates: new Map(),
  selectedServer: null,
  showServerDetails: false,
  filter: {
    searchText: '',
    categories: [],
    tags: [],
    showInstalled: false,
    sortBy: 'downloads',
    sortOrder: 'desc'
  },

  // Fetch catalog from backend
  fetchCatalog: async (forceRefresh = false) => {
    set({ catalogLoading: true, catalogError: null });

    try {
      // Get settings from localStorage
      let settings = null;
      const storedSettings = localStorage.getItem('mcpDiscoverySettings');
      if (storedSettings) {
        try {
          settings = JSON.parse(storedSettings);
          console.log('[Discovery Store] Using settings from localStorage:', settings);
        } catch (err) {
          console.error('[Discovery Store] Failed to parse settings:', err);
        }
      }

      const catalog = await window.electronAPI.discovery.fetchCatalog(forceRefresh, settings);
      set({
        catalog,
        catalogLoading: false,
        lastFetchTime: new Date()
      });

      // Also fetch installed servers
      await get().fetchInstalledServers();
    } catch (error) {
      set({
        catalogError: error.message || 'Failed to fetch catalog',
        catalogLoading: false
      });
    }
  },

  // Fetch installed servers
  fetchInstalledServers: async () => {
    set({ installedLoading: true });

    try {
      const installedServers = await window.electronAPI.discovery.getInstalledServers();
      set({
        installedServers,
        installedLoading: false
      });
    } catch (error) {
      console.error('Failed to fetch installed servers:', error);
      set({ installedLoading: false });
    }
  },

  // Install a server
  installServer: async (serverId: string) => {
    const state = get();
    const server = state.catalog?.servers.find(s => s.id === serverId);

    if (!server) {
      throw new Error('Server not found in catalog');
    }

    // Set initial installation state
    const installState: InstallationState = {
      serverId,
      status: 'pending',
      progress: 0,
      startedAt: new Date()
    };

    state.installationStates.set(serverId, installState);
    set({ installationStates: new Map(state.installationStates) });

    try {
      // Start installation
      await window.electronAPI.discovery.installServer(serverId);

      // Update installation state
      installState.status = 'completed';
      installState.progress = 100;
      installState.completedAt = new Date();
      state.installationStates.set(serverId, installState);
      set({ installationStates: new Map(state.installationStates) });

      // Refresh installed servers
      await get().fetchInstalledServers();
    } catch (error) {
      // Update installation state with error
      installState.status = 'failed';
      installState.progress = 0;
      installState.error = error.message;
      installState.completedAt = new Date();
      state.installationStates.set(serverId, installState);
      set({ installationStates: new Map(state.installationStates) });

      throw error;
    }
  },

  // Uninstall a server
  uninstallServer: async (serverId: string) => {
    try {
      await window.electronAPI.discovery.uninstallServer(serverId);

      // Refresh installed servers
      await get().fetchInstalledServers();

      // Clear installation state
      const state = get();
      state.installationStates.delete(serverId);
      set({ installationStates: new Map(state.installationStates) });
    } catch (error) {
      throw error;
    }
  },

  // Set selected server
  setSelectedServer: (server) => {
    set({ selectedServer: server });
  },

  // Show/hide server details
  setShowServerDetails: (show) => {
    set({ showServerDetails: show });
  },

  // Update filter
  setFilter: (filterUpdate) => {
    set((state) => ({
      filter: { ...state.filter, ...filterUpdate }
    }));
  },

  // Get filtered and sorted servers
  getFilteredServers: () => {
    const state = get();
    if (!state.catalog) return [];

    let servers = [...state.catalog.servers];

    // Apply search filter
    if (state.filter.searchText) {
      const searchLower = state.filter.searchText.toLowerCase();
      servers = servers.filter(s =>
        s.name?.toLowerCase().includes(searchLower) ||
        s.description?.toLowerCase().includes(searchLower) ||
        s.author?.toLowerCase().includes(searchLower) ||
        s.tags?.some(t => t?.toLowerCase().includes(searchLower))
      );
    }

    // Apply category filter
    if (state.filter.categories && state.filter.categories.length > 0) {
      servers = servers.filter(s =>
        s.category.some(c => state.filter.categories?.includes(c))
      );
    }

    // Apply tag filter
    if (state.filter.tags && state.filter.tags.length > 0) {
      servers = servers.filter(s =>
        s.tags?.some(t => state.filter.tags?.includes(t))
      );
    }

    // Apply installed filter
    if (state.filter.showInstalled) {
      const installedIds = state.installedServers.map(s => s.serverId);
      servers = servers.filter(s => installedIds.includes(s.id));
    }

    // Apply sorting
    const sortBy = state.filter.sortBy || 'downloads';
    const sortOrder = state.filter.sortOrder || 'desc';

    servers.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'downloads':
          comparison = a.stats.downloads - b.stats.downloads;
          break;
        case 'stars':
          comparison = a.stats.stars - b.stats.stars;
          break;
        case 'date':
          comparison = new Date(a.stats.lastUpdated).getTime() - new Date(b.stats.lastUpdated).getTime();
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return servers;
  },

  // Check if server is installed
  isServerInstalled: (serverId) => {
    const state = get();
    return state.installedServers.some(s => s.serverId === serverId);
  },

  // Get installation state for a server
  getInstallationState: (serverId) => {
    const state = get();
    return state.installationStates.get(serverId);
  },

  // Clear error
  clearError: () => {
    set({ catalogError: null });
  }
}));