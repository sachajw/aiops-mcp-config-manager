/**
 * Central export for all type adapters
 * Used during the migration from old to new type system
 */

export * from './serverAdapter';
export * from './clientAdapter';
export * from './configurationAdapter';

// Re-export feature flags for convenience
import { featureFlags, FeatureFlag, withFeatureFlag, useFeatureFlag } from '../utils/featureFlags';
export { featureFlags, FeatureFlag, withFeatureFlag, useFeatureFlag };

/**
 * Helper to conditionally use new or old types based on feature flag
 */
export function useAdapter<TOld, TNew>(
  flag: FeatureFlag,
  oldValue: TOld,
  toNewAdapter: (old: TOld) => TNew,
  toOldAdapter: (newVal: TNew) => TOld
): { value: TOld | TNew; isNew: boolean } {
  const isNew = featureFlags.isEnabled(flag);

  if (isNew) {
    return {
      value: toNewAdapter(oldValue),
      isNew: true
    };
  }

  return {
    value: oldValue,
    isNew: false
  };
}

/**
 * Batch adapter helper
 */
export function useBatchAdapter<TOld, TNew>(
  flag: FeatureFlag,
  oldValues: TOld[],
  toNewAdapter: (old: TOld[]) => TNew[],
  toOldAdapter: (newVal: TNew[]) => TOld[]
): { values: TOld[] | TNew[]; isNew: boolean } {
  const isNew = featureFlags.isEnabled(flag);

  if (isNew) {
    return {
      values: toNewAdapter(oldValues),
      isNew: true
    };
  }

  return {
    values: oldValues,
    isNew: false
  };
}