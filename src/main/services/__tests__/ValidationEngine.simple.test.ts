import { ValidationEngine, ValidationContext } from '../ValidationEngine';
import { ClientType } from '../../../shared/types/enums';

describe('ValidationEngine - Basic Tests', () => {
  const context: ValidationContext = {
    clientType: ClientType.CLAUDE_DESKTOP,
    checkFileSystem: false,
    checkCommands: false,
  };

  describe('validateConfiguration', () => {
    it('should validate a valid configuration', async () => {
      const config = {
        mcpServers: {
          'test-server': {
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-memory'],
          },
        },
        metadata: {
          version: '1.0',
          scope: 'user' as any,
          lastModified: new Date()
        }
      };

      const result = await ValidationEngine.validateConfiguration(config, context);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing mcpServers', async () => {
      const config = {};

      const result = await ValidationEngine.validateConfiguration(config as any, context);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateServer', () => {
    it('should validate a valid server', async () => {
      const server = {
        command: 'npx',
        args: ['@modelcontextprotocol/server-memory'],
      };

      const result = await ValidationEngine.validateServer('test-server', server as any, context);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing command', async () => {
      const server = {
        args: ['server'],
      };

      const result = await ValidationEngine.validateServer('test-server', server as any, context);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});