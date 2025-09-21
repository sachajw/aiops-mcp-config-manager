/**
 * Base IPC Handler
 * Provides common functionality for all IPC handlers
 */

import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { errorHandler, ApplicationError, ErrorCategory, ErrorSeverity } from '../../../shared/utils/ErrorHandler';

export abstract class BaseHandler {
  protected readonly prefix: string;

  constructor(prefix: string) {
    this.prefix = prefix;
  }

  /**
   * Register all handlers for this module
   */
  abstract register(): void;

  /**
   * Helper method to register a handler with error handling
   */
  protected handle<T extends any[], R>(
    channel: string,
    handler: (event: IpcMainInvokeEvent, ...args: T) => Promise<R> | R
  ): void {
    const fullChannel = this.prefix ? `${this.prefix}:${channel}` : channel;

    ipcMain.handle(fullChannel, async (event, ...args: any[]) => {
      try {
        console.log(`[IPC] ${fullChannel} called with:`, args.slice(0, 2)); // Log first 2 args only
        const result = await handler(event, ...args as T);
        return result;
      } catch (error) {
        console.error(`[IPC] ${fullChannel} error:`, error);

        const appError = error instanceof ApplicationError
          ? error
          : new ApplicationError(
              `IPC handler error: ${error instanceof Error ? error.message : String(error)}`,
              ErrorCategory.UNKNOWN,
              ErrorSeverity.HIGH
            );

        errorHandler.handle(appError);
        throw appError;
      }
    });
  }

  /**
   * Unregister all handlers for this module
   */
  unregister(): void {
    // Get all handlers for this prefix
    const handlers = (ipcMain as any)._invokeHandlers || {};
    const prefix = this.prefix;

    Object.keys(handlers).forEach(channel => {
      if (channel.startsWith(prefix)) {
        ipcMain.removeHandler(channel);
      }
    });
  }
}