/**
 * Installation Handler
 * IPC endpoints for server installation management
 */

import { BaseHandler } from './BaseHandler';
import { InstallationService } from '../../services/InstallationService';

export class InstallationHandler extends BaseHandler {
  private installationService: InstallationService;

  constructor() {
    super('installation');
    this.installationService = new InstallationService();
  }

  register(): void {
    this.handle('install', this.installServer.bind(this));
    this.handle('uninstall', this.uninstallServer.bind(this));
    this.handle('check', this.checkInstallation.bind(this));
    this.handle('getInstalled', this.getInstalledServers.bind(this));
    this.handle('getInfo', this.getInstallationInfo.bind(this));
    this.handle('getVersion', this.getInstalledVersion.bind(this));
  }

  /**
   * Install a server
   */
  private async installServer(event: any, serverId: string, source: string): Promise<any> {
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
  private async uninstallServer(event: any, serverId: string): Promise<any> {
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
  private async checkInstallation(event: any, packageName: string): Promise<any> {
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
  private async getInstalledServers(event: any): Promise<any> {
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
  private async getInstallationInfo(event: any, serverId: string): Promise<any> {
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
  private async getInstalledVersion(event: any, packageName: string): Promise<any> {
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