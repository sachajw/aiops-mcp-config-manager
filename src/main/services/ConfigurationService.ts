import { ConfigurationParser, ParseResult } from './ConfigurationParser';
import { ValidationEngine, ValidationContext } from './ValidationEngine';
import { Configuration } from '../../shared/types/configuration';
import { ValidationResult } from '../../shared/types/common';
import { ClientType } from '../../shared/types/enums';
import { promises as fs } from 'fs';

/**
 * High-level configuration service that combines parsing and validation
 */
export class ConfigurationService {
  /**
   * Load and validate configuration from file
   */
  static async loadConfiguration(
    filePath: string, 
    clientType: ClientType,
    validationOptions: Partial<ValidationContext> = {}
  ): Promise<ParseResult> {
    // Parse the configuration file
    const parseResult = await ConfigurationParser.parseFile(filePath, clientType);
    
    if (!parseResult.success || !parseResult.data) {
      return parseResult;
    }

    // Perform additional validation
    const validationContext: ValidationContext = {
      clientType,
      sourcePath: filePath,
      checkFileSystem: true,
      checkCommands: true,
      ...validationOptions
    };

    const validationResult = await ValidationEngine.validateConfiguration(
      parseResult.data,
      validationContext
    );

    // Merge validation results with parse results
    return {
      ...parseResult,
      success: parseResult.success && validationResult.isValid,
      errors: [...parseResult.errors, ...validationResult.errors],
      warnings: [...parseResult.warnings, ...validationResult.warnings]
    };
  }

  /**
   * Validate configuration content without file I/O
   */
  static async validateConfiguration(
    config: Configuration,
    context: ValidationContext
  ): Promise<ValidationResult> {
    return ValidationEngine.validateConfiguration(config, context);
  }

  /**
   * Parse configuration content with validation
   */
  static parseAndValidate(
    content: string,
    clientType: ClientType,
    validationOptions: Partial<ValidationContext> = {}
  ): Promise<ParseResult> {
    // Parse the content
    const parseResult = ConfigurationParser.parseContent(content, clientType);
    
    if (!parseResult.success || !parseResult.data) {
      return Promise.resolve(parseResult);
    }

    // Perform additional validation
    const validationContext: ValidationContext = {
      clientType,
      checkFileSystem: false, // No file system checks for content-only validation
      checkCommands: false,   // No command checks for content-only validation
      ...validationOptions
    };

    return ValidationEngine.validateConfiguration(parseResult.data, validationContext)
      .then(validationResult => ({
        ...parseResult,
        success: parseResult.success && validationResult.isValid,
        errors: [...parseResult.errors, ...validationResult.errors],
        warnings: [...parseResult.warnings, ...validationResult.warnings]
      }));
  }

  /**
   * Save configuration to file with validation
   */
  static async saveConfiguration(
    config: Configuration,
    filePath: string,
    clientType: ClientType,
    validationOptions: Partial<ValidationContext> = {}
  ): Promise<{ success: boolean; errors: string[]; warnings: string[] }> {
    try {
      // Validate before saving
      const validationContext: ValidationContext = {
        clientType,
        sourcePath: filePath,
        checkFileSystem: true,
        checkCommands: true,
        ...validationOptions
      };

      const validationResult = await ValidationEngine.validateConfiguration(config, validationContext);
      
      if (!validationResult.isValid) {
        return {
          success: false,
          errors: validationResult.errors.map(e => `${e.field}: ${e.message}`),
          warnings: validationResult.warnings.map(w => `${w.field}: ${w.message}`)
        };
      }

      // Format for client and save
      const formattedContent = ConfigurationParser.formatForClient(config, clientType, filePath);
      await fs.writeFile(filePath, formattedContent, 'utf-8');

      return {
        success: true,
        errors: [],
        warnings: validationResult.warnings.map(w => `${w.field}: ${w.message}`)
      };
    } catch (error) {
      return {
        success: false,
        errors: [`Failed to save configuration: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: []
      };
    }
  }

  /**
   * Validate JSON5 syntax only
   */
  static validateSyntax(content: string): ValidationResult {
    return ConfigurationParser.validateSyntax(content);
  }

  /**
   * Format configuration for specific client
   */
  static formatForClient(config: Configuration, clientType: ClientType): string {
    return ConfigurationParser.formatForClient(config, clientType);
  }

  /**
   * Get supported client types
   */
  static getSupportedClientTypes(): ClientType[] {
    return [
      ClientType.CLAUDE_DESKTOP,
      ClientType.CLAUDE_CODE,
      ClientType.CODEX,
      ClientType.VS_CODE,
      ClientType.GEMINI_DESKTOP,
      ClientType.GEMINI_CLI
    ];
  }

  /**
   * Get validation context defaults for client type
   */
  static getDefaultValidationContext(clientType: ClientType): Partial<ValidationContext> {
    switch (clientType) {
      case ClientType.CLAUDE_DESKTOP:
        return {
          checkFileSystem: true,
          checkCommands: true
        };
      
      case ClientType.CLAUDE_CODE:
        return {
          checkFileSystem: true,
          checkCommands: true
        };
      
      case ClientType.CODEX:
        return {
          checkFileSystem: true,
          checkCommands: true
        };
      
      case ClientType.VS_CODE:
        return {
          checkFileSystem: false, // VS Code handles this
          checkCommands: false    // VS Code handles this
        };
      
      case ClientType.GEMINI_DESKTOP:
      case ClientType.GEMINI_CLI:
        return {
          checkFileSystem: true,
          checkCommands: true
        };
      
      default:
        return {
          checkFileSystem: true,
          checkCommands: true
        };
    }
  }
}