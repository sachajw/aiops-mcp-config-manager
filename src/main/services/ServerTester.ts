import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs-extra';
import * as path from 'path';
import { MCPServer } from '../../shared/types/server';
import { TestStatus } from '../../shared/types/enums';
import { MacOSPathResolver } from '../utils/pathResolver';
import { FileSystemUtils } from '../utils/fileSystemUtils';

/**
 * Server test configuration
 */
export interface TestConfiguration {
  /** Test timeout in milliseconds */
  timeout: number;
  /** Whether to test command accessibility */
  checkCommand: boolean;
  /** Whether to test working directory */
  checkWorkingDirectory: boolean;
  /** Whether to test environment variables */
  checkEnvironment: boolean;
  /** Whether to attempt actual server connection */
  testConnection: boolean;
  /** Maximum time to wait for server startup */
  startupTimeout: number;
}

/**
 * Server test result
 */
export interface ServerTestResult {
  /** Test status */
  status: TestStatus;
  /** Success flag */
  success: boolean;
  /** Human-readable message */
  message: string;
  /** Test duration in milliseconds */
  duration: number;
  /** Detailed test results by category */
  details: {
    command: TestStepResult;
    workingDirectory?: TestStepResult;
    environment?: TestStepResult;
    connection?: TestStepResult;
  };
  /** Process ID if server was started */
  processId?: number;
  /** Server output/logs */
  output?: {
    stdout: string[];
    stderr: string[];
  };
}

/**
 * Individual test step result
 */
export interface TestStepResult {
  /** Whether this step passed */
  passed: boolean;
  /** Step message */
  message: string;
  /** Step duration in milliseconds */
  duration: number;
  /** Additional details */
  details?: any;
}

/**
 * Command validation result
 */
export interface CommandValidationResult {
  /** Whether command is valid */
  isValid: boolean;
  /** Resolved command path */
  resolvedPath?: string;
  /** Whether command is executable */
  isExecutable: boolean;
  /** Validation message */
  message: string;
  /** Command type detected */
  commandType: 'absolute' | 'relative' | 'system' | 'shell-builtin';
}

/**
 * Comprehensive MCP server configuration and connection testing
 */
export class ServerTester {
  private static readonly DEFAULT_CONFIG: TestConfiguration = {
    timeout: 10000,
    checkCommand: true,
    checkWorkingDirectory: true,
    checkEnvironment: true,
    testConnection: false, // Disabled by default as it requires actual server startup
    startupTimeout: 5000
  };

  /**
   * Test MCP server configuration comprehensively
   */
  static async testServer(
    server: MCPServer,
    config: Partial<TestConfiguration> = {}
  ): Promise<ServerTestResult> {
    const testConfig = { ...this.DEFAULT_CONFIG, ...config };
    const startTime = Date.now();
    
    const result: ServerTestResult = {
      status: TestStatus.PENDING,
      success: false,
      message: '',
      duration: 0,
      details: {
        command: { passed: false, message: '', duration: 0 }
      }
    };

    try {
      // Test command validation
      if (testConfig.checkCommand) {
        result.details.command = await this.testCommand(server, testConfig);
        if (!result.details.command.passed) {
          result.status = TestStatus.FAILED;
          result.message = `Command validation failed: ${result.details.command.message}`;
          result.duration = Date.now() - startTime;
          return result;
        }
      }

      // Test working directory
      if (testConfig.checkWorkingDirectory && server.cwd) {
        result.details.workingDirectory = await this.testWorkingDirectory(server, testConfig);
        if (!result.details.workingDirectory.passed) {
          result.status = TestStatus.FAILED;
          result.message = `Working directory validation failed: ${result.details.workingDirectory.message}`;
          result.duration = Date.now() - startTime;
          return result;
        }
      }

      // Test environment variables
      if (testConfig.checkEnvironment && server.env) {
        result.details.environment = await this.testEnvironment(server, testConfig);
        if (!result.details.environment.passed) {
          result.status = TestStatus.FAILED;
          result.message = `Environment validation failed: ${result.details.environment.message}`;
          result.duration = Date.now() - startTime;
          return result;
        }
      }

      // Test actual server connection if requested
      if (testConfig.testConnection) {
        result.details.connection = await this.testServerConnection(server, testConfig);
        if (!result.details.connection.passed) {
          result.status = TestStatus.FAILED;
          result.message = `Server connection failed: ${result.details.connection.message}`;
          result.duration = Date.now() - startTime;
          return result;
        }
        
        // Extract process ID if available
        if (result.details.connection.details?.processId) {
          result.processId = result.details.connection.details.processId;
        }
      }

      // All tests passed
      result.status = TestStatus.SUCCESS;
      result.success = true;
      result.message = 'All server tests passed successfully';
      result.duration = Date.now() - startTime;

      return result;

    } catch (error: any) {
      result.status = TestStatus.FAILED;
      result.success = false;
      result.message = `Test failed with error: ${error.message}`;
      result.duration = Date.now() - startTime;
      return result;
    }
  }

  /**
   * Validate server command
   */
  static async validateCommand(server: MCPServer): Promise<CommandValidationResult> {
    const stepStart = Date.now();
    
    if (!server.command) {
      return {
        isValid: false,
        isExecutable: false,
        message: 'Server command is required',
        commandType: 'absolute'
      };
    }

    const command = server.command.trim();
    const expandedCommand = MacOSPathResolver.expandTildeInPath(command);
    
    // Determine command type
    let commandType: CommandValidationResult['commandType'];
    if (path.isAbsolute(expandedCommand)) {
      commandType = 'absolute';
    } else if (command.includes('/')) {
      commandType = 'relative';
    } else {
      commandType = 'system';
    }

    // For absolute paths, check if file exists and is executable
    if (commandType === 'absolute') {
      try {
        const exists = await FileSystemUtils.fileExists(expandedCommand);
        if (!exists) {
          return {
            isValid: false,
            isExecutable: false,
            message: `Command file not found: ${expandedCommand}`,
            commandType
          };
        }

        const stats = await fs.stat(expandedCommand);
        const isExecutable = stats.isFile() && !!(stats.mode & parseInt('111', 8));
        
        return {
          isValid: isExecutable,
          resolvedPath: expandedCommand,
          isExecutable,
          message: isExecutable ? 'Command is valid and executable' : 'Command file is not executable',
          commandType
        };

      } catch (error: any) {
        return {
          isValid: false,
          isExecutable: false,
          message: `Failed to validate command: ${error.message}`,
          commandType
        };
      }
    }

    // For system commands, try to resolve using 'which'
    if (commandType === 'system') {
      try {
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        
        const { stdout } = await execAsync(`which "${command}"`);
        const resolvedPath = stdout.trim();
        
        if (resolvedPath) {
          return {
            isValid: true,
            resolvedPath,
            isExecutable: true,
            message: `System command resolved to: ${resolvedPath}`,
            commandType
          };
        } else {
          return {
            isValid: false,
            isExecutable: false,
            message: `System command not found in PATH: ${command}`,
            commandType
          };
        }

      } catch (error) {
        return {
          isValid: false,
          isExecutable: false,
          message: `Command not found in system PATH: ${command}`,
          commandType
        };
      }
    }

    // For relative paths, check if file exists relative to working directory
    if (commandType === 'relative') {
      const basePath = server.cwd ? MacOSPathResolver.expandTildeInPath(server.cwd) : process.cwd();
      const fullPath = path.resolve(basePath, expandedCommand);
      
      try {
        const exists = await FileSystemUtils.fileExists(fullPath);
        if (!exists) {
          return {
            isValid: false,
            isExecutable: false,
            message: `Relative command not found: ${fullPath}`,
            commandType
          };
        }

        const stats = await fs.stat(fullPath);
        const isExecutable = stats.isFile() && !!(stats.mode & parseInt('111', 8));
        
        return {
          isValid: isExecutable,
          resolvedPath: fullPath,
          isExecutable,
          message: isExecutable ? `Relative command resolved to: ${fullPath}` : 'Command file is not executable',
          commandType
        };

      } catch (error: any) {
        return {
          isValid: false,
          isExecutable: false,
          message: `Failed to validate relative command: ${error.message}`,
          commandType
        };
      }
    }

    return {
      isValid: false,
      isExecutable: false,
      message: 'Unable to validate command',
      commandType: 'absolute'
    };
  }

  /**
   * Test command validation step
   */
  private static async testCommand(server: MCPServer, config: TestConfiguration): Promise<TestStepResult> {
    const stepStart = Date.now();
    
    try {
      const validation = await this.validateCommand(server);
      
      return {
        passed: validation.isValid,
        message: validation.message,
        duration: Date.now() - stepStart,
        details: validation
      };

    } catch (error: any) {
      return {
        passed: false,
        message: `Command test failed: ${error.message}`,
        duration: Date.now() - stepStart
      };
    }
  }

  /**
   * Test working directory validation step
   */
  private static async testWorkingDirectory(server: MCPServer, config: TestConfiguration): Promise<TestStepResult> {
    const stepStart = Date.now();
    
    if (!server.cwd) {
      return {
        passed: true,
        message: 'No working directory specified (using default)',
        duration: Date.now() - stepStart
      };
    }

    try {
      const expandedCwd = MacOSPathResolver.expandTildeInPath(server.cwd);
      const exists = await FileSystemUtils.directoryExists(expandedCwd);
      
      if (!exists) {
        return {
          passed: false,
          message: `Working directory does not exist: ${expandedCwd}`,
          duration: Date.now() - stepStart
        };
      }

      // Check if directory is accessible
      try {
        await fs.access(expandedCwd, fs.constants.R_OK);
        return {
          passed: true,
          message: `Working directory is valid: ${expandedCwd}`,
          duration: Date.now() - stepStart
        };
      } catch (error) {
        return {
          passed: false,
          message: `Working directory is not accessible: ${expandedCwd}`,
          duration: Date.now() - stepStart
        };
      }

    } catch (error: any) {
      return {
        passed: false,
        message: `Working directory test failed: ${error.message}`,
        duration: Date.now() - stepStart
      };
    }
  }

  /**
   * Test environment variables validation step
   */
  private static async testEnvironment(server: MCPServer, config: TestConfiguration): Promise<TestStepResult> {
    const stepStart = Date.now();
    
    if (!server.env || Object.keys(server.env).length === 0) {
      return {
        passed: true,
        message: 'No environment variables specified',
        duration: Date.now() - stepStart
      };
    }

    const issues: string[] = [];
    let validCount = 0;

    for (const [key, value] of Object.entries(server.env)) {
      // Validate environment variable name
      if (!/^[A-Z_][A-Z0-9_]*$/i.test(key)) {
        issues.push(`Invalid environment variable name: ${key}`);
      }

      // Check for potentially problematic values
      if (typeof value !== 'string') {
        issues.push(`Environment variable ${key} must be a string`);
      } else {
        validCount++;
        
        // Warn about potentially sensitive values (don't fail, just log)
        if (this.isSensitiveEnvironmentVariable(key, value)) {
          console.warn(`Potentially sensitive environment variable: ${key}`);
        }
      }
    }

    const passed = issues.length === 0;
    const message = passed 
      ? `Environment variables valid (${validCount} variables)`
      : `Environment variable issues: ${issues.join(', ')}`;

    return {
      passed,
      message,
      duration: Date.now() - stepStart,
      details: { issues, validCount }
    };
  }

  /**
   * Test actual server connection
   */
  private static async testServerConnection(server: MCPServer, config: TestConfiguration): Promise<TestStepResult> {
    const stepStart = Date.now();
    
    try {
      // Build command with arguments
      const args = server.args || [];
      const env = { ...process.env, ...server.env };
      const cwd = server.cwd ? MacOSPathResolver.expandTildeInPath(server.cwd) : process.cwd();

      // Spawn the process
      const childProcess = spawn(server.command, args, {
        env,
        cwd,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      const output: { stdout: string[]; stderr: string[] } = {
        stdout: [],
        stderr: []
      };

      // Collect output
      childProcess.stdout?.on('data', (data) => {
        output.stdout.push(data.toString());
      });

      childProcess.stderr?.on('data', (data) => {
        output.stderr.push(data.toString());
      });

      // Set up timeout
      const timeoutId = setTimeout(() => {
        if (!childProcess.killed) {
          childProcess.kill('SIGTERM');
        }
      }, config.startupTimeout);

      // Wait for process to start or fail
      const result = await new Promise<TestStepResult>((resolve) => {
        childProcess.on('spawn', () => {
          clearTimeout(timeoutId);
          
          // Give the server a moment to initialize, then kill it
          setTimeout(() => {
            if (!childProcess.killed) {
              childProcess.kill('SIGTERM');
            }
            
            resolve({
              passed: true,
              message: 'Server started successfully',
              duration: Date.now() - stepStart,
              details: {
                processId: childProcess.pid,
                output
              }
            });
          }, 1000);
        });

        childProcess.on('error', (error) => {
          clearTimeout(timeoutId);
          resolve({
            passed: false,
            message: `Server failed to start: ${error.message}`,
            duration: Date.now() - stepStart,
            details: { error: error.message, output }
          });
        });

        childProcess.on('exit', (code, signal) => {
          clearTimeout(timeoutId);
          
          if (code === 0) {
            resolve({
              passed: true,
              message: 'Server started and exited cleanly',
              duration: Date.now() - stepStart,
              details: { exitCode: code, output }
            });
          } else {
            resolve({
              passed: false,
              message: `Server exited with code ${code} (signal: ${signal})`,
              duration: Date.now() - stepStart,
              details: { exitCode: code, signal, output }
            });
          }
        });
      });

      return result;

    } catch (error: any) {
      return {
        passed: false,
        message: `Connection test failed: ${error.message}`,
        duration: Date.now() - stepStart,
        details: { error: error.message }
      };
    }
  }

  /**
   * Check if environment variable might be sensitive
   */
  private static isSensitiveEnvironmentVariable(key: string, value: string | null | undefined): boolean {
    const sensitivePatterns = [
      /api[_-]?key/i,
      /secret/i,
      /password/i,
      /token/i,
      /credential/i,
      /private[_-]?key/i
    ];

    return sensitivePatterns.some(pattern => pattern.test(key)) || 
           Boolean(value && value.length > 20 && /^[A-Za-z0-9+/=_-]+$/.test(value));
  }

  /**
   * Get default test configuration for different server types
   */
  static getDefaultTestConfig(serverType?: string): TestConfiguration {
    const base = { ...this.DEFAULT_CONFIG };
    
    // Customize based on server type if provided
    switch (serverType?.toLowerCase()) {
      case 'python':
        base.startupTimeout = 8000; // Python can be slower to start
        break;
      case 'node':
      case 'nodejs':
        base.startupTimeout = 3000; // Node.js usually starts quickly
        break;
      case 'rust':
        base.startupTimeout = 2000; // Rust binaries are typically fast
        break;
      default:
        // Use defaults
        break;
    }

    return base;
  }
}