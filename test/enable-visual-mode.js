// Enable Visual Workspace in settings for testing
const settings = {
  theme: 'dark',
  autoSave: true,
  notifications: {
    enabled: true,
    sound: false,
    position: 'bottom-right'
  },
  experimental: {
    visualWorkspaceEnabled: true,
    visualWorkspaceDefault: true
  },
  enabledClients: {
    'Claude Desktop': true,
    'VS Code': true
  }
};

// Save to localStorage
if (typeof window !== 'undefined') {
  localStorage.setItem('mcp-app-settings', JSON.stringify(settings));
  console.log('Visual Workspace enabled in settings');
} else {
  console.log('Settings to save:', JSON.stringify(settings, null, 2));
  console.log('\nRun this in browser console:');
  console.log(`localStorage.setItem('mcp-app-settings', '${JSON.stringify(settings)}');`);
}