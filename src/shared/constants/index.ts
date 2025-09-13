import { ClientType, ConfigScope } from '../types/enums';

/**
 * Application constants
 */
export const APP_CONFIG = {
  NAME: 'MCP Configuration Manager',
  VERSION: '1.0.0',
  DESCRIPTION: 'Unified MCP server configuration management',
  AUTHOR: 'MCP Config Manager Team'
} as const;

/**
 * Default configuration file names for different clients
 */
export const CLIENT_CONFIG_FILES: Record<ClientType, string> = {
  [ClientType.CLAUDE_DESKTOP]: 'claude_desktop_config.json',
  [ClientType.CLAUDE_CODE]: 'claude_code_config.json',
  [ClientType.CODEX]: 'config.json',
  [ClientType.VS_CODE]: 'settings.json',
  [ClientType.CURSOR]: 'settings.json',
  [ClientType.KIRO]: 'config.json',
  [ClientType.WINDSURF]: 'settings.json',
  [ClientType.GEMINI_DESKTOP]: 'config.json',
  [ClientType.GEMINI_CLI]: 'config.json',
  [ClientType.CUSTOM]: 'config.json'
} as const;

/**
 * Default configuration paths for macOS
 */
export const MACOS_CONFIG_PATHS: Record<ClientType, string[]> = {
  [ClientType.CLAUDE_DESKTOP]: [
    '~/Library/Application Support/Claude/claude_desktop_config.json'
  ],
  [ClientType.CLAUDE_CODE]: [
    '~/.claude/claude_code_config.json',
    '~/.config/claude/claude_code_config.json'
  ],
  [ClientType.CODEX]: [
    '~/.codex/config.json',
    '~/Library/Application Support/Codex/config.json'
  ],
  [ClientType.VS_CODE]: [
    '~/Library/Application Support/Code/User/settings.json',
    '~/.vscode/settings.json'
  ],
  [ClientType.CURSOR]: [
    '~/Library/Application Support/Cursor/User/settings.json',
    '~/.cursor/settings.json'
  ],
  [ClientType.KIRO]: [
    '~/.kiro/settings/mcp.json',
    '~/Library/Application Support/Kiro/mcp.json'
  ],
  [ClientType.WINDSURF]: [
    '~/Library/Application Support/Windsurf/User/settings.json',
    '~/.windsurf/settings.json'
  ],
  [ClientType.GEMINI_DESKTOP]: [
    '~/Library/Application Support/Gemini/config.json'
  ],
  [ClientType.GEMINI_CLI]: [
    '~/.gemini/config.json',
    '~/.config/gemini/config.json'
  ],
  [ClientType.CUSTOM]: []
} as const;

/**
 * Scope priority order (higher number = higher priority)
 */
export const SCOPE_PRIORITY: Record<ConfigScope, number> = {
  [ConfigScope.GLOBAL]: 1,
  [ConfigScope.USER]: 2,
  [ConfigScope.LOCAL]: 3,
  [ConfigScope.PROJECT]: 4
} as const;

/**
 * Default scope paths
 */
export const DEFAULT_SCOPE_PATHS: Record<ConfigScope, string> = {
  [ConfigScope.GLOBAL]: '/etc/mcp/config.json',
  [ConfigScope.USER]: '~/.config/mcp/config.json',
  [ConfigScope.LOCAL]: './.mcp/config.json',
  [ConfigScope.PROJECT]: './project.mcp.json'
} as const;

/**
 * File system constants
 */
export const FILE_SYSTEM = {
  BACKUP_DIR: '.mcp-backups',
  MAX_BACKUP_AGE_DAYS: 30,
  MAX_BACKUP_COUNT: 50,
  CONFIG_FILE_ENCODING: 'utf8',
  WATCH_DEBOUNCE_MS: 500
} as const;

/**
 * Validation constants
 */
export const VALIDATION = {
  MAX_SERVER_NAME_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 500,
  MAX_ENV_VAR_COUNT: 50,
  MAX_ARGS_COUNT: 100,
  CONNECTION_TIMEOUT_MS: 10000,
  MIN_SERVER_NAME_LENGTH: 1
} as const;

/**
 * UI constants
 */
export const UI = {
  DEBOUNCE_DELAY_MS: 300,
  TOAST_DURATION_MS: 4000,
  MODAL_ANIMATION_DURATION_MS: 200,
  TREE_INDENT_SIZE: 20
} as const;

/**
 * Error codes
 */
export const ERROR_CODES = {
  // File system errors
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  DISK_FULL: 'DISK_FULL',
  
  // Configuration errors
  INVALID_JSON: 'INVALID_JSON',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_COMMAND: 'INVALID_COMMAND',
  SCOPE_CONFLICT: 'SCOPE_CONFLICT',
  
  // Network errors
  CONNECTION_TIMEOUT: 'CONNECTION_TIMEOUT',
  CONNECTION_REFUSED: 'CONNECTION_REFUSED',
  AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',
  
  // Application errors
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  BACKUP_FAILED: 'BACKUP_FAILED'
} as const;

/**
 * Default server configuration template
 */
export const DEFAULT_SERVER_CONFIG = {
  name: '',
  command: '',
  args: [],
  env: {},
  scope: ConfigScope.USER,
  enabled: true,
  description: '',
  autoApprove: []
} as const;

/**
 * Supported file extensions
 */
export const SUPPORTED_EXTENSIONS = ['.json', '.json5'] as const;

/**
 * Client display names
 */
export const CLIENT_DISPLAY_NAMES: Record<ClientType, string> = {
  [ClientType.CLAUDE_DESKTOP]: 'Claude Desktop',
  [ClientType.CLAUDE_CODE]: 'Claude Code',
  [ClientType.CODEX]: 'Codex',
  [ClientType.VS_CODE]: 'VS Code',
  [ClientType.CURSOR]: 'Cursor',
  [ClientType.KIRO]: 'Kiro',
  [ClientType.WINDSURF]: 'Windsurf',
  [ClientType.GEMINI_DESKTOP]: 'Gemini Desktop',
  [ClientType.GEMINI_CLI]: 'Gemini CLI',
  [ClientType.CUSTOM]: 'Custom Client'
} as const;