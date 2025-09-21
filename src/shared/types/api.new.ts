/**
 * API interface definitions for type-safe IPC communication
 * These interfaces define the contract between main and renderer processes
 */

import {
  MCPServer,
  MCPClient,
  ClientConfig,
  Configuration,
  ConfigScope,
  ServerMetrics,
  ServerConnection,
  ValidationResult,
  OperationResult,
  DiscoveredServer,
  ServerCatalog,
  CategoryInfo,
  AppSettings,
  ConnectionStatus,
  ServerCategory,
  ID,
  FilePath,
  Timestamp
} from './models.new';

// ============================================================
// Configuration API
// ============================================================

export interface ConfigAPI {
  // Read operations
  read(params: ConfigReadParams): Promise<ConfigReadResult>;
  readAll(params: ConfigReadAllParams): Promise<ConfigReadAllResult>;

  // Write operations
  write(params: ConfigWriteParams): Promise<ConfigWriteResult>;
  update(params: ConfigUpdateParams): Promise<ConfigUpdateResult>;
  delete(params: ConfigDeleteParams): Promise<ConfigDeleteResult>;

  // Validation
  validate(params: ConfigValidateParams): Promise<ValidationResult>;

  // Import/Export
  import(params: ConfigImportParams): Promise<ConfigImportResult>;
  export(params: ConfigExportParams): Promise<ConfigExportResult>;

  // Sync operations
  sync(params: ConfigSyncParams): Promise<ConfigSyncResult>;
  resolveConflict(params: ConflictResolveParams): Promise<ConflictResolveResult>;
}

export interface ConfigReadParams {
  clientId: string;
  scope?: ConfigScope;
  projectPath?: FilePath;
}

export interface ConfigReadResult {
  config: ClientConfig;
  path: FilePath;
  exists: boolean;
}

export interface ConfigReadAllParams {
  clientId?: string;
  scope?: ConfigScope;
}

export interface ConfigReadAllResult {
  configs: ClientConfig[];
  total: number;
}

export interface ConfigWriteParams {
  clientId: string;
  config: Partial<ClientConfig>;
  scope: ConfigScope;
  projectPath?: FilePath;
  backup?: boolean;
}

export interface ConfigWriteResult {
  success: boolean;
  path: FilePath;
  backupPath?: FilePath;
}

export interface ConfigUpdateParams {
  clientId: string;
  updates: Partial<ClientConfig>;
  scope: ConfigScope;
  merge?: boolean;
}

export interface ConfigUpdateResult {
  success: boolean;
  config: ClientConfig;
}

export interface ConfigDeleteParams {
  clientId: string;
  scope: ConfigScope;
  backup?: boolean;
}

export interface ConfigDeleteResult {
  success: boolean;
  backupPath?: FilePath;
}

export interface ConfigValidateParams {
  config: Partial<ClientConfig>;
  strict?: boolean;
}

export interface ConfigImportParams {
  path: FilePath;
  clientId: string;
  scope: ConfigScope;
  overwrite?: boolean;
}

export interface ConfigImportResult {
  success: boolean;
  config: ClientConfig;
  changes: string[];
}

export interface ConfigExportParams {
  clientId: string;
  scope: ConfigScope;
  path: FilePath;
  format?: 'json' | 'json5' | 'yaml';
}

export interface ConfigExportResult {
  success: boolean;
  path: FilePath;
  size: number;
}

export interface ConfigSyncParams {
  source: { clientId: string; scope: ConfigScope };
  target: { clientId: string; scope: ConfigScope };
  strategy: 'merge' | 'overwrite';
}

export interface ConfigSyncResult {
  success: boolean;
  changes: string[];
  conflicts?: ConfigConflict[];
}

export interface ConflictResolveParams {
  conflict: ConfigConflict;
  resolution: 'local' | 'remote' | 'merge';
  customValue?: any;
}

export interface ConflictResolveResult {
  success: boolean;
  resolved: boolean;
}

export interface ConfigConflict {
  field: string;
  localValue: any;
  remoteValue: any;
  timestamp: Timestamp;
}

// ============================================================
// Server API
// ============================================================

export interface ServerAPI {
  // List and discovery
  list(params: ServerListParams): Promise<ServerListResult>;
  discover(): Promise<ServerDiscoverResult>;
  search(params: ServerSearchParams): Promise<ServerSearchResult>;

  // Connection management
  connect(params: ServerConnectParams): Promise<ServerConnectResult>;
  disconnect(params: ServerDisconnectParams): Promise<ServerDisconnectResult>;
  reconnect(params: ServerReconnectParams): Promise<ServerReconnectResult>;

  // Server operations
  add(params: ServerAddParams): Promise<ServerAddResult>;
  update(params: ServerUpdateParams): Promise<ServerUpdateResult>;
  remove(params: ServerRemoveParams): Promise<ServerRemoveResult>;

  // Monitoring
  getStatus(serverId: ID): Promise<ServerStatusResult>;
  getMetrics(serverId: ID): Promise<ServerMetricsResult>;
  getLogs(params: ServerLogsParams): Promise<ServerLogsResult>;

  // Bulk operations
  bulkConnect(serverIds: ID[]): Promise<BulkOperationResult>;
  bulkDisconnect(serverIds: ID[]): Promise<BulkOperationResult>;
  bulkUpdate(updates: ServerBulkUpdate[]): Promise<BulkOperationResult>;
}

export interface ServerListParams {
  clientId?: string;
  category?: ServerCategory;
  status?: ConnectionStatus;
  enabled?: boolean;
}

export interface ServerListResult {
  servers: MCPServer[];
  total: number;
  connected: number;
  errored: number;
}

export interface ServerDiscoverResult {
  catalog: ServerCatalog;
  installed: ID[];
  available: number;
}

export interface ServerSearchParams {
  query: string;
  category?: ServerCategory;
  installed?: boolean;
  verified?: boolean;
}

export interface ServerSearchResult {
  servers: DiscoveredServer[];
  total: number;
}

export interface ServerConnectParams {
  serverId: ID;
  clientId: string;
  timeout?: number;
}

export interface ServerConnectResult {
  success: boolean;
  connection: ServerConnection;
  metrics?: ServerMetrics;
}

export interface ServerDisconnectParams {
  serverId: ID;
  force?: boolean;
}

export interface ServerDisconnectResult {
  success: boolean;
  cleanShutdown: boolean;
}

export interface ServerReconnectParams {
  serverId: ID;
  maxAttempts?: number;
  backoff?: number;
}

export interface ServerReconnectResult {
  success: boolean;
  attempts: number;
  connection?: ServerConnection;
}

export interface ServerAddParams {
  clientId: string;
  server: Partial<MCPServer>;
  connect?: boolean;
}

export interface ServerAddResult {
  success: boolean;
  server: MCPServer;
  connected?: boolean;
}

export interface ServerUpdateParams {
  serverId: ID;
  updates: Partial<MCPServer>;
  reconnect?: boolean;
}

export interface ServerUpdateResult {
  success: boolean;
  server: MCPServer;
}

export interface ServerRemoveParams {
  serverId: ID;
  clientId: string;
  disconnect?: boolean;
}

export interface ServerRemoveResult {
  success: boolean;
  disconnected?: boolean;
}

export interface ServerStatusResult {
  status: ConnectionStatus;
  connection?: ServerConnection;
  uptime?: number;
  lastError?: string;
}

export interface ServerMetricsResult {
  metrics: ServerMetrics;
  history?: ServerMetrics[];
}

export interface ServerLogsParams {
  serverId: ID;
  level?: 'all' | 'error' | 'warn' | 'info' | 'debug';
  limit?: number;
  since?: Timestamp;
}

export interface ServerLogsResult {
  logs: LogEntry[];
  total: number;
}

export interface LogEntry {
  timestamp: Timestamp;
  level: string;
  message: string;
  data?: any;
}

export interface ServerBulkUpdate {
  serverId: ID;
  updates: Partial<MCPServer>;
}

export interface BulkOperationResult {
  success: boolean;
  succeeded: ID[];
  failed: Array<{ id: ID; error: string }>;
  total: number;
}

// ============================================================
// Client API
// ============================================================

export interface ClientAPI {
  // Discovery and detection
  discover(): Promise<ClientDiscoverResult>;
  detect(clientId: ID): Promise<ClientDetectResult>;

  // Client operations
  getInfo(clientId: ID): Promise<ClientInfoResult>;
  validate(clientId: ID): Promise<ClientValidateResult>;
  install(params: ClientInstallParams): Promise<ClientInstallResult>;

  // Configuration
  getConfig(clientId: ID): Promise<ClientConfigResult>;
  setConfig(params: ClientSetConfigParams): Promise<ClientSetConfigResult>;

  // Paths and locations
  getPaths(clientId: ID): Promise<ClientPathsResult>;
  openConfig(clientId: ID): Promise<OpenConfigResult>;
}

export interface ClientDiscoverResult {
  clients: MCPClient[];
  installed: ID[];
  supported: ID[];
}

export interface ClientDetectResult {
  detected: boolean;
  client?: MCPClient;
  configPath?: FilePath;
}

export interface ClientInfoResult {
  client: MCPClient;
  isRunning?: boolean;
  pid?: number;
}

export interface ClientValidateResult {
  valid: boolean;
  installed: boolean;
  configExists: boolean;
  errors?: string[];
}

export interface ClientInstallParams {
  clientId: ID;
  createConfig?: boolean;
}

export interface ClientInstallResult {
  success: boolean;
  configPath?: FilePath;
}

export interface ClientConfigResult {
  config: ClientConfig;
  exists: boolean;
}

export interface ClientSetConfigParams {
  clientId: ID;
  config: Partial<ClientConfig>;
}

export interface ClientSetConfigResult {
  success: boolean;
  config: ClientConfig;
}

export interface ClientPathsResult {
  configPath: FilePath;
  dataPath?: FilePath;
  logPath?: FilePath;
  cachePath?: FilePath;
}

export interface OpenConfigResult {
  success: boolean;
  path: FilePath;
}

// ============================================================
// System API
// ============================================================

export interface SystemAPI {
  // Application
  getVersion(): Promise<string>;
  getInfo(): Promise<SystemInfoResult>;
  checkUpdates(): Promise<UpdateCheckResult>;

  // Settings
  getSettings(): Promise<AppSettings>;
  setSettings(settings: Partial<AppSettings>): Promise<SettingsUpdateResult>;
  resetSettings(): Promise<SettingsResetResult>;

  // File operations
  openExternal(url: string): Promise<OpenExternalResult>;
  openPath(path: FilePath): Promise<OpenPathResult>;
  selectFile(params: SelectFileParams): Promise<SelectFileResult>;
  selectDirectory(params: SelectDirectoryParams): Promise<SelectDirectoryResult>;

  // System operations
  restart(): Promise<void>;
  quit(): Promise<void>;
  minimize(): Promise<void>;
  maximize(): Promise<void>;
}

export interface SystemInfoResult {
  version: string;
  platform: string;
  arch: string;
  nodeVersion: string;
  electronVersion: string;
  memory: {
    total: number;
    free: number;
    used: number;
  };
}

export interface UpdateCheckResult {
  available: boolean;
  version?: string;
  releaseNotes?: string;
  downloadUrl?: string;
}

export interface SettingsUpdateResult {
  success: boolean;
  settings: AppSettings;
}

export interface SettingsResetResult {
  success: boolean;
  settings: AppSettings;
}

export interface OpenExternalResult {
  success: boolean;
  trusted: boolean;
}

export interface OpenPathResult {
  success: boolean;
  exists: boolean;
}

export interface SelectFileParams {
  title?: string;
  defaultPath?: FilePath;
  filters?: FileFilter[];
  multiSelect?: boolean;
}

export interface SelectFileResult {
  canceled: boolean;
  paths?: FilePath[];
}

export interface SelectDirectoryParams {
  title?: string;
  defaultPath?: FilePath;
  multiSelect?: boolean;
}

export interface SelectDirectoryResult {
  canceled: boolean;
  paths?: FilePath[];
}

export interface FileFilter {
  name: string;
  extensions: string[];
}

// ============================================================
// Discovery API
// ============================================================

export interface DiscoveryAPI {
  // Catalog operations
  getCatalog(): Promise<ServerCatalog>;
  refreshCatalog(): Promise<RefreshCatalogResult>;

  // Server discovery
  searchServers(query: string): Promise<DiscoveredServer[]>;
  getServerDetails(serverId: ID): Promise<ServerDetailsResult>;

  // Installation
  installServer(params: InstallServerParams): Promise<InstallServerResult>;
  uninstallServer(serverId: ID): Promise<UninstallServerResult>;

  // Categories
  getCategories(): Promise<CategoryInfo[]>;
  getServersByCategory(category: ServerCategory): Promise<DiscoveredServer[]>;
}

export interface RefreshCatalogResult {
  success: boolean;
  catalog: ServerCatalog;
  newServers: number;
}

export interface ServerDetailsResult {
  server: DiscoveredServer;
  readme?: string;
  changelog?: string;
  issues?: number;
}

export interface InstallServerParams {
  serverId: ID;
  clientId: ID;
  autoConnect?: boolean;
}

export interface InstallServerResult {
  success: boolean;
  server: MCPServer;
  connected?: boolean;
}

export interface UninstallServerResult {
  success: boolean;
  removed: boolean;
}