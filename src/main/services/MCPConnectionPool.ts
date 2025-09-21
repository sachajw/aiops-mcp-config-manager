/**
 * MCP Connection Pool Manager
 * Manages a pool of MCP client connections for improved performance and resource management
 */

import { MCPClient } from './MCPClient';
import { MCPServer } from '../../shared/types';
import { errorHandler, ApplicationError, ErrorCategory, ErrorSeverity } from '../../shared/utils/ErrorHandler';
import { RetryManager } from '../../shared/utils/RetryManager';

/**
 * Connection pool entry
 */
interface PoolEntry {
  client: MCPClient;
  serverId: string;
  inUse: boolean;
  lastUsed: Date;
  connectionAttempts: number;
  healthy: boolean;
}

/**
 * Pool configuration options
 */
interface PoolConfig {
  maxConnections?: number;
  minConnections?: number;
  connectionTimeout?: number;
  idleTimeout?: number;
  healthCheckInterval?: number;
  maxRetries?: number;
}

/**
 * Connection Pool Manager for MCP Clients
 * Implements connection pooling with health checks and automatic cleanup
 */
export class MCPConnectionPool {
  private readonly pool: Map<string, PoolEntry[]> = new Map();
  private readonly config: Required<PoolConfig>;
  private healthCheckTimer?: NodeJS.Timeout;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: PoolConfig = {}) {
    this.config = {
      maxConnections: config.maxConnections || 10,
      minConnections: config.minConnections || 2,
      connectionTimeout: config.connectionTimeout || 30000,
      idleTimeout: config.idleTimeout || 300000, // 5 minutes
      healthCheckInterval: config.healthCheckInterval || 60000, // 1 minute
      maxRetries: config.maxRetries || 3
    };

    this.startHealthChecks();
    this.startCleanup();
  }

  /**
   * Get a client from the pool or create a new one
   */
  async getClient(serverId: string, config: MCPServer): Promise<MCPClient> {
    try {
      // Get or create pool for this server
      let serverPool = this.pool.get(serverId);
      if (!serverPool) {
        serverPool = [];
        this.pool.set(serverId, serverPool);
      }

      // Try to find an available client
      const available = serverPool.find(entry => !entry.inUse && entry.healthy);
      if (available) {
        available.inUse = true;
        available.lastUsed = new Date();
        console.log(`[ConnectionPool] Reusing connection for ${serverId}`);
        return available.client;
      }

      // Check if we can create a new connection
      if (serverPool.length >= this.config.maxConnections) {
        // Try to find least recently used idle connection to replace
        const idle = serverPool.find(entry => !entry.inUse);
        if (idle) {
          await this.closeConnection(idle);
          serverPool.splice(serverPool.indexOf(idle), 1);
        } else {
          throw new ApplicationError(
            `Connection pool exhausted for ${serverId}`,
            ErrorCategory.SERVER,
            ErrorSeverity.HIGH
          ).withSuggestions(
            'Wait for a connection to become available',
            'Increase max connections in settings'
          );
        }
      }

      // Create new connection with retry logic
      const client = await RetryManager.execute(
        async () => {
          const newClient = new MCPClient(config);
          await newClient.connect();
          return newClient;
        },
        {
          maxAttempts: this.config.maxRetries,
          initialDelay: 1000,
          backoffMultiplier: 2,
          onRetry: (attempt) => {
            console.log(`[ConnectionPool] Retry ${attempt} for ${serverId}`);
          }
        }
      );

      const entry: PoolEntry = {
        client,
        serverId,
        inUse: true,
        lastUsed: new Date(),
        connectionAttempts: 0,
        healthy: true
      };

      serverPool.push(entry);
      console.log(`[ConnectionPool] Created new connection for ${serverId} (${serverPool.length}/${this.config.maxConnections})`);

      return client;
    } catch (error) {
      const appError = new ApplicationError(
        `Failed to get connection for ${serverId}`,
        ErrorCategory.SERVER,
        ErrorSeverity.HIGH
      ).withContext({ serverId, error });

      errorHandler.handle(appError);
      throw appError;
    }
  }

  /**
   * Release a client back to the pool
   */
  async releaseClient(serverId: string, client: MCPClient): Promise<void> {
    const serverPool = this.pool.get(serverId);
    if (!serverPool) return;

    const entry = serverPool.find(e => e.client === client);
    if (entry) {
      entry.inUse = false;
      entry.lastUsed = new Date();
      console.log(`[ConnectionPool] Released connection for ${serverId}`);

      // Check if we have too many idle connections
      const idleCount = serverPool.filter(e => !e.inUse).length;
      if (idleCount > this.config.minConnections) {
        // Close excess idle connections
        const toClose = serverPool.find(e => !e.inUse && e !== entry);
        if (toClose) {
          await this.closeConnection(toClose);
          serverPool.splice(serverPool.indexOf(toClose), 1);
        }
      }
    }
  }

  /**
   * Close a connection and clean up
   */
  private async closeConnection(entry: PoolEntry): Promise<void> {
    try {
      await entry.client.disconnect();
      console.log(`[ConnectionPool] Closed connection for ${entry.serverId}`);
    } catch (error) {
      console.error(`[ConnectionPool] Error closing connection for ${entry.serverId}:`, error);
    }
  }

  /**
   * Perform health checks on all connections
   */
  private startHealthChecks(): void {
    this.healthCheckTimer = setInterval(async () => {
      for (const [serverId, serverPool] of this.pool.entries()) {
        for (const entry of serverPool) {
          if (!entry.inUse) {
            try {
              // Perform health check
              const healthy = await this.checkHealth(entry.client);
              entry.healthy = healthy;

              if (!healthy) {
                console.warn(`[ConnectionPool] Unhealthy connection for ${serverId}`);
                entry.connectionAttempts++;

                // Remove if too many failures
                if (entry.connectionAttempts >= this.config.maxRetries) {
                  await this.closeConnection(entry);
                  serverPool.splice(serverPool.indexOf(entry), 1);
                  console.log(`[ConnectionPool] Removed unhealthy connection for ${serverId}`);
                }
              } else {
                entry.connectionAttempts = 0; // Reset on success
              }
            } catch (error) {
              entry.healthy = false;
              entry.connectionAttempts++;
            }
          }
        }
      }
    }, this.config.healthCheckInterval);
  }

  /**
   * Check health of a connection
   */
  private async checkHealth(client: MCPClient): Promise<boolean> {
    try {
      // Send a ping to check connection health
      const pingTime = await client.ping();
      return pingTime > 0;
    } catch {
      return false;
    }
  }

  /**
   * Clean up idle connections
   */
  private startCleanup(): void {
    this.cleanupTimer = setInterval(async () => {
      const now = Date.now();

      for (const [serverId, serverPool] of this.pool.entries()) {
        const toRemove: PoolEntry[] = [];

        for (const entry of serverPool) {
          if (!entry.inUse) {
            const idleTime = now - entry.lastUsed.getTime();

            // Remove if idle too long
            if (idleTime > this.config.idleTimeout) {
              toRemove.push(entry);
            }
          }
        }

        // Keep minimum connections
        const keepCount = Math.max(
          this.config.minConnections,
          serverPool.length - toRemove.length
        );
        const actualRemove = toRemove.slice(0, Math.max(0, serverPool.length - keepCount));

        for (const entry of actualRemove) {
          await this.closeConnection(entry);
          serverPool.splice(serverPool.indexOf(entry), 1);
          console.log(`[ConnectionPool] Cleaned up idle connection for ${serverId}`);
        }

        // Remove empty pools
        if (serverPool.length === 0) {
          this.pool.delete(serverId);
        }
      }
    }, 60000); // Run every minute
  }

  /**
   * Get pool statistics
   */
  getStatistics(): {
    totalConnections: number;
    activeConnections: number;
    idleConnections: number;
    poolsByServer: Map<string, { total: number; active: number; idle: number; healthy: number }>;
  } {
    let totalConnections = 0;
    let activeConnections = 0;
    let idleConnections = 0;
    const poolsByServer = new Map<string, any>();

    for (const [serverId, serverPool] of this.pool.entries()) {
      const active = serverPool.filter(e => e.inUse).length;
      const idle = serverPool.filter(e => !e.inUse).length;
      const healthy = serverPool.filter(e => e.healthy).length;

      totalConnections += serverPool.length;
      activeConnections += active;
      idleConnections += idle;

      poolsByServer.set(serverId, {
        total: serverPool.length,
        active,
        idle,
        healthy
      });
    }

    return {
      totalConnections,
      activeConnections,
      idleConnections,
      poolsByServer
    };
  }

  /**
   * Shutdown the pool and close all connections
   */
  async shutdown(): Promise<void> {
    console.log('[ConnectionPool] Shutting down connection pool...');

    // Stop timers
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    // Close all connections
    for (const [serverId, serverPool] of this.pool.entries()) {
      for (const entry of serverPool) {
        await this.closeConnection(entry);
      }
    }

    this.pool.clear();
    console.log('[ConnectionPool] Connection pool shut down');
  }

  /**
   * Pre-warm connections for a server
   */
  async prewarm(serverId: string, config: MCPServer, count?: number): Promise<void> {
    const targetCount = count || this.config.minConnections;
    console.log(`[ConnectionPool] Pre-warming ${targetCount} connections for ${serverId}`);

    const promises: Promise<void>[] = [];
    for (let i = 0; i < targetCount; i++) {
      promises.push(
        (async () => {
          const client = await this.getClient(serverId, config);
          await this.releaseClient(serverId, client);
        })()
      );
    }

    await Promise.all(promises);
    console.log(`[ConnectionPool] Pre-warming complete for ${serverId}`);
  }
}

// Export singleton instance
export const connectionPool = new MCPConnectionPool();