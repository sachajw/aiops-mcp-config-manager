/**
 * Type adapters for Configuration and related types
 * Converts between old and new type definitions during migration
 */

import { Configuration as OldConfiguration } from '../types/configuration';
import { ValidationResultType as OldValidationResult } from '../types/validation';
import { ConfigScope } from '../types/enums';
import {
  Configuration as NewConfiguration,
  ConfigurationSettings,
  ConfigurationMetadata,
  ValidationResult as NewValidationResult,
  ValidationError as NewValidationError,
  ValidationWarning as NewValidationWarning,
  ValidationSettings,
  SyncSettings,
  BackupSettings,
  OperationResult,
  OperationError
} from '../types/models.new';
import { toNewServers, toOldServers } from './serverAdapter';

/**
 * Convert old configuration to new configuration
 */
export function toNewConfiguration(old: OldConfiguration): NewConfiguration {
  // Extract servers from mcpServers object
  const servers = old.mcpServers ? Object.values(old.mcpServers) : [];

  return {
    id: old.metadata?.sourcePath || 'config-' + Date.now(),
    name: 'Configuration',
    description: undefined,
    clientId: 'unknown',
    scope: old.metadata?.scope || ConfigScope.USER,
    servers: toNewServers(servers),
    settings: createConfigSettings(old),
    metadata: createConfigMetadataNew(old)
  };
}

/**
 * Convert new configuration to old configuration
 */
export function toOldConfiguration(newConfig: NewConfiguration): OldConfiguration {
  // Convert servers array to mcpServers object
  const mcpServers: Record<string, any> = {};
  const oldServers = toOldServers(newConfig.servers);
  oldServers.forEach((server: any) => {
    mcpServers[server.name] = server;
  });

  return {
    mcpServers,
    metadata: {
      lastModified: new Date(newConfig.metadata?.updatedAt || Date.now()),
      version: '1.0.0',
      scope: newConfig.scope,
      sourcePath: newConfig.id,
      isDirty: false
    }
  };
}

/**
 * Create configuration settings from old config fields
 */
function createConfigSettings(old: OldConfiguration): ConfigurationSettings | undefined {
  // Old Configuration type doesn't have these settings
  return {
    autoSave: true,
    validation: {
      enabled: true,
      strict: false
    },
    sync: {
      enabled: false,
      strategy: 'merge',
      conflictResolution: 'prompt'
    },
    backup: {
      enabled: true
    }
  };
}

/**
 * Create configuration metadata from old config fields
 */
function createConfigMetadataNew(old: OldConfiguration): ConfigurationMetadata | undefined {
  if (!old.metadata) return undefined;

  return {
    createdAt: old.metadata.lastModified.toISOString(),
    updatedAt: old.metadata.lastModified.toISOString(),
    author: undefined,
    tags: [],
    isTemplate: false,
    isShared: false
  };
}

function createConfigMetadata(old: OldConfiguration): ConfigurationMetadata | undefined {
  // Old Configuration type doesn't have these fields directly
  // Return default metadata
  return {
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    author: undefined,
    tags: [],
    isTemplate: false,
    isShared: false
  };
}

/**
 * Convert old validation result to new validation result
 */
export function toNewValidationResult(old: OldValidationResult): NewValidationResult {
  return {
    valid: old.isValid || false,
    errors: old.errors?.map(toNewValidationError) || [],
    warnings: old.warnings?.map(toNewValidationWarning) || []
  };
}

/**
 * Convert new validation result to old validation result
 */
export function toOldValidationResult(newResult: NewValidationResult): OldValidationResult {
  return {
    isValid: newResult.valid,
    errors: newResult.errors.map(toOldValidationError),
    warnings: newResult.warnings.map(toOldValidationWarning)
  } as OldValidationResult;
}

/**
 * Convert old validation error to new validation error
 */
function toNewValidationError(old: any): NewValidationError {
  return {
    field: old.field || '',
    message: old.message || old.description || '',
    code: old.code || 'VALIDATION_ERROR',
    value: old.value
  };
}

/**
 * Convert new validation error to old validation error
 */
function toOldValidationError(newError: NewValidationError): any {
  return {
    field: newError.field,
    message: newError.message,
    code: newError.code,
    value: newError.value
  };
}

/**
 * Convert old validation warning to new validation warning
 */
function toNewValidationWarning(old: any): NewValidationWarning {
  return {
    field: old.field || '',
    message: old.message || old.description || '',
    code: old.code || 'VALIDATION_WARNING',
    severity: old.severity || 'medium'
  };
}

/**
 * Convert new validation warning to old validation warning
 */
function toOldValidationWarning(newWarning: NewValidationWarning): any {
  return {
    field: newWarning.field,
    message: newWarning.message,
    code: newWarning.code,
    severity: newWarning.severity
  };
}

/**
 * Create an operation result from old-style response
 */
export function toOperationResult<T>(success: boolean, data?: T, error?: any): OperationResult<T> {
  const result: OperationResult<T> = {
    success,
    timestamp: new Date().toISOString()
  };

  if (data !== undefined) {
    result.data = data;
  }

  if (error && !success) {
    result.error = toOperationError(error);
  }

  return result;
}

/**
 * Convert error to operation error
 */
function toOperationError(error: any): OperationError {
  if (typeof error === 'string') {
    return {
      code: 'ERROR',
      message: error
    };
  }

  return {
    code: error.code || 'ERROR',
    message: error.message || 'An error occurred',
    details: error.details,
    stack: error.stack,
    recoverable: error.recoverable
  };
}

/**
 * Batch convert old configurations to new configurations
 */
export function toNewConfigurations(oldConfigs: OldConfiguration[]): NewConfiguration[] {
  return oldConfigs.map(toNewConfiguration);
}

/**
 * Batch convert new configurations to old configurations
 */
export function toOldConfigurations(newConfigs: NewConfiguration[]): OldConfiguration[] {
  return newConfigs.map(toOldConfiguration);
}