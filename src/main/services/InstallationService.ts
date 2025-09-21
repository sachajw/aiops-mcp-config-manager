import { spawn } from 'child_process';
import * as fs from 'fs-extra';
import * as path from 'path';
import { app } from 'electron';

export interface InstallResult {
  success: boolean;
  version?: string;
  path?: string;
  error?: string;
}

export interface InstalledServerInfo {
  serverId: string;
  packageName: string;
  version: string;
  installDate: Date;
  installPath: string;
  type: 'npm' | 'pip' | 'cargo' | 'git' | 'manual';
}

/**
 * Service for managing MCP server installations
 * Handles npm, pip, cargo, and git installations
 */
export class InstallationService {
  private installedServers: Map<string, InstalledServerInfo> = new Map();
  private installationPath: string;

  constructor() {
    // Default installation path
    this.installationPath = path.join(app.getPath('userData'), 'mcp-servers');
    this.loadInstalledServers();
  }

  /**
   * Load installed servers from persistent storage
   */
  private async loadInstalledServers(): Promise<void> {
    const metadataPath = path.join(this.installationPath, 'installed.json');
    try {
      if (await fs.pathExists(metadataPath)) {
        const data = await fs.readJson(metadataPath);
        this.installedServers = new Map(Object.entries(data));
      }
    } catch (error) {
      console.error('[InstallationService] Failed to load installed servers:', error);
    }
  }

  /**
   * Save installed servers to persistent storage
   */
  private async saveInstalledServers(): Promise<void> {
    const metadataPath = path.join(this.installationPath, 'installed.json');
    try {
      await fs.ensureDir(this.installationPath);
      const data = Object.fromEntries(this.installedServers);
      await fs.writeJson(metadataPath, data, { spaces: 2 });
    } catch (error) {
      console.error('[InstallationService] Failed to save installed servers:', error);
    }
  }

  /**
   * Install a server from npm, pip, cargo, or git
   */
  async installServer(serverId: string, source: string): Promise<InstallResult> {
    console.log(`[InstallationService] Installing ${serverId} from ${source}`);

    // Determine installation type based on source
    if (source.startsWith('npm:')) {
      return this.installNpmServer(serverId, source.substring(4));
    } else if (source.startsWith('pip:')) {
      return this.installPipServer(serverId, source.substring(4));
    } else if (source.startsWith('cargo:')) {
      return this.installCargoServer(serverId, source.substring(6));
    } else if (source.startsWith('git:')) {
      return this.installGitServer(serverId, source.substring(4));
    } else {
      return { success: false, error: 'Unknown installation source type' };
    }
  }

  /**
   * Install an npm package
   */
  private async installNpmServer(serverId: string, packageName: string): Promise<InstallResult> {
    return new Promise(async (resolve) => {
      const serverPath = path.join(this.installationPath, 'npm', serverId);
      await fs.ensureDir(serverPath);

      // Check if already installed globally
      const checkGlobal = spawn('npm', ['list', '-g', packageName, '--json'], { shell: true });
      let isGloballyInstalled = false;

      checkGlobal.stdout.on('data', (data) => {
        try {
          const result = JSON.parse(data.toString());
          if (result.dependencies && result.dependencies[packageName]) {
            isGloballyInstalled = true;
          }
        } catch {}
      });

      checkGlobal.on('close', async () => {
        if (isGloballyInstalled) {
          // Already installed globally, just record it
          const info: InstalledServerInfo = {
            serverId,
            packageName,
            version: 'global',
            installDate: new Date(),
            installPath: 'global',
            type: 'npm'
          };
          this.installedServers.set(serverId, info);
          await this.saveInstalledServers();
          resolve({ success: true, version: 'global', path: 'global' });
          return;
        }

        // Install locally in our managed directory
        const npmProcess = spawn('npm', ['install', packageName], {
          cwd: serverPath,
          shell: true
        });

        let output = '';
        let errorOutput = '';

        npmProcess.stdout.on('data', (data) => {
          output += data.toString();
        });

        npmProcess.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });

        npmProcess.on('close', async (code) => {
          if (code === 0) {
            // Get installed version
            const pkgPath = path.join(serverPath, 'node_modules', packageName, 'package.json');
            let version = 'unknown';
            try {
              const pkg = await fs.readJson(pkgPath);
              version = pkg.version;
            } catch {}

            const info: InstalledServerInfo = {
              serverId,
              packageName,
              version,
              installDate: new Date(),
              installPath: serverPath,
              type: 'npm'
            };
            this.installedServers.set(serverId, info);
            await this.saveInstalledServers();

            resolve({ success: true, version, path: serverPath });
          } else {
            resolve({ success: false, error: errorOutput || `npm install failed with code ${code}` });
          }
        });
      });
    });
  }

  /**
   * Install a Python package via pip
   */
  private async installPipServer(serverId: string, packageName: string): Promise<InstallResult> {
    return new Promise(async (resolve) => {
      const pipProcess = spawn('pip', ['install', packageName], { shell: true });

      let output = '';
      let errorOutput = '';

      pipProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      pipProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      pipProcess.on('close', async (code) => {
        if (code === 0) {
          const info: InstalledServerInfo = {
            serverId,
            packageName,
            version: 'latest',
            installDate: new Date(),
            installPath: 'system',
            type: 'pip'
          };
          this.installedServers.set(serverId, info);
          await this.saveInstalledServers();

          resolve({ success: true, version: 'latest', path: 'system' });
        } else {
          resolve({ success: false, error: errorOutput || `pip install failed with code ${code}` });
        }
      });
    });
  }

  /**
   * Install a Rust package via cargo
   */
  private async installCargoServer(serverId: string, packageName: string): Promise<InstallResult> {
    return new Promise(async (resolve) => {
      const cargoProcess = spawn('cargo', ['install', packageName], { shell: true });

      let output = '';
      let errorOutput = '';

      cargoProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      cargoProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      cargoProcess.on('close', async (code) => {
        if (code === 0) {
          const info: InstalledServerInfo = {
            serverId,
            packageName,
            version: 'latest',
            installDate: new Date(),
            installPath: 'system',
            type: 'cargo'
          };
          this.installedServers.set(serverId, info);
          await this.saveInstalledServers();

          resolve({ success: true, version: 'latest', path: 'system' });
        } else {
          resolve({ success: false, error: errorOutput || `cargo install failed with code ${code}` });
        }
      });
    });
  }

  /**
   * Clone and install from git repository
   */
  private async installGitServer(serverId: string, repoUrl: string): Promise<InstallResult> {
    return new Promise(async (resolve) => {
      const serverPath = path.join(this.installationPath, 'git', serverId);
      await fs.ensureDir(path.dirname(serverPath));

      const gitProcess = spawn('git', ['clone', repoUrl, serverPath], { shell: true });

      let output = '';
      let errorOutput = '';

      gitProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      gitProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      gitProcess.on('close', async (code) => {
        if (code === 0) {
          // Check for package.json and run npm install if needed
          const pkgJsonPath = path.join(serverPath, 'package.json');
          if (await fs.pathExists(pkgJsonPath)) {
            const npmInstall = spawn('npm', ['install'], {
              cwd: serverPath,
              shell: true
            });

            npmInstall.on('close', async (npmCode) => {
              if (npmCode === 0) {
                const info: InstalledServerInfo = {
                  serverId,
                  packageName: repoUrl,
                  version: 'git',
                  installDate: new Date(),
                  installPath: serverPath,
                  type: 'git'
                };
                this.installedServers.set(serverId, info);
                await this.saveInstalledServers();

                resolve({ success: true, version: 'git', path: serverPath });
              } else {
                resolve({ success: false, error: 'Failed to install dependencies' });
              }
            });
          } else {
            const info: InstalledServerInfo = {
              serverId,
              packageName: repoUrl,
              version: 'git',
              installDate: new Date(),
              installPath: serverPath,
              type: 'git'
            };
            this.installedServers.set(serverId, info);
            await this.saveInstalledServers();

            resolve({ success: true, version: 'git', path: serverPath });
          }
        } else {
          resolve({ success: false, error: errorOutput || `git clone failed with code ${code}` });
        }
      });
    });
  }

  /**
   * Uninstall a server
   */
  async uninstallServer(serverId: string): Promise<void> {
    const info = this.installedServers.get(serverId);
    if (!info) {
      throw new Error(`Server ${serverId} is not installed`);
    }

    // Handle different uninstall methods based on type
    switch (info.type) {
      case 'npm':
        if (info.installPath !== 'global') {
          // Remove local installation
          await fs.remove(info.installPath);
        }
        break;

      case 'pip':
        // Uninstall pip package
        await new Promise((resolve, reject) => {
          const pipProcess = spawn('pip', ['uninstall', '-y', info.packageName], { shell: true });
          pipProcess.on('close', (code) => {
            if (code === 0) resolve(void 0);
            else reject(new Error(`pip uninstall failed with code ${code}`));
          });
        });
        break;

      case 'cargo':
        // Uninstall cargo package
        await new Promise((resolve, reject) => {
          const cargoProcess = spawn('cargo', ['uninstall', info.packageName], { shell: true });
          cargoProcess.on('close', (code) => {
            if (code === 0) resolve(void 0);
            else reject(new Error(`cargo uninstall failed with code ${code}`));
          });
        });
        break;

      case 'git':
        // Remove git clone
        await fs.remove(info.installPath);
        break;
    }

    // Remove from installed list
    this.installedServers.delete(serverId);
    await this.saveInstalledServers();
  }

  /**
   * Check if a server is installed
   */
  async checkInstallation(packageName: string): Promise<boolean> {
    // Check in our installed list
    for (const [, info] of this.installedServers) {
      if (info.packageName === packageName) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get installed version of a package
   */
  async getInstalledVersion(packageName: string): Promise<string | null> {
    for (const [, info] of this.installedServers) {
      if (info.packageName === packageName) {
        return info.version;
      }
    }
    return null;
  }

  /**
   * Get all installed servers
   */
  getInstalledServers(): InstalledServerInfo[] {
    return Array.from(this.installedServers.values());
  }

  /**
   * Get installation info for a specific server
   */
  getInstallationInfo(serverId: string): InstalledServerInfo | undefined {
    return this.installedServers.get(serverId);
  }
}