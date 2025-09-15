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

      // Add the installed server to the configuration catalog
      // Convert Discovery server format to config format
      let command = server.config?.command || '';
      let args = server.config?.args || [];

      // If no config.command, try to extract from installation command
      if (!command && server.installation?.command) {
        const installCmd = server.installation.command;

        // Handle different installation patterns
        if (installCmd.startsWith('npm install -g ')) {
          // For global npm packages, use npx to run them
          const packageName = installCmd.replace('npm install -g ', '');
          command = 'npx';
          args = [packageName, ...args];
        } else if (installCmd.startsWith('npx ')) {
          // For npx commands, keep as is
          const parts = installCmd.replace('npx ', '').split(' ');
          command = 'npx';
          args = [...parts, ...args];
        } else if (installCmd.startsWith('pip install ')) {
          // For Python packages
          const packageName = installCmd.replace('pip install ', '');
          command = 'python';
          args = ['-m', packageName, ...args];
        } else {
          // Default: use the installation command as is
          command = installCmd;
        }
      }

      const configServer = {
        command,
        args,
        env: server.config?.env || {},
        type: 'local' as const,
        description: server.description
      };

      // Get the catalog from localStorage and add this server
      try {
        const catalogStr = localStorage.getItem('mcp-server-catalog');
        const catalog = catalogStr ? JSON.parse(catalogStr) : {};

        // Use server name or id as the key
        const serverName = server.name || server.id;
        catalog[serverName] = configServer;

        // Save back to localStorage
        localStorage.setItem('mcp-server-catalog', JSON.stringify(catalog));
        console.log('[Discovery Store] Added server to catalog:', serverName, configServer);

        // Emit an event to notify the main app about the catalog update
        window.dispatchEvent(new CustomEvent('catalog-updated', {
          detail: { serverName, server: configServer }
        }));
      } catch (err) {
        console.error('Failed to add server to catalog:', err);
      }

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
      const state = get();
      const server = state.catalog?.servers.find(s => s.id === serverId);

      await window.electronAPI.discovery.uninstallServer(serverId);

      // Remove the server from the configuration catalog
      if (server) {
        try {
          const catalogStr = localStorage.getItem('mcp-server-catalog');
          const catalog = catalogStr ? JSON.parse(catalogStr) : {};

          const serverName = server.name || server.id;
          delete catalog[serverName];

          // Save back to localStorage
          localStorage.setItem('mcp-server-catalog', JSON.stringify(catalog));
          console.log('[Discovery Store] Removed server from catalog:', serverName);

          // Emit an event to notify the main app about the catalog update
          window.dispatchEvent(new CustomEvent('catalog-updated', {
            detail: { serverName, server: null, removed: true }
          }));
        } catch (err) {
          console.error('Failed to remove server from catalog:', err);
        }
      }

      // Refresh installed servers
      await get().fetchInstalledServers();

      // Clear installation state
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
      servers = servers.filter(s => {
        // Handle both category (array) and categories (array) properties
        const serverCategories = s.category || s.categories || [];
        // Check if server has at least one of the selected categories
        return Array.isArray(serverCategories) &&
               serverCategories.some(c => state.filter.categories?.includes(c));
      });
    }

    // Apply tag filter
    if (state.filter.tags && state.filter.tags.length > 0) {
      servers = servers.filter(s => {
        const serverTags = s.tags || [];
        return Array.isArray(serverTags) &&
               serverTags.some(t => state.filter.tags?.includes(t));
      });
    }

    // Apply installed filter
    if (state.filter.showInstalled) {
      const installedIds = state.installedServers.map(s => s.serverId);
      servers = servers.filter(s => installedIds.includes(s.id));
    }

    // Apply sorting with null safety
    const sortBy = state.filter.sortBy || 'downloads';
    const sortOrder = state.filter.sortOrder || 'desc';

    servers.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = (a.name || '').localeCompare(b.name || '');
          break;
        case 'downloads':
          comparison = (a.stats?.downloads || 0) - (b.stats?.downloads || 0);
          break;
        case 'stars':
          comparison = (a.stats?.stars || 0) - (b.stats?.stars || 0);
          break;
        case 'date':
          const aDate = a.stats?.lastUpdated ? new Date(a.stats.lastUpdated).getTime() : 0;
          const bDate = b.stats?.lastUpdated ? new Date(b.stats.lastUpdated).getTime() : 0;
          comparison = aDate - bDate;
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