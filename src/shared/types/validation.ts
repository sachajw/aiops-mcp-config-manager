import { z } from 'zod';
import { ClientType, ConfigScope, ClientStatus, TestStatus, ValidationSeverity } from './enums';

/**
 * Zod schema for MCP Server configuration
 */
export const MCPServerSchema = z.object({
  name: z.string().min(1, 'Server name is required').max(100, 'Server name too long'),
  command: z.string().min(1, 'Command is required'),
  args: z.array(z.string()).default([]),
  env: z.record(z.string(), z.string()).default({}),
  cwd: z.string().optional(),
  scope: z.nativeEnum(ConfigScope),
  enabled: z.boolean().default(true),
  description: z.string().optional(),
  autoApprove: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.any()).optional()
});

/**
 * Zod schema for Configuration Paths
 */
export const ConfigurationPathsSchema = z.object({
  primary: z.string().min(1, 'Primary path is required'),
  alternatives: z.array(z.string()).default([]),
  scopePaths: z.record(z.nativeEnum(ConfigScope), z.string())
});

/**
 * Zod schema for MCP Client
 */
export const MCPClientSchema = z.object({
  id: z.string().min(1, 'Client ID is required'),
  name: z.string().min(1, 'Client name is required'),
  type: z.nativeEnum(ClientType),
  version: z.string().optional(),
  configPaths: ConfigurationPathsSchema,
  status: z.nativeEnum(ClientStatus),
  isActive: z.boolean(),
  installPath: z.string().optional(),
  executablePath: z.string().optional(),
  lastSeen: z.date().optional(),
  metadata: z.record(z.string(), z.any()).optional()
});

/**
 * Zod schema for Configuration Metadata
 */
export const ConfigurationMetadataSchema = z.object({
  lastModified: z.date(),
  version: z.string().min(1, 'Version is required'),
  scope: z.nativeEnum(ConfigScope),
  sourcePath: z.string().optional(),
  isDirty: z.boolean().optional(),
  checksum: z.string().optional()
});

/**
 * Zod schema for Configuration
 */
export const ConfigurationSchema = z.object({
  mcpServers: z.record(z.string(), MCPServerSchema),
  metadata: ConfigurationMetadataSchema
});

/**
 * Zod schema for Test Result
 */
export const TestResultSchema = z.object({
  status: z.nativeEnum(TestStatus),
  duration: z.number().min(0),
  message: z.string(),
  error: z.object({
    code: z.string(),
    details: z.string(),
    stackTrace: z.string().optional()
  }).optional(),
  response: z.object({
    version: z.string().optional(),
    capabilities: z.array(z.string()).optional(),
    metadata: z.record(z.string(), z.any()).optional()
  }).optional()
});

/**
 * Zod schema for Validation Error
 */
export const ValidationErrorSchema = z.object({
  field: z.string(),
  message: z.string(),
  severity: z.nativeEnum(ValidationSeverity),
  code: z.string().optional()
});

/**
 * Zod schema for Validation Result
 */
export const ValidationResultSchema = z.object({
  isValid: z.boolean(),
  errors: z.array(ValidationErrorSchema),
  warnings: z.array(z.object({
    field: z.string(),
    message: z.string(),
    suggestion: z.string().optional()
  }))
});

/**
 * Zod schema for Server Form Data
 */
export const ServerFormDataSchema = z.object({
  name: z.string().min(1, 'Server name is required').max(100, 'Server name too long'),
  command: z.string().min(1, 'Command is required'),
  args: z.string().default(''),
  env: z.string().default(''),
  cwd: z.string().default(''),
  enabled: z.boolean().default(true),
  description: z.string().default(''),
  autoApprove: z.string().default('')
});

/**
 * Zod schema for Export Options
 */
export const ExportOptionsSchema = z.object({
  includeSensitiveData: z.boolean().default(false),
  includeDisabledServers: z.boolean().default(true),
  includeMetadata: z.boolean().default(true),
  compress: z.boolean().default(false)
});

/**
 * Validation utility functions
 */
export class ValidationUtils {
  /**
   * Validate MCP Server configuration
   */
  static validateServer(data: unknown): { success: boolean; data?: any; errors?: string[] } {
    try {
      const result = MCPServerSchema.parse(data);
      return { success: true, data: result };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          errors: error.issues.map((err: z.ZodIssue) => `${err.path.join('.')}: ${err.message}`)
        };
      }
      return { success: false, errors: ['Unknown validation error'] };
    }
  }

  /**
   * Validate MCP Client configuration
   */
  static validateClient(data: unknown): { success: boolean; data?: any; errors?: string[] } {
    try {
      const result = MCPClientSchema.parse(data);
      return { success: true, data: result };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          errors: error.issues.map((err: z.ZodIssue) => `${err.path.join('.')}: ${err.message}`)
        };
      }
      return { success: false, errors: ['Unknown validation error'] };
    }
  }

  /**
   * Validate complete configuration
   */
  static validateConfiguration(data: unknown): { success: boolean; data?: any; errors?: string[] } {
    try {
      const result = ConfigurationSchema.parse(data);
      return { success: true, data: result };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          errors: error.issues.map((err: z.ZodIssue) => `${err.path.join('.')}: ${err.message}`)
        };
      }
      return { success: false, errors: ['Unknown validation error'] };
    }
  }

  /**
   * Validate server form data
   */
  static validateServerForm(data: unknown): { success: boolean; data?: any; errors?: string[] } {
    try {
      const result = ServerFormDataSchema.parse(data);
      return { success: true, data: result };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          errors: error.issues.map((err: z.ZodIssue) => `${err.path.join('.')}: ${err.message}`)
        };
      }
      return { success: false, errors: ['Unknown validation error'] };
    }
  }

  /**
   * Check if a string is a valid JSON
   */
  static isValidJSON(str: string): boolean {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate environment variables format
   */
  static validateEnvVars(envString: string): { success: boolean; errors?: string[] } {
    if (!envString.trim()) {
      return { success: true };
    }

    try {
      const parsed = JSON.parse(envString);
      if (typeof parsed !== 'object' || Array.isArray(parsed)) {
        return { success: false, errors: ['Environment variables must be a JSON object'] };
      }

      const errors: string[] = [];
      Object.entries(parsed).forEach(([key, value]) => {
        if (typeof key !== 'string' || typeof value !== 'string') {
          errors.push(`Environment variable "${key}" must have string key and value`);
        }
      });

      return errors.length > 0 ? { success: false, errors } : { success: true };
    } catch {
      return { success: false, errors: ['Invalid JSON format for environment variables'] };
    }
  }

  /**
   * Validate command arguments format
   */
  static validateArgs(argsString: string): { success: boolean; errors?: string[] } {
    if (!argsString.trim()) {
      return { success: true };
    }

    try {
      const parsed = JSON.parse(argsString);
      if (!Array.isArray(parsed)) {
        return { success: false, errors: ['Arguments must be a JSON array'] };
      }

      const errors: string[] = [];
      parsed.forEach((arg, index) => {
        if (typeof arg !== 'string') {
          errors.push(`Argument at index ${index} must be a string`);
        }
      });

      return errors.length > 0 ? { success: false, errors } : { success: true };
    } catch {
      return { success: false, errors: ['Invalid JSON format for arguments'] };
    }
  }
}

// Type exports for the schemas
export type MCPServerType = z.infer<typeof MCPServerSchema>;
export type MCPClientType = z.infer<typeof MCPClientSchema>;
export type ConfigurationType = z.infer<typeof ConfigurationSchema>;
export type ServerFormDataType = z.infer<typeof ServerFormDataSchema>;
export type ValidationResultType = z.infer<typeof ValidationResultSchema>;