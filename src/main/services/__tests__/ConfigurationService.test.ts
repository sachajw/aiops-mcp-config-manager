import { ConfigurationService } from '../ConfigurationService';
import { ConfigurationParser } from '../ConfigurationParser';
import { ValidationEngine } from '../ValidationEngine';
import { ClientDetector } from '../ClientDetector';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

jest.mock('fs-extra');
jest.mock('../ConfigurationParser');
jest.mock('../ValidationEngine');
jest.mock('../ClientDetector');

describe('ConfigurationService', () => {
  let service: ConfigurationService;
  let mockParser: jest.Mocked<ConfigurationParser>;
  let mockValidator: jest.Mocked<ValidationEngine>;
  let mockDetector: jest.Mocked<ClientDetector>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockParser = new ConfigurationParser() as jest.Mocked<ConfigurationParser>;
    mockValidator = new ValidationEngine() as jest.Mocked<ValidationEngine>;
    mockDetector = new ClientDetector() as jest.Mocked<ClientDetector>;

    service = new ConfigurationService();
    (service as any).parser = mockParser;
    (service as any).validator = mockValidator;
    (service as any).detector = mockDetector;
  });

  describe('loadConfiguration', () => {
    it('should load configuration from valid file', async () => {
      const mockConfig = {
        mcpServers: {
          'test-server': {
            command: 'npx',
            args: ['test-server'],
          },
        },
      };

      mockParser.parse.mockResolvedValue(mockConfig);
      mockValidator.validateConfiguration.mockReturnValue({ isValid: true, errors: [] });

      const result = await service.loadConfiguration('/path/to/config.json');

      expect(result).toEqual(mockConfig);
      expect(mockParser.parse).toHaveBeenCalledWith('/path/to/config.json');
      expect(mockValidator.validateConfiguration).toHaveBeenCalledWith(mockConfig);
    });

    it('should throw error for invalid configuration', async () => {
      const mockConfig = { mcpServers: {} };

      mockParser.parse.mockResolvedValue(mockConfig);
      mockValidator.validateConfiguration.mockReturnValue({
        isValid: false,
        errors: ['Missing required fields']
      });

      await expect(service.loadConfiguration('/path/to/config.json'))
        .rejects.toThrow('Invalid configuration: Missing required fields');
    });

    it('should handle missing file gracefully', async () => {
      mockParser.parse.mockRejectedValue(new Error('File not found'));

      await expect(service.loadConfiguration('/path/to/missing.json'))
        .rejects.toThrow('File not found');
    });
  });

  describe('saveConfiguration', () => {
    it('should save valid configuration', async () => {
      const mockConfig = {
        mcpServers: {
          'test-server': {
            command: 'npx',
            args: ['test-server'],
          },
        },
      };

      mockValidator.validateConfiguration.mockReturnValue({ isValid: true, errors: [] });
      (fs.ensureDir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      await service.saveConfiguration('/path/to/config.json', mockConfig);

      expect(fs.ensureDir).toHaveBeenCalledWith(path.dirname('/path/to/config.json'));
      expect(fs.writeFile).toHaveBeenCalledWith(
        '/path/to/config.json',
        JSON.stringify(mockConfig, null, 2),
        'utf-8'
      );
    });

    it('should create backup before saving', async () => {
      const mockConfig = { mcpServers: {} };
      const existingConfig = { mcpServers: { old: {} } };

      mockValidator.validateConfiguration.mockReturnValue({ isValid: true, errors: [] });
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readJson as jest.Mock).mockResolvedValue(existingConfig);
      (fs.ensureDir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
      (fs.writeJson as jest.Mock).mockResolvedValue(undefined);

      await service.saveConfiguration('/path/to/config.json', mockConfig);

      expect(fs.writeJson).toHaveBeenCalledWith(
        expect.stringContaining('config.backup'),
        existingConfig
      );
    });
  });

  describe('addServer', () => {
    it('should add new server to configuration', async () => {
      const initialConfig = {
        mcpServers: {
          'existing-server': {
            command: 'npx',
            args: ['existing'],
          },
        },
      };

      const newServer = {
        name: 'new-server',
        command: 'npx',
        args: ['new-server'],
      };

      mockParser.parse.mockResolvedValue(initialConfig);
      mockValidator.validateConfiguration.mockReturnValue({ isValid: true, errors: [] });
      mockValidator.validateServer.mockReturnValue({ isValid: true, errors: [] });
      (fs.ensureDir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      await service.addServer('/path/to/config.json', newServer);

      expect(fs.writeFile).toHaveBeenCalledWith(
        '/path/to/config.json',
        expect.stringContaining('"new-server"'),
        'utf-8'
      );
    });

    it('should not add duplicate server', async () => {
      const config = {
        mcpServers: {
          'existing-server': {
            command: 'npx',
            args: ['existing'],
          },
        },
      };

      const duplicateServer = {
        name: 'existing-server',
        command: 'npx',
        args: ['new'],
      };

      mockParser.parse.mockResolvedValue(config);
      mockValidator.validateConfiguration.mockReturnValue({ isValid: true, errors: [] });

      await expect(service.addServer('/path/to/config.json', duplicateServer))
        .rejects.toThrow('Server "existing-server" already exists');
    });
  });

  describe('removeServer', () => {
    it('should remove existing server', async () => {
      const config = {
        mcpServers: {
          'server-to-remove': {
            command: 'npx',
            args: ['remove-me'],
          },
          'keep-server': {
            command: 'npx',
            args: ['keep-me'],
          },
        },
      };

      mockParser.parse.mockResolvedValue(config);
      mockValidator.validateConfiguration.mockReturnValue({ isValid: true, errors: [] });
      (fs.ensureDir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      await service.removeServer('/path/to/config.json', 'server-to-remove');

      const savedConfig = JSON.parse((fs.writeFile as jest.Mock).mock.calls[0][1]);
      expect(savedConfig.mcpServers).not.toHaveProperty('server-to-remove');
      expect(savedConfig.mcpServers).toHaveProperty('keep-server');
    });

    it('should throw error when removing non-existent server', async () => {
      const config = {
        mcpServers: {
          'existing-server': {
            command: 'npx',
            args: ['existing'],
          },
        },
      };

      mockParser.parse.mockResolvedValue(config);

      await expect(service.removeServer('/path/to/config.json', 'non-existent'))
        .rejects.toThrow('Server "non-existent" not found');
    });
  });

  describe('updateServer', () => {
    it('should update existing server configuration', async () => {
      const config = {
        mcpServers: {
          'update-me': {
            command: 'npx',
            args: ['old-args'],
            env: { OLD: 'value' },
          },
        },
      };

      const updates = {
        args: ['new-args'],
        env: { NEW: 'value' },
      };

      mockParser.parse.mockResolvedValue(config);
      mockValidator.validateConfiguration.mockReturnValue({ isValid: true, errors: [] });
      mockValidator.validateServer.mockReturnValue({ isValid: true, errors: [] });
      (fs.ensureDir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      await service.updateServer('/path/to/config.json', 'update-me', updates);

      const savedConfig = JSON.parse((fs.writeFile as jest.Mock).mock.calls[0][1]);
      expect(savedConfig.mcpServers['update-me'].args).toEqual(['new-args']);
      expect(savedConfig.mcpServers['update-me'].env).toEqual({ NEW: 'value' });
      expect(savedConfig.mcpServers['update-me'].command).toBe('npx');
    });
  });

  describe('syncConfigurations', () => {
    it('should sync servers between configurations', async () => {
      const sourceConfig = {
        mcpServers: {
          'server1': { command: 'npx', args: ['server1'] },
          'server2': { command: 'npx', args: ['server2'] },
        },
      };

      const targetConfig = {
        mcpServers: {
          'server3': { command: 'npx', args: ['server3'] },
        },
      };

      mockParser.parse.mockResolvedValueOnce(sourceConfig)
        .mockResolvedValueOnce(targetConfig);
      mockValidator.validateConfiguration.mockReturnValue({ isValid: true, errors: [] });
      (fs.ensureDir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      await service.syncConfigurations(
        '/source/config.json',
        '/target/config.json',
        ['server1']
      );

      const savedConfig = JSON.parse((fs.writeFile as jest.Mock).mock.calls[0][1]);
      expect(savedConfig.mcpServers).toHaveProperty('server1');
      expect(savedConfig.mcpServers).toHaveProperty('server3');
      expect(savedConfig.mcpServers).not.toHaveProperty('server2');
    });
  });

  describe('detectClients', () => {
    it('should detect installed clients', async () => {
      const mockClients = [
        {
          name: 'Claude Desktop',
          installed: true,
          configPath: '/path/to/claude/config.json',
        },
        {
          name: 'VS Code',
          installed: false,
          configPath: null,
        },
      ];

      mockDetector.detectInstalledClients.mockResolvedValue(mockClients);

      const result = await service.detectClients();

      expect(result).toEqual(mockClients);
      expect(mockDetector.detectInstalledClients).toHaveBeenCalled();
    });
  });

  describe('exportConfiguration', () => {
    it('should export configuration with metadata', async () => {
      const config = {
        mcpServers: {
          'server1': { command: 'npx', args: ['server1'] },
        },
      };

      mockParser.parse.mockResolvedValue(config);
      mockValidator.validateConfiguration.mockReturnValue({ isValid: true, errors: [] });

      const exported = await service.exportConfiguration('/path/to/config.json');

      expect(exported).toHaveProperty('config', config);
      expect(exported).toHaveProperty('metadata');
      expect(exported.metadata).toHaveProperty('exportedAt');
      expect(exported.metadata).toHaveProperty('version');
    });
  });

  describe('importConfiguration', () => {
    it('should import valid configuration', async () => {
      const importData = {
        config: {
          mcpServers: {
            'imported-server': { command: 'npx', args: ['imported'] },
          },
        },
        metadata: {
          exportedAt: new Date().toISOString(),
          version: '1.0.0',
        },
      };

      mockValidator.validateConfiguration.mockReturnValue({ isValid: true, errors: [] });
      (fs.ensureDir as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      await service.importConfiguration('/path/to/config.json', importData);

      expect(fs.writeFile).toHaveBeenCalledWith(
        '/path/to/config.json',
        JSON.stringify(importData.config, null, 2),
        'utf-8'
      );
    });
  });
});