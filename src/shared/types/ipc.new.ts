/**
 * IPC message types and channel definitions
 * Ensures type-safe communication between main and renderer processes
 */

import { ID } from './models.new';

// ============================================================
// IPC Channels
// ============================================================

export const IPC_CHANNELS = {
  // Configuration channels
  CONFIG: {
    READ: 'config:read',
    READ_ALL: 'config:readAll',
    WRITE: 'config:write',
    UPDATE: 'config:update',
    DELETE: 'config:delete',
    VALIDATE: 'config:validate',
    IMPORT: 'config:import',
    EXPORT: 'config:export',
    SYNC: 'config:sync',
    RESOLVE_CONFLICT: 'config:resolveConflict'
  },

  // Server channels
  SERVER: {
    LIST: 'server:list',
    DISCOVER: 'server:discover',
    SEARCH: 'server:search',
    CONNECT: 'server:connect',
    DISCONNECT: 'server:disconnect',
    RECONNECT: 'server:reconnect',
    ADD: 'server:add',
    UPDATE: 'server:update',
    REMOVE: 'server:remove',
    GET_STATUS: 'server:getStatus',
    GET_METRICS: 'server:getMetrics',
    GET_LOGS: 'server:getLogs',
    BULK_CONNECT: 'server:bulkConnect',
    BULK_DISCONNECT: 'server:bulkDisconnect',
    BULK_UPDATE: 'server:bulkUpdate'
  },

  // Client channels
  CLIENT: {
    DISCOVER: 'client:discover',
    DETECT: 'client:detect',
    GET_INFO: 'client:getInfo',
    VALIDATE: 'client:validate',
    INSTALL: 'client:install',
    GET_CONFIG: 'client:getConfig',
    SET_CONFIG: 'client:setConfig',
    GET_PATHS: 'client:getPaths',
    OPEN_CONFIG: 'client:openConfig'
  },

  // System channels
  SYSTEM: {
    GET_VERSION: 'system:getVersion',
    GET_INFO: 'system:getInfo',
    CHECK_UPDATES: 'system:checkUpdates',
    GET_SETTINGS: 'system:getSettings',
    SET_SETTINGS: 'system:setSettings',
    RESET_SETTINGS: 'system:resetSettings',
    OPEN_EXTERNAL: 'system:openExternal',
    OPEN_PATH: 'system:openPath',
    SELECT_FILE: 'system:selectFile',
    SELECT_DIRECTORY: 'system:selectDirectory',
    RESTART: 'system:restart',
    QUIT: 'system:quit',
    MINIMIZE: 'system:minimize',
    MAXIMIZE: 'system:maximize'
  },

  // Discovery channels
  DISCOVERY: {
    GET_CATALOG: 'discovery:getCatalog',
    REFRESH_CATALOG: 'discovery:refreshCatalog',
    SEARCH_SERVERS: 'discovery:searchServers',
    GET_SERVER_DETAILS: 'discovery:getServerDetails',
    INSTALL_SERVER: 'discovery:installServer',
    UNINSTALL_SERVER: 'discovery:uninstallServer',
    GET_CATEGORIES: 'discovery:getCategories',
    GET_SERVERS_BY_CATEGORY: 'discovery:getServersByCategory'
  },

  // Event channels (main -> renderer)
  EVENTS: {
    SERVER_CONNECTED: 'event:serverConnected',
    SERVER_DISCONNECTED: 'event:serverDisconnected',
    SERVER_ERROR: 'event:serverError',
    CONFIG_SAVED: 'event:configSaved',
    CONFIG_LOADED: 'event:configLoaded',
    CONFIG_ERROR: 'event:configError',
    CLIENT_DISCOVERED: 'event:clientDiscovered',
    CLIENT_REMOVED: 'event:clientRemoved',
    SETTINGS_CHANGED: 'event:settingsChanged',
    UPDATE_AVAILABLE: 'event:updateAvailable',
    UPDATE_DOWNLOADED: 'event:updateDownloaded'
  }
} as const;

// ============================================================
// IPC Message Types
// ============================================================

export interface IPCMessage<T = any> {
  id: string;
  channel: string;
  timestamp: string;
  payload: T;
}

export interface IPCRequest<T = any> extends IPCMessage<T> {
  replyChannel?: string;
  timeout?: number;
}

export interface IPCResponse<T = any> extends IPCMessage<T> {
  requestId: string;
  success: boolean;
  error?: IPCError;
  duration?: number;
}

export interface IPCError {
  code: string;
  message: string;
  details?: any;
  stack?: string;
}

export interface IPCEvent<T = any> {
  type: string;
  payload: T;
  timestamp: string;
  source: 'main' | 'renderer';
}

// ============================================================
// IPC Handler Types
// ============================================================

export interface IPCHandler<TRequest = any, TResponse = any> {
  channel: string;
  handle: (request: TRequest) => Promise<TResponse>;
  validate?: (request: TRequest) => boolean;
  authorize?: (request: TRequest) => boolean;
}

export interface IPCHandlerRegistry {
  handlers: Map<string, IPCHandler>;
  register(handler: IPCHandler): void;
  unregister(channel: string): void;
  get(channel: string): IPCHandler | undefined;
  has(channel: string): boolean;
}

// ============================================================
// IPC Event Emitter Types
// ============================================================

export interface IPCEventEmitter {
  emit<T>(event: string, payload: T): void;
  on<T>(event: string, listener: (payload: T) => void): void;
  off(event: string, listener?: Function): void;
  once<T>(event: string, listener: (payload: T) => void): void;
}

// ============================================================
// IPC Bridge Types
// ============================================================

export interface IPCBridge {
  invoke<TRequest, TResponse>(
    channel: string,
    request: TRequest
  ): Promise<TResponse>;

  send<T>(channel: string, data: T): void;

  on<T>(
    channel: string,
    listener: (event: IPCEvent<T>) => void
  ): () => void;

  off(channel: string, listener?: Function): void;

  once<T>(
    channel: string,
    listener: (event: IPCEvent<T>) => void
  ): void;
}

// ============================================================
// Type Guards
// ============================================================

export function isIPCMessage(value: any): value is IPCMessage {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.id === 'string' &&
    typeof value.channel === 'string' &&
    typeof value.timestamp === 'string' &&
    'payload' in value
  );
}

export function isIPCRequest(value: any): value is IPCRequest {
  return (
    isIPCMessage(value) &&
    ('replyChannel' in value || 'timeout' in value)
  );
}

export function isIPCResponse(value: any): value is IPCResponse {
  return (
    isIPCMessage(value) &&
    typeof (value as any).requestId === 'string' &&
    typeof (value as any).success === 'boolean'
  );
}

export function isIPCError(value: any): value is IPCError {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.code === 'string' &&
    typeof value.message === 'string'
  );
}

export function isIPCEvent(value: any): value is IPCEvent {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.type === 'string' &&
    'payload' in value &&
    typeof value.timestamp === 'string' &&
    (value.source === 'main' || value.source === 'renderer')
  );
}

// ============================================================
// IPC Utilities
// ============================================================

export function createIPCMessage<T>(
  channel: string,
  payload: T
): IPCMessage<T> {
  return {
    id: generateMessageId(),
    channel,
    timestamp: new Date().toISOString(),
    payload
  };
}

export function createIPCRequest<T>(
  channel: string,
  payload: T,
  options?: { replyChannel?: string; timeout?: number }
): IPCRequest<T> {
  return {
    ...createIPCMessage(channel, payload),
    ...options
  };
}

export function createIPCResponse<T>(
  requestId: string,
  channel: string,
  payload: T,
  success: boolean,
  error?: IPCError
): IPCResponse<T> {
  return {
    ...createIPCMessage(channel, payload),
    requestId,
    success,
    error
  };
}

export function createIPCError(
  code: string,
  message: string,
  details?: any
): IPCError {
  return {
    code,
    message,
    details,
    stack: new Error().stack
  };
}

export function createIPCEvent<T>(
  type: string,
  payload: T,
  source: 'main' | 'renderer'
): IPCEvent<T> {
  return {
    type,
    payload,
    timestamp: new Date().toISOString(),
    source
  };
}

function generateMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================
// Channel Type Mappings
// ============================================================

export type ChannelName =
  | typeof IPC_CHANNELS.CONFIG[keyof typeof IPC_CHANNELS.CONFIG]
  | typeof IPC_CHANNELS.SERVER[keyof typeof IPC_CHANNELS.SERVER]
  | typeof IPC_CHANNELS.CLIENT[keyof typeof IPC_CHANNELS.CLIENT]
  | typeof IPC_CHANNELS.SYSTEM[keyof typeof IPC_CHANNELS.SYSTEM]
  | typeof IPC_CHANNELS.DISCOVERY[keyof typeof IPC_CHANNELS.DISCOVERY]
  | typeof IPC_CHANNELS.EVENTS[keyof typeof IPC_CHANNELS.EVENTS];

export type EventName = typeof IPC_CHANNELS.EVENTS[keyof typeof IPC_CHANNELS.EVENTS];

// ============================================================
// IPC Context
// ============================================================

export interface IPCContext {
  processType: 'main' | 'renderer';
  windowId?: number;
  userId?: string;
  sessionId?: string;
  permissions?: string[];
}

// ============================================================
// IPC Middleware
// ============================================================

export type IPCMiddleware<TRequest = any, TResponse = any> = (
  request: IPCRequest<TRequest>,
  next: () => Promise<IPCResponse<TResponse>>
) => Promise<IPCResponse<TResponse>>;

export interface IPCMiddlewareStack {
  use(middleware: IPCMiddleware): void;
  execute<TRequest, TResponse>(
    request: IPCRequest<TRequest>,
    handler: () => Promise<TResponse>
  ): Promise<IPCResponse<TResponse>>;
}