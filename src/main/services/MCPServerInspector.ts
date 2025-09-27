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
  tokenUsage?: number;  // Calculated token usage based on tools and resources
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
  private static cacheTimeout = Infinity; // Never expire cache until force refresh
  private static activeClients: Map<string, MCPClient> = new Map();
  private static readonly CONNECTION_TIMEOUT = 30000; // 30 seconds max connection time

  /**
   * Inspect a server to get its real metrics
   */
  public static async inspectServer(
    serverName: string,
    serverConfig: MCPServer,
    forceRefresh: boolean = false
  ): Promise<ServerInspectionResult> {
    console.log(`[MCPServerInspector] Inspecting server: ${serverName}, forceRefresh: ${forceRefresh}`);
    console.log(`[MCPServerInspector] Server config:`, serverConfig);

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = this.inspectionCache.get(serverName);
      if (cached && cached.toolCount !== undefined) {
        console.log(`[MCPServerInspector] Returning cached results for ${serverName}`);
        return cached;
      }
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

        console.log(`[MCPServerInspector] Creating new MCPClient for ${serverName} with config:`, clientConfig);
        client = new MCPClient(clientConfig);

        // Add timeout for connection
        const connectPromise = client.connect();
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error(`Connection timeout after ${this.CONNECTION_TIMEOUT}ms`)), this.CONNECTION_TIMEOUT);
        });

        await Promise.race([connectPromise, timeoutPromise]);
        console.log(`[MCPServerInspector] Successfully connected to ${serverName}`);
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

      // Calculate estimated token usage based on tools and resources
      result.tokenUsage = this.calculateTokenUsage(result);

      // Cache the successful result
      this.inspectionCache.set(serverName, result);

    } catch (error) {
      console.error(`[MCPServerInspector] Failed to inspect ${serverName}:`, error);
      console.error(`[MCPServerInspector] Error stack:`, (error as Error).stack);
      result.error = error instanceof Error ? error.message : 'Unknown error';

      // Return undefined for metrics on error
      result.toolCount = undefined as any;
      result.tokenUsage = undefined as any;

      // If connection failed, remove from active clients and cleanup
      if (client) {
        this.activeClients.delete(serverName);
        try {
          await client.disconnect();
        } catch (e) {
          console.error(`[MCPServerInspector] Error disconnecting failed client:`, e);
        }
      }

      // Don't cache failed results
      return result;
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
    if (cached && cached.toolCount !== undefined) {
      return cached;
    }
    return null;
  }

  /**
   * Force clear cache for a specific server
   */
  public static clearServerCache(serverName: string): void {
    this.inspectionCache.delete(serverName);
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

  /**
   * Calculate estimated token usage based on tools and resources
   */
  private static calculateTokenUsage(result: ServerInspectionResult): number {
    let tokenCount = 0;

    // Estimate tokens from tool descriptions (roughly 4 chars per token)
    if (result.tools && result.tools.length > 0) {
      result.tools.forEach(tool => {
        // Tool name and description
        tokenCount += Math.ceil((tool.name?.length || 0) / 4);
        tokenCount += Math.ceil((tool.description?.length || 0) / 4);

        // Tool parameters/schema
        if (tool.inputSchema) {
          const schemaStr = JSON.stringify(tool.inputSchema);
          tokenCount += Math.ceil(schemaStr.length / 4);
        }
      });
    }

    // Estimate tokens from resource descriptions
    if (result.resources && result.resources.length > 0) {
      result.resources.forEach(resource => {
        tokenCount += Math.ceil((resource.name?.length || 0) / 4);
        tokenCount += Math.ceil((resource.description?.length || 0) / 4);
        tokenCount += Math.ceil((resource.uri?.length || 0) / 4);
      });
    }

    // Estimate tokens from prompts
    if (result.prompts && result.prompts.length > 0) {
      result.prompts.forEach(prompt => {
        tokenCount += Math.ceil((prompt.name?.length || 0) / 4);
        tokenCount += Math.ceil((prompt.description?.length || 0) / 4);
      });
    }

    console.log(`[MCPServerInspector] Calculated ${tokenCount} tokens for server`);
    return tokenCount;
  }
}

export default MCPServerInspector;