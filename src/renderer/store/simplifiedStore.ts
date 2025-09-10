import { create } from 'zustand';
import { MCPServer } from '@/main/services/UnifiedConfigService';

interface DetectedClient {
  name: string;
  displayName: string;
  installed: boolean;
  configPath?: string;
  format: 'json' | 'json5' | 'toml';
}

type ConfigScope = 'user' | 'project' | 'system';

interface AppState {
  // State
  clients: DetectedClient[];
  activeClient: string | null;
  activeScope: ConfigScope;
  servers: Record<string, MCPServer>;
  isDirty: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  detectClients: () => Promise<void>;
  selectClient: (clientName: string) => Promise<void>;
  setScope: (scope: ConfigScope) => void;
  addServer: (name: string, server: MCPServer) => void;
  updateServer: (name: string, server: MCPServer) => void;
  deleteServer: (name: string) => void;
  saveConfig: () => Promise<void>;
  resetState: () => void;
}

const electronAPI = (window as any).electronAPI;

export const useConfigStore = create<AppState>((set, get) => ({
  // Initial state
  clients: [],
  activeClient: null,
  activeScope: 'user',
  servers: {},
  isDirty: false,
  isLoading: false,
  error: null,

  // Detect installed clients
  detectClients: async () => {
    set({ isLoading: true, error: null });
    try {
      const detected = await electronAPI.detectClients();
      set({ 
        clients: detected,
        isLoading: false,
        activeClient: detected.find(c => c.installed)?.name || null
      });
      
      // Auto-load first installed client
      const firstInstalled = detected.find(c => c.installed);
      if (firstInstalled) {
        await get().selectClient(firstInstalled.name);
      }
    } catch (error) {
      set({ 
        error: `Failed to detect clients: ${(error as Error).message}`,
        isLoading: false 
      });
    }
  },

  // Select and load a client's configuration
  selectClient: async (clientName: string) => {
    const { activeScope } = get();
    set({ isLoading: true, error: null, activeClient: clientName });
    
    try {
      const result = await electronAPI.readConfig(clientName, activeScope);
      
      if (result.success) {
        set({ 
          servers: result.data || {},
          isDirty: false,
          isLoading: false
        });
      } else {
        set({ 
          servers: {},
          error: result.error || 'Failed to read configuration',
          isLoading: false
        });
      }
    } catch (error) {
      set({ 
        servers: {},
        error: `Failed to load configuration: ${(error as Error).message}`,
        isLoading: false
      });
    }
  },

  // Change configuration scope
  setScope: (scope: ConfigScope) => {
    const { activeClient } = get();
    set({ activeScope: scope });
    
    // Reload config for new scope
    if (activeClient) {
      get().selectClient(activeClient);
    }
  },

  // Add new MCP server
  addServer: (name: string, server: MCPServer) => {
    const { servers } = get();
    
    // Check for duplicate
    if (servers[name]) {
      set({ error: `Server "${name}" already exists` });
      return;
    }
    
    set({ 
      servers: { ...servers, [name]: server },
      isDirty: true,
      error: null
    });
  },

  // Update existing MCP server
  updateServer: (name: string, server: MCPServer) => {
    const { servers } = get();
    
    set({ 
      servers: { ...servers, [name]: server },
      isDirty: true,
      error: null
    });
  },

  // Delete MCP server
  deleteServer: (name: string) => {
    const { servers } = get();
    const newServers = { ...servers };
    delete newServers[name];
    
    set({ 
      servers: newServers,
      isDirty: true,
      error: null
    });
  },

  // Save configuration back to file
  saveConfig: async () => {
    const { activeClient, activeScope, servers } = get();
    
    if (!activeClient) {
      set({ error: 'No client selected' });
      return;
    }
    
    set({ isLoading: true, error: null });
    
    try {
      // Create backup first
      await electronAPI.backupConfig(activeClient, activeScope);
      
      // Save configuration
      const result = await electronAPI.writeConfig(activeClient, activeScope, servers);
      
      if (result.success) {
        set({ 
          isDirty: false,
          isLoading: false,
          error: null
        });
      } else {
        set({ 
          error: result.error || 'Failed to save configuration',
          isLoading: false
        });
      }
    } catch (error) {
      set({ 
        error: `Failed to save configuration: ${(error as Error).message}`,
        isLoading: false
      });
    }
  },

  // Reset state
  resetState: () => {
    set({
      clients: [],
      activeClient: null,
      activeScope: 'user',
      servers: {},
      isDirty: false,
      isLoading: false,
      error: null
    });
  }
}));