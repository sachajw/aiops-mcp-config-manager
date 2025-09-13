// Development mock for electronAPI when running in browser
export const getElectronAPI = () => {
  if (typeof window !== 'undefined' && window.electronAPI) {
    return window.electronAPI;
  }
  
  // Mock API for development in browser
  return {
    discoverClients: async () => {
      console.log('Mock: discoverClients called');
      return [
        {
          id: 'claude-desktop-mock',
          name: 'Claude Desktop (Mock)',
          type: 'claude-desktop',
          configPaths: {
            primary: '~/Library/Application Support/Claude/claude_desktop_config.json',
            alternatives: [],
            scopePaths: {}
          },
          status: 'active',
          isActive: true,
          version: '1.2.0'
        }
      ];
    },
    loadConfiguration: async (clientId: string, scope?: string) => {
      console.log('Mock: loadConfiguration called for', clientId, scope);
      return {
        mcpServers: {
          'filesystem': {
            name: 'filesystem',
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-filesystem', '~/Documents'],
            env: {},
            enabled: true,
            scope: 'USER'
          }
        },
        metadata: {
          version: '1.0.0',
          scope: 'USER',
          lastModified: new Date()
        }
      };
    },
    resolveConfiguration: async (clientId: string) => {
      console.log('Mock: resolveConfiguration called for', clientId);
      return {
        servers: {
          'filesystem': {
            name: 'filesystem',
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-filesystem', '~/Documents'],
            env: {},
            enabled: true,
            scope: 'USER'
          }
        },
        conflicts: [],
        sources: {
          'filesystem': 'USER'
        },
        metadata: {
          resolvedAt: new Date(),
          mergedScopes: ['USER'],
          serverCount: 1,
          conflictCount: 0
        }
      };
    },
    saveConfiguration: async (clientId: string, config: any, scope?: string) => {
      console.log('Mock: saveConfiguration called for', clientId, config, scope);
      return true;
    }
  };
};

// Type augmentation for window.electronAPI
declare global {
  interface Window {
    electronAPI?: {
      discoverClients: () => Promise<any[]>;
      loadConfiguration: (clientId: string, scope?: string) => Promise<any>;
      resolveConfiguration: (clientId: string) => Promise<any>;
      saveConfiguration: (clientId: string, config: any, scope?: string) => Promise<boolean>;
      validateConfiguration: (config: any) => Promise<any>;
      testServer: (serverConfig: any) => Promise<any>;
    };
  }
}