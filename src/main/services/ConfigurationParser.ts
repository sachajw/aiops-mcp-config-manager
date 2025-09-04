import JSON5 from 'json5';
import { z } from 'zod';
import { promises as fs } from 'fs';
import { ClientType, ValidationSeverity, ConfigScope } from '../../shared/types/enums';
import { Configuration, ConfigurationMetadata } from '../../shared/types/configuration';
import { MCPServer } from '../../shared/types/server';
import { ValidationResult, ValidationError } from '../../shared/types/common';

/**
 * Configuration parsing result
 */
export interface ParseResult {
  success: boolean;
  data?: Configuration;
  errors: ValidationError[];
  warnings: ValidationError[];
  rawContent?: string;
}

/**
 * Client-specific configuration schemas
 */
export class ClientConfigSchemas {
  /**
   * Claude Desktop configuration schema
   */
  static readonly CLAUDE_DESKTOP = z.object({
    mcpServers: z.record(z.string(), z.object({
      command: z.string(),
      args: z.array(z.string()).optional(),
      env: z.record(z.string(), z.string()).optional(),
      cwd: z.string().optional(),
      disabled: z.boolean().optional()
    }))
  });

  /**
   * Claude Code configuration schema
   */
  static readonly CLAUDE_CODE = z.object({
    mcpServers: z.record(z.string(), z.object({
      command: z.string(),
      args: z.array(z.string()).optional(),
      env: z.record(z.string(), z.string()).optional(),
      cwd: z.string().optional(),
      autoApprove: z.array(z.string()).optional(),
      disabled: z.boolean().optional()
    }))
  });

  /**
   * Codex configuration schema
   */
  static readonly CODEX = z.object({
    servers: z.record(z.string(), z.object({
      command: z.string(),
      arguments: z.array(z.string()).optional(),
      environment: z.record(z.string(), z.string()).optional(),
      workingDirectory: z.string().optional(),
      enabled: z.boolean().optional()
    }))
  });

  /**
   * VS Code configuration schema (workspace/user settings)
   */
  static readonly VS_CODE = z.object({
    'mcp.servers': z.record(z.string(), z.object({
      command: z.string(),
      args: z.array(z.string()).optional(),
      env: z.record(z.string(), z.string()).optional(),
      cwd: z.string().optional(),
      enabled: z.boolean().optional()
    })).optional()
  });

  /**
   * Gemini Desktop configuration schema
   */
  static readonly GEMINI_DESKTOP = z.object({
    mcpServers: z.record(z.string(), z.object({
      command: z.string(),
      args: z.array(z.string()).optional(),
      env: z.record(z.string(), z.string()).optional(),
      cwd: z.string().optional(),
      disabled: z.boolean().optional()
    }))
  });

  /**
   * Get schema for client type
   */
  static getSchema(clientType: ClientType): z.ZodSchema {
    switch (clientType) {
      case ClientType.CLAUDE_DESKTOP:
        return this.CLAUDE_DESKTOP;
      case ClientType.CLAUDE_CODE:
        return this.CLAUDE_CODE;
      case ClientType.CODEX:
        return this.CODEX;
      case ClientType.VS_CODE:
        return this.VS_CODE;
      case ClientType.GEMINI_DESKTOP:
        return this.GEMINI_DESKTOP;
      case ClientType.GEMINI_CLI:
        return this.GEMINI_DESKTOP; // Same format as desktop
      default:
        throw new Error(`Unsupported client type: ${clientType}`);
    }
  }
}

/**
 * Configuration parser with JSON5 support and client-specific validation
 */
export class ConfigurationParser {
  /**
   * Parse configuration file with JSON5 support
   */
  static async parseFile(filePath: string, clientType: ClientType): Promise<ParseResult> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return this.parseContent(content, clientType, filePath);
    } catch (error) {
      return {
        success: false,
        errors: [{
          field: 'file',
          message: `Failed to read configuration file: ${error instanceof Error ? error.message : 'Unknown error'}`,
          severity: ValidationSeverity.ERROR,
          code: 'FILE_READ_ERROR'
        }],
        warnings: []
      };
    }
  }

  /**
   * Parse configuration content string
   */
  static parseContent(content: string, clientType: ClientType, sourcePath?: string): ParseResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Step 1: Parse JSON5
    let rawData: any;
    try {
      rawData = JSON5.parse(content);
    } catch (error) {
      return {
        success: false,
        errors: [{
          field: 'syntax',
          message: `JSON5 parsing error: ${error instanceof Error ? error.message : 'Invalid syntax'}`,
          severity: ValidationSeverity.ERROR,
          code: 'SYNTAX_ERROR'
        }],
        warnings: [],
        rawContent: content
      };
    }

    // Step 2: Validate against client-specific schema
    const schema = ClientConfigSchemas.getSchema(clientType);
    const schemaResult = schema.safeParse(rawData);

    if (!schemaResult.success) {
      schemaResult.error.issues.forEach(issue => {
        errors.push({
          field: issue.path.join('.'),
          message: issue.message,
          severity: ValidationSeverity.ERROR,
          code: issue.code
        });
      });
    }

    // Step 3: Convert to normalized format
    let normalizedConfig: Configuration;
    try {
      normalizedConfig = this.normalizeConfiguration(rawData, clientType, sourcePath);
    } catch (error) {
      errors.push({
        field: 'normalization',
        message: `Failed to normalize configuration: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: ValidationSeverity.ERROR,
        code: 'NORMALIZATION_ERROR'
      });
      
      return {
        success: false,
        errors,
        warnings,
        rawContent: content
      };
    }

    // Step 4: Additional validation
    const additionalValidation = this.validateConfiguration(normalizedConfig);
    errors.push(...additionalValidation.errors);
    warnings.push(...additionalValidation.warnings);

    return {
      success: errors.length === 0,
      data: normalizedConfig,
      errors,
      warnings,
      rawContent: content
    };
  }

  /**
   * Normalize client-specific configuration to standard format
   */
  private static normalizeConfiguration(rawData: any, clientType: ClientType, sourcePath?: string): Configuration {
    const servers: Record<string, MCPServer> = {};
    
    switch (clientType) {
      case ClientType.CLAUDE_DESKTOP:
      case ClientType.CLAUDE_CODE:
      case ClientType.GEMINI_DESKTOP:
      case ClientType.GEMINI_CLI:
        this.normalizeStandardFormat(rawData.mcpServers || {}, servers);
        break;
        
      case ClientType.CODEX:
        this.normalizeCodexFormat(rawData.servers || {}, servers);
        break;
        
      case ClientType.VS_CODE:
        this.normalizeVSCodeFormat(rawData['mcp.servers'] || {}, servers);
        break;
        
      default:
        throw new Error(`Unsupported client type: ${clientType}`);
    }

    const metadata: ConfigurationMetadata = {
      lastModified: new Date(),
      version: '1.0.0',
      scope: ConfigScope.USER,
      sourcePath,
      isDirty: false
    };

    return {
      mcpServers: servers,
      metadata
    };
  }

  /**
   * Normalize standard format (Claude Desktop, Claude Code, Gemini)
   */
  private static normalizeStandardFormat(rawServers: any, servers: Record<string, MCPServer>): void {
    Object.entries(rawServers).forEach(([name, config]: [string, any]) => {
      servers[name] = {
        name,
        command: config.command,
        args: config.args || [],
        env: config.env || {},
        cwd: config.cwd,
        scope: ConfigScope.USER,
        enabled: !config.disabled,
        description: config.description,
        autoApprove: config.autoApprove || []
      };
    });
  }

  /**
   * Normalize Codex format
   */
  private static normalizeCodexFormat(rawServers: any, servers: Record<string, MCPServer>): void {
    Object.entries(rawServers).forEach(([name, config]: [string, any]) => {
      servers[name] = {
        name,
        command: config.command,
        args: config.arguments || [],
        env: config.environment || {},
        cwd: config.workingDirectory,
        scope: ConfigScope.USER,
        enabled: config.enabled !== false,
        description: config.description
      };
    });
  }

  /**
   * Normalize VS Code format
   */
  private static normalizeVSCodeFormat(rawServers: any, servers: Record<string, MCPServer>): void {
    Object.entries(rawServers).forEach(([name, config]: [string, any]) => {
      servers[name] = {
        name,
        command: config.command,
        args: config.args || [],
        env: config.env || {},
        cwd: config.cwd,
        scope: ConfigScope.USER,
        enabled: config.enabled !== false,
        description: config.description
      };
    });
  }

  /**
   * Additional configuration validation
   */
  private static validateConfiguration(config: Configuration): { errors: ValidationError[]; warnings: ValidationError[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Validate server configurations
    Object.entries(config.mcpServers).forEach(([name, server]) => {
      // Check for empty command
      if (!server.command || !server.command.trim()) {
        errors.push({
          field: `mcpServers.${name}.command`,
          message: 'Command cannot be empty',
          severity: ValidationSeverity.ERROR,
          code: 'EMPTY_COMMAND'
        });
      }

      // Check for suspicious commands
      if (server.command && (server.command.includes('..') || server.command.includes('~'))) {
        warnings.push({
          field: `mcpServers.${name}.command`,
          message: 'Command contains relative paths, consider using absolute paths',
          severity: ValidationSeverity.WARNING,
          code: 'RELATIVE_PATH'
        });
      }

      // Validate environment variables
      Object.entries(server.env || {}).forEach(([key, value]) => {
        if (key.includes(' ')) {
          warnings.push({
            field: `mcpServers.${name}.env.${key}`,
            message: 'Environment variable names should not contain spaces',
            severity: ValidationSeverity.WARNING,
            code: 'ENV_VAR_SPACES'
          });
        }

        if (typeof value !== 'string') {
          errors.push({
            field: `mcpServers.${name}.env.${key}`,
            message: 'Environment variable values must be strings',
            severity: ValidationSeverity.ERROR,
            code: 'ENV_VAR_TYPE'
          });
        }
      });

      // Validate arguments
      server.args?.forEach((arg, index) => {
        if (typeof arg !== 'string') {
          errors.push({
            field: `mcpServers.${name}.args[${index}]`,
            message: 'Arguments must be strings',
            severity: ValidationSeverity.ERROR,
            code: 'ARG_TYPE'
          });
        }
      });

      // Check for duplicate server names (case-insensitive)
      const lowerName = name.toLowerCase();
      const duplicates = Object.keys(config.mcpServers).filter(n => n.toLowerCase() === lowerName && n !== name);
      if (duplicates.length > 0) {
        warnings.push({
          field: `mcpServers.${name}`,
          message: `Server name conflicts with: ${duplicates.join(', ')}`,
          severity: ValidationSeverity.WARNING,
          code: 'DUPLICATE_NAME'
        });
      }
    });

    return { errors, warnings };
  }

  /**
   * Parse configuration from file path (backwards compatibility)
   */
  static async parseConfiguration(filePath: string, clientType?: ClientType): Promise<ParseResult> {
    // Default to Claude Desktop if no client type provided
    return this.parseFile(filePath, clientType || ClientType.CLAUDE_DESKTOP);
  }

  /**
   * Validate JSON5 syntax without full parsing
   */
  static validateSyntax(content: string): ValidationResult {
    try {
      JSON5.parse(content);
      return {
        isValid: true,
        errors: [],
        warnings: []
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [{
          field: 'syntax',
          message: `JSON5 syntax error: ${error instanceof Error ? error.message : 'Invalid syntax'}`,
          severity: ValidationSeverity.ERROR,
          code: 'SYNTAX_ERROR'
        }],
        warnings: []
      };
    }
  }

  /**
   * Format configuration for client-specific output
   */
  static formatForClient(config: Configuration, clientType: ClientType): string {
    const formatted = this.convertToClientFormat(config, clientType);
    return JSON.stringify(formatted, null, 2);
  }

  /**
   * Convert normalized configuration to client-specific format
   */
  private static convertToClientFormat(config: Configuration, clientType: ClientType): any {
    switch (clientType) {
      case ClientType.CLAUDE_DESKTOP:
      case ClientType.CLAUDE_CODE:
      case ClientType.GEMINI_DESKTOP:
      case ClientType.GEMINI_CLI:
        return this.convertToStandardFormat(config);
        
      case ClientType.CODEX:
        return this.convertToCodexFormat(config);
        
      case ClientType.VS_CODE:
        return this.convertToVSCodeFormat(config);
        
      default:
        throw new Error(`Unsupported client type: ${clientType}`);
    }
  }

  /**
   * Convert to standard format (Claude Desktop, Claude Code, Gemini)
   */
  private static convertToStandardFormat(config: Configuration): any {
    const mcpServers: any = {};
    
    Object.entries(config.mcpServers).forEach(([name, server]) => {
      mcpServers[name] = {
        command: server.command,
        ...(server.args && server.args.length > 0 && { args: server.args }),
        ...(server.env && Object.keys(server.env).length > 0 && { env: server.env }),
        ...(server.cwd && { cwd: server.cwd }),
        ...(server.autoApprove && server.autoApprove.length > 0 && { autoApprove: server.autoApprove }),
        ...(!server.enabled && { disabled: true })
      };
    });

    return { mcpServers };
  }

  /**
   * Convert to Codex format
   */
  private static convertToCodexFormat(config: Configuration): any {
    const servers: any = {};
    
    Object.entries(config.mcpServers).forEach(([name, server]) => {
      servers[name] = {
        command: server.command,
        ...(server.args && server.args.length > 0 && { arguments: server.args }),
        ...(server.env && Object.keys(server.env).length > 0 && { environment: server.env }),
        ...(server.cwd && { workingDirectory: server.cwd }),
        enabled: server.enabled
      };
    });

    return { servers };
  }

  /**
   * Convert to VS Code format
   */
  private static convertToVSCodeFormat(config: Configuration): any {
    const mcpServers: any = {};
    
    Object.entries(config.mcpServers).forEach(([name, server]) => {
      mcpServers[name] = {
        command: server.command,
        ...(server.args && server.args.length > 0 && { args: server.args }),
        ...(server.env && Object.keys(server.env).length > 0 && { env: server.env }),
        ...(server.cwd && { cwd: server.cwd }),
        enabled: server.enabled
      };
    });

    return { 'mcp.servers': mcpServers };
  }
}