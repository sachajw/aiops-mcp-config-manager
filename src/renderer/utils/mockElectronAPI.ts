// Mock Electron API for browser development
export const mockElectronAPI = {
  detectClients: async () => {
    console.log('[Mock] Detecting clients...');
    return [
      { name: 'claude-desktop', displayName: 'Claude Desktop', installed: true, format: 'json' },
      { name: 'claude-code', displayName: 'Claude Code', installed: true, format: 'json5' },
      { name: 'gemini-cli', displayName: 'Gemini CLI', installed: false, format: 'json' },
      { name: 'codex-cli', displayName: 'Codex CLI', installed: false, format: 'toml' },
      { name: 'vscode', displayName: 'VS Code', installed: true, format: 'json' }
    ];
  },
  
  readConfig: async (clientName: string, scope: string) => {
    console.log(`[Mock] Reading config for ${clientName} (${scope})`);
    return {
      success: true,
      data: {
        'example-server': {
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-example'],
          env: { API_KEY: 'demo-key' }
        },
        'filesystem': {
          command: 'npx',
          args: ['@modelcontextprotocol/server-filesystem', '/home'],
          env: {}
        }
      }
    };
  },
  
  writeConfig: async (clientName: string, scope: string, servers: any) => {
    console.log(`[Mock] Writing config for ${clientName}`, servers);
    return { success: true };
  },
  
  backupConfig: async (clientName: string, scope: string) => {
    console.log(`[Mock] Backing up config for ${clientName}`);
    return { success: true, backupPath: '/backup/path' };
  }
};