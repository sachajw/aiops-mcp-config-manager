/**
 * Type adapters for MCPClient
 * Converts between old and new type definitions during migration
 */

import { MCPClient as OldClient } from '../types/client';
import { ConfigScope, ClientType, ClientStatus } from '../types/enums';
import type {
  MCPClient as NewClient,
  ClientSettings,
  ClientPlatform,
  ClientConfig as NewClientConfig,
  ConfigFormat,
  LogLevel
} from '../types/models.new';

/**
 * Convert old client type to new client type
 */
export function toNewClient(old: OldClient): NewClient {
  return {
    id: old.id,
    name: old.name,
    displayName: old.metadata?.displayName || old.name,
    description: old.metadata?.description,
    icon: old.metadata?.icon,
    configPath: old.configPaths.primary,
    isInstalled: old.status === ClientStatus.ACTIVE,
    isSupported: true,
    version: old.version,
    platform: mapToPlatform(old.type),
    settings: createSettings(old)
  };
}

/**
 * Convert new client type to old client type
 */
export function toOldClient(newClient: NewClient): OldClient {
  return {
    id: newClient.id,
    name: newClient.name,
    type: mapToClientType(newClient.platform),
    configPaths: {
      primary: newClient.configPath,
      alternatives: [],
      scopePaths: {
        [ConfigScope.GLOBAL]: '',
        [ConfigScope.USER]: newClient.configPath,
        [ConfigScope.LOCAL]: '',
        [ConfigScope.PROJECT]: ''
      }
    },
    status: newClient.isInstalled ? ClientStatus.ACTIVE : ClientStatus.INACTIVE,
    isActive: newClient.isInstalled,
    version: newClient.version,
    metadata: {
      displayName: newClient.displayName,
      description: newClient.description,
      icon: newClient.icon,
      autoConnect: newClient.settings?.autoConnect,
      theme: newClient.settings?.theme
    }
  };
}

/**
 * Map old ClientType enum to new ClientPlatform type
 */
function mapToPlatform(type?: ClientType): ClientPlatform {
  if (!type) return 'desktop';

  const mapping: Record<string, ClientPlatform> = {
    [ClientType.CLAUDE_DESKTOP]: 'desktop',
    [ClientType.CLAUDE_CODE]: 'cli',
    [ClientType.VS_CODE]: 'vscode',
    [ClientType.CODEX]: 'cli',
    [ClientType.GEMINI_DESKTOP]: 'desktop',
    [ClientType.GEMINI_CLI]: 'cli',
    [ClientType.CURSOR]: 'vscode',
    [ClientType.KIRO]: 'cli',
    [ClientType.WINDSURF]: 'vscode',
    [ClientType.CUSTOM]: 'cli'
  };

  return mapping[type] || 'desktop';
}

/**
 * Map new ClientPlatform to old ClientType enum
 */
function mapToClientType(platform?: ClientPlatform): ClientType {
  if (!platform) return ClientType.CUSTOM;

  const mapping: Record<ClientPlatform, ClientType> = {
    'desktop': ClientType.CLAUDE_DESKTOP,
    'cli': ClientType.CLAUDE_CODE,
    'vscode': ClientType.VS_CODE,
    'browser': ClientType.CUSTOM,
    'mobile': ClientType.CUSTOM
  };

  return mapping[platform] || ClientType.CUSTOM;
}

/**
 * Create settings from old client fields
 */
function createSettings(old: OldClient): ClientSettings | undefined {
  const metadata = old.metadata || {};
  const hasSettings = metadata.autoConnect !== undefined ||
                     metadata.theme !== undefined ||
                     metadata.maxConnections !== undefined ||
                     metadata.timeout !== undefined ||
                     metadata.logLevel !== undefined;

  if (!hasSettings) return undefined;

  return {
    theme: metadata.theme as ('light' | 'dark' | 'system') | undefined,
    autoConnect: metadata.autoConnect,
    maxConnections: metadata.maxConnections,
    timeout: metadata.timeout,
    logLevel: metadata.logLevel as LogLevel | undefined,
    experimental: {},
    advanced: {}
  };
}

/**
 * Convert old client config to new client config
 */
export function toNewClientConfig(old: any): NewClientConfig {
  return {
    client: toNewClient(old.client),
    servers: old.servers || [],
    globalSettings: old.globalSettings,
    lastModified: old.lastModified,
    configFormat: normalizeConfigFormat(old.configFormat),
    scope: old.scope || ConfigScope.USER
  };
}

/**
 * Convert new client config to old client config
 */
export function toOldClientConfig(newConfig: NewClientConfig): any {
  return {
    client: toOldClient(newConfig.client),
    servers: newConfig.servers,
    globalSettings: newConfig.globalSettings,
    lastModified: newConfig.lastModified,
    configFormat: newConfig.configFormat,
    scope: newConfig.scope
  };
}

/**
 * Normalize config format to valid enum value
 */
function normalizeConfigFormat(format?: string): ConfigFormat {
  const validFormats: ConfigFormat[] = ['json', 'json5', 'jsonc', 'toml', 'yaml'];
  return validFormats.includes(format as ConfigFormat)
    ? format as ConfigFormat
    : 'json';
}

/**
 * Batch convert old clients to new clients
 */
export function toNewClients(oldClients: OldClient[]): NewClient[] {
  return oldClients.map(toNewClient);
}

/**
 * Batch convert new clients to old clients
 */
export function toOldClients(newClients: NewClient[]): OldClient[] {
  return newClients.map(toOldClient);
}