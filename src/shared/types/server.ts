import { ConfigScope, TestStatus } from './enums';

/**
 * MCP Server configuration interface
 */
export interface MCPServer {
  /** Unique server name/identifier */
  name: string;
  /** Command to execute the server */
  command: string;
  /** Command line arguments */
  args: string[];
  /** Environment variables */
  env: Record<string, string>;
  /** Working directory (optional) */
  cwd?: string;
  /** Configuration scope */
  scope: ConfigScope;
  /** Whether the server is enabled */
  enabled: boolean;
  /** Server description (optional) */
  description?: string;
  /** Auto-approval settings */
  autoApprove?: string[];
  /** Server-specific metadata */
  metadata?: Record<string, any>;
}

/**
 * Server connection test result
 */
export interface TestResult {
  /** Test status */
  status: TestStatus;
  /** Test duration in milliseconds */
  duration: number;
  /** Success/error message */
  message: string;
  /** Detailed error information */
  error?: {
    code: string;
    details: string;
    stackTrace?: string;
  };
  /** Server response data */
  response?: {
    version?: string;
    capabilities?: string[];
    metadata?: Record<string, any>;
  };
}

/**
 * Server test result (for UI compatibility)
 */
export interface ServerTestResult {
  /** Test status */
  status: TestStatus;
  /** Whether the test was successful */
  success: boolean;
  /** Test duration in milliseconds */
  duration: number;
  /** Success/error message */
  message: string;
  /** Detailed test information */
  details: any;
}

/**
 * Server validation result
 */
export interface ServerValidationResult {
  /** Whether the server configuration is valid */
  isValid: boolean;
  /** Validation errors */
  errors: ServerValidationError[];
  /** Validation warnings */
  warnings: ServerValidationWarning[];
}

/**
 * Server-specific validation error
 */
export interface ServerValidationError {
  field: keyof MCPServer;
  message: string;
  code: string;
}

/**
 * Server-specific validation warning
 */
export interface ServerValidationWarning {
  field: keyof MCPServer;
  message: string;
  suggestion: string;
}

/**
 * Server configuration form data
 */
export interface ServerFormData {
  name: string;
  command: string;
  args: string;
  env: string;
  cwd: string;
  enabled: boolean;
  description: string;
  autoApprove: string;
}

/**
 * Server import/export format
 */
export interface ServerExport {
  servers: MCPServer[];
  metadata: {
    exportedAt: Date;
    version: string;
    source: string;
  };
}