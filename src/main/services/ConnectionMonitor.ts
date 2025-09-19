/**
 * ConnectionMonitor - Monitors real MCP server connection status
 */

import { EventEmitter } from 'events';
import MCPClient, { MCPServerConfig } from './MCPClient';

export interface ConnectionStatus {
  serverId: string;
  serverName: string;
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  lastPing: Date;
  responseTime: number;
  errorCount: number;
  uptime: number; // seconds
  connectedAt?: Date;
}

export interface ConnectionEvent {
  type: 'connected' | 'disconnected' | 'error' | 'ping';
  serverId: string;
  timestamp: Date;
  data?: any;
}

export class ConnectionMonitor extends EventEmitter {
  private connections: Map<string, ConnectionStatus> = new Map();
  private mcpClients: Map<string, MCPClient> = new Map();
  private pingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private PING_INTERVAL = 30000; // 30 seconds
  private MAX_ERROR_COUNT = 3;

  /**
   * Start monitoring a server connection
   */
  public async startMonitoring(
    serverId: string,
    serverName: string,
    command: string,
    args?: string[],
    env?: Record<string, string>,
    cwd?: string
  ): Promise<void> {
    // Stop existing monitoring if any
    await this.stopMonitoring(serverId);

    // Initialize connection status
    const status: ConnectionStatus = {
      serverId,
      serverName,
      status: 'connecting',
      lastPing: new Date(),
      responseTime: 0,
      errorCount: 0,
      uptime: 0
    };

    this.connections.set(serverId, status);
    this.emit('statusChange', status);

    try {
      // Create real MCP client
      const config: MCPServerConfig = {
        name: serverName,
        command,
        args,
        env,
        cwd
      };

      const client = new MCPClient(config);
      this.mcpClients.set(serverId, client);

      // Set up event handlers
      client.on('connected', () => {
        const currentStatus = this.connections.get(serverId);
        if (currentStatus) {
          currentStatus.status = 'connected';
          currentStatus.connectedAt = new Date();
          currentStatus.errorCount = 0;
          this.emit('statusChange', currentStatus);
          this.emit('event', {
            type: 'connected',
            serverId,
            timestamp: new Date()
          } as ConnectionEvent);
        }
      });

      client.on('disconnected', () => {
        const currentStatus = this.connections.get(serverId);
        if (currentStatus) {
          currentStatus.status = 'disconnected';
          this.emit('statusChange', currentStatus);
          this.emit('event', {
            type: 'disconnected',
            serverId,
            timestamp: new Date()
          } as ConnectionEvent);
        }
      });

      client.on('error', (error) => {
        const currentStatus = this.connections.get(serverId);
        if (currentStatus) {
          currentStatus.status = 'error';
          currentStatus.errorCount++;
          this.emit('statusChange', currentStatus);
          this.emit('event', {
            type: 'error',
            serverId,
            timestamp: new Date(),
            data: error
          } as ConnectionEvent);
        }
      });

      // Actually connect to the server
      await client.connect();

      // Start ping monitoring
      const pingInterval = setInterval(() => {
        this.pingServer(serverId);
      }, this.PING_INTERVAL);
      this.pingIntervals.set(serverId, pingInterval);

    } catch (error) {
      status.status = 'error';
      status.errorCount++;
      this.emit('statusChange', status);
      this.emit('event', {
        type: 'error',
        serverId,
        timestamp: new Date(),
        data: error
      } as ConnectionEvent);
      throw error;
    }
  }

  /**
   * Stop monitoring a server connection
   */
  public async stopMonitoring(serverId: string): Promise<void> {
    // Clear ping interval
    const interval = this.pingIntervals.get(serverId);
    if (interval) {
      clearInterval(interval);
      this.pingIntervals.delete(serverId);
    }

    // Disconnect MCP client
    const client = this.mcpClients.get(serverId);
    if (client) {
      await client.disconnect();
      this.mcpClients.delete(serverId);
    }

    // Update status
    const status = this.connections.get(serverId);
    if (status) {
      status.status = 'disconnected';
      this.emit('statusChange', status);
      this.emit('event', {
        type: 'disconnected',
        serverId,
        timestamp: new Date()
      } as ConnectionEvent);
    }

    this.connections.delete(serverId);
  }

  /**
   * Get connection status for a server
   */
  public getConnectionStatus(serverId: string): ConnectionStatus | undefined {
    return this.connections.get(serverId);
  }

  /**
   * Get all connection statuses
   */
  public getAllConnectionStatuses(): ConnectionStatus[] {
    return Array.from(this.connections.values());
  }

  /**
   * Get connected servers count
   */
  public getConnectedCount(): number {
    return Array.from(this.connections.values()).filter(
      conn => conn.status === 'connected'
    ).length;
  }

  /**
   * Get average response time across all connected servers
   */
  public getAverageResponseTime(): number {
    const connected = Array.from(this.connections.values()).filter(
      conn => conn.status === 'connected'
    );

    if (connected.length === 0) return 0;

    const totalTime = connected.reduce(
      (sum, conn) => sum + conn.responseTime, 0
    );

    return Math.round(totalTime / connected.length);
  }

  /**
   * Ping a server to check its health
   */
  private async pingServer(serverId: string): Promise<void> {
    const status = this.connections.get(serverId);
    if (!status || status.status !== 'connected') return;

    const client = this.mcpClients.get(serverId);
    if (!client) return;

    try {
      // Send real ping to MCP server
      const responseTime = await client.ping();

      // Update metrics on successful ping
      status.responseTime = responseTime;
      status.lastPing = new Date();
      status.errorCount = 0;

      if (status.connectedAt) {
        status.uptime = Math.floor(
          (Date.now() - status.connectedAt.getTime()) / 1000
        );
      }

      this.emit('statusChange', status);
      this.emit('event', {
        type: 'ping',
        serverId,
        timestamp: new Date(),
        data: { responseTime: status.responseTime }
      } as ConnectionEvent);

    } catch (error) {
      // Handle ping failure
      status.errorCount++;
      status.lastPing = new Date();

      if (status.errorCount >= this.MAX_ERROR_COUNT) {
        // Too many errors, mark as disconnected
        status.status = 'error';
        this.emit('statusChange', status);
        this.emit('event', {
          type: 'error',
          serverId,
          timestamp: new Date(),
          data: error
        } as ConnectionEvent);
      }
    }
  }

  /**
   * Get real metrics from MCP client
   */
  public getRealMetrics(serverId: string): any {
    const client = this.mcpClients.get(serverId);
    if (client && client.isConnected()) {
      return client.getMetrics();
    }
    return null;
  }

  /**
   * Stop all monitoring
   */
  public async stopAll(): Promise<void> {
    const serverIds = Array.from(this.connections.keys());
    await Promise.all(serverIds.map(id => this.stopMonitoring(id)));
  }
}

// Singleton instance
export const connectionMonitor = new ConnectionMonitor();