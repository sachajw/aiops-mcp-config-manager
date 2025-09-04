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
      
      // Composite actions (these would integrate with Electron IPC in a real app)
      refreshClients: async () => {
        const { setClients, setClientsLoading } = get();
        setClientsLoading(true);
        
        try {
          // TODO: Call Electron IPC to discover clients
          // const clients = await window.electronAPI.discoverClients();
          // setClients(clients);
          
          // Mock data for now
          const mockClients: MCPClient[] = [
            {
              id: 'claude-desktop',
              name: 'Claude Desktop',
              type: 'claude-desktop' as any,
              configPaths: {
                primary: '/Users/user/Library/Application Support/Claude/claude_desktop_config.json',
                alternatives: [],
                scopePaths: {} as any
              },
              status: ClientStatus.ACTIVE,
              isActive: true,
              version: '1.0.0'
            },
            {
              id: 'claude-code',
              name: 'Claude Code',
              type: 'claude-code' as any,
              configPaths: {
                primary: '/Users/user/.claude/claude_code_config.json',
                alternatives: [],
                scopePaths: {} as any
              },
              status: ClientStatus.INACTIVE,
              isActive: false,
              version: '0.9.1'
            }
          ];
          setClients(mockClients);
          
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
          // TODO: Call Electron IPC to load configuration
          // const config = await window.electronAPI.loadConfiguration(clientId);
          // setConfiguration(clientId, config);
          
          // Mock data for now
          const mockConfig: ResolvedConfiguration = {
            servers: {
              'filesystem': {
                name: 'filesystem',
                command: '/usr/local/bin/mcp-server-filesystem',
                args: ['--path', '/Users/user/Documents'],
                env: {},
                enabled: true,
                scope: ConfigScope.USER
              },
              'git': {
                name: 'git',
                command: 'npx',
                args: ['@modelcontextprotocol/server-git'],
                env: {},
                enabled: true,
                scope: ConfigScope.PROJECT
              }
            },
            conflicts: [],
            sources: {
              'filesystem': ConfigScope.USER,
              'git': ConfigScope.PROJECT
            },
            metadata: {
              resolvedAt: new Date(),
              mergedScopes: [ConfigScope.USER, ConfigScope.PROJECT],
              serverCount: 2,
              conflictCount: 0
            }
          };
          setConfiguration(clientId, mockConfig);
          
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
          
          // TODO: Call Electron IPC to test server
          // const result = await window.electronAPI.testServer(server);
          // setServerTestResult(serverName, result);
          
          // Mock test result
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