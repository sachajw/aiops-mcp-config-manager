/**
 * MCPClient - Real MCP protocol client for connecting to servers
 */

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

export interface MCPServerConfig {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface MCPServerInfo {
  name: string;
  version: string;
  protocolVersion: string;
  capabilities: {
    tools?: { listChanged?: boolean };
    resources?: { subscribe?: boolean; listChanged?: boolean };
    prompts?: { listChanged?: boolean };
    logging?: {};
  };
}

export interface MCPClientMetrics {
  toolCount: number;
  resourceCount: number;
  responseTime: number;
  lastActivity: Date;
  errorCount: number;
  isConnected: boolean;
  serverInfo?: MCPServerInfo;
  status?: 'connected' | 'connecting' | 'disconnected' | 'unavailable';
  retryAttempts?: number;
  lastError?: string;
}

export class MCPClient extends EventEmitter {
  private process: ChildProcess | null = null;
  private connected = false;
  private nextId = 1;
  private pendingRequests = new Map<number, { resolve: Function; reject: Function; timestamp: number }>();
  private config: MCPServerConfig;
  private metrics: MCPClientMetrics;
  private reconnectAttempts = 0;
  private readonly MAX_RETRIES = 5; // Maximum retry attempts before marking unavailable
  private readonly RETRY_DELAYS = [1000, 2000, 4000, 8000, 16000]; // Exponential backoff in ms
  private messageBuffer = ''; // Buffer for partial JSON messages
  private isUnavailable = false; // Flag to prevent further retries after max attempts

  constructor(config: MCPServerConfig) {
    super();
    this.config = config;
    this.metrics = {
      toolCount: 0,
      resourceCount: 0,
      responseTime: 0,
      lastActivity: new Date(),
      errorCount: 0,
      isConnected: false,
      status: 'disconnected',
      retryAttempts: 0,
      lastError: undefined
    };
  }

  /**
   * Connect to the MCP server
   */
  public async connect(): Promise<void> {
    // Don't attempt to connect if marked unavailable
    if (this.isUnavailable) {
      const error = new Error(`Server ${this.config.name} is marked unavailable after ${this.MAX_RETRIES} failed attempts`);
      console.error(`[MCPClient] ${error.message}`);
      throw error;
    }

    try {
      console.log(`[MCPClient] Connecting to ${this.config.name}... (attempt ${this.reconnectAttempts + 1}/${this.MAX_RETRIES + 1})`);
      this.metrics.status = 'connecting';
      this.metrics.retryAttempts = this.reconnectAttempts;

      // Spawn the server process
      this.process = spawn(this.config.command, this.config.args || [], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, ...this.config.env },
        cwd: this.config.cwd || process.cwd()
      });

      // Handle process events
      this.process.on('error', (error) => {
        console.error(`[MCPClient] Process error for ${this.config.name}:`, error);
        this.metrics.errorCount++;
        this.emit('error', error);
      });

      this.process.on('exit', (code, signal) => {
        console.log(`[MCPClient] Process exited for ${this.config.name}: code=${code}, signal=${signal}`);
        this.connected = false;
        this.metrics.isConnected = false;
        this.metrics.status = 'disconnected';
        this.emit('disconnected', { code, signal });

        // Auto-reconnect on unexpected exit with exponential backoff
        if (code !== 0 && this.reconnectAttempts < this.MAX_RETRIES) {
          this.reconnectAttempts++;
          const delay = this.RETRY_DELAYS[Math.min(this.reconnectAttempts - 1, this.RETRY_DELAYS.length - 1)];

          console.log(`[MCPClient] Scheduling reconnect for ${this.config.name} in ${delay}ms (attempt ${this.reconnectAttempts}/${this.MAX_RETRIES})`);

          setTimeout(() => {
            if (!this.isUnavailable) {
              this.connect().catch((error) => {
                console.error(`[MCPClient] Reconnect attempt ${this.reconnectAttempts} failed for ${this.config.name}:`, error);
                this.metrics.lastError = error.message;
              });
            }
          }, delay);
        } else if (code !== 0 && this.reconnectAttempts >= this.MAX_RETRIES) {
          // Mark as unavailable after max retries
          this.isUnavailable = true;
          this.metrics.status = 'unavailable';
          this.metrics.lastError = `Failed after ${this.MAX_RETRIES} retry attempts`;

          console.error(`[MCPClient] Server ${this.config.name} marked as UNAVAILABLE after ${this.MAX_RETRIES} failed attempts`);
          this.emit('unavailable', {
            serverName: this.config.name,
            attempts: this.MAX_RETRIES,
            lastError: this.metrics.lastError
          });
        }
      });

      // Handle stdout data (MCP messages with proper buffering)
      this.process.stdout?.on('data', (data) => {
        try {
          // Append new data to buffer
          this.messageBuffer += data.toString();

          // Process complete messages (split by newlines)
          const lines = this.messageBuffer.split('\n');

          // Keep the last partial line in the buffer
          this.messageBuffer = lines.pop() || '';

          // Process each complete line
          for (const line of lines) {
            if (line.trim()) {
              try {
                const message = JSON.parse(line);
                this.handleMessage(message);
              } catch (parseError) {
                // Log but don't crash on individual message parse errors
                console.warn(`[MCPClient] Skipping malformed message from ${this.config.name}:`, line.substring(0, 100));
              }
            }
          }
        } catch (error) {
          console.error(`[MCPClient] Fatal error processing messages:`, error);
          this.metrics.errorCount++;
        }
      });

      // Handle stderr for debugging
      this.process.stderr?.on('data', (data) => {
        console.error(`[MCPClient] ${this.config.name} stderr:`, data.toString());
      });

      // Initialize the connection with MCP protocol
      await this.initialize();

      this.connected = true;
      this.metrics.isConnected = true;
      this.metrics.status = 'connected';
      this.reconnectAttempts = 0; // Reset on successful connection
      this.metrics.retryAttempts = 0;
      this.metrics.lastError = undefined;
      this.emit('connected');

      console.log(`[MCPClient] ✅ Successfully connected to ${this.config.name}`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[MCPClient] ❌ Failed to connect to ${this.config.name}:`, errorMessage);
      this.metrics.errorCount++;
      this.metrics.lastError = errorMessage;
      this.metrics.status = 'disconnected';
      throw error;
    }
  }

  /**
   * Initialize MCP protocol handshake
   */
  private async initialize(): Promise<void> {
    const initMessage = {
      jsonrpc: '2.0',
      id: this.nextId++,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {},
          resources: {},
          prompts: {}
        },
        clientInfo: {
          name: 'mcp-config-manager',
          version: '0.1.5'
        }
      }
    };

    const response = await this.sendRequestInternal(initMessage);
    this.metrics.serverInfo = response.result.serverInfo;

    // Send initialized notification
    await this.sendNotification({
      jsonrpc: '2.0',
      method: 'notifications/initialized'
    });

    // Fetch initial data
    await this.fetchServerCapabilities();
  }

  /**
   * Fetch server capabilities (tools, resources, etc.)
   */
  private async fetchServerCapabilities(): Promise<void> {
    try {
      // Fetch tools
      const toolsResponse = await this.sendRequestInternal({
        jsonrpc: '2.0',
        id: this.nextId++,
        method: 'tools/list'
      });

      if (toolsResponse.result?.tools) {
        this.metrics.toolCount = toolsResponse.result.tools.length;
      }

      // Fetch resources
      try {
        const resourcesResponse = await this.sendRequestInternal({
          jsonrpc: '2.0',
          id: this.nextId++,
          method: 'resources/list'
        });

        if (resourcesResponse.result?.resources) {
          this.metrics.resourceCount = resourcesResponse.result.resources.length;
        }
      } catch (error) {
        // Resources might not be supported
        console.log(`[MCPClient] ${this.config.name} doesn't support resources`);
      }

    } catch (error) {
      console.error(`[MCPClient] Failed to fetch capabilities for ${this.config.name}:`, error);
      this.metrics.errorCount++;
    }
  }

  /**
   * Send a JSON-RPC request and wait for response
   */
  private async sendRequestInternal(message: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const timestamp = Date.now();
      this.pendingRequests.set(message.id, { resolve, reject, timestamp });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(message.id)) {
          this.pendingRequests.delete(message.id);
          reject(new Error(`Request timeout for ${this.config.name}`));
        }
      }, 30000);

      this.sendMessage(message);
    });
  }

  /**
   * Send a JSON-RPC notification (no response expected)
   */
  private async sendNotification(message: any): Promise<void> {
    this.sendMessage(message);
  }

  /**
   * Send raw message to server
   */
  private sendMessage(message: any): void {
    if (!this.process?.stdin) {
      throw new Error(`Cannot send message - not connected to ${this.config.name}`);
    }

    const serialized = JSON.stringify(message) + '\n';
    this.process.stdin.write(serialized);
    this.metrics.lastActivity = new Date();
  }

  /**
   * Handle incoming message from server
   */
  private handleMessage(message: any): void {
    this.metrics.lastActivity = new Date();

    // Handle response to our request
    if (message.id && this.pendingRequests.has(message.id)) {
      const { resolve, reject, timestamp } = this.pendingRequests.get(message.id)!;
      this.pendingRequests.delete(message.id);

      // Calculate response time
      this.metrics.responseTime = Date.now() - timestamp;

      if (message.error) {
        reject(new Error(message.error.message || 'Unknown error'));
      } else {
        resolve(message);
      }
      return;
    }

    // Handle server notifications
    if (message.method) {
      this.emit('notification', message);
    }
  }

  /**
   * Disconnect from server
   */
  public async disconnect(): Promise<void> {
    console.log(`[MCPClient] Disconnecting from ${this.config.name}...`);

    this.connected = false;
    this.metrics.isConnected = false;
    this.metrics.status = 'disconnected';

    if (this.process) {
      this.process.kill('SIGTERM');

      // Force kill after 5 seconds
      setTimeout(() => {
        if (this.process && !this.process.killed) {
          this.process.kill('SIGKILL');
        }
      }, 5000);

      this.process = null;
    }

    // Reject all pending requests
    this.pendingRequests.forEach(({ reject }, id) => {
      reject(new Error(`Connection closed to ${this.config.name}`));
    });
    this.pendingRequests.clear();

    this.emit('disconnected');
  }

  /**
   * Reset unavailable status and allow reconnection attempts
   */
  public resetUnavailableStatus(): void {
    console.log(`[MCPClient] Resetting unavailable status for ${this.config.name}`);
    this.isUnavailable = false;
    this.reconnectAttempts = 0;
    this.metrics.status = 'disconnected';
    this.metrics.retryAttempts = 0;
    this.metrics.lastError = undefined;
  }

  /**
   * Get current metrics
   */
  public getMetrics(): MCPClientMetrics {
    return { ...this.metrics };
  }

  /**
   * Check if connected
   */
  public isConnected(): boolean {
    return this.connected && this.process !== null && !this.process.killed;
  }

  /**
   * Ping the server to check health
   */
  public async ping(): Promise<number> {
    if (!this.isConnected()) {
      throw new Error(`Not connected to ${this.config.name}`);
    }

    const startTime = Date.now();

    try {
      // Send a simple tools/list request as ping
      await this.sendRequestInternal({
        jsonrpc: '2.0',
        id: this.nextId++,
        method: 'tools/list'
      });

      const responseTime = Date.now() - startTime;
      this.metrics.responseTime = responseTime;
      return responseTime;

    } catch (error) {
      this.metrics.errorCount++;
      throw error;
    }
  }

  /**
   * Get available tools
   */
  public async getTools(): Promise<MCPTool[]> {
    const response = await this.sendRequestInternal({
      jsonrpc: '2.0',
      id: this.nextId++,
      method: 'tools/list'
    });

    return response.result?.tools || [];
  }

  /**
   * Get available resources
   */
  public async getResources(): Promise<MCPResource[]> {
    const response = await this.sendRequestInternal({
      jsonrpc: '2.0',
      id: this.nextId++,
      method: 'resources/list'
    });

    return response.result?.resources || [];
  }

  /**
   * Send a public request (for MCPServerInspector)
   */
  public async sendRequest(message: any): Promise<any> {
    if (message.id === undefined) {
      message.id = this.nextId++;
    }
    return this.sendRequestInternal(message);
  }
}

export default MCPClient;