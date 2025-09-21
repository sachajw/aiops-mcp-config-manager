import { ConfigurationService } from '../ConfigurationService';
import { ConfigurationParser } from '../ConfigurationParser';
import { ValidationEngine } from '../ValidationEngine';
import { ClientType } from '../../../shared/types/enums';
import { Configuration } from '../../../shared/types/configuration';
import { promises as fs } from 'fs';

// Mock dependencies
jest.mock('../ConfigurationParser');
jest.mock('../ValidationEngine');
jest.mock('fs', () => ({
  promises: {
    writeFile: jest.fn()
  }
}));

describe('ConfigurationService', () => {
  const mockConfig: Configuration = {
    configuredClients: [{
      name: 'test-server',
      command: 'node',
      args: ['server.js'],
      env: { PORT: '3000' }
    }]
  };

  const mockValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };

  const mockParseResult = {
    success: true,
    data: mockConfig,
    errors: [],
    warnings: []
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mocks
    (ConfigurationParser.parseFile as jest.Mock).mockResolvedValue(mockParseResult);
    (ConfigurationParser.parseContent as jest.Mock).mockReturnValue(mockParseResult);
    (ConfigurationParser.formatForClient as jest.Mock).mockReturnValue('{}');
    (ConfigurationParser.validateSyntax as jest.Mock).mockReturnValue(mockValidationResult);
    (ValidationEngine.validateConfiguration as jest.Mock).mockResolvedValue(mockValidationResult);
    (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
  });

  describe('loadConfiguration', () => {
    it('should load and validate configuration successfully', async () => {
      const result = await ConfigurationService.loadConfiguration(
        '/path/to/config.json',
        ClientType.CLAUDE_DESKTOP
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockConfig);
      expect(ConfigurationParser.parseFile).toHaveBeenCalledWith(
        '/path/to/config.json',
        ClientType.CLAUDE_DESKTOP
      );
      expect(ValidationEngine.validateConfiguration).toHaveBeenCalledWith(
        mockConfig,
        expect.objectContaining({
          clientType: ClientType.CLAUDE_DESKTOP,
          sourcePath: '/path/to/config.json',
          checkFileSystem: true,
          checkCommands: true
        })
      );
    });

    it('should return parse failure when file parsing fails', async () => {
      const parseError = {
        success: false,
        data: null,
        errors: ['Parse error'],
        warnings: []
      };

      (ConfigurationParser.parseFile as jest.Mock).mockResolvedValue(parseError);

      const result = await ConfigurationService.loadConfiguration(
        '/invalid/config.json',
        ClientType.CLAUDE_DESKTOP
      );

      expect(result.success).toBe(false);
      expect(result.errors).toEqual(['Parse error']);
      expect(ValidationEngine.validateConfiguration).not.toHaveBeenCalled();
    });

    it('should merge validation errors with parse errors', async () => {
      const validationError = {
        isValid: false,
        errors: [{ field: 'command', message: 'Invalid command' }],
        warnings: []
      };

      (ValidationEngine.validateConfiguration as jest.Mock).mockResolvedValue(validationError);

      const result = await ConfigurationService.loadConfiguration(
        '/path/to/config.json',
        ClientType.CLAUDE_DESKTOP
      );

      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ message: 'Invalid command' })
      );
    });

    it('should apply custom validation options', async () => {
      const customOptions = {
        checkFileSystem: false,
        checkCommands: false
      };

      await ConfigurationService.loadConfiguration(
        '/path/to/config.json',
        ClientType.CLAUDE_DESKTOP,
        customOptions
      );

      expect(ValidationEngine.validateConfiguration).toHaveBeenCalledWith(
        mockConfig,
        expect.objectContaining(customOptions)
      );
    });

    it('should merge warnings from parse and validation', async () => {
      const parseWarnings = {
        ...mockParseResult,
        warnings: ['Parse warning']
      };

      const validationWarnings = {
        ...mockValidationResult,
        warnings: [{ field: 'env', message: 'Validation warning' }]
      };

      (ConfigurationParser.parseFile as jest.Mock).mockResolvedValue(parseWarnings);
      (ValidationEngine.validateConfiguration as jest.Mock).mockResolvedValue(validationWarnings);

      const result = await ConfigurationService.loadConfiguration(
        '/path/to/config.json',
        ClientType.CLAUDE_DESKTOP
      );

      expect(result.warnings).toHaveLength(2);
      expect(result.warnings[0]).toBe('Parse warning');
      expect(result.warnings[1]).toEqual(
        expect.objectContaining({ message: 'Validation warning' })
      );
    });
  });

  describe('validateConfiguration', () => {
    it('should validate configuration using ValidationEngine', async () => {
      const context = {
        clientType: ClientType.CLAUDE_DESKTOP,
        checkFileSystem: true,
        checkCommands: true
      };

      const result = await ConfigurationService.validateConfiguration(mockConfig, context);

      expect(result).toBe(mockValidationResult);
      expect(ValidationEngine.validateConfiguration).toHaveBeenCalledWith(mockConfig, context);
    });
  });

  describe('parseAndValidate', () => {
    const testContent = '{"configuredClients": []}';

    it('should parse and validate content successfully', async () => {
      const result = await ConfigurationService.parseAndValidate(
        testContent,
        ClientType.CLAUDE_DESKTOP
      );

      expect(result.success).toBe(true);
      expect(ConfigurationParser.parseContent).toHaveBeenCalledWith(
        testContent,
        ClientType.CLAUDE_DESKTOP
      );
      expect(ValidationEngine.validateConfiguration).toHaveBeenCalledWith(
        mockConfig,
        expect.objectContaining({
          clientType: ClientType.CLAUDE_DESKTOP,
          checkFileSystem: false,
          checkCommands: false
        })
      );
    });

    it('should return parse error immediately if parsing fails', async () => {
      const parseError = {
        success: false,
        data: null,
        errors: ['Invalid JSON'],
        warnings: []
      };

      (ConfigurationParser.parseContent as jest.Mock).mockReturnValue(parseError);

      const result = await ConfigurationService.parseAndValidate(
        'invalid json',
        ClientType.CLAUDE_DESKTOP
      );

      expect(result.success).toBe(false);
      expect(result.errors).toEqual(['Invalid JSON']);
      expect(ValidationEngine.validateConfiguration).not.toHaveBeenCalled();
    });

    it('should disable filesystem and command checks for content validation', async () => {
      await ConfigurationService.parseAndValidate(
        testContent,
        ClientType.CLAUDE_DESKTOP
      );

      expect(ValidationEngine.validateConfiguration).toHaveBeenCalledWith(
        mockConfig,
        expect.objectContaining({
          checkFileSystem: false,
          checkCommands: false
        })
      );
    });

    it('should allow custom validation options to override defaults', async () => {
      const customOptions = {
        checkFileSystem: true, // Override default false
        extraCheck: true
      };

      await ConfigurationService.parseAndValidate(
        testContent,
        ClientType.CLAUDE_DESKTOP,
        customOptions
      );

      expect(ValidationEngine.validateConfiguration).toHaveBeenCalledWith(
        mockConfig,
        expect.objectContaining(customOptions)
      );
    });
  });

  describe('saveConfiguration', () => {
    const testFilePath = '/path/to/save/config.json';

    it('should validate and save configuration successfully', async () => {
      const result = await ConfigurationService.saveConfiguration(
        mockConfig,
        testFilePath,
        ClientType.CLAUDE_DESKTOP
      );

      expect(result.success).toBe(true);
      expect(result.errors).toEqual([]);
      expect(ValidationEngine.validateConfiguration).toHaveBeenCalledWith(
        mockConfig,
        expect.objectContaining({
          clientType: ClientType.CLAUDE_DESKTOP,
          sourcePath: testFilePath,
          checkFileSystem: true,
          checkCommands: true
        })
      );
      expect(ConfigurationParser.formatForClient).toHaveBeenCalledWith(
        mockConfig,
        ClientType.CLAUDE_DESKTOP
      );
      expect(fs.writeFile).toHaveBeenCalledWith(testFilePath, '{}', 'utf-8');
    });

    it('should fail when validation fails', async () => {
      const validationError = {
        isValid: false,
        errors: [
          { field: 'command', message: 'Command not found' },
          { field: 'args', message: 'Invalid arguments' }
        ],
        warnings: [
          { field: 'env', message: 'Environment variable not set' }
        ]
      };

      (ValidationEngine.validateConfiguration as jest.Mock).mockResolvedValue(validationError);

      const result = await ConfigurationService.saveConfiguration(
        mockConfig,
        testFilePath,
        ClientType.CLAUDE_DESKTOP
      );

      expect(result.success).toBe(false);
      expect(result.errors).toEqual([
        'command: Command not found',
        'args: Invalid arguments'
      ]);
      expect(result.warnings).toEqual([
        'env: Environment variable not set'
      ]);
      expect(fs.writeFile).not.toHaveBeenCalled();
    });

    it('should handle file write errors', async () => {
      (fs.writeFile as jest.Mock).mockRejectedValue(new Error('Permission denied'));

      const result = await ConfigurationService.saveConfiguration(
        mockConfig,
        testFilePath,
        ClientType.CLAUDE_DESKTOP
      );

      expect(result.success).toBe(false);
      expect(result.errors).toEqual(['Failed to save configuration: Permission denied']);
    });

    it('should handle unknown errors', async () => {
      (fs.writeFile as jest.Mock).mockRejectedValue('Unknown error type');

      const result = await ConfigurationService.saveConfiguration(
        mockConfig,
        testFilePath,
        ClientType.CLAUDE_DESKTOP
      );

      expect(result.success).toBe(false);
      expect(result.errors).toEqual(['Failed to save configuration: Unknown error']);
    });

    it('should include warnings even on successful save', async () => {
      const validationWithWarnings = {
        isValid: true,
        errors: [],
        warnings: [{ field: 'env', message: 'Consider setting NODE_ENV' }]
      };

      (ValidationEngine.validateConfiguration as jest.Mock).mockResolvedValue(validationWithWarnings);

      const result = await ConfigurationService.saveConfiguration(
        mockConfig,
        testFilePath,
        ClientType.CLAUDE_DESKTOP
      );

      expect(result.success).toBe(true);
      expect(result.warnings).toEqual(['env: Consider setting NODE_ENV']);
    });

    it('should apply custom validation options', async () => {
      const customOptions = {
        checkCommands: false
      };

      await ConfigurationService.saveConfiguration(
        mockConfig,
        testFilePath,
        ClientType.CLAUDE_DESKTOP,
        customOptions
      );

      expect(ValidationEngine.validateConfiguration).toHaveBeenCalledWith(
        mockConfig,
        expect.objectContaining(customOptions)
      );
    });
  });

  describe('validateSyntax', () => {
    it('should delegate to ConfigurationParser.validateSyntax', () => {
      const content = '{"test": true}';

      const result = ConfigurationService.validateSyntax(content);

      expect(result).toBe(mockValidationResult);
      expect(ConfigurationParser.validateSyntax).toHaveBeenCalledWith(content);
    });
  });

  describe('formatForClient', () => {
    it('should delegate to ConfigurationParser.formatForClient', () => {
      const result = ConfigurationService.formatForClient(mockConfig, ClientType.CLAUDE_DESKTOP);

      expect(result).toBe('{}');
      expect(ConfigurationParser.formatForClient).toHaveBeenCalledWith(
        mockConfig,
        ClientType.CLAUDE_DESKTOP
      );
    });
  });

  describe('getSupportedClientTypes', () => {
    it('should return all supported client types', () => {
      const clientTypes = ConfigurationService.getSupportedClientTypes();

      expect(clientTypes).toEqual([
        ClientType.CLAUDE_DESKTOP,
        ClientType.CLAUDE_CODE,
        ClientType.CODEX,
        ClientType.VS_CODE,
        ClientType.GEMINI_DESKTOP,
        ClientType.GEMINI_CLI
      ]);
    });

    it('should return array with length > 0', () => {
      const clientTypes = ConfigurationService.getSupportedClientTypes();
      expect(clientTypes.length).toBeGreaterThan(0);
    });
  });

  describe('getDefaultValidationContext', () => {
    it('should return correct context for Claude Desktop', () => {
      const context = ConfigurationService.getDefaultValidationContext(ClientType.CLAUDE_DESKTOP);

      expect(context).toEqual({
        checkFileSystem: true,
        checkCommands: true
      });
    });

    it('should return correct context for Claude Code', () => {
      const context = ConfigurationService.getDefaultValidationContext(ClientType.CLAUDE_CODE);

      expect(context).toEqual({
        checkFileSystem: true,
        checkCommands: true
      });
    });

    it('should return correct context for Codex', () => {
      const context = ConfigurationService.getDefaultValidationContext(ClientType.CODEX);

      expect(context).toEqual({
        checkFileSystem: true,
        checkCommands: true
      });
    });

    it('should return disabled checks for VS Code', () => {
      const context = ConfigurationService.getDefaultValidationContext(ClientType.VS_CODE);

      expect(context).toEqual({
        checkFileSystem: false,
        checkCommands: false
      });
    });

    it('should return correct context for Gemini Desktop', () => {
      const context = ConfigurationService.getDefaultValidationContext(ClientType.GEMINI_DESKTOP);

      expect(context).toEqual({
        checkFileSystem: true,
        checkCommands: true
      });
    });

    it('should return correct context for Gemini CLI', () => {
      const context = ConfigurationService.getDefaultValidationContext(ClientType.GEMINI_CLI);

      expect(context).toEqual({
        checkFileSystem: true,
        checkCommands: true
      });
    });

    it('should return default context for unknown client type', () => {
      const unknownClientType = 'UNKNOWN_CLIENT' as ClientType;
      const context = ConfigurationService.getDefaultValidationContext(unknownClientType);

      expect(context).toEqual({
        checkFileSystem: true,
        checkCommands: true
      });
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete load-modify-save workflow', async () => {
      // Load
      const loadResult = await ConfigurationService.loadConfiguration(
        '/path/to/config.json',
        ClientType.CLAUDE_DESKTOP
      );

      expect(loadResult.success).toBe(true);

      // Modify config
      const modifiedConfig = {
        ...loadResult.data!,
        configuredClients: [
          ...loadResult.data!.configuredClients,
          {
            name: 'new-server',
            command: 'python',
            args: ['server.py']
          }
        ]
      };

      // Save
      const saveResult = await ConfigurationService.saveConfiguration(
        modifiedConfig,
        '/path/to/config.json',
        ClientType.CLAUDE_DESKTOP
      );

      expect(saveResult.success).toBe(true);
    });

    it('should handle validation failure during save', async () => {
      // Mock validation failure
      (ValidationEngine.validateConfiguration as jest.Mock)
        .mockResolvedValueOnce(mockValidationResult) // Load succeeds
        .mockResolvedValueOnce({ // Save fails
          isValid: false,
          errors: [{ field: 'command', message: 'Invalid command path' }],
          warnings: []
        });

      // Load
      const loadResult = await ConfigurationService.loadConfiguration(
        '/path/to/config.json',
        ClientType.CLAUDE_DESKTOP
      );

      expect(loadResult.success).toBe(true);

      // Try to save with invalid modification
      const invalidConfig = {
        ...loadResult.data!,
        configuredClients: [{
          name: 'invalid-server',
          command: '/invalid/path/to/command',
          args: []
        }]
      };

      const saveResult = await ConfigurationService.saveConfiguration(
        invalidConfig,
        '/path/to/config.json',
        ClientType.CLAUDE_DESKTOP
      );

      expect(saveResult.success).toBe(false);
      expect(saveResult.errors).toContain('command: Invalid command path');
    });

    it('should handle parse and validate with different client types', async () => {
      const content = '{"configuredClients": []}';

      // Test each client type
      const clientTypes = [
        ClientType.CLAUDE_DESKTOP,
        ClientType.CLAUDE_CODE,
        ClientType.CODEX,
        ClientType.VS_CODE,
        ClientType.GEMINI_DESKTOP,
        ClientType.GEMINI_CLI
      ];

      for (const clientType of clientTypes) {
        const result = await ConfigurationService.parseAndValidate(content, clientType);
        expect(result.success).toBe(true);

        // Verify validation was called with correct client type
        expect(ValidationEngine.validateConfiguration).toHaveBeenCalledWith(
          mockConfig,
          expect.objectContaining({ clientType })
        );
      }
    });
  });

  describe('error handling edge cases', () => {
    it('should handle null configuration data', async () => {
      const nullParseResult = {
        success: true,
        data: null,
        errors: [],
        warnings: []
      };

      (ConfigurationParser.parseFile as jest.Mock).mockResolvedValue(nullParseResult);

      const result = await ConfigurationService.loadConfiguration(
        '/path/to/config.json',
        ClientType.CLAUDE_DESKTOP
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
      expect(ValidationEngine.validateConfiguration).not.toHaveBeenCalled();
    });

    it('should handle empty validation errors and warnings arrays', async () => {
      const emptyValidationResult = {
        isValid: true,
        errors: [],
        warnings: []
      };

      (ValidationEngine.validateConfiguration as jest.Mock).mockResolvedValue(emptyValidationResult);

      const result = await ConfigurationService.loadConfiguration(
        '/path/to/config.json',
        ClientType.CLAUDE_DESKTOP
      );

      expect(result.success).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.warnings).toEqual([]);
    });

    it('should handle ValidationEngine throwing an error', async () => {
      (ValidationEngine.validateConfiguration as jest.Mock).mockRejectedValue(
        new Error('Validation engine crashed')
      );

      const result = await ConfigurationService.saveConfiguration(
        mockConfig,
        '/path/to/config.json',
        ClientType.CLAUDE_DESKTOP
      );

      expect(result.success).toBe(false);
      expect(result.errors).toEqual(['Failed to save configuration: Validation engine crashed']);
    });
  });
});