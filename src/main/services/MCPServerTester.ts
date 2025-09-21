/**
 * MCPServerTester - Test real MCP server connections
 */

import { connectionMonitor } from './ConnectionMonitor';
import { container } from '../container';
import { MetricsService } from './MetricsService';

export class MCPServerTester {
  private static metricsService = container.get<MetricsService>('metricsService');
  /**
   * Test connection to a real MCP server
   */
  public static async testServer(
    serverId: string,
    serverName: string,
    command: string,
    args?: string[]
  ): Promise<{ success: boolean; error?: string; metrics?: any }> {
    try {
      console.log(`[MCPServerTester] Testing ${serverName} with command: ${command} ${(args || []).join(' ')}`);

      // Start monitoring the server
      await connectionMonitor.startMonitoring(serverId, serverName, command, args);

      // Wait for connection to establish
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 15000); // 15 second timeout

        connectionMonitor.on('statusChange', (status) => {
          if (status.serverId === serverId) {
            if (status.status === 'connected') {
              clearTimeout(timeout);
              resolve(true);
            } else if (status.status === 'error') {
              clearTimeout(timeout);
              reject(new Error('Connection failed'));
            }
          }
        });
      });

      // Get metrics
      const metrics = connectionMonitor.getRealMetrics(serverId);

      console.log(`[MCPServerTester] Successfully connected to ${serverName}:`, metrics);

      return {
        success: true,
        metrics
      };

    } catch (error) {
      console.error(`[MCPServerTester] Failed to test ${serverName}:`, error);

      // Clean up failed connection
      try {
        await connectionMonitor.stopMonitoring(serverId);
      } catch (e) {
        // Ignore cleanup errors
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test common MCP servers that should be available
   */
  public static async testCommonServers(): Promise<Record<string, any>> {
    const results: Record<string, any> = {};

    // Test servers that are likely to be available
    const serversToTest = [
      {
        id: 'node-version',
        name: 'Node Version Check',
        command: 'node',
        args: ['--version']
      },
      {
        id: 'echo-test',
        name: 'Echo Test',
        command: 'echo',
        args: ['{"jsonrpc":"2.0","method":"test"}']
      }
    ];

    for (const server of serversToTest) {
      console.log(`[MCPServerTester] Testing ${server.name}...`);

      try {
        const result = await this.testServer(server.id, server.name, server.command, server.args);
        results[server.id] = result;
      } catch (error) {
        results[server.id] = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }

      // Wait a bit between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return results;
  }

  /**
   * Test filesystem server if available
   */
  public static async testFilesystemServer(): Promise<any> {
    try {
      // Check if @modelcontextprotocol/server-filesystem is available
      const { spawn } = await import('child_process');

      return new Promise((resolve) => {
        const testProcess = spawn('npx', ['--yes', '@modelcontextprotocol/server-filesystem', '--help'], {
          stdio: ['ignore', 'pipe', 'pipe']
        });

        let output = '';
        testProcess.stdout?.on('data', (data) => {
          output += data.toString();
        });

        testProcess.on('close', (code) => {
          if (code === 0 || output.includes('filesystem')) {
            // Package is available, test real connection
            this.testServer(
              'filesystem-real',
              'Filesystem Server (Real)',
              'npx',
              ['@modelcontextprotocol/server-filesystem', '/tmp']
            ).then(resolve).catch(() => resolve({ success: false, error: 'Connection failed' }));
          } else {
            resolve({ success: false, error: 'Package not available' });
          }
        });

        // Timeout after 10 seconds
        setTimeout(() => {
          testProcess.kill();
          resolve({ success: false, error: 'Package check timeout' });
        }, 10000);
      });

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export default MCPServerTester;