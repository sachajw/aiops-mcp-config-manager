import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';

export interface DialogState {
  serverConfig: {
    visible: boolean;
    mode: 'add' | 'edit';
    serverId?: string;
    clientId?: string;
  };
  scopeConflict: {
    visible: boolean;
    conflicts: any[];
  };
  scopeMigration: {
    visible: boolean;
    clientId?: string;
  };
  bulkOperations: {
    visible: boolean;
  };
  errorReport: {
    visible: boolean;
    error?: Error;
    errorInfo?: any;
  };
  settings: {
    visible: boolean;
    activeTab?: string;
  };
}

export interface PanelState {
  clientList: {
    collapsed: boolean;
    width: number;
    selectedClient?: string;
  };
  serverManagement: {
    collapsed: boolean;
    height: number;
    searchTerm: string;
    showDisabled: boolean;
    selectedServers: string[];
  };
  configurationEditor: {
    collapsed: boolean;
    activeMode: 'form' | 'json' | 'preview';
    hasUnsavedChanges: boolean;
    validation: {
      enabled: boolean;
      errors: any[];
      warnings: any[];
    };
  };
  scopeManagement: {
    collapsed: boolean;
    height: number;
  };
  synchronization: {
    collapsed: boolean;
    primaryClient?: string;
    autoSync: boolean;
  };
}

export interface NotificationState {
  notifications: Array<{
    id: string;
    type: 'success' | 'info' | 'warning' | 'error';
    title: string;
    message: string;
    timestamp: Date;
    persistent?: boolean;
    actions?: Array<{
      label: string;
      action: () => void;
    }>;
  }>;
  toast: {
    visible: boolean;
    type: 'success' | 'info' | 'warning' | 'error';
    message: string;
    duration: number;
  };
}

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  items: Array<{
    key: string;
    label: string;
    icon?: React.ReactNode;
    action: () => void;
    disabled?: boolean;
    divider?: boolean;
  }>;
}

export interface LoadingState {
  global: boolean;
  clients: boolean;
  configurations: boolean;
  serverTests: Record<string, boolean>;
  bulkOperations: boolean;
  sync: boolean;
  settings: boolean;
}

export interface UIState {
  // Layout state
  layout: {
    sidebarCollapsed: boolean;
    sidebarWidth: number;
    activeTab: string;
    fullscreen: boolean;
    theme: 'light' | 'dark';
  };
  
  // Dialog states
  dialogs: DialogState;
  
  // Panel states
  panels: PanelState;
  
  // Notification state
  notifications: NotificationState;
  
  // Context menu
  contextMenu: ContextMenuState;
  
  // Loading states
  loading: LoadingState;
  
  // Search and filter states
  search: {
    global: string;
    clients: string;
    servers: string;
    configurations: string;
  };
  
  // Selection states
  selection: {
    clients: string[];
    servers: string[];
    scopes: string[];
  };
  
  // Actions
  // Layout actions
  toggleSidebar: () => void;
  setSidebarWidth: (width: number) => void;
  setActiveTab: (tab: string) => void;
  toggleFullscreen: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  
  // Dialog actions
  openDialog: <K extends keyof DialogState>(
    dialog: K, 
    state: Partial<DialogState[K]>
  ) => void;
  closeDialog: (dialog: keyof DialogState) => void;
  closeAllDialogs: () => void;
  
  // Panel actions
  togglePanel: <K extends keyof PanelState>(panel: K) => void;
  setPanelState: <K extends keyof PanelState>(
    panel: K, 
    state: Partial<PanelState[K]>
  ) => void;
  
  // Notification actions
  showNotification: (notification: Omit<NotificationState['notifications'][0], 'id' | 'timestamp'>) => string;
  dismissNotification: (id: string) => void;
  clearNotifications: () => void;
  showToast: (type: NotificationState['toast']['type'], message: string, duration?: number) => void;
  hideToast: () => void;
  
  // Context menu actions
  showContextMenu: (x: number, y: number, items: ContextMenuState['items']) => void;
  hideContextMenu: () => void;
  
  // Loading actions
  setLoading: <K extends keyof LoadingState>(key: K, loading: boolean) => void;
  setServerTestLoading: (serverId: string, loading: boolean) => void;
  
  // Search actions
  setSearch: <K extends keyof UIState['search']>(key: K, value: string) => void;
  clearSearch: () => void;
  
  // Selection actions
  setSelection: <K extends keyof UIState['selection']>(key: K, selection: string[]) => void;
  toggleSelection: <K extends keyof UIState['selection']>(key: K, item: string) => void;
  clearSelection: () => void;
  
  // Utility actions
  resetUIState: () => void;
}

const initialDialogState: DialogState = {
  serverConfig: { visible: false, mode: 'add' },
  scopeConflict: { visible: false, conflicts: [] },
  scopeMigration: { visible: false },
  bulkOperations: { visible: false },
  errorReport: { visible: false },
  settings: { visible: false }
};

const initialPanelState: PanelState = {
  clientList: { collapsed: false, width: 250 },
  serverManagement: { 
    collapsed: false, 
    height: 400, 
    searchTerm: '', 
    showDisabled: true,
    selectedServers: []
  },
  configurationEditor: { 
    collapsed: false, 
    activeMode: 'form', 
    hasUnsavedChanges: false,
    validation: { enabled: true, errors: [], warnings: [] }
  },
  scopeManagement: { collapsed: false, height: 300 },
  synchronization: { collapsed: false, autoSync: false }
};

const initialNotificationState: NotificationState = {
  notifications: [],
  toast: { visible: false, type: 'info', message: '', duration: 3000 }
};

export const useUIStore = create<UIState>()(
  devtools(
    subscribeWithSelector(
      (set, get) => ({
        // Initial state
        layout: {
          sidebarCollapsed: false,
          sidebarWidth: 250,
          activeTab: 'servers',
          fullscreen: false,
          theme: 'light'
        },
        
        dialogs: initialDialogState,
        panels: initialPanelState,
        notifications: initialNotificationState,
        
        contextMenu: {
          visible: false,
          x: 0,
          y: 0,
          items: []
        },
        
        loading: {
          global: false,
          clients: false,
          configurations: false,
          serverTests: {},
          bulkOperations: false,
          sync: false,
          settings: false
        },
        
        search: {
          global: '',
          clients: '',
          servers: '',
          configurations: ''
        },
        
        selection: {
          clients: [],
          servers: [],
          scopes: []
        },
        
        // Layout actions
        toggleSidebar: () => 
          set((state) => ({
            layout: { 
              ...state.layout, 
              sidebarCollapsed: !state.layout.sidebarCollapsed 
            }
          })),
          
        setSidebarWidth: (width) =>
          set((state) => ({
            layout: { ...state.layout, sidebarWidth: width }
          })),
          
        setActiveTab: (tab) =>
          set((state) => ({
            layout: { ...state.layout, activeTab: tab }
          })),
          
        toggleFullscreen: () =>
          set((state) => ({
            layout: { 
              ...state.layout, 
              fullscreen: !state.layout.fullscreen 
            }
          })),
          
        setTheme: (theme) =>
          set((state) => ({
            layout: { ...state.layout, theme }
          })),
        
        // Dialog actions
        openDialog: (dialog, state) =>
          set((uiState) => ({
            dialogs: {
              ...uiState.dialogs,
              [dialog]: { ...uiState.dialogs[dialog], ...state, visible: true }
            }
          })),
          
        closeDialog: (dialog) =>
          set((state) => ({
            dialogs: {
              ...state.dialogs,
              [dialog]: { ...state.dialogs[dialog], visible: false }
            }
          })),
          
        closeAllDialogs: () =>
          set((state) => ({
            dialogs: Object.keys(state.dialogs).reduce(
              (acc, key) => ({
                ...acc,
                [key]: { ...state.dialogs[key as keyof DialogState], visible: false }
              }),
              {} as DialogState
            )
          })),
        
        // Panel actions
        togglePanel: (panel) =>
          set((state) => ({
            panels: {
              ...state.panels,
              [panel]: {
                ...state.panels[panel],
                collapsed: !state.panels[panel].collapsed
              }
            }
          })),
          
        setPanelState: (panel, panelState) =>
          set((state) => ({
            panels: {
              ...state.panels,
              [panel]: { ...state.panels[panel], ...panelState }
            }
          })),
        
        // Notification actions
        showNotification: (notification) => {
          const id = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const fullNotification = {
            ...notification,
            id,
            timestamp: new Date()
          };
          
          set((state) => ({
            notifications: {
              ...state.notifications,
              notifications: [fullNotification, ...state.notifications.notifications]
            }
          }));
          
          return id;
        },
        
        dismissNotification: (id) =>
          set((state) => ({
            notifications: {
              ...state.notifications,
              notifications: state.notifications.notifications.filter(n => n.id !== id)
            }
          })),
          
        clearNotifications: () =>
          set((state) => ({
            notifications: {
              ...state.notifications,
              notifications: []
            }
          })),
          
        showToast: (type, message, duration = 3000) =>
          set((state) => ({
            notifications: {
              ...state.notifications,
              toast: { visible: true, type, message, duration }
            }
          })),
          
        hideToast: () =>
          set((state) => ({
            notifications: {
              ...state.notifications,
              toast: { ...state.notifications.toast, visible: false }
            }
          })),
        
        // Context menu actions
        showContextMenu: (x, y, items) =>
          set({ contextMenu: { visible: true, x, y, items } }),
          
        hideContextMenu: () =>
          set((state) => ({ 
            contextMenu: { ...state.contextMenu, visible: false } 
          })),
        
        // Loading actions
        setLoading: (key, loading) =>
          set((state) => ({
            loading: { ...state.loading, [key]: loading }
          })),
          
        setServerTestLoading: (serverId, loading) =>
          set((state) => ({
            loading: {
              ...state.loading,
              serverTests: {
                ...state.loading.serverTests,
                [serverId]: loading
              }
            }
          })),
        
        // Search actions
        setSearch: (key, value) =>
          set((state) => ({
            search: { ...state.search, [key]: value }
          })),
          
        clearSearch: () =>
          set({ search: { global: '', clients: '', servers: '', configurations: '' } }),
        
        // Selection actions
        setSelection: (key, selection) =>
          set((state) => ({
            selection: { ...state.selection, [key]: selection }
          })),
          
        toggleSelection: (key, item) =>
          set((state) => {
            const currentSelection = state.selection[key];
            const newSelection = currentSelection.includes(item)
              ? currentSelection.filter(i => i !== item)
              : [...currentSelection, item];
            
            return {
              selection: { ...state.selection, [key]: newSelection }
            };
          }),
          
        clearSelection: () =>
          set({ selection: { clients: [], servers: [], scopes: [] } }),
        
        // Utility actions
        resetUIState: () =>
          set({
            dialogs: initialDialogState,
            panels: initialPanelState,
            notifications: initialNotificationState,
            contextMenu: { visible: false, x: 0, y: 0, items: [] },
            search: { global: '', clients: '', servers: '', configurations: '' },
            selection: { clients: [], servers: [], scopes: [] }
          })
      })
    ),
    {
      name: 'mcp-ui-store'
    }
  )
);