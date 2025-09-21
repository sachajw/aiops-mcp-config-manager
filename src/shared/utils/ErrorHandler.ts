/**
 * Comprehensive Error Handling System
 * Provides centralized error management for stability and maintainability
 */

import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs-extra';

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Error categories for better organization
 */
export enum ErrorCategory {
  CONFIGURATION = 'configuration',
  FILE_SYSTEM = 'file_system',
  NETWORK = 'network',
  VALIDATION = 'validation',
  PERMISSION = 'permission',
  CLIENT = 'client',
  SERVER = 'server',
  UNKNOWN = 'unknown'
}

/**
 * Structured error interface
 */
export interface IApplicationError {
  id: string;
  timestamp: Date;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  details?: string;
  stack?: string;
  context?: Record<string, any>;
  recoverable: boolean;
  suggestions?: string[];
}

/**
 * Error recovery strategy
 */
export interface IErrorRecovery {
  canRecover: boolean;
  strategy: () => Promise<void>;
  fallback?: () => void;
}

/**
 * Application-specific error class
 */
export class ApplicationError extends Error implements IApplicationError {
  id: string;
  timestamp: Date;
  category: ErrorCategory;
  severity: ErrorSeverity;
  details?: string;
  context?: Record<string, any>;
  recoverable: boolean;
  suggestions?: string[];

  constructor(
    message: string,
    category: ErrorCategory = ErrorCategory.UNKNOWN,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    recoverable = true
  ) {
    super(message);
    this.name = 'ApplicationError';
    this.id = this.generateErrorId();
    this.timestamp = new Date();
    this.category = category;
    this.severity = severity;
    this.recoverable = recoverable;

    // Ensure proper prototype chain
    Object.setPrototypeOf(this, ApplicationError.prototype);
  }

  private generateErrorId(): string {
    return `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Add context to the error
   */
  withContext(context: Record<string, any>): ApplicationError {
    this.context = { ...this.context, ...context };
    return this;
  }

  /**
   * Add recovery suggestions
   */
  withSuggestions(...suggestions: string[]): ApplicationError {
    this.suggestions = [...(this.suggestions || []), ...suggestions];
    return this;
  }

  /**
   * Add details
   */
  withDetails(details: string): ApplicationError {
    this.details = details;
    return this;
  }

  /**
   * Convert to JSON for logging
   */
  toJSON(): IApplicationError {
    return {
      id: this.id,
      timestamp: this.timestamp,
      category: this.category,
      severity: this.severity,
      message: this.message,
      details: this.details,
      stack: this.stack,
      context: this.context,
      recoverable: this.recoverable,
      suggestions: this.suggestions
    };
  }
}

/**
 * Global Error Handler
 */
export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLog: IApplicationError[] = [];
  private readonly MAX_ERROR_LOG = 1000;
  private errorHandlers: Map<ErrorCategory, (error: IApplicationError) => void> = new Map();
  private recoveryStrategies: Map<string, IErrorRecovery> = new Map();
  private errorLogPath: string;

  private constructor() {
    this.errorLogPath = path.join(app?.getPath('userData') || '.', 'error.log');
    this.setupDefaultHandlers();
    this.setupRecoveryStrategies();
  }

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Setup default error handlers
   */
  private setupDefaultHandlers(): void {
    // Configuration errors
    this.errorHandlers.set(ErrorCategory.CONFIGURATION, (error) => {
      console.error(`Configuration Error: ${error.message}`);
      if (error.severity === ErrorSeverity.CRITICAL) {
        this.notifyUser('Configuration Error', error.message, error.suggestions);
      }
    });

    // File system errors
    this.errorHandlers.set(ErrorCategory.FILE_SYSTEM, (error) => {
      console.error(`File System Error: ${error.message}`);
      this.attemptRecovery(error);
    });

    // Network errors
    this.errorHandlers.set(ErrorCategory.NETWORK, (error) => {
      console.error(`Network Error: ${error.message}`);
      // Network errors are often transient, log but don't notify
    });

    // Permission errors
    this.errorHandlers.set(ErrorCategory.PERMISSION, (error) => {
      console.error(`Permission Error: ${error.message}`);
      this.notifyUser('Permission Denied', error.message, [
        'Run the application with administrator privileges',
        'Check file/folder permissions',
        'Ensure the configuration directory is writable'
      ]);
    });
  }

  /**
   * Setup recovery strategies
   */
  private setupRecoveryStrategies(): void {
    // File not found recovery
    this.recoveryStrategies.set('FILE_NOT_FOUND', {
      canRecover: true,
      strategy: async () => {
        // Create default configuration
        console.log('Attempting to create default configuration...');
      },
      fallback: () => {
        console.log('Using in-memory configuration');
      }
    });

    // Connection failed recovery
    this.recoveryStrategies.set('CONNECTION_FAILED', {
      canRecover: true,
      strategy: async () => {
        // Retry connection with exponential backoff
        console.log('Retrying connection...');
      }
    });

    // Corrupted data recovery
    this.recoveryStrategies.set('DATA_CORRUPTED', {
      canRecover: true,
      strategy: async () => {
        // Restore from backup
        console.log('Attempting to restore from backup...');
      }
    });
  }

  /**
   * Handle an error
   */
  handle(error: Error | ApplicationError, context?: Record<string, any>): void {
    let appError: ApplicationError;

    if (error instanceof ApplicationError) {
      appError = error;
      if (context) {
        appError.withContext(context);
      }
    } else {
      appError = this.wrapError(error, context);
    }

    // Log the error
    this.logError(appError);

    // Execute specific handler
    const handler = this.errorHandlers.get(appError.category);
    if (handler) {
      handler(appError);
    }

    // Attempt recovery if possible
    if (appError.recoverable) {
      this.attemptRecovery(appError);
    }

    // Write to file in background
    this.writeErrorToFile(appError).catch(console.error);
  }

  /**
   * Wrap standard error in ApplicationError
   */
  private wrapError(error: Error, context?: Record<string, any>): ApplicationError {
    const category = this.categorizeError(error);
    const severity = this.assessSeverity(error);

    const appError = new ApplicationError(
      error.message,
      category,
      severity,
      this.isRecoverable(error)
    );

    appError.stack = error.stack;
    if (context) {
      appError.withContext(context);
    }

    return appError;
  }

  /**
   * Categorize error based on message and type
   */
  private categorizeError(error: Error): ErrorCategory {
    const message = error.message.toLowerCase();

    if (message.includes('enoent') || message.includes('file') || message.includes('directory')) {
      return ErrorCategory.FILE_SYSTEM;
    }
    if (message.includes('econnrefused') || message.includes('timeout') || message.includes('network')) {
      return ErrorCategory.NETWORK;
    }
    if (message.includes('permission') || message.includes('eacces') || message.includes('eperm')) {
      return ErrorCategory.PERMISSION;
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return ErrorCategory.VALIDATION;
    }
    if (message.includes('config')) {
      return ErrorCategory.CONFIGURATION;
    }

    return ErrorCategory.UNKNOWN;
  }

  /**
   * Assess error severity
   */
  private assessSeverity(error: Error): ErrorSeverity {
    const message = error.message.toLowerCase();

    if (message.includes('critical') || message.includes('fatal')) {
      return ErrorSeverity.CRITICAL;
    }
    if (message.includes('error')) {
      return ErrorSeverity.HIGH;
    }
    if (message.includes('warning')) {
      return ErrorSeverity.MEDIUM;
    }

    return ErrorSeverity.LOW;
  }

  /**
   * Check if error is recoverable
   */
  private isRecoverable(error: Error): boolean {
    const message = error.message.toLowerCase();

    // Non-recoverable errors
    if (message.includes('fatal') || message.includes('critical')) {
      return false;
    }

    // Typically recoverable errors
    if (message.includes('enoent') || message.includes('timeout') || message.includes('retry')) {
      return true;
    }

    return true; // Optimistic by default
  }

  /**
   * Log error to memory
   */
  private logError(error: IApplicationError): void {
    this.errorLog.push(error);

    // Maintain log size
    if (this.errorLog.length > this.MAX_ERROR_LOG) {
      this.errorLog.shift();
    }
  }

  /**
   * Write error to file
   */
  private async writeErrorToFile(error: IApplicationError): Promise<void> {
    try {
      const logEntry = `[${error.timestamp.toISOString()}] [${error.severity.toUpperCase()}] [${error.category}] ${error.message}\n`;
      await fs.appendFile(this.errorLogPath, logEntry);
    } catch (writeError) {
      console.error('Failed to write error to file:', writeError);
    }
  }

  /**
   * Attempt error recovery
   */
  private attemptRecovery(error: IApplicationError): void {
    const strategyKey = this.getRecoveryStrategyKey(error);
    const recovery = this.recoveryStrategies.get(strategyKey);

    if (recovery && recovery.canRecover) {
      recovery.strategy()
        .catch(() => {
          if (recovery.fallback) {
            recovery.fallback();
          }
        });
    }
  }

  /**
   * Get recovery strategy key
   */
  private getRecoveryStrategyKey(error: IApplicationError): string {
    const message = error.message.toLowerCase();

    if (message.includes('enoent')) return 'FILE_NOT_FOUND';
    if (message.includes('econnrefused')) return 'CONNECTION_FAILED';
    if (message.includes('corrupt')) return 'DATA_CORRUPTED';

    return '';
  }

  /**
   * Notify user of error
   */
  private notifyUser(title: string, message: string, suggestions?: string[]): void {
    // This would integrate with the UI notification system
    console.error(`USER NOTIFICATION: ${title} - ${message}`);
    if (suggestions) {
      console.log('Suggestions:', suggestions);
    }
  }

  /**
   * Get error statistics
   */
  getStatistics(): {
    total: number;
    byCategory: Record<ErrorCategory, number>;
    bySeverity: Record<ErrorSeverity, number>;
    recent: IApplicationError[];
  } {
    const byCategory: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};

    for (const error of this.errorLog) {
      byCategory[error.category] = (byCategory[error.category] || 0) + 1;
      bySeverity[error.severity] = (bySeverity[error.severity] || 0) + 1;
    }

    return {
      total: this.errorLog.length,
      byCategory: byCategory as Record<ErrorCategory, number>,
      bySeverity: bySeverity as Record<ErrorSeverity, number>,
      recent: this.errorLog.slice(-10)
    };
  }

  /**
   * Clear error log
   */
  clearLog(): void {
    this.errorLog = [];
  }

  /**
   * Export error log
   */
  async exportLog(filepath: string): Promise<void> {
    const logData = this.errorLog.map(e => JSON.stringify(e)).join('\n');
    await fs.writeFile(filepath, logData);
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();

/**
 * Error boundary decorator for methods
 */
export function ErrorBoundary(
  category: ErrorCategory = ErrorCategory.UNKNOWN,
  recoverable = true
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      try {
        return await originalMethod.apply(this, args);
      } catch (error) {
        const appError = new ApplicationError(
          error instanceof Error ? error.message : String(error),
          category,
          ErrorSeverity.MEDIUM,
          recoverable
        );

        appError.withContext({
          method: propertyKey,
          class: target.constructor.name,
          args: args.map(a => typeof a === 'object' ? '[Object]' : a)
        });

        errorHandler.handle(appError);

        if (!recoverable) {
          throw appError;
        }
      }
    };

    return descriptor;
  };
}

/**
 * Common error factory methods
 */
export const ErrorFactory = {
  configurationError: (message: string, suggestions?: string[]) =>
    new ApplicationError(message, ErrorCategory.CONFIGURATION, ErrorSeverity.HIGH)
      .withSuggestions(...(suggestions || [])),

  fileSystemError: (message: string, path?: string) =>
    new ApplicationError(message, ErrorCategory.FILE_SYSTEM, ErrorSeverity.MEDIUM)
      .withContext({ path }),

  validationError: (message: string, field?: string) =>
    new ApplicationError(message, ErrorCategory.VALIDATION, ErrorSeverity.LOW)
      .withContext({ field }),

  networkError: (message: string, url?: string) =>
    new ApplicationError(message, ErrorCategory.NETWORK, ErrorSeverity.MEDIUM)
      .withContext({ url }),

  permissionError: (message: string, resource?: string) =>
    new ApplicationError(message, ErrorCategory.PERMISSION, ErrorSeverity.HIGH, false)
      .withContext({ resource })
};