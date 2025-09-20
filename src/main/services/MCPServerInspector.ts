/**
 * MCPServerInspector - Service to inspect MCP servers and get real metrics
 * Uses the MCP protocol to connect to servers and query their actual capabilities
 */

import { MCPClient } from './MCPClient';
import { MCPServer } from '../../shared/types';

export interface ServerInspectionResult {
  serverName: string;
  toolCount: number;
  resourceCount: number;
  promptCount?: number;
  tools?: Array<{
    name: string;
    description?: string;
    inputSchema?: any;
  }>;
  resources?: Array<{
    uri: string;
    name?: string;
    description?: string;
    mimeType?: string;
  }>;
  prompts?: Array<{
    name: string;
    description?: string;
  }>;
  serverInfo?: {
    name: string;
    version?: string;
  };
  error?: string;
  timestamp: Date;
}

export class MCPServerInspector {
  private static inspectionCache: Map<string, ServerInspectionResult> = new Map();
  private static cacheTimeout = 5 * 60 * 1000; // 5 minutes cache
  private static activeClients: Map<string, MCPClient> = new Map();

  /**
   * Inspect a server to get its real metrics
   */
  public static async inspectServer(
    serverName: string,
    serverConfig: MCPServer
  ): Promise<ServerInspectionResult> {
    console.log(`[MCPServerInspector] Inspecting server: ${serverName}`);

    // Check cache first
    const cached = this.inspectionCache.get(serverName);
    if (cached && Date.now() - cached.timestamp.getTime() < this.cacheTimeout) {
      console.log(`[MCPServerInspector] Returning cached results for ${serverName}`);
      return cached;
    }

    // Create inspection result
    const result: ServerInspectionResult = {
      serverName,
      toolCount: 0,
      resourceCount: 0,
      promptCount: 0,
      timestamp: new Date()
    };

    let client: MCPClient | null = null;

    try {
      // Check if we have an active client
      client = this.activeClients.get(serverName) || null;

      // Create new client if needed
      if (!client || !client.isConnected()) {
        const clientConfig = {
          name: serverName,
          command: serverConfig.command,
          args: serverConfig.args || [],
          env: serverConfig.env,
          cwd: serverConfig.cwd
        };

        client = new MCPClient(clientConfig);
        await client.connect();
        this.activeClients.set(serverName, client);
      }

      // Get server info (already fetched during initialization)
      const metrics = client.getMetrics();
      result.serverInfo = metrics.serverInfo;

      // Get tools
      try {
        const tools = await client.getTools();
        result.tools = tools;
        result.toolCount = tools.length;
        console.log(`[MCPServerInspector] ${serverName} has ${tools.length} tools`);
      } catch (err) {
        console.warn(`[MCPServerInspector] Failed to get tools for ${serverName}:`, err);
      }

      // Get resources
      try {
        const resources = await client.getResources();
        result.resources = resources;
        result.resourceCount = resources.length;
        console.log(`[MCPServerInspector] ${serverName} has ${resources.length} resources`);
      } catch (err) {
        console.warn(`[MCPServerInspector] Failed to get resources for ${serverName}:`, err);
      }

      // Try to get prompts (may not be supported by all servers)
      try {
        const promptsResponse = await client.sendRequest({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'prompts/list'
        });
        if (promptsResponse.result?.prompts) {
          result.prompts = promptsResponse.result.prompts;
          result.promptCount = promptsResponse.result.prompts.length;
          console.log(`[MCPServerInspector] ${serverName} has ${result.promptCount} prompts`);
        }
      } catch (err) {
        // Prompts might not be supported, that's ok
        console.log(`[MCPServerInspector] ${serverName} doesn't support prompts`);
      }

      // Cache the successful result
      this.inspectionCache.set(serverName, result);

    } catch (error) {
      console.error(`[MCPServerInspector] Failed to inspect ${serverName}:`, error);
      result.error = error instanceof Error ? error.message : 'Unknown error';

      // If connection failed, remove from active clients
      if (client) {
        this.activeClients.delete(serverName);
        try {
          await client.disconnect();
        } catch (e) {
          // Ignore disconnect errors
        }
      }
    }

    return result;
  }

  /**
   * Inspect multiple servers in parallel
   */
  public static async inspectMultipleServers(
    servers: Record<string, MCPServer>
  ): Promise<Record<string, ServerInspectionResult>> {
    const results: Record<string, ServerInspectionResult> = {};

    // Inspect servers in parallel with a limit
    const serverEntries = Object.entries(servers);
    const batchSize = 3; // Limit parallel connections to avoid overwhelming the system

    for (let i = 0; i < serverEntries.length; i += batchSize) {
      const batch = serverEntries.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(
        batch.map(([name, config]) => this.inspectServer(name, config))
      );

      batch.forEach(([name], index) => {
        const result = batchResults[index];
        if (result.status === 'fulfilled') {
          results[name] = result.value;
        } else {
          results[name] = {
            serverName: name,
            toolCount: 0,
            resourceCount: 0,
            error: result.reason?.message || 'Inspection failed',
            timestamp: new Date()
          };
        }
      });
    }

    return results;
  }

  /**
   * Get cached metrics for a server without reconnecting
   */
  public static getCachedMetrics(serverName: string): ServerInspectionResult | null {
    const cached = this.inspectionCache.get(serverName);
    if (cached && Date.now() - cached.timestamp.getTime() < this.cacheTimeout) {
      return cached;
    }
    return null;
  }

  /**
   * Clear the inspection cache
   */
  public static clearCache(): void {
    this.inspectionCache.clear();
  }

  /**
   * Disconnect all active clients
   */
  public static async disconnectAll(): Promise<void> {
    const disconnectPromises = Array.from(this.activeClients.values()).map(
      client => client.disconnect().catch(err =>
        console.error('[MCPServerInspector] Error disconnecting client:', err)
      )
    );

    await Promise.all(disconnectPromises);
    this.activeClients.clear();
  }

  /**
   * Get simple metrics for UI display
   */
  public static async getServerMetrics(
    serverName: string,
    serverConfig: MCPServer
  ): Promise<{ toolCount: number; tokenUsage: number; isConnected: boolean }> {
    const inspection = await this.inspectServer(serverName, serverConfig);

    // Estimate token usage based on tool complexity
    // This is a rough estimate: more tools = more potential token usage
    const baseTokens = 500;
    const tokensPerTool = 100;
    const tokensPerResource = 50;
    const estimatedTokens = baseTokens +
      (inspection.toolCount * tokensPerTool) +
      (inspection.resourceCount * tokensPerResource);

    return {
      toolCount: inspection.toolCount,
      tokenUsage: Math.min(10000, estimatedTokens), // Cap at 10k for display
      isConnected: !inspection.error && inspection.toolCount > 0
    };
  }
}

export default MCPServerInspector;