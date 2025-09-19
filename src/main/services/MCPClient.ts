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
}

export class MCPClient extends EventEmitter {
  private process: ChildProcess | null = null;
  private connected = false;
  private nextId = 1;
  private pendingRequests = new Map<number, { resolve: Function; reject: Function; timestamp: number }>();
  private config: MCPServerConfig;
  private metrics: MCPClientMetrics;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;

  constructor(config: MCPServerConfig) {
    super();
    this.config = config;
    this.metrics = {
      toolCount: 0,
      resourceCount: 0,
      responseTime: 0,
      lastActivity: new Date(),
      errorCount: 0,
      isConnected: false
    };
  }

  /**
   * Connect to the MCP server
   */
  public async connect(): Promise<void> {
    try {
      console.log(`[MCPClient] Connecting to ${this.config.name}...`);

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
        this.emit('disconnected', { code, signal });

        // Auto-reconnect on unexpected exit
        if (code !== 0 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          setTimeout(() => this.connect(), 1000 * this.reconnectAttempts);
        }
      });

      // Handle stdout data (MCP messages)
      this.process.stdout?.on('data', (data) => {
        try {
          const lines = data.toString().split('\n').filter(Boolean);
          for (const line of lines) {
            this.handleMessage(JSON.parse(line));
          }
        } catch (error) {
          console.error(`[MCPClient] Failed to parse message:`, error);
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
      this.reconnectAttempts = 0;
      this.emit('connected');

      console.log(`[MCPClient] Successfully connected to ${this.config.name}`);

    } catch (error) {
      console.error(`[MCPClient] Failed to connect to ${this.config.name}:`, error);
      this.metrics.errorCount++;
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

    const response = await this.sendRequest(initMessage);
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
      const toolsResponse = await this.sendRequest({
        jsonrpc: '2.0',
        id: this.nextId++,
        method: 'tools/list'
      });

      if (toolsResponse.result?.tools) {
        this.metrics.toolCount = toolsResponse.result.tools.length;
      }

      // Fetch resources
      try {
        const resourcesResponse = await this.sendRequest({
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
  private async sendRequest(message: any): Promise<any> {
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
      await this.sendRequest({
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
    const response = await this.sendRequest({
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
    const response = await this.sendRequest({
      jsonrpc: '2.0',
      id: this.nextId++,
      method: 'resources/list'
    });

    return response.result?.resources || [];
  }
}

export default MCPClient;