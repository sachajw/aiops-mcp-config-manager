import { ClientType, ClientStatus, ConfigScope } from './enums';

/**
 * Configuration paths for different scopes
 */
export interface ConfigurationPaths {
  /** Primary configuration file path */
  primary: string;
  /** Alternative configuration file paths */
  alternatives: string[];
  /** Scope-specific configuration paths (null if scope not supported) */
  scopePaths: Record<ConfigScope, string | null>;
}

/**
 * MCP Client representation
 */
export interface MCPClient {
  /** Unique client identifier */
  id: string;
  /** Human-readable client name */
  name: string;
  /** Client type */
  type: ClientType;
  /** Client version (if detectable) */
  version?: string;
  /** Configuration file paths */
  configPaths: ConfigurationPaths;
  /** Current client status */
  status: ClientStatus;
  /** Whether the client is currently active/running */
  isActive: boolean;
  /** Installation path */
  installPath?: string;
  /** Executable path */
  executablePath?: string;
  /** Last seen timestamp */
  lastSeen?: Date;
  /** Client-specific metadata */
  metadata?: Record<string, any>;
}

/**
 * Client detection result
 */
export interface ClientDetectionResult {
  /** Detected clients */
  clients: MCPClient[];
  /** Detection errors */
  errors: ClientDetectionError[];
  /** Detection timestamp */
  detectedAt: Date;
}

/**
 * Client detection error
 */
export interface ClientDetectionError {
  clientType: ClientType;
  message: string;
  path?: string;
}

/**
 * Client validation result
 */
export interface ClientValidationResult {
  /** Whether the client is valid */
  isValid: boolean;
  /** Validation errors */
  errors: string[];
  /** Client capabilities */
  capabilities?: string[];
}

/**
 * Client status check result
 */
export interface ClientStatusResult {
  /** Client status */
  status: ClientStatus;
  /** Process ID if running */
  pid?: number;
  /** Status check timestamp */
  checkedAt: Date;
  /** Additional status information */
  details?: string;
}