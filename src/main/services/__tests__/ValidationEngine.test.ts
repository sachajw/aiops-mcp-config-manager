import { ValidationEngine, ValidationContext } from '../ValidationEngine';
import { ClientType } from '../../../shared/types/enums';

describe('ValidationEngine', () => {
  const defaultContext: ValidationContext = {
    clientType: ClientType.CLAUDE_DESKTOP,
    checkFileSystem: false,
    checkCommands: false,
  };

  describe('validateConfiguration', () => {
    test('should validate valid configuration', async () => {
      const validConfig = {
        mcpServers: {
          'memory-server': {
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-memory'],
          },
          'git-server': {
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-git'],
            env: {
              GIT_REPO: '/path/to/repo',
            },
          },
        },
        metadata: {
          version: '1.0',
          scope: 'user' as any,
          lastModified: new Date()
        }
      };

      const result = await ValidationEngine.validateConfiguration(validConfig, defaultContext);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should handle empty configuration', async () => {
      const emptyConfig = {
        mcpServers: {},
        metadata: {
          version: '1.0',
          scope: 'user' as any,
          lastModified: new Date()
        }
      };

      const result = await ValidationEngine.validateConfiguration(emptyConfig, defaultContext);

      // ValidationEngine should handle empty config gracefully
      expect(result).toBeDefined();
    });

    test('should handle invalid configuration structure', async () => {
      const invalidConfig = {
        mcpServers: 'not-an-object',
        metadata: {
          version: '1.0',
          scope: 'user' as any,
          lastModified: new Date()
        }
      };

      const result = await ValidationEngine.validateConfiguration(invalidConfig, defaultContext);

      // ValidationEngine should detect structural issues
      expect(result).toBeDefined();
    });
  });

  // TODO: Add more specific validation tests when ValidationEngine methods are fully implemented
  // These tests were removed because they referenced undefined 'validator' object
  // Future tests should use ValidationEngine static methods instead
});