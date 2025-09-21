/**
 * Installation Handler
 * IPC endpoints for server installation management
 */

import { BaseHandler } from './BaseHandler';
import { InstallationService } from '../../services/InstallationService';

export class InstallationHandler extends BaseHandler {
  private installationService: InstallationService;

  constructor() {
    super();
    this.installationService = new InstallationService();
  }

  protected getHandlers(): Record<string, (...args: any[]) => Promise<any>> {
    return {
      'installation:install': this.installServer.bind(this),
      'installation:uninstall': this.uninstallServer.bind(this),
      'installation:check': this.checkInstallation.bind(this),
      'installation:getInstalled': this.getInstalledServers.bind(this),
      'installation:getInfo': this.getInstallationInfo.bind(this),
      'installation:getVersion': this.getInstalledVersion.bind(this)
    };
  }

  /**
   * Install a server
   */
  private async installServer(serverId: string, source: string): Promise<any> {
    try {
      console.log(`[InstallationHandler] Installing server: ${serverId} from ${source}`);
      const result = await this.installationService.installServer(serverId, source);
      return { success: true, data: result };
    } catch (error) {
      console.error('[InstallationHandler] Install failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Installation failed'
      };
    }
  }

  /**
   * Uninstall a server
   */
  private async uninstallServer(serverId: string): Promise<any> {
    try {
      console.log(`[InstallationHandler] Uninstalling server: ${serverId}`);
      await this.installationService.uninstallServer(serverId);
      return { success: true };
    } catch (error) {
      console.error('[InstallationHandler] Uninstall failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Uninstallation failed'
      };
    }
  }

  /**
   * Check if a package is installed
   */
  private async checkInstallation(packageName: string): Promise<any> {
    try {
      const isInstalled = await this.installationService.checkInstallation(packageName);
      return { success: true, data: { installed: isInstalled } };
    } catch (error) {
      console.error('[InstallationHandler] Check failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Check failed'
      };
    }
  }

  /**
   * Get all installed servers
   */
  private async getInstalledServers(): Promise<any> {
    try {
      const servers = this.installationService.getInstalledServers();
      return { success: true, data: servers };
    } catch (error) {
      console.error('[InstallationHandler] Get installed servers failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get installed servers'
      };
    }
  }

  /**
   * Get installation info for a specific server
   */
  private async getInstallationInfo(serverId: string): Promise<any> {
    try {
      const info = this.installationService.getInstallationInfo(serverId);
      return { success: true, data: info };
    } catch (error) {
      console.error('[InstallationHandler] Get info failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get installation info'
      };
    }
  }

  /**
   * Get installed version of a package
   */
  private async getInstalledVersion(packageName: string): Promise<any> {
    try {
      const version = await this.installationService.getInstalledVersion(packageName);
      return { success: true, data: { version } };
    } catch (error) {
      console.error('[InstallationHandler] Get version failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get version'
      };
    }
  }
}