/**
 * MCP IPC Handler
 * Handles MCP server inspection and testing operations
 */

import { BaseHandler } from './BaseHandler';

export class MCPHandler extends BaseHandler {
  constructor() {
    super('mcp');
  }

  /**
   * Register all MCP-related IPC handlers
   */
  register(): void {
    // Inspect MCP server
    this.handle<[string, any], any>(
      'inspectServer',
      async (_, serverName: string, serverConfig: any) => {
        const { MCPServerInspector } = await import('../../services/MCPServerInspector');
        try {
          const result = await MCPServerInspector.inspectServer(serverName, serverConfig);
          console.log(`[IPC] Inspection result for ${serverName}:`, {
            tools: result.toolCount,
            resources: result.resourceCount,
            prompts: result.promptCount
          });
          return result;
        } catch (error) {
          console.error(`[IPC] Failed to inspect server ${serverName}:`, error);
          throw error;
        }
      }
    );

    // Test MCP server
    this.handle<[string, string, string, string[]?], any>(
      'testServer',
      async (_, serverId: string, serverName: string, command: string, args?: string[]) => {
        const { MCPServerTester } = await import('../../services/MCPServerTester');
        return MCPServerTester.testServer(serverId, serverName, command, args);
      }
    );

    // Test common servers
    this.handle<[], any>(
      'testCommonServers',
      async () => {
        const { MCPServerTester } = await import('../../services/MCPServerTester');
        return MCPServerTester.testCommonServers();
      }
    );

    // Test filesystem server
    this.handle<[], any>(
      'testFilesystemServer',
      async () => {
        const { MCPServerTester } = await import('../../services/MCPServerTester');
        return MCPServerTester.testFilesystemServer();
      }
    );

    console.log('[MCPHandler] Registered all MCP handlers');
  }
}