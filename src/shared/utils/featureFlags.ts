/**
 * Feature flags for gradual type system migration
 * Allows us to incrementally migrate components to the new type system
 */

export enum FeatureFlag {
  // Type migration flags
  USE_NEW_TYPES_VALIDATION_ENGINE = 'useNewTypesValidationEngine',
  USE_NEW_TYPES_CONFIG_PARSER = 'useNewTypesConfigParser',
  USE_NEW_TYPES_CLIENT_DETECTOR = 'useNewTypesClientDetector',
  USE_NEW_TYPES_IPC_HANDLERS = 'useNewTypesIpcHandlers',
  USE_NEW_TYPES_COMPONENTS = 'useNewTypesComponents',
  USE_NEW_TYPES_STORES = 'useNewTypesStores',

  // Service migration flags
  USE_NEW_CONFIG_API = 'useNewConfigApi',
  USE_NEW_SERVER_API = 'useNewServerApi',
  USE_NEW_CLIENT_API = 'useNewClientApi',
  USE_NEW_SYSTEM_API = 'useNewSystemApi',
  USE_NEW_DISCOVERY_API = 'useNewDiscoveryApi',

  // Component migration flags (examples)
  USE_NEW_TYPES_SERVER_CONFIG = 'useNewTypesServerConfig',
  USE_NEW_TYPES_CLIENT_LIST = 'useNewTypesClientList',
  USE_NEW_TYPES_SETTINGS = 'useNewTypesSettings',
}

interface FeatureFlagConfig {
  [key: string]: boolean;
}

// Default configuration - all flags disabled initially
const defaultFlags: FeatureFlagConfig = {
  [FeatureFlag.USE_NEW_TYPES_VALIDATION_ENGINE]: false,
  [FeatureFlag.USE_NEW_TYPES_CONFIG_PARSER]: false,
  [FeatureFlag.USE_NEW_TYPES_CLIENT_DETECTOR]: false,
  [FeatureFlag.USE_NEW_TYPES_IPC_HANDLERS]: false,
  [FeatureFlag.USE_NEW_TYPES_COMPONENTS]: false,
  [FeatureFlag.USE_NEW_TYPES_STORES]: false,
  [FeatureFlag.USE_NEW_CONFIG_API]: false,
  [FeatureFlag.USE_NEW_SERVER_API]: false,
  [FeatureFlag.USE_NEW_CLIENT_API]: false,
  [FeatureFlag.USE_NEW_SYSTEM_API]: false,
  [FeatureFlag.USE_NEW_DISCOVERY_API]: false,
  [FeatureFlag.USE_NEW_TYPES_SERVER_CONFIG]: false,
  [FeatureFlag.USE_NEW_TYPES_CLIENT_LIST]: false,
  [FeatureFlag.USE_NEW_TYPES_SETTINGS]: false,
};

// Load flags from environment or config file
const loadFlags = (): FeatureFlagConfig => {
  // In development, can override with environment variables
  if (process.env.NODE_ENV === 'development') {
    const envFlags: FeatureFlagConfig = {};
    Object.keys(defaultFlags).forEach(flag => {
      const envValue = process.env[`FF_${flag.toUpperCase()}`];
      if (envValue !== undefined) {
        envFlags[flag] = envValue === 'true';
      }
    });
    return { ...defaultFlags, ...envFlags };
  }

  // In production, use default flags or load from config
  return defaultFlags;
};

class FeatureFlagManager {
  private flags: FeatureFlagConfig;

  constructor() {
    this.flags = loadFlags();
  }

  /**
   * Check if a feature flag is enabled
   */
  isEnabled(flag: FeatureFlag): boolean {
    return this.flags[flag] ?? false;
  }

  /**
   * Enable a feature flag (for testing/development)
   */
  enable(flag: FeatureFlag): void {
    this.flags[flag] = true;
  }

  /**
   * Disable a feature flag (for testing/development)
   */
  disable(flag: FeatureFlag): void {
    this.flags[flag] = false;
  }

  /**
   * Get all flags and their current states
   */
  getAllFlags(): FeatureFlagConfig {
    return { ...this.flags };
  }

  /**
   * Bulk update flags (for testing/development)
   */
  setFlags(flags: Partial<FeatureFlagConfig>): void {
    this.flags = { ...this.flags, ...flags } as FeatureFlagConfig;
  }

  /**
   * Reset all flags to defaults
   */
  reset(): void {
    this.flags = { ...defaultFlags };
  }

  /**
   * Check if we're in migration mode for any component
   */
  isInMigrationMode(): boolean {
    return Object.values(this.flags).some(enabled => enabled);
  }

  /**
   * Get migration progress as percentage
   */
  getMigrationProgress(): number {
    const total = Object.keys(this.flags).length;
    const enabled = Object.values(this.flags).filter(v => v).length;
    return Math.round((enabled / total) * 100);
  }
}

// Singleton instance
export const featureFlags = new FeatureFlagManager();

// Helper function for conditional rendering in components
export function withFeatureFlag<T, U>(
  flag: FeatureFlag,
  newImplementation: () => T,
  oldImplementation: () => U
): T | U {
  return featureFlags.isEnabled(flag)
    ? newImplementation()
    : oldImplementation();
}

// React hook for using feature flags in components
export function useFeatureFlag(flag: FeatureFlag): boolean {
  return featureFlags.isEnabled(flag);
}