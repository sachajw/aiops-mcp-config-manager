import { MCPServer } from './server';
import { MCPClient } from './client';
import { ConfigScope } from './enums';

/**
 * Complete configuration for a client
 */
export interface Configuration {
  /** MCP servers configuration */
  mcpServers: Record<string, MCPServer>;
  /** Configuration metadata */
  metadata: ConfigurationMetadata;
}

/**
 * Configuration metadata
 */
export interface ConfigurationMetadata {
  /** Last modification timestamp */
  lastModified: Date;
  /** Configuration version */
  version: string;
  /** Configuration scope */
  scope: ConfigScope;
  /** Configuration source file path */
  sourcePath?: string;
  /** Whether configuration has been modified */
  isDirty?: boolean;
  /** Configuration checksum for change detection */
  checksum?: string;
}

/**
 * Resolved configuration after scope merging
 */
export interface ResolvedConfiguration {
  /** Merged server configurations */
  servers: Record<string, MCPServer>;
  /** Scope conflicts detected during resolution */
  conflicts: ScopeConflict[];
  /** Source scope for each server */
  sources: Record<string, ConfigScope>;
  /** Resolution metadata */
  metadata: ResolutionMetadata;
}

/**
 * Resolution metadata
 */
export interface ResolutionMetadata {
  /** Resolution timestamp */
  resolvedAt: Date;
  /** Scopes that were merged */
  mergedScopes: ConfigScope[];
  /** Total number of servers */
  serverCount: number;
  /** Number of conflicts found */
  conflictCount: number;
}

/**
 * Scope conflict detection
 */
export interface ScopeConflict {
  /** Server name with conflict */
  serverName: string;
  /** Conflicting configurations from different scopes */
  scopes: ScopeConfigEntry[];
  /** Currently active configuration */
  activeConfig: MCPServer;
  /** Conflict resolution strategy */
  resolutionStrategy?: ConflictResolutionStrategy;
}

/**
 * Scope configuration entry
 */
export interface ScopeConfigEntry {
  /** Configuration scope */
  scope: ConfigScope;
  /** Server configuration */
  config: MCPServer;
  /** Scope priority (higher = more priority) */
  priority: number;
  /** Source file path */
  sourcePath: string;
}

/**
 * Conflict resolution strategies
 */
export enum ConflictResolutionStrategy {
  /** Use highest priority scope */
  PRIORITY = 'priority',
  /** Merge configurations */
  MERGE = 'merge',
  /** Ask user to resolve */
  MANUAL = 'manual',
  /** Keep existing */
  KEEP_EXISTING = 'keep_existing'
}

/**
 * Configuration import/export format
 */
export interface ConfigurationExport {
  /** Exported configurations by client */
  configurations: Record<string, Configuration>;
  /** Export metadata */
  metadata: ExportMetadata;
}

/**
 * Export metadata
 */
export interface ExportMetadata {
  /** Export timestamp */
  exportedAt: Date;
  /** Export version */
  version: string;
  /** Source system information */
  source: {
    platform: string;
    version: string;
    hostname?: string;
  };
  /** Included clients */
  clients: string[];
  /** Export options */
  options: ExportOptions;
}

/**
 * Export options
 */
export interface ExportOptions {
  /** Include sensitive environment variables */
  includeSensitiveData: boolean;
  /** Include disabled servers */
  includeDisabledServers: boolean;
  /** Include metadata */
  includeMetadata: boolean;
  /** Compress export */
  compress: boolean;
}

/**
 * Configuration diff result
 */
export interface ConfigurationDiff {
  /** Added servers */
  added: MCPServer[];
  /** Modified servers */
  modified: ConfigurationChange[];
  /** Removed servers */
  removed: MCPServer[];
  /** Unchanged servers */
  unchanged: string[];
}

/**
 * Configuration change details
 */
export interface ConfigurationChange {
  /** Server name */
  serverName: string;
  /** Original configuration */
  original: MCPServer;
  /** Modified configuration */
  modified: MCPServer;
  /** Changed fields */
  changedFields: string[];
}