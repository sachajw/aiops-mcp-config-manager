/**
 * Central export for all shared types
 * This file provides a single import point for type definitions
 */

// Export existing types (original structure - to maintain compatibility)
export * from './client';
export * from './server';
export * from './configuration';
export * from './enums';
export * from './mcp-discovery';
export * from './validation';
export * from './common';

// Export new types for migration
export * as NewModels from './models.new';
export * as NewAPI from './api.new';
export * as NewIPC from './ipc.new';

// Re-export specific new types with aliases to avoid conflicts
export type {
  MCPServer as MCPServerNew,
  MCPClient as MCPClientNew,
  ClientConfig as ClientConfigNew,
  ServerMetrics as ServerMetricsNew,
  ServerConnection as ServerConnectionNew,
  ConnectionStatus as ConnectionStatusNew
} from './models.new';

export {
  IPC_CHANNELS,
  type IPCMessage,
  type IPCRequest,
  type IPCResponse,
  type IPCError,
  type IPCEvent
} from './ipc.new';

// NOTE: New comprehensive types are available in:
// - ./models.new.ts - Core domain models
// - ./api.new.ts - API interface definitions
// - ./ipc.new.ts - IPC communication types
// These will be gradually migrated as part of the refactoring plan