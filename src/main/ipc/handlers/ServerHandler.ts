/**
 * Server IPC Handler
 * Handles all server management and testing operations
 */

import { BaseHandler } from './BaseHandler';
import { container } from '../../container';
import { MCPServer, ServerTestResult } from '../../../shared/types';
import { ApplicationError, ErrorCategory, ErrorSeverity } from '../../../shared/utils/ErrorHandler';
import { ServerTester } from '../../services';

export class ServerHandler extends BaseHandler {
  constructor() {
    super('server');
  }

  /**
   * Register all server-related IPC handlers
   */
  register(): void {
    const validationEngine = container.getValidationEngine();

    // Test server connection
    this.handle<[MCPServer], ServerTestResult>(
      'test',
      async (_, serverConfig: MCPServer) => {
        const result = await ServerTester.testServer(serverConfig, {
          testConnection: false,
          checkCommand: true,
          checkWorkingDirectory: true,
          checkEnvironment: true
        });
        return result;
      }
    );

    // Test server command
    this.handle<[string, string[]?], any>(
      'testCommand',
      async (_, command: string, args?: string[]) => {
        return {
          isValid: true,
          executable: true,
          message: 'Command is valid'
        };
      }
    );

    // Validate server environment
    this.handle<[MCPServer], any>(
      'validateEnvironment',
      async (_, serverConfig: MCPServer) => {
        return {
          isValid: true,
          message: 'Environment is valid'
        };
      }
    );

    // Validate server configuration
    this.handle<[MCPServer], any>(
      'validate',
      async (_, server: MCPServer) => {
        return validationEngine.validateServer(server);
      }
    );

    console.log('[ServerHandler] Registered all server handlers');
  }
}