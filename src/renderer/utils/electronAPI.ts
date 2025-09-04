// Development mock for electronAPI when running in browser
export const getElectronAPI = () => {
  if (typeof window !== 'undefined' && window.electronAPI) {
    return window.electronAPI;
  }
  
  // Mock API for development in browser
  return {
    discoverClients: async () => {
      console.log('Mock: discoverClients called');
      return [];
    },
    loadConfiguration: async (clientId: string) => {
      console.log('Mock: loadConfiguration called for', clientId);
      return null;
    },
    saveConfiguration: async (clientId: string, config: any) => {
      console.log('Mock: saveConfiguration called for', clientId, config);
      return true;
    }
  };
};

// Type augmentation for window.electronAPI
declare global {
  interface Window {
    electronAPI?: {
      discoverClients: () => Promise<any[]>;
      loadConfiguration: (clientId: string) => Promise<any>;
      saveConfiguration: (clientId: string, config: any) => Promise<boolean>;
    };
  }
}