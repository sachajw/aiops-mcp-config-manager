/**
 * Type adapters for MCPServer
 * Converts between old and new type definitions during migration
 */

import { MCPServer as OldServer } from '../types/server';
import { ConfigScope } from '../types/enums';
import type {
  MCPServer as NewServer,
  ServerMetadata,
  ServerMetrics,
  ServerConnection,
  ConnectionStatus,
  TransportType
} from '../types/models.new';

/**
 * Convert old server type to new server type
 */
export function toNewServer(old: OldServer): NewServer {
  return {
    id: old.name, // OldServer doesn't have id, use name
    name: old.name,
    command: old.command,
    args: old.args || [],
    env: old.env || {},
    enabled: old.enabled !== false, // default to true
    metadata: createMetadata(old),
    metrics: undefined, // OldServer doesn't have metrics
    connection: undefined // OldServer doesn't have connection
  };
}

/**
 * Convert new server type to old server type
 */
export function toOldServer(newServer: NewServer): OldServer {
  return {
    name: newServer.name,
    command: newServer.command,
    args: newServer.args,
    env: newServer.env || {},
    scope: ConfigScope.USER,
    enabled: newServer.enabled !== false,
    description: newServer.metadata?.description,
    metadata: {
      ...newServer.metadata,
      metrics: newServer.metrics,
      connection: newServer.connection
    }
  };
}

/**
 * Create metadata from old server fields
 */
function createMetadata(old: OldServer): ServerMetadata | undefined {
  const hasMetadata = old.description || old.metadata;

  if (!hasMetadata) return undefined;

  return {
    description: old.description,
    version: old.metadata?.version,
    author: old.metadata?.author,
    homepage: old.metadata?.homepage,
    repository: old.metadata?.repository,
    license: old.metadata?.license,
    tags: old.metadata?.tags,
    icon: old.metadata?.icon,
    category: old.metadata?.category
  };
}

/**
 * Convert old metrics to new metrics type
 */
function toNewMetrics(oldMetrics: any): ServerMetrics {
  return {
    toolCount: oldMetrics.toolCount ?? 0,
    resourceCount: oldMetrics.resourceCount ?? 0,
    promptCount: oldMetrics.promptCount ?? 0,
    tokensUsed: oldMetrics.tokensUsed ?? 0,
    responseTime: oldMetrics.responseTime ?? 0,
    lastUpdated: oldMetrics.lastUpdated ?? new Date().toISOString(),
    errorCount: oldMetrics.errorCount ?? 0,
    successRate: oldMetrics.successRate ?? 100
  };
}

/**
 * Convert new metrics to old metrics type
 */
function toOldMetrics(newMetrics: ServerMetrics): any {
  return {
    toolCount: newMetrics.toolCount,
    resourceCount: newMetrics.resourceCount,
    promptCount: newMetrics.promptCount,
    tokensUsed: newMetrics.tokensUsed,
    responseTime: newMetrics.responseTime,
    lastUpdated: newMetrics.lastUpdated,
    errorCount: newMetrics.errorCount,
    successRate: newMetrics.successRate
  };
}

/**
 * Convert old connection to new connection type
 */
function toNewConnection(oldConnection: any): ServerConnection {
  return {
    status: normalizeConnectionStatus(oldConnection.status),
    connectedAt: oldConnection.connectedAt,
    lastPing: oldConnection.lastPing,
    pid: oldConnection.pid,
    port: oldConnection.port,
    transport: normalizeTransportType(oldConnection.transport),
    error: oldConnection.error
  };
}

/**
 * Convert new connection to old connection type
 */
function toOldConnection(newConnection: ServerConnection): any {
  return {
    status: newConnection.status,
    connectedAt: newConnection.connectedAt,
    lastPing: newConnection.lastPing,
    pid: newConnection.pid,
    port: newConnection.port,
    transport: newConnection.transport,
    error: newConnection.error
  };
}

/**
 * Normalize connection status to new enum
 */
function normalizeConnectionStatus(status: any): ConnectionStatus {
  const validStatuses: ConnectionStatus[] = ['connected', 'connecting', 'disconnected', 'error', 'unknown'];
  return validStatuses.includes(status) ? status : 'unknown';
}

/**
 * Normalize transport type to new enum
 */
function normalizeTransportType(transport: any): TransportType {
  const validTransports: TransportType[] = ['stdio', 'http', 'websocket'];
  return validTransports.includes(transport) ? transport : 'stdio';
}

/**
 * Batch convert old servers to new servers
 */
export function toNewServers(oldServers: OldServer[]): NewServer[] {
  return oldServers.map(toNewServer);
}

/**
 * Batch convert new servers to old servers
 */
export function toOldServers(newServers: NewServer[]): OldServer[] {
  return newServers.map(toOldServer);
}