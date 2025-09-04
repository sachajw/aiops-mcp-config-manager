import { ValidationSeverity, FileChangeType } from './enums';

/**
 * Generic validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * Validation error details
 */
export interface ValidationError {
  field: string;
  message: string;
  severity: ValidationSeverity;
  code?: string;
}

/**
 * Validation warning details
 */
export interface ValidationWarning {
  field: string;
  message: string;
  severity: ValidationSeverity;
  suggestion?: string;
}

/**
 * File system change event
 */
export interface FileChange {
  path: string;
  type: FileChangeType;
  timestamp: Date;
}

/**
 * External file change detection
 */
export interface ExternalChange {
  filePath: string;
  change: FileChange;
  hasConflict: boolean;
}

/**
 * File conflict resolution
 */
export interface FileConflict {
  filePath: string;
  localContent: string;
  externalContent: string;
  timestamp: Date;
}

/**
 * Backup metadata
 */
export interface Backup {
  id: string;
  filePath: string;
  backupPath: string;
  timestamp: Date;
  size: number;
  description?: string;
}

/**
 * Error response with recovery suggestions
 */
export interface ErrorResponse {
  message: string;
  code: string;
  severity: ValidationSeverity;
  suggestions: string[];
  canAutoRecover: boolean;
}

/**
 * Fix suggestion for error recovery
 */
export interface FixSuggestion {
  description: string;
  action: string;
  autoApplicable: boolean;
}

/**
 * Error report for debugging
 */
export interface ErrorReport {
  id: string;
  timestamp: Date;
  error: Error;
  context: Record<string, any>;
  stackTrace: string;
}