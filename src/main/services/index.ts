// Configuration parsing and validation services
export { ConfigurationParser, ClientConfigSchemas, type ParseResult } from './ConfigurationParser';
export { ValidationEngine, type ValidationContext, type CommandValidationResult } from './ValidationEngine';
export { ConfigurationService } from './ConfigurationService';

// Client discovery and management services
export { ClientDetector } from './ClientDetector';

// Scope management services
export { ScopeManager } from './ScopeManager';

// Main configuration management orchestrator
export { ConfigurationManager } from './ConfigurationManager';

// File monitoring and change detection
export { FileMonitor, type FileChangeEvent, type ExternalChange, type FileConflict } from './FileMonitor';

// Backup and recovery system
export { 
  BackupManager, 
  BackupType,
  type Backup, 
  type RestoreResult, 
  type CleanupStats 
} from './BackupManager';

// Server configuration and testing
export { 
  ServerTester,
  type ServerTestResult,
  type TestConfiguration,
  type CommandValidationResult
} from './ServerTester';

// Re-export commonly used types
export type { Configuration, ConfigurationMetadata, ResolvedConfiguration } from '../../shared/types/configuration';
export type { MCPServer } from '../../shared/types/server';
export type { MCPClient, ClientDetectionResult, ClientValidationResult, ClientStatusResult } from '../../shared/types/client';
export type { ValidationResult, ValidationError } from '../../shared/types/common';
export { ClientType, ValidationSeverity, ConfigScope, ClientStatus } from '../../shared/types/enums';