import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { 
  MCPClient, 
  MCPServer,
  ResolvedConfiguration
} from '../../shared/types';
import { ConfigScope, ClientStatus, TestStatus } from '../../shared/types/enums';

// Define ServerTestResult interface locally since it's in main process
export interface ServerTestResult {
  status: TestStatus;
  success: boolean;
  message: string;
  duration: number;
  details: any;
}

export interface ApplicationState {
  // Client management
  clients: MCPClient[];
  selectedClient: string | null;
  selectedScope: ConfigScope | null;
  clientsLoading: boolean;
  
  // Configuration management
  configurations: Record<string, ResolvedConfiguration>;
  configurationsLoading: boolean;
  
  // Server testing
  serverTestResults: Record<string, ServerTestResult>;
  testingServers: Set<string>;
  
  // UI state
  sidebarCollapsed: boolean;
  activeTab: string;
  
  // Actions
  setClients: (clients: MCPClient[]) => void;
  setSelectedClient: (clientId: string | null) => void;
  setSelectedScope: (scope: ConfigScope | null) => void;
  setClientsLoading: (loading: boolean) => void;
  updateClientStatus: (clientId: string, status: ClientStatus) => void;
  
  setConfiguration: (clientId: string, config: ResolvedConfiguration) => void;
  setConfigurationsLoading: (loading: boolean) => void;
  
  setServerTestResult: (serverName: string, result: ServerTestResult) => void;
  setTestingServer: (serverName: string, testing: boolean) => void;
  clearServerTestResults: () => void;
  
  setSidebarCollapsed: (collapsed: boolean) => void;
  setActiveTab: (tab: string) => void;
  
  // Composite actions
  refreshClients: () => Promise<void>;
  refreshConfiguration: (clientId: string) => Promise<void>;
  testServer: (clientId: string, serverName: string) => Promise<void>;
}

export const useApplicationStore = create<ApplicationState>()(
  devtools(
    (set, get) => ({
      // Initial state
      clients: [],
      selectedClient: null,
      selectedScope: null,
      clientsLoading: false,
      
      configurations: {},
      configurationsLoading: false,
      
      serverTestResults: {},
      testingServers: new Set(),
      
      sidebarCollapsed: false,
      activeTab: 'servers',
      
      // Basic setters
      setClients: (clients) => set({ clients }),
      setSelectedClient: (selectedClient) => set({ selectedClient }),
      setSelectedScope: (selectedScope) => set({ selectedScope }),
      setClientsLoading: (clientsLoading) => set({ clientsLoading }),
      
      updateClientStatus: (clientId, status) => 
        set((state) => ({
          clients: state.clients.map(client =>
            client.id === clientId ? { ...client, status } : client
          )
        })),
      
      setConfiguration: (clientId, config) =>
        set((state) => ({
          configurations: { ...state.configurations, [clientId]: config }
        })),
        
      setConfigurationsLoading: (configurationsLoading) => set({ configurationsLoading }),
      
      setServerTestResult: (serverName, result) =>
        set((state) => ({
          serverTestResults: { ...state.serverTestResults, [serverName]: result }
        })),
        
      setTestingServer: (serverName, testing) =>
        set((state) => {
          const newTestingServers = new Set(state.testingServers);
          if (testing) {
            newTestingServers.add(serverName);
          } else {
            newTestingServers.delete(serverName);
          }
          return { testingServers: newTestingServers };
        }),
        
      clearServerTestResults: () => 
        set({ serverTestResults: {}, testingServers: new Set() }),
      
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      setActiveTab: (activeTab) => set({ activeTab }),
      
      // Composite actions (integrated with Electron IPC)
      refreshClients: async () => {
        const { setClients, setClientsLoading } = get();
        setClientsLoading(true);
        
        try {
          // Use Electron API if available, otherwise fall back to mock data
          if (window.electronAPI) {
            const clients = await window.electronAPI.discoverClients();
            setClients(clients);
          } else {
            // No mock data - return empty array for browser mode
            console.warn('Running in browser mode - no client data available');
            setClients([]);
          }
          
        } catch (error) {
          console.error('Failed to refresh clients:', error);
        } finally {
          setClientsLoading(false);
        }
      },
      
      refreshConfiguration: async (clientId) => {
        const { setConfiguration, setConfigurationsLoading } = get();
        setConfigurationsLoading(true);
        
        try {
          // Use Electron API if available, otherwise fall back to mock data
          if (window.electronAPI) {
            const config = await window.electronAPI.resolveConfiguration(clientId);
            setConfiguration(clientId, config);
          } else {
            // Fallback to mock data for development (browser mode)
            const mockConfig: ResolvedConfiguration = {
            servers: {
              'filesystem': {
                name: 'filesystem',
                command: 'npx',
                args: ['-y', '@modelcontextprotocol/server-filesystem', '/Users/user/Documents'],
                env: {},
                enabled: true,
                scope: ConfigScope.USER
              },
              'git': {
                name: 'git',
                command: 'npx',
                args: ['-y', '@modelcontextprotocol/server-git', '--repository', '/Users/user/workspace'],
                env: {},
                enabled: true,
                scope: ConfigScope.USER
              },
              'brave-search': {
                name: 'brave-search',
                command: 'npx',
                args: ['-y', '@modelcontextprotocol/server-brave-search'],
                env: {
                  BRAVE_API_KEY: 'your-api-key-here'
                },
                enabled: true,
                scope: ConfigScope.USER
              },
              'sqlite': {
                name: 'sqlite',
                command: 'npx',
                args: ['-y', '@modelcontextprotocol/server-sqlite', '--db-path', '/Users/user/databases/example.db'],
                env: {},
                enabled: true,
                scope: ConfigScope.USER
              },
              'postgres': {
                name: 'postgres',
                command: 'npx',
                args: ['-y', '@modelcontextprotocol/server-postgres'],
                env: {
                  POSTGRES_CONNECTION_STRING: 'postgresql://user:password@localhost:5432/database'
                },
                enabled: false,
                scope: ConfigScope.USER
              },
              'memory': {
                name: 'memory',
                command: 'npx',
                args: ['-y', '@modelcontextprotocol/server-memory'],
                env: {},
                enabled: true,
                scope: ConfigScope.PROJECT
              },
              'fetch': {
                name: 'fetch',
                command: 'npx',
                args: ['-y', '@modelcontextprotocol/server-fetch'],
                env: {},
                enabled: true,
                scope: ConfigScope.USER
              },
              'puppeteer': {
                name: 'puppeteer',
                command: 'npx',
                args: ['-y', '@modelcontextprotocol/server-puppeteer'],
                env: {},
                enabled: false,
                scope: ConfigScope.USER
              },
              'github': {
                name: 'github',
                command: 'npx',
                args: ['-y', '@modelcontextprotocol/server-github'],
                env: {
                  GITHUB_PERSONAL_ACCESS_TOKEN: 'your-github-token'
                },
                enabled: true,
                scope: ConfigScope.USER
              },
              'gmail': {
                name: 'gmail',
                command: 'npx',
                args: ['-y', '@modelcontextprotocol/server-gmail'],
                env: {},
                enabled: false,
                scope: ConfigScope.USER
              }
            },
            conflicts: [],
            sources: {
              'filesystem': ConfigScope.USER,
              'git': ConfigScope.USER,
              'brave-search': ConfigScope.USER,
              'sqlite': ConfigScope.USER,
              'postgres': ConfigScope.USER,
              'memory': ConfigScope.PROJECT,
              'fetch': ConfigScope.USER,
              'puppeteer': ConfigScope.USER,
              'github': ConfigScope.USER,
              'gmail': ConfigScope.USER
            },
            metadata: {
              resolvedAt: new Date(),
              mergedScopes: [ConfigScope.USER, ConfigScope.PROJECT],
              serverCount: 10,
              conflictCount: 0
            }
          };
          setConfiguration(clientId, mockConfig);
          }
          
        } catch (error) {
          console.error('Failed to refresh configuration:', error);
        } finally {
          setConfigurationsLoading(false);
        }
      },
      
      testServer: async (clientId, serverName) => {
        const { 
          setTestingServer, 
          setServerTestResult, 
          configurations 
        } = get();
        
        setTestingServer(serverName, true);
        
        try {
          const config = configurations[clientId];
          const server = config?.servers[serverName];
          
          if (!server) {
            throw new Error('Server not found');
          }
          
          // Use Electron API if available, otherwise fall back to mock data
          if (window.electronAPI?.testServer) {
            const result = await window.electronAPI.testServer(server);
            setServerTestResult(serverName, result);
            setTestingServer(serverName, false);
          } else {
            // Fallback to mock data for development (browser mode)
            setTimeout(() => {
              const mockResult: ServerTestResult = {
                status: 'success' as any,
                success: true,
                message: 'Server configuration is valid',
                duration: 1250,
                details: {
                  command: { passed: true, message: 'Command is executable', duration: 250 }
                }
              };
              setServerTestResult(serverName, mockResult);
              setTestingServer(serverName, false);
            }, 2000);
          }
          
        } catch (error) {
          console.error('Failed to test server:', error);
          setTestingServer(serverName, false);
        }
      }
    }),
    {
      name: 'mcp-config-manager-store'
    }
  )
);