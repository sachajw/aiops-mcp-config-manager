import { z } from 'zod';
import { promises as fs } from 'fs';
import { existsSync } from 'fs';
import { resolve, isAbsolute } from 'path';
import { Configuration } from '../../shared/types/configuration';
import { MCPServer } from '../../shared/types/server';
import { ValidationResult, ValidationError, ValidationWarning } from '../../shared/types/common';
import { ClientType, ValidationSeverity } from '../../shared/types/enums';

/**
 * Validation context for enhanced error reporting
 */
export interface ValidationContext {
  clientType: ClientType;
  sourcePath?: string;
  scope?: string;
  checkFileSystem?: boolean;
  checkCommands?: boolean;
}

/**
 * Command validation result
 */
export interface CommandValidationResult {
  exists: boolean;
  isExecutable: boolean;
  absolutePath?: string;
  suggestions: string[];
}

/**
 * Comprehensive validation engine with detailed error reporting
 */
export class ValidationEngine {
  /**
   * Validate complete configuration with context
   */
  static async validateConfiguration(
    config: Configuration, 
    context: ValidationContext
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Basic structure validation
    const structureValidation = this.validateStructure(config);
    errors.push(...structureValidation.errors);
    warnings.push(...structureValidation.warnings);

    // Server-specific validation
    if (config.mcpServers && typeof config.mcpServers === 'object') {
      for (const [serverName, server] of Object.entries(config.mcpServers)) {
        const serverValidation = await this.validateServer(server, serverName, context);
        errors.push(...serverValidation.errors);
        warnings.push(...serverValidation.warnings);
      }
    }

    // Cross-server validation
    const crossValidation = this.validateCrossServerRules(config);
    errors.push(...crossValidation.errors);
    warnings.push(...crossValidation.warnings);

    // Client-specific validation
    const clientValidation = this.validateClientSpecificRules(config, context.clientType);
    errors.push(...clientValidation.errors);
    warnings.push(...clientValidation.warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate individual server configuration
   */
  static async validateServer(
    server: MCPServer, 
    serverName: string, 
    context: ValidationContext
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Required fields validation
    if (!server.name || server.name.trim() === '') {
      errors.push({
        field: `mcpServers.${serverName}.name`,
        message: 'Server name is required',
        severity: ValidationSeverity.ERROR,
        code: 'REQUIRED_FIELD'
      });
    }

    if (!server.command || server.command.trim() === '') {
      errors.push({
        field: `mcpServers.${serverName}.command`,
        message: 'Command is required',
        severity: ValidationSeverity.ERROR,
        code: 'REQUIRED_FIELD'
      });
    } else {
      // Command validation
      const commandValidation = await this.validateCommand(server.command, context);
      if (!commandValidation.exists && context.checkCommands) {
        errors.push({
          field: `mcpServers.${serverName}.command`,
          message: `Command not found: ${server.command}`,
          severity: ValidationSeverity.ERROR,
          code: 'COMMAND_NOT_FOUND'
        });

        if (commandValidation.suggestions.length > 0) {
          warnings.push({
            field: `mcpServers.${serverName}.command`,
            message: `Did you mean: ${commandValidation.suggestions.join(', ')}?`,
            severity: ValidationSeverity.WARNING,
            suggestion: `Try using one of these commands: ${commandValidation.suggestions.join(', ')}`
          });
        }
      }

      if (!commandValidation.isExecutable && commandValidation.exists && context.checkCommands) {
        warnings.push({
          field: `mcpServers.${serverName}.command`,
          message: 'Command file is not executable',
          severity: ValidationSeverity.WARNING,
          suggestion: 'Make the command file executable with chmod +x'
        });
      }
    }

    // Arguments validation
    if (server.args) {
      server.args.forEach((arg, index) => {
        if (typeof arg !== 'string') {
          errors.push({
            field: `mcpServers.${serverName}.args[${index}]`,
            message: 'Arguments must be strings',
            severity: ValidationSeverity.ERROR,
            code: 'INVALID_TYPE'
          });
        }

        // Check for potentially dangerous arguments
        if (typeof arg === 'string' && this.isDangerousArgument(arg)) {
          warnings.push({
            field: `mcpServers.${serverName}.args[${index}]`,
            message: `Potentially dangerous argument: ${arg}`,
            severity: ValidationSeverity.WARNING,
            suggestion: 'Review and validate this argument for security'
          });
        }
      });
    }

    // Environment variables validation
    if (server.env) {
      Object.entries(server.env).forEach(([key, value]) => {
        // Environment variable name validation
        if (!this.isValidEnvVarName(key)) {
          errors.push({
            field: `mcpServers.${serverName}.env.${key}`,
            message: 'Invalid environment variable name',
            severity: ValidationSeverity.ERROR,
            code: 'INVALID_ENV_VAR_NAME'
          });
        }

        // Environment variable value validation
        if (typeof value !== 'string') {
          errors.push({
            field: `mcpServers.${serverName}.env.${key}`,
            message: 'Environment variable values must be strings',
            severity: ValidationSeverity.ERROR,
            code: 'INVALID_TYPE'
          });
        }

        // Check for sensitive data in environment variables
        if (typeof value === 'string' && this.containsSensitiveData(key, value)) {
          warnings.push({
            field: `mcpServers.${serverName}.env.${key}`,
            message: 'Environment variable may contain sensitive data',
            severity: ValidationSeverity.WARNING,
            suggestion: 'Consider using environment variable references instead'
          });
        }
      });
    }

    // Working directory validation
    if (server.cwd && context.checkFileSystem) {
      const cwdValidation = await this.validateWorkingDirectory(server.cwd);
      if (!cwdValidation.exists) {
        warnings.push({
          field: `mcpServers.${serverName}.cwd`,
          message: `Working directory does not exist: ${server.cwd}`,
          severity: ValidationSeverity.WARNING,
          suggestion: 'Create the directory or use an existing path'
        });
      }

      if (!cwdValidation.isAccessible) {
        errors.push({
          field: `mcpServers.${serverName}.cwd`,
          message: `Working directory is not accessible: ${server.cwd}`,
          severity: ValidationSeverity.ERROR,
          code: 'DIRECTORY_NOT_ACCESSIBLE'
        });
      }
    }

    // Auto-approve validation
    if (server.autoApprove) {
      server.autoApprove.forEach((tool, index) => {
        if (typeof tool !== 'string') {
          errors.push({
            field: `mcpServers.${serverName}.autoApprove[${index}]`,
            message: 'Auto-approve tools must be strings',
            severity: ValidationSeverity.ERROR,
            code: 'INVALID_TYPE'
          });
        }

        if (typeof tool === 'string' && tool.includes('*') && !this.isValidGlobPattern(tool)) {
          warnings.push({
            field: `mcpServers.${serverName}.autoApprove[${index}]`,
            message: 'Invalid glob pattern in auto-approve tool',
            severity: ValidationSeverity.WARNING,
            suggestion: 'Use a valid glob pattern like *.txt'
          });
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate configuration structure
   */
  private static validateStructure(config: Configuration): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check if mcpServers exists
    if (!config.mcpServers) {
      errors.push({
        field: 'mcpServers',
        message: 'mcpServers field is required',
        severity: ValidationSeverity.ERROR,
        code: 'REQUIRED_FIELD'
      });
    } else if (typeof config.mcpServers !== 'object') {
      errors.push({
        field: 'mcpServers',
        message: 'mcpServers must be an object',
        severity: ValidationSeverity.ERROR,
        code: 'INVALID_TYPE'
      });
    } else if (Object.keys(config.mcpServers).length === 0) {
      warnings.push({
        field: 'mcpServers',
        message: 'No MCP servers configured',
        severity: ValidationSeverity.WARNING,
        suggestion: 'Add at least one MCP server to enable functionality'
      });
    }

    // Validate metadata
    if (config.metadata) {
      if (!config.metadata.version) {
        warnings.push({
          field: 'metadata.version',
          message: 'Configuration version not specified',
          severity: ValidationSeverity.WARNING,
          suggestion: 'Add a version field to track configuration changes'
        });
      }

      if (!config.metadata.lastModified) {
        warnings.push({
          field: 'metadata.lastModified',
          message: 'Last modified timestamp not specified',
          severity: ValidationSeverity.WARNING,
          suggestion: 'Add lastModified field with current timestamp'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate cross-server rules
   */
  private static validateCrossServerRules(config: Configuration): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!config.mcpServers || typeof config.mcpServers !== 'object') {
      return { isValid: true, errors, warnings };
    }

    const serverNames = Object.keys(config.mcpServers);
    const lowerCaseNames = serverNames.map(name => name.toLowerCase());

    // Check for duplicate names (case-insensitive)
    const duplicates = lowerCaseNames.filter((name, index) => 
      lowerCaseNames.indexOf(name) !== index
    );

    duplicates.forEach(duplicate => {
      const originalNames = serverNames.filter(name => name.toLowerCase() === duplicate);
      warnings.push({
        field: 'mcpServers',
        message: `Duplicate server names (case-insensitive): ${originalNames.join(', ')}`,
        severity: ValidationSeverity.WARNING,
        suggestion: 'Rename servers to have unique names'
      });
    });

    // Check for conflicting ports (if servers expose ports)
    const portConflicts = this.detectPortConflicts(config.mcpServers);
    portConflicts.forEach(conflict => {
      warnings.push({
        field: 'mcpServers',
        message: `Port conflict detected: ${conflict.servers.join(', ')} use port ${conflict.port}`,
        severity: ValidationSeverity.WARNING,
        suggestion: 'Use different ports for each server'
      });
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate client-specific rules
   */
  private static validateClientSpecificRules(config: Configuration, clientType: ClientType): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!config.mcpServers || typeof config.mcpServers !== 'object') {
      return { isValid: true, errors, warnings };
    }

    switch (clientType) {
      case ClientType.CLAUDE_DESKTOP:
        // Claude Desktop specific validations
        Object.entries(config.mcpServers).forEach(([name, server]) => {
          if (server.autoApprove && server.autoApprove.length > 0) {
            warnings.push({
              field: `mcpServers.${name}.autoApprove`,
              message: 'Claude Desktop may not support autoApprove feature',
              severity: ValidationSeverity.WARNING,
              suggestion: 'Remove autoApprove or check client documentation'
            });
          }
        });
        break;

      case ClientType.CODEX:
        // Codex specific validations
        Object.entries(config.mcpServers).forEach(([name, server]) => {
          if (server.env && Object.keys(server.env).length > 10) {
            warnings.push({
              field: `mcpServers.${name}.env`,
              message: 'Codex may have limitations with many environment variables',
              severity: ValidationSeverity.WARNING,
              suggestion: 'Consider reducing the number of servers for better performance'
            });
          }
        });
        break;

      case ClientType.VS_CODE:
        // VS Code specific validations
        if (Object.keys(config.mcpServers).length > 20) {
          warnings.push({
            field: 'mcpServers',
            message: 'VS Code may have performance issues with many MCP servers',
            severity: ValidationSeverity.WARNING,
            suggestion: 'Consider reducing the number of servers for better performance'
          });
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate command existence and executability
   */
  private static async validateCommand(command: string, context: ValidationContext): Promise<CommandValidationResult> {
    const result: CommandValidationResult = {
      exists: false,
      isExecutable: false,
      suggestions: []
    };

    if (!context.checkCommands) {
      return result;
    }

    try {
      // Check if command is an absolute path
      if (isAbsolute(command)) {
        result.exists = existsSync(command);
        if (result.exists) {
          result.absolutePath = command;
          const stats = await fs.stat(command);
          result.isExecutable = !!(stats.mode & parseInt('111', 8));
        }
      } else {
        // Search in PATH
        const pathDirs = process.env.PATH?.split(':') || [];
        for (const dir of pathDirs) {
          const fullPath = resolve(dir, command);
          if (existsSync(fullPath)) {
            result.exists = true;
            result.absolutePath = fullPath;
            const stats = await fs.stat(fullPath);
            result.isExecutable = !!(stats.mode & parseInt('111', 8));
            break;
          }
        }
      }

      // Generate suggestions for common commands
      if (!result.exists) {
        result.suggestions = this.generateCommandSuggestions(command);
      }
    } catch (error) {
      // Command validation failed, but don't throw
    }

    return result;
  }

  /**
   * Validate working directory
   */
  private static async validateWorkingDirectory(cwd: string): Promise<{ exists: boolean; isAccessible: boolean }> {
    try {
      const stats = await fs.stat(cwd);
      if (!stats.isDirectory()) {
        return { exists: false, isAccessible: false };
      }

      // Test accessibility by trying to read the directory
      await fs.readdir(cwd);
      return { exists: true, isAccessible: true };
    } catch (error) {
      return { exists: false, isAccessible: false };
    }
  }

  /**
   * Check if argument is potentially dangerous
   */
  private static isDangerousArgument(arg: string): boolean {
    const dangerousPatterns = [
      /--?rm\b/i,
      /--?delete\b/i,
      /--?force\b/i,
      /sudo\b/i,
      /\brm\s+/i,
      /\bmv\s+.*\/dev\/null/i,
      />\s*\/dev\/null/,
      /\|\s*sh\b/i,
      /\|\s*bash\b/i,
      /eval\s*\(/i
    ];

    return dangerousPatterns.some(pattern => pattern.test(arg));
  }

  /**
   * Validate environment variable name
   */
  private static isValidEnvVarName(name: string): boolean {
    // Environment variable names should start with letter or underscore
    // and contain only letters, numbers, and underscores
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
  }

  /**
   * Check if environment variable contains sensitive data
   */
  private static containsSensitiveData(key: string, value: string): boolean {
    const sensitiveKeys = [
      /password/i,
      /secret/i,
      /token/i,
      /key/i,
      /auth/i,
      /credential/i,
      /private/i
    ];

    const sensitiveValues = [
      /^[a-zA-Z0-9+/]{20,}={0,2}$/, // Base64-like
      /^[a-fA-F0-9]{32,}$/, // Hex tokens
      /^sk-[a-zA-Z0-9]{20,}$/, // OpenAI-style keys
      /^ghp_[a-zA-Z0-9]{36}$/, // GitHub tokens
    ];

    return sensitiveKeys.some(pattern => pattern.test(key)) ||
           sensitiveValues.some(pattern => pattern.test(value));
  }

  /**
   * Validate glob pattern
   */
  private static isValidGlobPattern(pattern: string): boolean {
    try {
      // Basic glob pattern validation
      // Check for balanced brackets and valid characters
      const brackets = pattern.match(/\[|\]/g);
      if (brackets && brackets.length % 2 !== 0) {
        return false;
      }

      // Check for invalid sequences
      if (pattern.includes('***') || pattern.includes('//')) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Detect port conflicts between servers
   */
  private static detectPortConflicts(servers: Record<string, MCPServer>): Array<{ port: number; servers: string[] }> {
    const portMap = new Map<number, string[]>();

    Object.entries(servers).forEach(([name, server]) => {
      // Extract port numbers from arguments and environment variables
      const ports = this.extractPorts(server);
      ports.forEach(port => {
        if (!portMap.has(port)) {
          portMap.set(port, []);
        }
        portMap.get(port)!.push(name);
      });
    });

    return Array.from(portMap.entries())
      .filter(([_, serverList]) => serverList.length > 1)
      .map(([port, serverList]) => ({ port, servers: serverList }));
  }

  /**
   * Extract port numbers from server configuration
   */
  private static extractPorts(server: MCPServer): number[] {
    const ports: number[] = [];

    // Check arguments for port patterns
    if (server.args) {
      server.args.forEach((arg, index) => {
        if (typeof arg === 'string') {
          // Check for --port=3000 or --port 3000 patterns
          const portMatches = arg.match(/--?port[=\s]?(\d+)/i) || arg.match(/:(\d+)$/);
          if (portMatches && portMatches[1]) {
            const port = parseInt(portMatches[1], 10);
            if (port > 0 && port < 65536) {
              ports.push(port);
            }
          }
          
          // Check for --port followed by next argument
          if (arg.match(/--?port$/i) && index + 1 < server.args.length) {
            const nextArg = server.args[index + 1];
            if (typeof nextArg === 'string' && /^\d+$/.test(nextArg)) {
              const port = parseInt(nextArg, 10);
              if (port > 0 && port < 65536) {
                ports.push(port);
              }
            }
          }
          
          // Check for standalone port numbers that might be ports
          if (/^\d+$/.test(arg)) {
            const port = parseInt(arg, 10);
            if (port >= 1000 && port < 65536) { // Only consider likely port numbers
              ports.push(port);
            }
          }
        }
      });
    }

    // Check environment variables for port patterns
    if (server.env) {
      Object.entries(server.env).forEach(([key, value]) => {
        if (typeof key === 'string' && typeof value === 'string' && 
            key.toLowerCase().includes('port') && /^\d+$/.test(value)) {
          const port = parseInt(value, 10);
          if (port > 0 && port < 65536) {
            ports.push(port);
          }
        }
      });
    }

    return ports;
  }

  /**
   * Generate command suggestions for common typos
   */
  private static generateCommandSuggestions(command: string): string[] {
    const commonCommands = [
      'node', 'python', 'python3', 'npm', 'npx', 'uvx', 'pip', 'pip3',
      'docker', 'java', 'go', 'rust', 'cargo', 'deno', 'bun'
    ];

    const suggestions: string[] = [];

    // Exact matches with common prefixes/suffixes
    commonCommands.forEach(cmd => {
      if (command.includes(cmd) || cmd.includes(command)) {
        suggestions.push(cmd);
      }
    });

    // Levenshtein distance for typos
    commonCommands.forEach(cmd => {
      if (this.levenshteinDistance(command, cmd) <= 2) {
        suggestions.push(cmd);
      }
    });

    return [...new Set(suggestions)].slice(0, 3);
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i;
    }

    for (let j = 0; j <= str2.length; j++) {
      matrix[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }
}