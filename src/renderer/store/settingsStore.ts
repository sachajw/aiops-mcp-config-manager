import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { ConfigScope } from '../../shared/types/enums';

export interface Theme {
  mode: 'light' | 'dark' | 'auto';
  primaryColor: string;
  compact: boolean;
}

export interface BackupSettings {
  enabled: boolean;
  maxBackups: number;
  retentionDays: number;
  compressionEnabled: boolean;
  location: string;
  autoCleanup: boolean;
}

export interface ValidationSettings {
  realTimeValidation: boolean;
  strictMode: boolean;
  showWarnings: boolean;
  autoFixEnabled: boolean;
  validationLevel: 'basic' | 'strict' | 'paranoid';
}

export interface SyncSettings {
  autoSync: boolean;
  syncInterval: number; // minutes
  conflictResolution: 'ask' | 'prefer-higher-scope' | 'prefer-newer';
  backgroundSync: boolean;
  syncOnStartup: boolean;
}

export interface NotificationSettings {
  enabled: boolean;
  showSuccess: boolean;
  showWarnings: boolean;
  showErrors: boolean;
  autoClose: boolean;
  autoCloseDelay: number; // seconds
  position: 'topRight' | 'topLeft' | 'bottomRight' | 'bottomLeft';
}

export interface EditorSettings {
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
  showLineNumbers: boolean;
  highlightActiveLine: boolean;
  autoCloseBrackets: boolean;
  defaultViewMode: 'form' | 'json' | 'preview';
  jsonFormatterStyle: 'compact' | 'standard' | 'expanded';
}

export interface WindowSettings {
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  maximized: boolean;
  sidebarWidth: number;
  panelHeights: Record<string, number>;
  remembrLastTab: boolean;
  lastActiveTab: string;
}

export interface ApplicationSettings {
  theme: Theme;
  backup: BackupSettings;
  validation: ValidationSettings;
  sync: SyncSettings;
  notifications: NotificationSettings;
  editor: EditorSettings;
  window: WindowSettings;
  
  // User preferences
  defaultScope: ConfigScope;
  showWelcomeDialog: boolean;
  checkForUpdates: boolean;
  telemetryEnabled: boolean;
  autoSaveInterval: number; // minutes
  
  // Advanced settings
  debug: {
    enabled: boolean;
    logLevel: 'error' | 'warn' | 'info' | 'debug';
    showPerformanceMetrics: boolean;
  };
}

export interface SettingsState {
  settings: ApplicationSettings;
  isLoading: boolean;
  isDirty: boolean;
  lastSaved: Date | null;
  
  // Actions
  updateSettings: <K extends keyof ApplicationSettings>(
    category: K, 
    updates: Partial<ApplicationSettings[K]>
  ) => void;
  resetSettings: (category?: keyof ApplicationSettings) => void;
  saveSettings: () => Promise<void>;
  loadSettings: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  
  // Convenience getters
  getTheme: () => Theme;
  getBackupSettings: () => BackupSettings;
  getValidationSettings: () => ValidationSettings;
  getSyncSettings: () => SyncSettings;
  getNotificationSettings: () => NotificationSettings;
  getEditorSettings: () => EditorSettings;
  getWindowSettings: () => WindowSettings;
}

const DEFAULT_SETTINGS: ApplicationSettings = {
  theme: {
    mode: 'auto',
    primaryColor: '#1890ff',
    compact: false
  },
  backup: {
    enabled: true,
    maxBackups: 10,
    retentionDays: 30,
    compressionEnabled: true,
    location: '~/.mcp-config-manager/backups',
    autoCleanup: true
  },
  validation: {
    realTimeValidation: true,
    strictMode: false,
    showWarnings: true,
    autoFixEnabled: true,
    validationLevel: 'strict'
  },
  sync: {
    autoSync: false,
    syncInterval: 5,
    conflictResolution: 'ask',
    backgroundSync: false,
    syncOnStartup: false
  },
  notifications: {
    enabled: true,
    showSuccess: true,
    showWarnings: true,
    showErrors: true,
    autoClose: true,
    autoCloseDelay: 5,
    position: 'topRight'
  },
  editor: {
    fontSize: 14,
    tabSize: 2,
    wordWrap: true,
    showLineNumbers: true,
    highlightActiveLine: true,
    autoCloseBrackets: true,
    defaultViewMode: 'form',
    jsonFormatterStyle: 'standard'
  },
  window: {
    bounds: {
      x: 100,
      y: 100,
      width: 1200,
      height: 800
    },
    maximized: false,
    sidebarWidth: 250,
    panelHeights: {},
    remembrLastTab: true,
    lastActiveTab: 'servers'
  },
  defaultScope: ConfigScope.USER,
  showWelcomeDialog: true,
  checkForUpdates: true,
  telemetryEnabled: false,
  autoSaveInterval: 1,
  debug: {
    enabled: false,
    logLevel: 'info',
    showPerformanceMetrics: false
  }
};

export const useSettingsStore = create<SettingsState>()(
  devtools(
    persist(
      (set, get) => ({
        settings: DEFAULT_SETTINGS,
        isLoading: false,
        isDirty: false,
        lastSaved: null,
        
        updateSettings: <K extends keyof ApplicationSettings>(
          category: K, 
          updates: Partial<ApplicationSettings[K]>
        ) => {
          set((state) => ({
            settings: {
              ...state.settings,
              [category]: {
                ...(state.settings[category] as object || {}),
                ...updates
              }
            },
            isDirty: true
          }));
        },
        
        resetSettings: (category) => {
          set((state) => {
            if (category) {
              return {
                settings: {
                  ...state.settings,
                  [category]: DEFAULT_SETTINGS[category]
                },
                isDirty: true
              };
            } else {
              return {
                settings: DEFAULT_SETTINGS,
                isDirty: true
              };
            }
          });
        },
        
        saveSettings: async () => {
          const { settings } = get();
          set({ isLoading: true });
          
          try {
            // TODO: Call Electron IPC to save settings to file
            // await window.electronAPI.saveSettings(settings);
            
            // Simulate async save
            await new Promise(resolve => setTimeout(resolve, 500));
            
            set({ 
              isDirty: false, 
              lastSaved: new Date(),
              isLoading: false 
            });
          } catch (error) {
            console.error('Failed to save settings:', error);
            set({ isLoading: false });
            throw error;
          }
        },
        
        loadSettings: async () => {
          set({ isLoading: true });
          
          try {
            // TODO: Call Electron IPC to load settings from file
            // const loadedSettings = await window.electronAPI.loadSettings();
            
            // Simulate async load
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // For now, use persisted settings or defaults
            set({ 
              isLoading: false,
              isDirty: false,
              lastSaved: new Date()
            });
          } catch (error) {
            console.error('Failed to load settings:', error);
            set({ isLoading: false });
            throw error;
          }
        },
        
        setLoading: (isLoading) => set({ isLoading }),
        
        // Convenience getters
        getTheme: () => get().settings.theme,
        getBackupSettings: () => get().settings.backup,
        getValidationSettings: () => get().settings.validation,
        getSyncSettings: () => get().settings.sync,
        getNotificationSettings: () => get().settings.notifications,
        getEditorSettings: () => get().settings.editor,
        getWindowSettings: () => get().settings.window
      }),
      {
        name: 'mcp-config-manager-settings',
        partialize: (state) => ({ 
          settings: state.settings,
          lastSaved: state.lastSaved
        }),
        version: 1,
        migrate: (persistedState: any, version) => {
          if (version === 0) {
            // Migration logic for version 0 -> 1
            return {
              ...persistedState,
              settings: {
                ...DEFAULT_SETTINGS,
                ...persistedState.settings
              }
            };
          }
          return persistedState;
        }
      }
    ),
    {
      name: 'mcp-settings-store'
    }
  )
);