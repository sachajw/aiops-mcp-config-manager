/**
 * Configuration IPC Handler
 * Handles all configuration CRUD operations
 */

import { BaseHandler } from './BaseHandler';
import { container } from '../../container';
import { Configuration } from '../../../shared/types';
import { ConfigScope } from '../../../shared/types/enums';
import {
  Configuration as ConfigurationNew,
  ValidationResult
} from '../../../shared/types/models.new';
import { ApplicationError, ErrorCategory, ErrorSeverity } from '../../../shared/utils/ErrorHandler';
import { ClientDetector } from '../../services';

export class ConfigHandler extends BaseHandler {
  constructor() {
    super('config');
  }

  /**
   * Register all configuration-related IPC handlers
   */
  register(): void {
    const configurationManager = container.getConfigurationManager();
    const clientDetector = container.getClientDetector();
    const validationEngine = container.getValidationEngine();
    const backupManager = container.getBackupManager();

    // Load configuration
    this.handle<[string, ConfigScope?], Configuration | null>(
      'load',
      async (_, clientId: string, scope?: ConfigScope) => {
        console.log(`Loading config for ${clientId}, scope: ${scope}`);
        return configurationManager.readConfiguration(clientId, scope);
      }
    );

    // Save configuration
    this.handle<[string, Configuration, ConfigScope?], boolean>(
      'save',
      async (_, clientId: string, configuration: Configuration, scope?: ConfigScope) => {
        console.log(`Saving config for ${clientId}, scope: ${scope}`);
        await configurationManager.writeConfiguration(clientId, configuration, scope);
        return true;
      }
    );

    // Resolve configuration (merge all scopes)
    this.handle<[string], Configuration | null>(
      'resolve',
      async (_, clientId: string) => {
        console.log(`Resolving config for ${clientId}`);
        // Load with default scope to get merged configuration
        return configurationManager.readConfiguration(clientId);
      }
    );

    // Validate configuration
    this.handle<[Configuration], ValidationResult>(
      'validate',
      async (_, configuration: Configuration) => {
        return validationEngine.validateConfiguration(configuration);
      }
    );

    // Get available scopes
    this.handle<[string], ConfigScope[]>(
      'getScopes',
      async (_, clientId: string) => {
        return Object.values(ConfigScope);
      }
    );

    // Delete configuration
    this.handle<[string, ConfigScope?], void>(
      'delete',
      async (_, clientId: string, scope?: ConfigScope) => {
        console.log(`Deleting config for ${clientId}, scope: ${scope}`);
        await configurationManager.deleteConfiguration(clientId, scope);
      }
    );

    // Export configuration
    this.handle<[string], string>(
      'export',
      async (_, clientId: string) => {
        const config = await configurationManager.readConfiguration(clientId);
        return JSON.stringify(config, null, 2);
      }
    );

    // Import configuration
    this.handle<[string, string], boolean>(
      'import',
      async (_, clientId: string, configJson: string) => {
        try {
          const config = JSON.parse(configJson);
          await configurationManager.writeConfiguration(clientId, config);
          return true;
        } catch (error) {
          throw new ApplicationError(
            'Failed to import configuration',
            ErrorCategory.CONFIGURATION,
            ErrorSeverity.HIGH
          ).withDetails('Invalid JSON format');
        }
      }
    );

    // Detect clients (unified config service)
    this.handle<[], Array<{
      id: string;
      name: string;
      installed: boolean;
      configPath?: string;
      detected?: boolean;
    }>>('detect', async () => {
      console.log('Detecting clients via config:detect...');
      const unifiedConfigService = container.get<{
        detectClients(): Promise<Array<{
          id: string;
          name: string;
          installed: boolean;
          configPath?: string;
          detected?: boolean;
        }>>;
      }>('unifiedConfigService');
      const clients = await unifiedConfigService.detectClients();
      console.log(`Found ${clients.filter(c => c.installed).length} installed clients out of ${clients.length} total`);
      return clients;
    });

    console.log('[ConfigHandler] Registered all configuration handlers');
  }
}