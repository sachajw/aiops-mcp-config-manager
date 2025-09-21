// Main application stores
import { useApplicationStore } from './applicationStore';
import { useSettingsStore } from './settingsStore';
import { useUIStore } from './uiStore';
import { usePerformanceStore } from './performanceStore';

// Re-export the stores
export { useApplicationStore, useSettingsStore, useUIStore, usePerformanceStore };

// Export types
export type { ApplicationState, ServerTestResult } from './applicationStore';
export type { 
  SettingsState, 
  ApplicationSettings,
  Theme,
  BackupSettings,
  ValidationSettings,
  SyncSettings,
  NotificationSettings,
  EditorSettings,
  WindowSettings
} from './settingsStore';
export type { 
  UIState, 
  DialogState, 
  PanelState, 
  NotificationState,
  ContextMenuState,
  LoadingState
} from './uiStore';
export type { 
  PerformanceState,
  PerformanceMetric,
  OperationTiming,
  SystemInfo
} from './performanceStore';

// Store initialization utility
export const initializeStores = async () => {
  // Get store instances
  const settingsStore = useSettingsStore.getState();
  const performanceStore = usePerformanceStore.getState();
  const applicationStore = useApplicationStore.getState();
  
  try {
    // Load settings
    await settingsStore.loadSettings();
    
    // Start performance monitoring if enabled in settings
    const settings = settingsStore.settings;
    if (settings.debug.enabled) {
      performanceStore.startMonitoring();
    }
    
    // Initialize application data
    await applicationStore.refreshClients();
    
    console.log('All stores initialized successfully');
  } catch (error) {
    console.error('Failed to initialize stores:', error);
  }
};

// Store cleanup utility
export const cleanupStores = () => {
  const performanceStore = usePerformanceStore.getState();
  
  // Stop performance monitoring
  performanceStore.stopMonitoring();
  
  // Clear any interval timers or subscriptions
  console.log('Stores cleaned up');
};

// Development utilities
export const getStoreStates = () => {
  if (process.env.NODE_ENV === 'development') {
    return {
      application: useApplicationStore.getState(),
      settings: useSettingsStore.getState(),
      ui: useUIStore.getState(),
      performance: usePerformanceStore.getState()
    };
  }
  
  throw new Error('getStoreStates is only available in development');
};

// Performance monitoring helpers
export const trackOperation = (operationName: string, metadata?: Record<string, any>) => {
  const performanceStore = usePerformanceStore.getState();
  const operationId = `${operationName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  performanceStore.startOperation(operationId, operationName, metadata);
  
  return {
    finish: (success?: boolean, error?: string) => {
      performanceStore.endOperation(operationId, success, error);
    },
    id: operationId
  };
};

// Error tracking integration
export const trackError = (error: Error, context?: string) => {
  const performanceStore = usePerformanceStore.getState();
  
  performanceStore.addMetric({
    name: 'error_occurred',
    value: 1,
    unit: 'count',
    category: 'ui',
    details: {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      context
    }
  });
};

// Store persistence utilities
export const saveAllSettings = async () => {
  const settingsStore = useSettingsStore.getState();
  
  if (settingsStore.isDirty) {
    await settingsStore.saveSettings();
  }
};

// Store reset utility (for testing or user reset)
export const resetAllStores = () => {
  const uiStore = useUIStore.getState();
  const performanceStore = usePerformanceStore.getState();
  const settingsStore = useSettingsStore.getState();
  
  // Reset UI state
  uiStore.resetUIState();
  
  // Clear performance data
  performanceStore.clearMetrics();
  performanceStore.clearOperations();
  
  // Reset settings to defaults (requires user confirmation in UI)
  // settingsStore.resetSettings(); // Commented out for safety
  
  console.log('Stores reset (excluding settings)');
};