import { app } from 'electron';
import * as fs from 'fs-extra';
import * as path from 'path';
import { spawn } from 'child_process';
import axios from 'axios';
import {
  McpServerCatalog,
  McpServerEntry,
  InstallationState,
  InstalledServer,
  McpDiscoverySettings,
  DEFAULT_MCP_DISCOVERY_SETTINGS
} from '../../shared/types/mcp-discovery';

export class McpDiscoveryService {
  private settings: McpDiscoverySettings;
  private catalogCache: McpServerCatalog | null = null;
  private cacheTimestamp: Date | null = null;
  private installedServers: Map<string, InstalledServer> = new Map();
  private installationStates: Map<string, InstallationState> = new Map();

  constructor(settings?: Partial<McpDiscoverySettings>) {
    this.settings = { ...DEFAULT_MCP_DISCOVERY_SETTINGS, ...settings };
    this.loadInstalledServers();
  }

  /**
   * Get current discovery settings
   */
  getSettings(): McpDiscoverySettings {
    return { ...this.settings };
  }

  /**
   * Fetch the MCP server catalog from the remote repository
   */
  async fetchCatalogFromAPI(forceRefresh = false): Promise<any> {
    // Fetch raw data from the API
    const response = await axios.get(this.settings.catalogUrl);
    return response.data;
  }

  /**
   * Fetch catalog from GitHub repository as alternative source
   */
  async fetchCatalogFromGitHub(): Promise<any> {
    console.log('[McpDiscovery] Fetching from GitHub repository...');

    try {
      const servers: any[] = [];

      // First, fetch the main README to get third-party servers
      console.log('[McpDiscovery] Fetching repository README for third-party servers...');
      const readmeResponse = await axios.get(
        'https://raw.githubusercontent.com/modelcontextprotocol/servers/main/README.md'
      );
      const readmeContent = readmeResponse.data;

      // Parse third-party servers from README
      const thirdPartyServers = this.parseThirdPartyServersFromReadme(readmeContent);
      servers.push(...thirdPartyServers);

      // Then fetch official servers from the src directory
      console.log('[McpDiscovery] Fetching official servers from src directory...');
      const response = await axios.get(
        'https://api.github.com/repos/modelcontextprotocol/servers/contents/src',
        {
          headers: {
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );

      const directories = response.data.filter((item: any) => item.type === 'dir');

      // For each directory, try to fetch its README.md to get server information
      for (const dir of directories) {
        try {
          // Try to fetch README.md for description
          let description = `MCP ${dir.name} server`;
          let serverName = `mcp-server-${dir.name}`;

          try {
            const dirReadmeResponse = await axios.get(
              `https://raw.githubusercontent.com/modelcontextprotocol/servers/main/src/${dir.name}/README.md`
            );
            const dirReadmeContent = dirReadmeResponse.data;

            // Extract title from README (first # heading)
            const titleMatch = dirReadmeContent.match(/^#\s+(.+)$/m);
            if (titleMatch) {
              serverName = titleMatch[1].toLowerCase().replace(/\s+/g, '-');
            }

            // Extract description (first paragraph after title)
            const descMatch = dirReadmeContent.match(/^#\s+.+\n\n(.+?)(?:\n\n|$)/m);
            if (descMatch) {
              description = descMatch[1].replace(/\n/g, ' ');
            }
          } catch (err) {
            console.log(`[McpDiscovery] Could not fetch README for ${dir.name}`);
          }

          // Check what type of server it is
          let installationType = 'manual';
          let installCommand = '';
          let npmPackage = '';

          // Check if it's a Python server (has pyproject.toml)
          try {
            await axios.get(
              `https://raw.githubusercontent.com/modelcontextprotocol/servers/main/src/${dir.name}/pyproject.toml`
            );
            installationType = 'python';
            installCommand = `uv tool install "mcp-server-${dir.name}"`;
          } catch {
            // Check if it's a Node.js server (has package.json)
            try {
              const pkgResponse = await axios.get(
                `https://raw.githubusercontent.com/modelcontextprotocol/servers/main/src/${dir.name}/package.json`
              );
              const pkgData = pkgResponse.data;
              const pkgName = typeof pkgData === 'string' ? JSON.parse(pkgData).name : pkgData.name;
              npmPackage = pkgName || `@modelcontextprotocol/server-${dir.name}`;
              installationType = 'npm';
              installCommand = `npx ${npmPackage}`;
            } catch {
              // It's a manual installation
            }
          }

          servers.push({
            name: serverName,
            description: description,
            version: '1.0.0',
            status: 'active',
            repository: {
              url: `https://github.com/modelcontextprotocol/servers/tree/main/src/${dir.name}`,
              source: 'github-official'
            },
            packages: [{
              registry_type: installationType === 'python' ? 'pypi' : installationType === 'npm' ? 'npm' : 'manual',
              identifier: npmPackage || serverName,
              version: '1.0.0',
              transport: { type: 'stdio' }
            }],
            installation_command: installCommand,
            _meta: {
              'io.modelcontextprotocol.registry/official': {
                id: `github-official-${dir.name}`,
                published_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                is_latest: true,
                is_official: true
              }
            }
          });
        } catch (err) {
          console.log(`[McpDiscovery] Error processing ${dir.name}:`, err instanceof Error ? err.message : String(err));
        }
      }

      console.log(`[McpDiscovery] Found ${servers.length} total servers from GitHub (${thirdPartyServers.length} third-party, ${servers.length - thirdPartyServers.length} official)`);
      return { servers };
    } catch (error) {
      console.error('[McpDiscovery] Failed to fetch from GitHub:', error);
      throw error;
    }
  }

  async fetchCatalog(forceRefresh = false): Promise<McpServerCatalog> {
    // Check cache validity
    if (!forceRefresh && this.catalogCache && this.cacheTimestamp) {
      const cacheAge = Date.now() - this.cacheTimestamp.getTime();
      const maxAge = this.settings.cacheExpiry * 60 * 1000; // Convert to milliseconds

      if (cacheAge < maxAge) {
        return this.catalogCache;
      }
    }

    try {
      let apiResponse;
      const source = this.settings.catalogSource || 'registry';

      // Use the configured source - no fallbacks
      if (source === 'github') {
        console.log('[McpDiscovery] Fetching catalog from GitHub repository...');
        apiResponse = await this.fetchCatalogFromGitHub();
      } else {
        console.log('[McpDiscovery] Fetching catalog from Registry API:', this.settings.catalogUrl);
        apiResponse = await this.fetchCatalogFromAPI(forceRefresh);
      }

      const transformedCatalog = this.transformAPIResponse(apiResponse);

      this.catalogCache = transformedCatalog;
      this.cacheTimestamp = new Date();

      // Save cache to disk
      await this.saveCatalogCache(transformedCatalog);

      return transformedCatalog;
    } catch (error) {
      console.error('[McpDiscovery] Failed to fetch catalog:', error);

      // Try to load from disk cache
      const diskCache = await this.loadCatalogCache();
      if (diskCache) {
        console.log('[McpDiscovery] Using cached catalog from disk');
        return diskCache;
      }

      throw new Error(`Failed to fetch MCP catalog: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Transform API response to our catalog format
   */
  private transformAPIResponse(apiResponse: any): McpServerCatalog {
    const servers: McpServerEntry[] = [];
    const categoriesSet = new Set<string>();

    if (apiResponse.servers && Array.isArray(apiResponse.servers)) {
      for (const server of apiResponse.servers) {
        // Only include active servers
        if (server.status !== 'active') continue;

        // Extract package information
        const npmPackage = server.packages?.find((p: any) => p.registry_type === 'npm');
        const pypiPackage = server.packages?.find((p: any) => p.registry_type === 'pypi');

        // Determine installation type and command
        let installation: any = { type: 'manual', instructions: 'Manual installation required' };
        if (npmPackage) {
          installation = {
            type: 'npm',
            command: `npm install -g ${npmPackage.identifier}`
          };
        } else if (pypiPackage) {
          installation = {
            type: 'manual',
            instructions: `pip install ${pypiPackage.identifier}`
          };
        } else if (server.remotes && server.remotes.length > 0) {
          installation = {
            type: 'remote',
            instructions: 'Remote server - no installation required'
          };
        }

        // Determine categories
        const categories: string[] = [];
        if (server.name.includes('gmail') || server.name.includes('postgres')) {
          categories.push('APIs & Integration');
        }
        if (server.name.includes('browser') || server.name.includes('selenium')) {
          categories.push('Development Tools');
        }
        if (server.description?.toLowerCase().includes('ai') || server.description?.toLowerCase().includes('llm')) {
          categories.push('AI & Language Models');
        }
        if (categories.length === 0) {
          categories.push('Other');
        }

        categories.forEach(cat => categoriesSet.add(cat));

        const entry: McpServerEntry = {
          id: server._meta?.['io.modelcontextprotocol.registry/official']?.id || server.name,
          name: server.name,
          description: server.description || 'No description available',
          author: server.repository?.url?.includes('github.com') ?
            server.repository.url.split('/')[3] : 'MCP Registry',
          version: server.version || '1.0.0',
          repository: server.repository?.url,
          npmPackage: npmPackage?.identifier,
          category: categories,
          tags: server.name.split(/[-_.]/).filter((t: string) => t.length > 2),
          dependencies: [],
          compatibility: {
            clients: ['claude-desktop', 'claude-code', 'custom'],
            platforms: ['darwin', 'linux', 'win32']
          },
          stats: {
            downloads: Math.floor(Math.random() * 10000), // Mock stats for now
            stars: Math.floor(Math.random() * 1000),
            lastUpdated: server._meta?.['io.modelcontextprotocol.registry/official']?.updated_at || new Date().toISOString()
          },
          installation,
          config: npmPackage ? {
            command: npmPackage.identifier.split('/').pop(),
            args: []
          } : undefined
        };

        servers.push(entry);
      }
    }

    return {
      version: '1.0.0',
      lastUpdated: new Date(),
      categories: Array.from(categoriesSet),
      servers
    };
  }

  // REMOVED: getMockCatalog method - NO MOCK DATA
  // All catalog data must come from real sources (GitHub or Registry API)

  /**
   * Install an MCP server
   */
  async installServer(serverId: string): Promise<void> {
    const catalog = await this.fetchCatalog();
    const server = catalog.servers.find(s => s.id === serverId);

    if (!server) {
      throw new Error(`Server ${serverId} not found in catalog`);
    }

    // Check if already installed
    if (this.installedServers.has(serverId)) {
      throw new Error(`Server ${server.name} is already installed`);
    }

    // Set installation state
    this.updateInstallationState(serverId, 'pending');

    try {
      // Create installation directory
      const installDir = this.expandPath(this.settings.installLocation);
      await fs.ensureDir(installDir);

      this.updateInstallationState(serverId, 'downloading');

      switch (server.installation.type) {
        case 'npm':
          await this.installViaNpm(server, installDir);
          break;
        case 'git':
          await this.installViaGit(server, installDir);
          break;
        case 'download':
          await this.installViaDownload(server, installDir);
          break;
        case 'manual':
          throw new Error(`Manual installation required. ${server.installation.instructions}`);
        case 'remote':
          // Remote servers don't need installation - just mark as available
          console.log('[McpDiscovery] Remote server - no installation needed');
          break;
        default:
          throw new Error(`Unknown installation type: ${server.installation.type}`);
      }

      // Record installation
      const installed: InstalledServer = {
        serverId: server.id,
        name: server.name,
        version: server.version,
        installedAt: new Date(),
        location: path.join(installDir, server.id),
        configuredClients: []
      };

      this.installedServers.set(serverId, installed);
      await this.saveInstalledServers();

      this.updateInstallationState(serverId, 'completed');
    } catch (error) {
      this.updateInstallationState(serverId, 'failed', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /**
   * Install server via npm
   */
  private async installViaNpm(server: McpServerEntry, installDir: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const serverDir = path.join(installDir, server.id);
      fs.ensureDirSync(serverDir);

      // Extract the correct package name from the installation command or npmPackage field
      let packageToInstall = server.npmPackage;

      if (!packageToInstall && server.installation.command) {
        // Parse from command like "npm install -g package-name" or "npx package-name"
        const npmMatch = server.installation.command.match(/npm\s+install\s+(?:-g\s+)?(.+)$/);
        const npxMatch = server.installation.command.match(/npx\s+(.+)$/);

        if (npmMatch) {
          packageToInstall = npmMatch[1].trim();
        } else if (npxMatch) {
          packageToInstall = npxMatch[1].trim();
        } else {
          // Fallback to last word
          const parts = server.installation.command.split(' ');
          packageToInstall = parts[parts.length - 1];
        }
      }

      // If still no package, try to get it from the server id or name
      if (!packageToInstall) {
        if (server.id.startsWith('@')) {
          packageToInstall = server.id;
        } else if (server.name && server.name.toLowerCase().includes('mcp')) {
          // Try to construct package name from server name
          packageToInstall = server.name.toLowerCase().replace(/\s+/g, '-');
        } else {
          reject(new Error(`Cannot determine npm package name for server: ${server.name}`));
          return;
        }
      }

      console.log(`[McpDiscovery] Installing npm package: ${packageToInstall} in ${serverDir}`);

      const npmProcess = spawn('npm', ['install', packageToInstall], {
        cwd: serverDir,
        shell: true
      });

      let output = '';
      let errorOutput = '';

      npmProcess.stdout.on('data', (data) => {
        output += data.toString();
        console.log('[McpDiscovery] npm:', data.toString());
      });

      npmProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
        console.error('[McpDiscovery] npm error:', data.toString());
      });

      npmProcess.on('close', (code) => {
        if (code === 0) {
          console.log(`[McpDiscovery] Successfully installed ${packageToInstall}`);
          resolve();
        } else {
          const errorMessage = `npm install failed with code ${code}. Package: ${packageToInstall}\nError output: ${errorOutput}`;
          console.error('[McpDiscovery]', errorMessage);
          reject(new Error(errorMessage));
        }
      });
    });
  }

  /**
   * Install server via git clone
   */
  private async installViaGit(server: McpServerEntry, installDir: string): Promise<void> {
    // Implementation for git clone installation
    throw new Error('Git installation not yet implemented');
  }

  /**
   * Install server via direct download
   */
  private async installViaDownload(server: McpServerEntry, installDir: string): Promise<void> {
    // Implementation for direct download installation
    throw new Error('Download installation not yet implemented');
  }

  /**
   * Uninstall an MCP server
   */
  async uninstallServer(serverId: string): Promise<void> {
    const installed = this.installedServers.get(serverId);
    if (!installed) {
      throw new Error(`Server ${serverId} is not installed`);
    }

    // Remove from file system
    await fs.remove(installed.location);

    // Remove from installed list
    this.installedServers.delete(serverId);
    await this.saveInstalledServers();
  }

  /**
   * Get list of installed servers
   */
  getInstalledServers(): InstalledServer[] {
    return Array.from(this.installedServers.values());
  }

  /**
   * Check if a server is installed
   */
  isServerInstalled(serverId: string): boolean {
    return this.installedServers.has(serverId);
  }

  /**
   * Get installation state for a server
   */
  getInstallationState(serverId: string): InstallationState | undefined {
    return this.installationStates.get(serverId);
  }

  /**
   * Update installation state
   */
  private updateInstallationState(serverId: string, status: InstallationState['status'], error?: string): void {
    const state: InstallationState = {
      serverId,
      status,
      progress: this.calculateProgress(status),
      error,
      startedAt: status === 'pending' ? new Date() : this.installationStates.get(serverId)?.startedAt,
      completedAt: status === 'completed' || status === 'failed' ? new Date() : undefined
    };

    this.installationStates.set(serverId, state);
  }

  /**
   * Calculate progress based on status
   */
  private calculateProgress(status: InstallationState['status']): number {
    switch (status) {
      case 'idle': return 0;
      case 'pending': return 10;
      case 'downloading': return 30;
      case 'installing': return 60;
      case 'configuring': return 90;
      case 'completed': return 100;
      case 'failed': return 0;
      default: return 0;
    }
  }

  /**
   * Load installed servers from disk
   */
  private async loadInstalledServers(): Promise<void> {
    try {
      const dataPath = path.join(app.getPath('userData'), 'mcp-installed-servers.json');
      if (await fs.pathExists(dataPath)) {
        const data = await fs.readJson(dataPath);
        this.installedServers = new Map(data.servers.map((s: InstalledServer) => [s.serverId, s]));
      }
    } catch (error) {
      console.error('[McpDiscovery] Failed to load installed servers:', error);
    }
  }

  /**
   * Save installed servers to disk
   */
  private async saveInstalledServers(): Promise<void> {
    try {
      const dataPath = path.join(app.getPath('userData'), 'mcp-installed-servers.json');
      const data = {
        servers: Array.from(this.installedServers.values()),
        lastUpdated: new Date()
      };
      await fs.writeJson(dataPath, data, { spaces: 2 });
    } catch (error) {
      console.error('[McpDiscovery] Failed to save installed servers:', error);
    }
  }

  /**
   * Save catalog cache to disk
   */
  private async saveCatalogCache(catalog: McpServerCatalog): Promise<void> {
    try {
      const cachePath = path.join(app.getPath('userData'), 'mcp-catalog-cache.json');
      await fs.writeJson(cachePath, catalog, { spaces: 2 });
    } catch (error) {
      console.error('[McpDiscovery] Failed to save catalog cache:', error);
    }
  }

  /**
   * Load catalog cache from disk
   */
  private async loadCatalogCache(): Promise<McpServerCatalog | null> {
    try {
      const cachePath = path.join(app.getPath('userData'), 'mcp-catalog-cache.json');
      if (await fs.pathExists(cachePath)) {
        return await fs.readJson(cachePath);
      }
    } catch (error) {
      console.error('[McpDiscovery] Failed to load catalog cache:', error);
    }
    return null;
  }

  /**
   * Parse third-party servers from the main README
   */
  private parseThirdPartyServersFromReadme(readmeContent: string): any[] {
    const servers: any[] = [];

    // Find the Third-Party Servers section - note the emoji in the section name
    // Match everything from "Third-Party Servers" to the end of the file
    const thirdPartyMatch = readmeContent.match(/##\s+[🤝]*\s*Third-Party Servers[\s\S]*/i);
    if (!thirdPartyMatch) {
      console.log('[McpDiscovery] No third-party servers section found in README');
      return servers;
    }

    const thirdPartySection = thirdPartyMatch[0];
    console.log('[McpDiscovery] Found third-party section, length:', thirdPartySection.length);

    // Parse each line that looks like a server entry
    // Multiple formats to handle:
    // - [Server Name](url) - Description
    // - <img ...> **[Server Name](url)** - Description
    // - **[Server Name](url)** - Description
    const serverLines = thirdPartySection.match(/^\s*-\s+.*?\[([^\]]+)\]\(([^)]+)\)[^\n]*/gm);

    if (serverLines) {
      console.log(`[McpDiscovery] Found ${serverLines.length} potential server lines`);

      for (const line of serverLines) {
        // Extract server name and URL from various formats
        const linkMatch = line.match(/\*?\*?\[([^\]]+)\]\(([^)]+)\)\*?\*?/);
        if (linkMatch) {
          const [, name, url] = linkMatch;

          // Extract description - everything after the link, minus the dash
          const descMatch = line.match(/\]\([^)]+\)\*?\*?\s*[-–]?\s*(.*)$/);
          const description = descMatch ? descMatch[1].trim() : '';

          // Skip non-GitHub URLs for now (some might be npm packages)
          if (!url.includes('github.com') && !url.includes('npmjs.com')) {
            console.log(`[McpDiscovery] Skipping non-GitHub URL: ${url}`);
            continue;
          }

          // Extract repo owner and name from URL
          const repoMatch = url.match(/github\.com\/([^/]+)\/([^/?#]+)/);
          if (repoMatch) {
            const [, owner, repo] = repoMatch;
            const serverId = `github-3p-${repo.toLowerCase().replace(/[^a-z0-9-]/g, '-')}`;

            // Determine installation type based on common patterns
            let installationType = 'manual';
            let installCommand = '';
            let npmPackage = '';

            // Check if it's an npm package link
            if (url.includes('npmjs.com/package/')) {
              const npmMatch = url.match(/npmjs\.com\/package\/(.+)/);
              if (npmMatch) {
                npmPackage = npmMatch[1];
                installationType = 'npm';
                installCommand = `npm install -g ${npmPackage}`;
              }
            } else if (repo.startsWith('mcp-') || repo.includes('-mcp') || name.toLowerCase().includes('mcp')) {
              // Guess npm package name from repo name
              npmPackage = repo;
              installationType = 'npm';
              installCommand = `npm install -g ${npmPackage}`;
            }

            // Auto-categorize based on keywords in name and description
            const categories: string[] = [];
            const lowerName = name.toLowerCase();
            const lowerDesc = (description || '').toLowerCase();
            const combined = `${lowerName} ${lowerDesc}`;

            // Categorization logic
            if (combined.match(/\b(ai|llm|gpt|claude|gemini|openai|anthropic|language|model|chat)\b/)) {
              categories.push('AI & Language Models');
            }
            if (combined.match(/\b(dev|development|code|programming|debug|test|git|github|gitlab)\b/)) {
              categories.push('Development Tools');
            }
            if (combined.match(/\b(data|analytics|database|sql|postgres|mongo|redis|elastic)\b/)) {
              categories.push('Data & Analytics');
            }
            if (combined.match(/\b(productivity|task|todo|calendar|schedule|note|document)\b/)) {
              categories.push('Productivity');
            }
            if (combined.match(/\b(file|filesystem|storage|drive|folder|directory|s3|cloud)\b/)) {
              categories.push('File Management');
            }
            if (combined.match(/\b(api|integration|webhook|rest|graphql|soap|grpc)\b/)) {
              categories.push('APIs & Integration');
            }
            if (combined.match(/\b(security|auth|authentication|encrypt|decrypt|password|token)\b/)) {
              categories.push('Security');
            }
            if (combined.match(/\b(communication|email|slack|discord|telegram|message|chat|notification)\b/)) {
              categories.push('Communication');
            }

            // If no categories matched, assign to 'Other'
            if (categories.length === 0) {
              categories.push('Other');
            }

            // Generate tags from name and description
            const tags = [
              ...name.toLowerCase().split(/[-_.\s]+/).filter(t => t.length > 2),
              ...(description ? description.toLowerCase().match(/\b[a-z]{3,}\b/g) || [] : [])
            ].filter((tag, index, self) => self.indexOf(tag) === index).slice(0, 10); // Unique tags, max 10

            servers.push({
              id: serverId,
              name: name.trim(),
              description: description || `${name} MCP server`,
              version: '1.0.0',
              status: 'active',
              author: owner,
              repository: {
                url: url.trim(),
                source: 'github-third-party'
              },
              packages: [{
                registry_type: installationType === 'npm' ? 'npm' : 'manual',
                identifier: npmPackage || repo,
                version: '1.0.0',
                transport: { type: 'stdio' }
              }],
              installation_command: installCommand || `See ${url} for installation instructions`,
              category: categories,
              tags: tags,
              stats: {
                downloads: Math.floor(Math.random() * 5000), // Mock stats for third-party
                stars: Math.floor(Math.random() * 500),
                lastUpdated: new Date().toISOString()
              },
              installation: {
                type: installationType as 'npm' | 'manual',
                command: installCommand || undefined,
                instructions: installationType === 'manual' ? `See ${url} for installation instructions` : undefined
              },
              npmPackage: npmPackage || undefined,
              compatibility: {
                clients: ['claude-desktop', 'claude-code', 'custom'],
                platforms: ['darwin', 'linux', 'win32']
              },
              _meta: {
                'io.modelcontextprotocol.registry/official': {
                  id: serverId,
                  published_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  is_latest: true,
                  is_official: false,
                  author: owner
                }
              }
            });
          }
        }
      }
    } else {
      console.log('[McpDiscovery] No server lines found in third-party section');
    }

    console.log(`[McpDiscovery] Parsed ${servers.length} third-party servers from README`);
    return servers;
  }

  /**
   * Expand path with home directory
   */
  private expandPath(filePath: string): string {
    if (filePath.startsWith('~')) {
      return path.join(app.getPath('home'), filePath.slice(1));
    }
    return filePath;
  }

  /**
   * Get all available categories from the catalog
   */
  static async getCategories(): Promise<string[]> {
    const { ServerCatalogService } = await import('./ServerCatalogService');
    const servers = await ServerCatalogService.getCatalog();
    const categoriesSet = new Set<string>();

    servers.forEach((server: any) => {
      // Handle both category (string) and categories (array) properties
      if (server.category) {
        if (Array.isArray(server.category)) {
          server.category.forEach((cat: string) => categoriesSet.add(cat));
        } else if (typeof server.category === 'string') {
          categoriesSet.add(server.category);
        }
      }
      if (server.categories) {
        if (Array.isArray(server.categories)) {
          server.categories.forEach((cat: string) => categoriesSet.add(cat));
        } else if (typeof server.categories === 'string') {
          categoriesSet.add(server.categories);
        }
      }
    });

    // Add default categories if none found
    if (categoriesSet.size === 0) {
      return ['General', 'Development', 'Data', 'Communication', 'Utility'];
    }

    return Array.from(categoriesSet).sort();
  }
}