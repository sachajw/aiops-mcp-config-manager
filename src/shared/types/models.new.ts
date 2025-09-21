/**
 * Core domain models for MCP Configuration Manager
 * These types are shared between main and renderer processes
 */

import { ConfigScope } from './enums';
import { ServerCategory } from './mcp-discovery';
export type { ConfigScope, ServerCategory }; // Re-export for convenience

// ============================================================
// MCP Server Models
// ============================================================

export interface MCPServer {
  id: string;
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  enabled?: boolean;
  metadata?: ServerMetadata;
  metrics?: ServerMetrics;
  connection?: ServerConnection;
}

export interface ServerMetadata {
  description?: string;
  version?: string;
  author?: string;
  homepage?: string;
  repository?: string;
  license?: string;
  tags?: string[];
  icon?: string;
  category?: ServerCategory;
}

export interface ServerMetrics {
  toolCount: number;
  resourceCount: number;
  promptCount: number;
  tokensUsed: number;
  responseTime: number;
  lastUpdated: string;
  errorCount: number;
  successRate: number;
}

export interface ServerConnection {
  status: ConnectionStatus;
  connectedAt?: string;
  lastPing?: string;
  pid?: number;
  port?: number;
  transport: TransportType;
  error?: string;
}

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'error' | 'unknown';
export type TransportType = 'stdio' | 'http' | 'websocket';
// ServerCategory is imported from mcp-discovery.ts

// ============================================================
// Client Models
// ============================================================

export interface MCPClient {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  icon?: string;
  configPath: string;
  isInstalled: boolean;
  isSupported: boolean;
  version?: string;
  platform?: ClientPlatform;
  settings?: ClientSettings;
}

export interface ClientConfig {
  client: MCPClient;
  servers: MCPServer[];
  globalSettings?: ClientSettings;
  lastModified?: string;
  configFormat: ConfigFormat;
  scope: ConfigScope;
}

export interface ClientSettings {
  theme?: 'light' | 'dark' | 'system';
  autoConnect?: boolean;
  maxConnections?: number;
  timeout?: number;
  logLevel?: LogLevel;
  experimental?: Record<string, boolean>;
  advanced?: Record<string, any>;
}

export type ClientPlatform = 'desktop' | 'cli' | 'vscode' | 'browser' | 'mobile';
export type ConfigFormat = 'json' | 'json5' | 'jsonc' | 'toml' | 'yaml';
// ConfigScope is defined in enums.ts as an enum
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'none';

// ============================================================
// Configuration Models
// ============================================================

export interface Configuration {
  id: string;
  name: string;
  description?: string;
  clientId: string;
  scope: ConfigScope;
  servers: MCPServer[];
  settings?: ConfigurationSettings;
  metadata?: ConfigurationMetadata;
}

export interface ConfigurationSettings {
  autoSave?: boolean;
  validation?: ValidationSettings;
  sync?: SyncSettings;
  backup?: BackupSettings;
}

export interface ConfigurationMetadata {
  createdAt: string;
  updatedAt: string;
  author?: string;
  tags?: string[];
  isTemplate?: boolean;
  isShared?: boolean;
}

export interface ValidationSettings {
  enabled: boolean;
  strict: boolean;
  rules?: ValidationRule[];
}

export interface ValidationRule {
  field: string;
  rule: 'required' | 'pattern' | 'min' | 'max' | 'custom';
  value?: any;
  message?: string;
}

export interface SyncSettings {
  enabled: boolean;
  interval?: number;
  strategy: 'merge' | 'overwrite' | 'manual';
  conflictResolution: 'local' | 'remote' | 'prompt';
}

export interface BackupSettings {
  enabled: boolean;
  maxBackups?: number;
  interval?: number;
  location?: string;
}

// ============================================================
// Operation Models
// ============================================================

export interface OperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: OperationError;
  timestamp: string;
  duration?: number;
}

export interface OperationError {
  code: string;
  message: string;
  details?: any;
  stack?: string;
  recoverable?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
  severity: 'low' | 'medium' | 'high';
}

// ============================================================
// UI State Models
// ============================================================

export interface AppSettings {
  general: GeneralSettings;
  appearance: AppearanceSettings;
  experimental: ExperimentalSettings;
  advanced: AdvancedSettings;
}

export interface GeneralSettings {
  language: string;
  autoStart: boolean;
  minimizeToTray: boolean;
  checkUpdates: boolean;
  telemetry: boolean;
}

export interface AppearanceSettings {
  theme: 'light' | 'dark' | 'system';
  accentColor?: string;
  fontSize: 'small' | 'medium' | 'large';
  animations: boolean;
  compactMode: boolean;
}

export interface ExperimentalSettings {
  visualWorkspace: boolean;
  discoveryPage: boolean;
  aiAssistant: boolean;
  betaFeatures: boolean;
  debugMode: boolean;
}

export interface AdvancedSettings {
  maxConnections: number;
  connectionTimeout: number;
  retryAttempts: number;
  cacheSize: number;
  logLevel: LogLevel;
  customPaths?: Record<string, string>;
}

// ============================================================
// Discovery Models
// ============================================================

export interface DiscoveredServer {
  id: string;
  name: string;
  description?: string;
  category: ServerCategory;
  author?: string;
  stars?: number;
  downloads?: number;
  lastUpdated?: string;
  verified?: boolean;
  installCommand?: string;
  configExample?: Partial<MCPServer>;
  requirements?: string[];
  compatibility?: string[];
}

export interface ServerCatalog {
  servers: DiscoveredServer[];
  categories: CategoryInfo[];
  lastUpdated: string;
  totalCount: number;
}

export interface CategoryInfo {
  id: ServerCategory;
  name: string;
  description: string;
  count: number;
  icon?: string;
}

// ============================================================
// Event Models
// ============================================================

export interface AppEvent {
  id: string;
  type: EventType;
  payload: any;
  timestamp: string;
  source: 'main' | 'renderer';
}

export type EventType =
  | 'server.connected'
  | 'server.disconnected'
  | 'server.error'
  | 'config.saved'
  | 'config.loaded'
  | 'config.error'
  | 'client.discovered'
  | 'client.removed'
  | 'settings.changed'
  | 'update.available'
  | 'update.downloaded';

// ============================================================
// Utility Types
// ============================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Nullable<T> = T | null;

export type Optional<T> = T | undefined;

export type AsyncResult<T> = Promise<OperationResult<T>>;

export type ID = string;

export type Timestamp = string; // ISO 8601

export type FilePath = string;

export type URL = string;