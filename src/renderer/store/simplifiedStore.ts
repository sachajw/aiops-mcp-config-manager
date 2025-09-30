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

interface ConfigProfile {
  name: string;
  servers: Record<string, MCPServer>;
  createdAt: Date;
  description?: string;
}

interface AppState {
  // State
  clients: DetectedClient[];
  activeClient: string | null;
  activeScope: ConfigScope;
  servers: Record<string, MCPServer>;
  currentConfigPath: string | null;
  isDirty: boolean;
  isLoading: boolean;
  error: string | null;
  catalog: Record<string, MCPServer>;
  projectDirectory: string | null;
  profiles: ConfigProfile[];
  activeProfile: string | null;
  
  // Actions
  detectClients: () => Promise<void>;
  selectClient: (clientName: string) => Promise<void>;
  setActiveClient: (clientName: string | null) => void;
  setServers: (servers: Record<string, MCPServer>) => void;
  setScope: (scope: ConfigScope) => void;
  addServer: (name: string, server: MCPServer) => void;
  updateServer: (name: string, server: MCPServer) => void;
  deleteServer: (name: string) => void;
  toggleServer: (name: string) => void;
  enableServer: (name: string, enabled: boolean) => void;
  saveConfig: () => Promise<{ success: boolean; backupPath?: string } | null>;
  resetState: () => void;
  loadCatalog: () => Promise<void>;
  saveCatalog: () => Promise<void>;
  addToCatalog: (name: string, server: MCPServer) => void;
  removeFromCatalog: (name: string) => void;
  setProjectDirectory: (directory: string) => void;
  selectProjectDirectory: () => Promise<void>;
  saveProfile: (name: string, description?: string) => void;
  loadProfile: (name: string) => void;
  deleteProfile: (name: string) => void;
  exportProfile: (name: string) => void;
  importProfile: (profileData: string) => void;
  setDirty: (dirty?: boolean) => void;
}

// Import the unified type
import '@/shared/types/electron';

const electronAPI = window.electronAPI;

// Load catalog from localStorage
const loadCatalogFromStorage = (): Record<string, MCPServer> => {
  try {
    const stored = localStorage.getItem('mcp-server-catalog');
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

// Save catalog to localStorage
const saveCatalogToStorage = (catalog: Record<string, MCPServer>) => {
  try {
    localStorage.setItem('mcp-server-catalog', JSON.stringify(catalog));
  } catch (error) {
    console.error('Failed to save catalog:', error);
  }
};

// Load profiles from localStorage
const loadProfilesFromStorage = (): ConfigProfile[] => {
  try {
    const stored = localStorage.getItem('mcp-config-profiles');
    if (stored) {
      const profiles = JSON.parse(stored);
      // Convert date strings back to Date objects
      return profiles.map((p: { name: string; servers: Record<string, MCPServer>; createdAt: string | Date; description?: string }) => ({
        ...p,
        createdAt: new Date(p.createdAt)
      }));
    }
    return [];
  } catch {
    return [];
  }
};

// Save profiles to localStorage
const saveProfilesToStorage = (profiles: ConfigProfile[]) => {
  try {
    localStorage.setItem('mcp-config-profiles', JSON.stringify(profiles));
  } catch (error) {
    console.error('Failed to save profiles:', error);
  }
};

export const useConfigStore = create<AppState>((set, get) => ({
  // Initial state
  clients: [],
  activeClient: null,
  activeScope: 'user',
  servers: {},
  currentConfigPath: null,
  isDirty: false,
  isLoading: false,
  error: null,
  catalog: loadCatalogFromStorage(),
  projectDirectory: localStorage.getItem('mcp-project-directory') || null,
  profiles: loadProfilesFromStorage(),
  activeProfile: null,

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
    const { activeScope, projectDirectory } = get();
    set({ isLoading: true, error: null, activeClient: clientName });

    console.log('[Store] selectClient called:', { clientName, activeScope, projectDirectory });

    // Handle special "catalog" selection
    if (clientName === 'catalog') {
      set({
        servers: {},
        currentConfigPath: null,
        isDirty: false,
        isLoading: false
      });
      return;
    }

    try {
      const result = await electronAPI.readConfig(
        clientName,
        activeScope,
        activeScope === 'project' ? (projectDirectory || undefined) : undefined
      );

      if (result.success) {
        set({
          servers: result.data || {},
          currentConfigPath: result.configPath || null,
          isDirty: false,
          isLoading: false
        });
      } else {
        set({
          servers: {},
          currentConfigPath: null,
          error: result.error || 'Failed to read configuration',
          isLoading: false
        });
      }
    } catch (error) {
      set({
        servers: {},
        currentConfigPath: null,
        error: `Failed to load configuration: ${(error as Error).message}`,
        isLoading: false
      });
    }
  },

  // Set active client without loading configuration
  setActiveClient: (clientName: string | null) => {
    set({ activeClient: clientName });
  },

  // Set servers directly (for JSON editor updates)
  setServers: (servers: Record<string, MCPServer>) => {
    set({ servers, isDirty: true });
  },

  // Change configuration scope
  setScope: (scope: ConfigScope) => {
    const { activeClient, projectDirectory } = get();
    set({ activeScope: scope });

    // Handle project scope special case
    if (scope === 'project' && !projectDirectory) {
      // Auto-detect current working directory as project directory
      console.log('[Store] Project scope selected but no directory set - attempting auto-detection');

      // Try to get current working directory from Electron main process
      electronAPI.getCurrentWorkingDirectory?.().then((cwd) => {
        if (cwd) {
          console.log(`[Store] Auto-detected project directory: ${cwd}`);
          set({ projectDirectory: cwd });
          localStorage.setItem('mcp-project-directory', cwd);

          // Now reload config for the detected project directory
          if (activeClient && activeClient !== 'catalog') {
            get().selectClient(activeClient);
          }
        } else {
          // Fallback: show empty state if auto-detection fails
          set({
            servers: {},
            currentConfigPath: null,
            error: 'No project directory detected. Please select a project directory.',
            isLoading: false
          });
          console.log('[Store] Auto-detection failed - showing empty state');
        }
      }).catch(() => {
        // Fallback: show empty state if auto-detection fails
        set({
          servers: {},
          currentConfigPath: null,
          error: 'No project directory detected. Please select a project directory.',
          isLoading: false
        });
        console.log('[Store] Auto-detection failed - showing empty state');
      });
      return;
    }

    // Reload config for new scope
    if (activeClient && activeClient !== 'catalog') {
      get().selectClient(activeClient);
    }
  },

  // Add new MCP server
  addServer: (name: string, server: MCPServer) => {
    const { servers, catalog } = get();

    // Check for exact duplicate
    if (servers[name]) {
      set({ error: `Server "${name}" already exists. Please use a different name.` });
      return;
    }

    // Check for similar names (case-insensitive)
    const similarName = Object.keys(servers).find(
      key => key.toLowerCase() === name.toLowerCase()
    );
    if (similarName) {
      set({ error: `A server with a similar name "${similarName}" already exists. Please use a more distinct name.` });
      return;
    }

    // Check if command/URL already exists (for duplicate functionality)
    const duplicateServer = Object.entries(servers).find(([_, srv]) => {
      if (server.type === 'local' && srv.type === 'local') {
        return srv.command === server.command;
      } else if (server.type === 'remote' && srv.type === 'remote') {
        return srv.url === server.url;
      }
      return false;
    });

    if (duplicateServer) {
      const [dupName] = duplicateServer;
      set({ error: `A server "${dupName}" with the same ${server.type === 'local' ? 'command' : 'URL'} already exists.` });
      return;
    }

    // Add to current client's servers
    const newServers = { ...servers, [name]: server };
    
    // Also add to catalog if not already there
    const newCatalog = { ...catalog };
    if (!newCatalog[name]) {
      newCatalog[name] = server;
      saveCatalogToStorage(newCatalog);
    }
    
    set({ 
      servers: newServers,
      catalog: newCatalog,
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

  // Toggle server enabled status
  toggleServer: (name: string) => {
    const { servers } = get();

    if (!servers[name]) {
      set({ error: `Server "${name}" not found` });
      return;
    }

    const updatedServer = {
      ...servers[name],
      enabled: !servers[name].enabled
    };

    set({
      servers: { ...servers, [name]: updatedServer },
      isDirty: true,
      error: null
    });

    console.log(`Server ${name} toggled to ${updatedServer.enabled ? 'enabled' : 'disabled'}`);
  },

  // Enable or disable a server
  enableServer: (name: string, enabled: boolean) => {
    const { servers } = get();

    if (!servers[name]) {
      set({ error: `Server "${name}" not found` });
      return;
    }

    const updatedServer = {
      ...servers[name],
      enabled
    };

    set({
      servers: { ...servers, [name]: updatedServer },
      isDirty: true,
      error: null
    });

    console.log(`Server ${name} ${enabled ? 'enabled' : 'disabled'}`);
  },

  // Save configuration back to file
  saveConfig: async () => {
    const { activeClient, activeScope, servers, projectDirectory } = get();

    console.log('═══════════════════════════════════════════════════════');
    console.log('[Store] 💾 SAVE CONFIG STARTED');
    console.log('═══════════════════════════════════════════════════════');
    console.log('[Store] Active client:', activeClient);
    console.log('[Store] Active scope:', activeScope);
    console.log('[Store] Project directory:', projectDirectory);
    console.log('[Store] Number of servers to save:', Object.keys(servers).length);
    console.log('[Store] Server names:', Object.keys(servers));
    console.log('[Store] Full servers object:', JSON.stringify(servers, null, 2));

    if (!activeClient) {
      console.error('[Store] ❌ No client selected, aborting save');
      set({ error: 'No client selected' });
      return null;
    }

    set({ isLoading: true, error: null });

    try {
      // Create backup first
      console.log('[Store] 📋 Creating backup...');
      const backupResult = await electronAPI.backupConfig(
        activeClient,
        activeScope,
        activeScope === 'project' ? (projectDirectory || undefined) : undefined
      );
      console.log('[Store] Backup result:', backupResult);

      // Save configuration
      console.log('[Store] 📤 Calling electronAPI.writeConfig with:');
      console.log('  - client:', activeClient);
      console.log('  - scope:', activeScope);
      console.log('  - servers count:', Object.keys(servers).length);
      console.log('  - servers:', JSON.stringify(servers, null, 2));
      console.log('  - projectDir:', activeScope === 'project' ? projectDirectory : 'N/A');

      const result = await electronAPI.writeConfig(
        activeClient,
        activeScope,
        servers as any,
        activeScope === 'project' ? (projectDirectory || undefined) : undefined
      );

      console.log('[Store] 📥 writeConfig returned:', JSON.stringify(result, null, 2));

      if (result.success) {
        console.log('[Store] ✅ Save successful, clearing isDirty flag');
        set({
          isDirty: false,
          isLoading: false,
          error: null
        });
        console.log('═══════════════════════════════════════════════════════');
        console.log('[Store] 🏁 SAVE CONFIG COMPLETED SUCCESSFULLY');
        console.log('═══════════════════════════════════════════════════════');
        return backupResult; // Return backup result for UI to use
      } else {
        console.error('[Store] ❌ Save failed:', result.error);
        set({
          error: result.error || 'Failed to save configuration',
          isLoading: false
        });
        return null;
      }
    } catch (error) {
      console.error('[Store] ❌ Exception during save:', error);
      set({
        error: `Failed to save configuration: ${(error as Error).message}`,
        isLoading: false
      });
      return null;
    }
  },

  // Reset state
  resetState: () => {
    set({
      clients: [],
      activeClient: null,
      activeScope: 'user',
      servers: {},
      currentConfigPath: null,
      isDirty: false,
      isLoading: false,
      error: null
    });
  },

  // Load catalog from storage
  loadCatalog: async () => {
    const catalog = loadCatalogFromStorage();
    set({ catalog });
    
    // Also scan all clients to discover new servers
    const { clients } = get();
    const allServers: Record<string, MCPServer> = { ...catalog };
    
    for (const client of clients.filter(c => c.installed)) {
      try {
        const result = await electronAPI.readConfig(client.name, 'user', undefined);
        if (result.success && result.data) {
          Object.entries(result.data).forEach(([name, server]) => {
            if (!allServers[name]) {
              allServers[name] = server as MCPServer;
            }
          });
        }
      } catch (error) {
        console.error(`Failed to read config for ${client.name}:`, error);
      }
    }
    
    set({ catalog: allServers });
    saveCatalogToStorage(allServers);
  },

  // Save catalog to storage
  saveCatalog: async () => {
    const { catalog } = get();
    saveCatalogToStorage(catalog);
  },

  // Add server to catalog
  addToCatalog: (name: string, server: MCPServer) => {
    const { catalog } = get();
    const newCatalog = { ...catalog, [name]: server };
    set({ catalog: newCatalog });
    saveCatalogToStorage(newCatalog);
  },

  // Remove server from catalog
  removeFromCatalog: (name: string) => {
    const { catalog } = get();
    const newCatalog = { ...catalog };
    delete newCatalog[name];
    set({ catalog: newCatalog });
    saveCatalogToStorage(newCatalog);
  },

  // Set project directory
  setProjectDirectory: (directory: string) => {
    set({ projectDirectory: directory });
    localStorage.setItem('mcp-project-directory', directory);
    
    // Reload config for current client if in project scope
    const { activeScope, activeClient } = get();
    if (activeScope === 'project' && activeClient && activeClient !== 'catalog') {
      get().selectClient(activeClient);
    }
  },

  // Select project directory via dialog
  selectProjectDirectory: async () => {
    try {
      const result = await electronAPI.selectDirectory();
      if (result.success && result.path) {
        get().setProjectDirectory(result.path);
        set({ error: null });
      }
    } catch (error) {
      set({ error: `Failed to select directory: ${(error as Error).message}` });
    }
  },

  // Save current configuration as a profile
  saveProfile: (name: string, description?: string) => {
    const { servers, profiles } = get();
    
    // Check if profile name already exists
    const existingIndex = profiles.findIndex(p => p.name === name);
    
    const newProfile: ConfigProfile = {
      name,
      servers: { ...servers },
      createdAt: new Date(),
      description
    };
    
    let newProfiles: ConfigProfile[];
    if (existingIndex >= 0) {
      // Update existing profile
      newProfiles = [...profiles];
      newProfiles[existingIndex] = newProfile;
    } else {
      // Add new profile
      newProfiles = [...profiles, newProfile];
    }
    
    set({ 
      profiles: newProfiles,
      activeProfile: name,
      error: null
    });
    saveProfilesToStorage(newProfiles);
  },

  // Load a saved profile
  loadProfile: (name: string) => {
    const { profiles } = get();
    const profile = profiles.find(p => p.name === name);
    
    if (profile) {
      set({ 
        servers: { ...profile.servers },
        activeProfile: name,
        isDirty: true,
        error: null
      });
    } else {
      set({ error: `Profile "${name}" not found` });
    }
  },

  // Delete a profile
  deleteProfile: (name: string) => {
    const { profiles, activeProfile } = get();
    const newProfiles = profiles.filter(p => p.name !== name);
    
    set({ 
      profiles: newProfiles,
      activeProfile: activeProfile === name ? null : activeProfile,
      error: null
    });
    saveProfilesToStorage(newProfiles);
  },

  // Export profile to JSON
  exportProfile: (name: string) => {
    const { profiles } = get();
    const profile = profiles.find(p => p.name === name);
    
    if (profile) {
      const dataStr = JSON.stringify(profile, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `mcp-profile-${name}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      set({ error: null });
    } else {
      set({ error: `Profile "${name}" not found` });
    }
  },

  // Import profile from JSON
  importProfile: (profileData: string) => {
    try {
      const profile = JSON.parse(profileData);
      
      // Validate profile structure
      if (!profile.name || !profile.servers) {
        set({ error: 'Invalid profile format' });
        return;
      }
      
      // Convert date string to Date object
      profile.createdAt = new Date(profile.createdAt || Date.now());
      
      const { profiles } = get();
      
      // Check for duplicate name
      let finalName = profile.name;
      let counter = 1;
      while (profiles.some(p => p.name === finalName)) {
        finalName = `${profile.name} (${counter++})`;
      }
      profile.name = finalName;
      
      const newProfiles = [...profiles, profile];
      set({ 
        profiles: newProfiles,
        error: null
      });
      saveProfilesToStorage(newProfiles);
    } catch (error) {
      set({ error: `Failed to import profile: ${(error as Error).message}` });
    }
  },

  // Mark configuration as dirty (needs saving)
  setDirty: (dirty: boolean = true) => {
    console.log(`[Store] Setting isDirty to ${dirty}`);
    set({ isDirty: dirty });
  }
}));