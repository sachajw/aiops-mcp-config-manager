/**
 * IPC Handler Registration
 * Central registration point for all modular IPC handlers
 */

import { BaseHandler } from './BaseHandler';
import { ClientHandler } from './ClientHandler';
import { ConfigHandler } from './ConfigHandler';
import { ServerHandler } from './ServerHandler';
import { MetricsHandler } from './MetricsHandler';
import { SystemHandler } from './SystemHandler';
import { CatalogHandler } from './CatalogHandler';
import { ConnectionHandler } from './ConnectionHandler';
import { MCPHandler } from './MCPHandler';
import { InstallationHandler } from './InstallationHandler';

// Store handler instances for cleanup
const handlers: BaseHandler[] = [];

/**
 * Register all IPC handlers
 */
export function registerAllHandlers(): void {
  console.log('[IPC] Registering all handlers...');

  // Create and register each handler module
  const handlersToRegister = [
    new SystemHandler(),      // System and app handlers (no prefix)
    new ClientHandler(),       // clients:*
    new ConfigHandler(),       // config:*
    new ServerHandler(),       // server:*
    new MetricsHandler(),      // metrics:*
    new CatalogHandler(),      // catalog:*
    new ConnectionHandler(),   // connection:*
    new MCPHandler(),         // mcp:*
    new InstallationHandler(), // installation:*
  ];

  // Register each handler
  handlersToRegister.forEach(handler => {
    handler.register();
    handlers.push(handler);
  });

  console.log('[IPC] All handlers registered successfully');
}

/**
 * Unregister all IPC handlers
 */
export function unregisterAllHandlers(): void {
  console.log('[IPC] Unregistering all handlers...');

  handlers.forEach(handler => {
    handler.unregister();
  });

  handlers.length = 0;
  console.log('[IPC] All handlers unregistered');
}

// Export individual handlers for testing
export {
  BaseHandler,
  ClientHandler,
  ConfigHandler,
  ServerHandler,
  MetricsHandler,
  SystemHandler
};