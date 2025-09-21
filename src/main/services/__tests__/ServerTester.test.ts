import { ServerTester, TestConfiguration, ServerTestResult } from '../ServerTester';
import { TestStatus } from '../../../shared/types/enums';
import { spawn } from 'child_process';
import * as fs from 'fs-extra';

// Mock require('util').promisify and require('child_process').exec directly in the test
const mockPromisifiedExec = jest.fn().mockResolvedValue({ stdout: '/usr/local/bin/node\n', stderr: '' });

jest.mock('util', () => ({
  promisify: jest.fn(() => mockPromisifiedExec)
}));

// Mock spawn to return a fake process that emits events
const mockChildProcess = {
  stdout: { on: jest.fn() },
  stderr: { on: jest.fn() },
  on: jest.fn(),
  kill: jest.fn(),
  killed: false,
  pid: 12345
};

jest.mock('child_process', () => ({
  spawn: jest.fn(() => mockChildProcess),
  exec: jest.fn()
}));
jest.mock('fs-extra');
jest.mock('../../utils/pathResolver', () => ({
  MacOSPathResolver: {
    expandTildeInPath: jest.fn((path: string) => path) // Return path as-is
  }
}));
jest.mock('../../utils/fileSystemUtils', () => ({
  FileSystemUtils: {
    fileExists: jest.fn(() => Promise.resolve(true)),
    directoryExists: jest.fn(() => Promise.resolve(true))
  }
}));

describe('ServerTester', () => {
  const mockServerConfig = {
    name: 'test-server',
    command: 'node',
    args: ['server.js'],
    env: { PORT: '3000' }
  };

  const defaultTestConfig: TestConfiguration = {
    timeout: 5000,
    checkCommand: true,
    checkWorkingDirectory: true,
    checkEnvironment: true,
    testConnection: true,
    startupTimeout: 3000
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (fs.pathExists as jest.Mock).mockResolvedValue(true);
    (fs.stat as jest.Mock).mockResolvedValue({
      isDirectory: () => true,
      isFile: () => true,
      mode: parseInt('755', 8) // Executable permissions
    });
    (fs.access as jest.Mock).mockResolvedValue(undefined); // Mock access check to succeed

    // Reset and configure child process mock
    mockChildProcess.on.mockImplementation((event: string, callback: Function) => {
      if (event === 'spawn') {
        // Emit spawn event immediately
        setTimeout(() => callback(), 10);
      }
      return mockChildProcess;
    });
  });

  describe('testServer', () => {
    it('should test server successfully with valid configuration', async () => {
      const result = await ServerTester.testServer(mockServerConfig, defaultTestConfig);

      expect(result).toBeDefined();
      expect(result.details).toBeDefined();
      expect(result.details.command).toBeDefined();
      expect(typeof result.duration).toBe('number');
    });

    it('should handle configuration with disabled checks', async () => {
      const minimalConfig: TestConfiguration = {
        timeout: 1000,
        checkCommand: false,
        checkWorkingDirectory: false,
        checkEnvironment: false,
        testConnection: false,
        startupTimeout: 1000
      };

      const result = await ServerTester.testServer(mockServerConfig, minimalConfig);

      expect(result).toBeDefined();
      expect(result.details.command).toBeDefined();
    });

    it('should handle missing command gracefully', async () => {
      const invalidServerConfig = {
        ...mockServerConfig,
        command: ''
      };

      const result = await ServerTester.testServer(invalidServerConfig, defaultTestConfig);

      expect(result).toBeDefined();
      expect(result.success).toBe(false);
    });

    it('should handle file system errors gracefully', async () => {
      (fs.pathExists as jest.Mock).mockRejectedValue(new Error('File system error'));

      const result = await ServerTester.testServer(mockServerConfig, defaultTestConfig);

      expect(result).toBeDefined();
      // Should handle errors gracefully
    });

    it('should respect timeout settings', async () => {
      const shortTimeoutConfig: TestConfiguration = {
        ...defaultTestConfig,
        timeout: 100,
        startupTimeout: 50
      };

      const result = await ServerTester.testServer(mockServerConfig, shortTimeoutConfig);

      expect(result).toBeDefined();
      expect(result.duration).toBeLessThan(shortTimeoutConfig.timeout + 1000); // Allow more margin for test environment
    });

    it('should validate working directory when enabled', async () => {
      const serverWithCwd = {
        ...mockServerConfig,
        cwd: '/test/working/directory'
      };

      const result = await ServerTester.testServer(serverWithCwd, defaultTestConfig);

      expect(result).toBeDefined();
      expect(result.details.workingDirectory).toBeDefined();
      expect(result.details.workingDirectory.passed).toBeDefined();
    });

    it('should validate environment variables when enabled', async () => {
      const serverWithEnv = {
        ...mockServerConfig,
        env: {
          NODE_ENV: 'production',
          API_KEY: 'test-key'
        }
      };

      const result = await ServerTester.testServer(serverWithEnv, defaultTestConfig);

      expect(result).toBeDefined();
      expect(result.details.environment).toBeDefined();
      expect(result.details.environment.passed).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle null server configuration', async () => {
      const nullServer = null as any;

      const result = await ServerTester.testServer(nullServer, defaultTestConfig);

      expect(result).toBeDefined();
      expect(result.success).toBe(false);
    });

    it('should handle empty args array', async () => {
      const serverWithEmptyArgs = {
        ...mockServerConfig,
        args: []
      };

      const result = await ServerTester.testServer(serverWithEmptyArgs, defaultTestConfig);

      expect(result).toBeDefined();
    });

    it('should handle very short timeout', async () => {
      const veryShortConfig: TestConfiguration = {
        ...defaultTestConfig,
        timeout: 1,
        startupTimeout: 1
      };

      const result = await ServerTester.testServer(mockServerConfig, veryShortConfig);

      expect(result).toBeDefined();
    });

    it('should handle unicode characters in server config', async () => {
      const unicodeServer = {
        ...mockServerConfig,
        name: 'тест-сервер-测试',
        command: 'node',
        args: ['файл.js']
      };

      const result = await ServerTester.testServer(unicodeServer, defaultTestConfig);

      expect(result).toBeDefined();
    });
  });

  describe('validation tests', () => {
    it('should validate that result has required properties', async () => {
      const result = await ServerTester.testServer(mockServerConfig, defaultTestConfig);

      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('duration');
      expect(result).toHaveProperty('details');
      expect(result.details).toHaveProperty('command');
    });

    it('should return consistent result structure', async () => {
      const result1 = await ServerTester.testServer(mockServerConfig, defaultTestConfig);
      const result2 = await ServerTester.testServer(mockServerConfig, defaultTestConfig);

      expect(Object.keys(result1)).toEqual(Object.keys(result2));
      expect(Object.keys(result1.details)).toEqual(Object.keys(result2.details));
    });
  });
});