/**
 * Enumeration of supported MCP client types
 */
export enum ClientType {
  CLAUDE_DESKTOP = 'claude-desktop',
  CLAUDE_CODE = 'claude-code',
  CODEX = 'codex',
  VS_CODE = 'vscode',
  CURSOR = 'cursor',
  GEMINI_DESKTOP = 'gemini-desktop',
  GEMINI_CLI = 'gemini-cli'
}

/**
 * Configuration scope hierarchy (project > local > user > global)
 */
export enum ConfigScope {
  GLOBAL = 'global',
  USER = 'user',
  LOCAL = 'local',
  PROJECT = 'project'
}

/**
 * Client status indicators
 */
export enum ClientStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error',
  UNKNOWN = 'unknown'
}

/**
 * Server connection test status
 */
export enum TestStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
  TIMEOUT = 'timeout'
}

/**
 * File change types for monitoring
 */
export enum FileChangeType {
  CREATED = 'created',
  MODIFIED = 'modified',
  DELETED = 'deleted',
  RENAMED = 'renamed'
}

/**
 * Validation result severity levels
 */
export enum ValidationSeverity {
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info'
}