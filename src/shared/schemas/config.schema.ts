/**
 * Configuration validation schemas using Zod
 * Provides runtime validation for configuration data
 */

import { z } from 'zod';

// ============================================================
// Base Schemas
// ============================================================

export const ConfigScopeSchema = z.enum(['global', 'user', 'local', 'project']);

export const ConfigFormatSchema = z.enum(['json', 'json5', 'jsonc', 'toml', 'yaml']);

export const LogLevelSchema = z.enum(['debug', 'info', 'warn', 'error', 'none']);

// ============================================================
// Settings Schemas
// ============================================================

export const ClientSettingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  autoConnect: z.boolean().optional(),
  maxConnections: z.number().min(1).max(100).optional(),
  timeout: z.number().min(1000).max(60000).optional(),
  logLevel: LogLevelSchema.optional(),
  experimental: z.record(z.string(), z.boolean()).optional(),
  advanced: z.record(z.string(), z.any()).optional()
}).strict();

export const ValidationSettingsSchema = z.object({
  enabled: z.boolean(),
  strict: z.boolean(),
  rules: z.array(z.object({
    field: z.string(),
    rule: z.enum(['required', 'pattern', 'min', 'max', 'custom']),
    value: z.any().optional(),
    message: z.string().optional()
  })).optional()
}).strict();

export const SyncSettingsSchema = z.object({
  enabled: z.boolean(),
  interval: z.number().min(1000).optional(),
  strategy: z.enum(['merge', 'overwrite', 'manual']),
  conflictResolution: z.enum(['local', 'remote', 'prompt'])
}).strict();

export const BackupSettingsSchema = z.object({
  enabled: z.boolean(),
  maxBackups: z.number().min(1).max(100).optional(),
  interval: z.number().min(3600000).optional(), // Min 1 hour
  location: z.string().optional()
}).strict();

export const ConfigurationSettingsSchema = z.object({
  autoSave: z.boolean().optional(),
  validation: ValidationSettingsSchema.optional(),
  sync: SyncSettingsSchema.optional(),
  backup: BackupSettingsSchema.optional()
}).strict();

// ============================================================
// Configuration Schemas
// ============================================================

export const ConfigurationMetadataSchema = z.object({
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  author: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isTemplate: z.boolean().optional(),
  isShared: z.boolean().optional()
}).strict();

export const ConfigurationSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  clientId: z.string().min(1),
  scope: ConfigScopeSchema,
  servers: z.array(z.any()), // Will use ServerSchema when defined
  settings: ConfigurationSettingsSchema.optional(),
  metadata: ConfigurationMetadataSchema.optional()
}).strict();

// ============================================================
// Client Config Schemas
// ============================================================

export const ClientConfigSchema = z.object({
  client: z.any(), // Will use MCPClientSchema when defined
  servers: z.array(z.any()), // Will use MCPServerSchema when defined
  globalSettings: ClientSettingsSchema.optional(),
  lastModified: z.string().datetime().optional(),
  configFormat: ConfigFormatSchema,
  scope: ConfigScopeSchema
}).strict();

// ============================================================
// API Parameter Schemas
// ============================================================

export const ConfigReadParamsSchema = z.object({
  clientId: z.string().min(1),
  scope: ConfigScopeSchema.optional(),
  projectPath: z.string().optional()
}).strict();

export const ConfigReadAllParamsSchema = z.object({
  clientId: z.string().optional(),
  scope: ConfigScopeSchema.optional()
}).strict();

export const ConfigWriteParamsSchema = z.object({
  clientId: z.string().min(1),
  config: ClientConfigSchema.partial(),
  scope: ConfigScopeSchema,
  projectPath: z.string().optional(),
  backup: z.boolean().optional()
}).strict();

export const ConfigUpdateParamsSchema = z.object({
  clientId: z.string().min(1),
  updates: ClientConfigSchema.partial(),
  scope: ConfigScopeSchema,
  merge: z.boolean().optional()
}).strict();

export const ConfigDeleteParamsSchema = z.object({
  clientId: z.string().min(1),
  scope: ConfigScopeSchema,
  backup: z.boolean().optional()
}).strict();

export const ConfigValidateParamsSchema = z.object({
  config: ClientConfigSchema.partial(),
  strict: z.boolean().optional()
}).strict();

export const ConfigImportParamsSchema = z.object({
  path: z.string().min(1),
  clientId: z.string().min(1),
  scope: ConfigScopeSchema,
  overwrite: z.boolean().optional()
}).strict();

export const ConfigExportParamsSchema = z.object({
  clientId: z.string().min(1),
  scope: ConfigScopeSchema,
  path: z.string().min(1),
  format: z.enum(['json', 'json5', 'yaml']).optional()
}).strict();

export const ConfigSyncParamsSchema = z.object({
  source: z.object({
    clientId: z.string().min(1),
    scope: ConfigScopeSchema
  }),
  target: z.object({
    clientId: z.string().min(1),
    scope: ConfigScopeSchema
  }),
  strategy: z.enum(['merge', 'overwrite'])
}).strict();

export const ConflictResolveParamsSchema = z.object({
  conflict: z.object({
    field: z.string(),
    localValue: z.any(),
    remoteValue: z.any(),
    timestamp: z.string().datetime()
  }),
  resolution: z.enum(['local', 'remote', 'merge']),
  customValue: z.any().optional()
}).strict();

// ============================================================
// Validation Helpers
// ============================================================

export function validateConfigReadParams(params: unknown) {
  return ConfigReadParamsSchema.parse(params);
}

export function validateConfigWriteParams(params: unknown) {
  return ConfigWriteParamsSchema.parse(params);
}

export function validateConfiguration(config: unknown) {
  return ConfigurationSchema.parse(config);
}

export function validateClientConfig(config: unknown) {
  return ClientConfigSchema.parse(config);
}

// Safe parse functions that return success/error results
export function safeValidateConfiguration(config: unknown) {
  return ConfigurationSchema.safeParse(config);
}

export function safeValidateClientConfig(config: unknown) {
  return ClientConfigSchema.safeParse(config);
}

// Type inference helpers
export type Configuration = z.infer<typeof ConfigurationSchema>;
export type ClientConfig = z.infer<typeof ClientConfigSchema>;
export type ClientSettings = z.infer<typeof ClientSettingsSchema>;
export type ConfigurationSettings = z.infer<typeof ConfigurationSettingsSchema>;