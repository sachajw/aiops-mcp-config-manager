import React, { useEffect, useState } from 'react';
import { useConfigStore } from './store/simplifiedStore';
import { MCPServer } from '@/main/services/UnifiedConfigService';
import { LandingPage, LoadingState } from './pages/Landing/LandingPage';
import { SettingsPage, getDefaultSettings, AppSettings } from './pages/Settings/SettingsPage';
import { DiscoveryPage } from './pages/Discovery/DiscoveryPage';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import { VisualWorkspace } from './components/VisualWorkspace';

export const SimplifiedApp: React.FC = () => {
  const { 
    detectClients, 
    selectClient,
    setScope,
    addServer,
    updateServer,
    deleteServer,
    saveConfig, 
    isDirty, 
    isLoading, 
    error, 
    activeClient,
    activeScope,
    clients,
    servers,
    currentConfigPath,
    catalog,
    loadCatalog,
    addToCatalog,
    removeFromCatalog,
    projectDirectory,
    selectProjectDirectory,
    profiles,
    activeProfile,
    saveProfile,
    loadProfile,
    deleteProfile,
    exportProfile,
    importProfile
  } = useConfigStore();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<{ name: string; server: MCPServer } | null>(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    type: 'local' as 'local' | 'remote',
    command: '', 
    args: '', 
    env: '',
    url: '',
    headers: ''
  });
  const [editingArgs, setEditingArgs] = useState<{ name: string; value: string } | null>(null);
  const [editingEnv, setEditingEnv] = useState<{ name: string; value: string } | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [backupPath, setBackupPath] = useState<string | null>(null);
  const [copyModalOpen, setCopyModalOpen] = useState<{ serverName: string; server: MCPServer } | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileFormData, setProfileFormData] = useState({ name: '', description: '' });
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [appSettings, setAppSettings] = useState<AppSettings>(getDefaultSettings());
  const [discoveryOpen, setDiscoveryOpen] = useState(false);

  // View mode state
  const [viewMode, setViewMode] = useState<'classic' | 'visual'>('classic');

  // Landing page state
  const [showLanding, setShowLanding] = useState(true);
  const [loadingState, setLoadingState] = useState<LoadingState>({
    stage: 'initial',
    progress: 0,
    message: 'Starting My MCP Manager...'
  });

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('mcp-app-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setAppSettings(parsed);

        // Set view mode based on settings
        if (parsed.experimental?.visualWorkspaceEnabled && parsed.experimental?.visualWorkspaceDefault) {
          setViewMode('visual');
        }
      } catch (e) {
        console.error('Failed to load settings:', e);
      }
    }

    // Simulate loading progress
    const loadApp = async () => {
      setLoadingState({
        stage: 'detecting_clients',
        progress: 30,
        message: 'Detecting AI clients...'
      });

      await detectClients();

      setLoadingState({
        stage: 'loading_configs',
        progress: 60,
        message: 'Loading configurations...'
      });

      await loadCatalog();

      setLoadingState({
        stage: 'ready',
        progress: 100,
        message: 'Ready!'
      });
    };

    loadApp();

    // Listen for catalog updates from Discovery page
    const handleCatalogUpdate = (event: CustomEvent) => {
      const { serverName, server, removed } = event.detail;
      console.log('[SimplifiedApp] Catalog updated from Discovery:', serverName, removed ? '(removed)' : '');

      // Directly update the catalog in the store
      if (removed) {
        removeFromCatalog(serverName);
      } else if (server) {
        addToCatalog(serverName, server);
      }

      // Also reload the catalog to ensure consistency
      loadCatalog();
    };

    window.addEventListener('catalog-updated', handleCatalogUpdate as EventListener);

    return () => {
      window.removeEventListener('catalog-updated', handleCatalogUpdate as EventListener);
    };
  }, []);

  const handleSave = async () => {
    const backupResult = await saveConfig();
    if (backupResult && backupResult.backupPath) {
      setBackupPath(backupResult.backupPath);
    }
    setShowSuccessToast(true);
    setTimeout(() => {
      setShowSuccessToast(false);
      setBackupPath(null);
    }, 5000);
  };

  const handleAddServer = () => {
    if (!formData.name) return;
    if (formData.type === 'local' && !formData.command) return;
    if (formData.type === 'remote' && !formData.url) return;
    
    const server: MCPServer = {
      type: formData.type
    };
    
    if (formData.type === 'local') {
      server.command = formData.command;
      server.args = formData.args ? formData.args.split(',').map(s => s.trim()) : [];
      server.env = formData.env ? JSON.parse(formData.env) : {};
    } else {
      server.url = formData.url;
      server.headers = formData.headers ? JSON.parse(formData.headers) : {};
    }
    
    addServer(formData.name, server);
    setFormData({ name: '', type: 'local', command: '', args: '', env: '', url: '', headers: '' });
    setIsAddModalOpen(false);
  };

  const handleUpdateServer = () => {
    if (!editingServer) return;
    if (formData.type === 'local' && !formData.command) return;
    if (formData.type === 'remote' && !formData.url) return;
    
    const server: MCPServer = {
      type: formData.type
    };
    
    if (formData.type === 'local') {
      server.command = formData.command;
      server.args = formData.args ? formData.args.split(',').map(s => s.trim()) : [];
      server.env = formData.env ? JSON.parse(formData.env) : {};
    } else {
      server.url = formData.url;
      server.headers = formData.headers ? JSON.parse(formData.headers) : {};
    }
    
    updateServer(editingServer.name, server);
    setEditingServer(null);
    setFormData({ name: '', type: 'local', command: '', args: '', env: '', url: '', headers: '' });
  };

  const handleEdit = (name: string, server: MCPServer) => {
    setEditingServer({ name, server });
    const serverType = server.type || (server.url ? 'remote' : 'local');
    setFormData({
      name,
      type: serverType as 'local' | 'remote',
      command: server.command || '',
      args: server.args?.join(', ') || '',
      env: server.env ? JSON.stringify(server.env, null, 2) : '',
      url: server.url || '',
      headers: server.headers ? JSON.stringify(server.headers, null, 2) : ''
    });
  };

  const handleInlineArgsEdit = (serverName: string, currentArgs: string[] | undefined) => {
    setEditingArgs({
      name: serverName,
      value: currentArgs?.join(', ') || ''
    });
  };

  const handleInlineArgsSave = () => {
    if (!editingArgs) return;
    
    const server = servers[editingArgs.name];
    if (server) {
      const newArgs = editingArgs.value 
        ? editingArgs.value.split(',').map(s => s.trim()).filter(s => s)
        : [];
      updateServer(editingArgs.name, { ...server, args: newArgs });
    }
    setEditingArgs(null);
  };

  const handleInlineArgsCancel = () => {
    setEditingArgs(null);
  };

  const handleInlineEnvEdit = (serverName: string, currentEnv: Record<string, string> | undefined) => {
    setEditingEnv({
      name: serverName,
      value: currentEnv ? JSON.stringify(currentEnv, null, 2) : ''
    });
  };

  const handleInlineEnvSave = () => {
    if (!editingEnv) return;
    
    const server = servers[editingEnv.name];
    if (server) {
      let newEnv: Record<string, string> = {};
      if (editingEnv.value.trim()) {
        try {
          newEnv = JSON.parse(editingEnv.value);
        } catch (error) {
          console.error('Invalid JSON for environment variables:', error);
          return;
        }
      }
      updateServer(editingEnv.name, { ...server, env: newEnv });
    }
    setEditingEnv(null);
  };

  const handleInlineEnvCancel = () => {
    setEditingEnv(null);
  };

  const handleCopyToClient = async (targetClient: string) => {
    if (!copyModalOpen) return;
    
    // Save current client's state first if dirty
    if (isDirty) {
      await saveConfig();
    }
    
    // Switch to target client
    await selectClient(targetClient);
    
    // Add the server to the target client
    addServer(copyModalOpen.serverName, copyModalOpen.server);
    
    // Close the modal
    setCopyModalOpen(null);
    
    // Show success message
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
  };

  const activeClientData = clients.find(c => c.name === activeClient);

  // Show landing page if requested
  if (showLanding) {
    return (
      <LandingPage 
        loadingState={loadingState}
        onGetStarted={() => setShowLanding(false)}
      />
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-base-200" data-theme="corporate">
      {/* Fixed Header with improved UX layout */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-base-100 shadow-lg">
        {/* Main header bar - responsive two-row layout */}
        <div className="px-4 py-3 shadow-md">
          {/* Title Row */}
          <div className="mb-2">
            <h1 className="text-xl font-bold">MCP Configuration Manager</h1>
          </div>
          
          {/* Controls Row */}
          <div className="flex items-center justify-between gap-4">
            {/* Main Controls */}
            <div className="flex items-center gap-4 flex-1">
              {/* Client Selector */}
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-base-content/70 whitespace-nowrap">Client:</label>
                <select 
                  className="select select-bordered select-sm w-64"
                  value={activeClient || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === 'catalog') {
                      useConfigStore.setState({ 
                        activeClient: 'catalog',
                        servers: catalog,
                        currentConfigPath: null,
                        isDirty: false
                      });
                    } else if (value.startsWith('custom-')) {
                      // Handle custom client selection
                      const customClientName = value.replace('custom-', '');
                      const customClient = appSettings.customClients?.find(c => c.name === customClientName);
                      if (customClient) {
                        // TODO: Load custom client config from specified path
                        selectClient(value);
                      }
                    } else {
                      selectClient(value);
                    }
                  }}
                  disabled={isLoading}
                >
                  <option value="" disabled>Select a client</option>
                  <option value="catalog" className="font-semibold">
                    Server Catalog ({Object.keys(catalog).length} servers)
                  </option>
                  <optgroup label="Installed Clients">
                    {clients
                      .filter(client => {
                        // Filter based on enabled status in settings
                        if (!appSettings.enabledClients) return true; // Show all if no settings
                        // The client.name is the same as the type (e.g., 'claude-desktop', 'claude-code')
                        return (appSettings.enabledClients as any)[client.name] !== false;
                      })
                      .map(client => (
                        <option key={client.name} value={client.name}>
                          {client.displayName} {client.installed ? '✓' : ''}
                        </option>
                      ))}
                  </optgroup>
                  {appSettings.customClients && appSettings.customClients.length > 0 && (
                    <optgroup label="Custom Clients">
                      {appSettings.customClients.map(client => (
                        <option key={`custom-${client.name}`} value={`custom-${client.name}`}>
                          {client.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              {/* Configuration Scope */}
              {activeClient && activeClient !== 'catalog' && (
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-base-content/70 whitespace-nowrap">Scope:</label>
                  <div className="btn-group">
                    <button 
                      className={`btn btn-sm ${activeScope === 'user' ? 'btn-active' : ''}`}
                      onClick={() => setScope('user')}
                    >
                      User
                    </button>
                    <button 
                      className={`btn btn-sm ${activeScope === 'project' ? 'btn-active' : ''}`}
                      onClick={() => setScope('project')}
                    >
                      Project
                    </button>
                    <button 
                      className={`btn btn-sm ${activeScope === 'system' ? 'btn-active' : ''}`}
                      onClick={() => setScope('system')}
                    >
                      System
                    </button>
                  </div>
                </div>
              )}

            </div>

            {/* Right: Action Buttons */}
            <div className="flex items-center gap-2">
              {/* Secondary Actions */}
              <button 
                className="btn btn-sm btn-ghost"
                onClick={() => detectClients()}
                disabled={isLoading}
                title="Refresh clients"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              
              {/* View Mode Switcher - Only show if visual workspace is enabled */}
              {appSettings.experimental?.visualWorkspaceEnabled && (
                <div className="flex items-center gap-1 p-1 bg-base-200 rounded-lg">
                  <button
                    className={`btn btn-xs ${viewMode === 'classic' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setViewMode('classic')}
                    title="Classic View"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                    <span className="ml-1 hidden sm:inline">Classic</span>
                  </button>
                  <button
                    className={`btn btn-xs ${viewMode === 'visual' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setViewMode('visual')}
                    title="Visual Workspace"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                    </svg>
                    <span className="ml-1 hidden sm:inline">Visual</span>
                  </button>
                </div>
              )}

              {/* Discovery Button - Only show if experimental feature is enabled */}
              {appSettings.experimental?.enableMcpDiscovery && (
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={() => setDiscoveryOpen(true)}
                  title="MCP Discovery"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span className="ml-1 hidden sm:inline">Discover</span>
                </button>
              )}

              {/* Settings Button */}
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => setSettingsOpen(true)}
                title="Settings"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              
              <button 
                className="btn btn-sm btn-ghost"
                onClick={() => setHelpModalOpen(true)}
                title="Help & Documentation"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              
              {/* Profiles Dropdown */}
              {activeClient !== 'catalog' && (
                <div className="dropdown dropdown-end">
                  <label 
                    tabIndex={0}
                    className="btn btn-sm btn-ghost cursor-pointer"
                    title="Manage profiles"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    Profiles
                  </label>
                  <ul tabIndex={0} className="dropdown-content z-[100] menu p-2 shadow-lg bg-base-100 rounded-box w-80 mt-1 border border-base-300">
                      <li className="menu-title">Save/Load Profiles</li>
                      <li>
                        <button onClick={() => {
                          setProfileModalOpen(true);
                        }}>
                          Save Current as Profile
                        </button>
                      </li>
                      {profiles.length > 0 && (
                        <>
                          <div className="divider my-1"></div>
                          <li className="menu-title">Load Profile</li>
                          {profiles.map(profile => (
                            <li key={profile.name}>
                              <button 
                                onClick={() => {
                                  loadProfile(profile.name);
                                }}
                                className={activeProfile === profile.name ? 'active' : ''}
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium">{profile.name}</div>
                                  {profile.description && (
                                    <div 
                                      className="text-xs opacity-60 truncate" 
                                      title={profile.description}
                                    >
                                      {profile.description}
                                    </div>
                                  )}
                                </div>
                              </button>
                            </li>
                          ))}
                          <div className="divider my-1"></div>
                          <li className="menu-title">Manage</li>
                          {profiles.map(profile => (
                            <li key={`manage-${profile.name}`}>
                              <div className="flex justify-between items-center">
                                <span className="text-sm">{profile.name}</span>
                                <div className="flex gap-1">
                                  <button 
                                    className="btn btn-xs btn-ghost"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      exportProfile(profile.name);
                                    }}
                                    title="Export"
                                  >
                                    ↓
                                  </button>
                                  <button 
                                    className="btn btn-xs btn-error btn-ghost"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (confirm(`Delete profile "${profile.name}"?`)) {
                                        deleteProfile(profile.name);
                                      }
                                    }}
                                    title="Delete"
                                  >
                                    ×
                                  </button>
                                </div>
                              </div>
                            </li>
                          ))}
                        </>
                      )}
                      <div className="divider my-1"></div>
                      <li>
                        <label className="cursor-pointer">
                          Import Profile
                          <input 
                            type="file" 
                            accept=".json"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  if (event.target?.result) {
                                    importProfile(event.target.result as string);
                                  }
                                };
                                reader.readAsText(file);
                              }
                            }}
                          />
                        </label>
                      </li>
                    </ul>
                </div>
              )}

              {/* Primary Action */}
              <button 
                className={`btn btn-sm btn-primary ${!isDirty || !activeClient || activeClient === 'catalog' ? 'btn-disabled' : ''}`}
                onClick={handleSave}
                disabled={!isDirty || !activeClient || activeClient === 'catalog' || isLoading}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V2" />
                </svg>
                Save
              </button>
            </div>
          </div>
        </div>

        {/* Project Directory Selector - shows when project scope is selected */}
        {activeScope === 'project' && activeClient && activeClient !== 'catalog' && (
          <div className="px-4 py-4 bg-base-50 shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <label className="text-sm font-medium text-base-content/70">Project Directory:</label>
                <div className="text-sm mt-1">
                  {projectDirectory ? (
                    <code className="bg-base-100 px-2 py-1 rounded text-xs">
                      {projectDirectory}
                    </code>
                  ) : (
                    <span className="text-base-content/50">No project directory selected</span>
                  )}
                </div>
              </div>
              <button
                className="btn btn-sm btn-outline"
                onClick={selectProjectDirectory}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                {projectDirectory ? 'Change' : 'Select'} Directory
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content - Conditional rendering based on view mode */}
      {viewMode === 'visual' && appSettings.experimental?.visualWorkspaceEnabled ? (
        <div style={{ paddingTop: '100px', height: 'calc(100vh - 100px)', overflow: 'hidden' }}>
          <VisualWorkspace />
        </div>
      ) : (
        <div className="container mx-auto px-4" style={{ paddingTop: activeScope === 'project' && activeClient && activeClient !== 'catalog' ? '180px' : '120px', paddingBottom: activeClient ? '60px' : '20px' }}>
          {/* Servers Table Card */}
          <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <div className="flex justify-between items-center mb-4">
              <h2 className="card-title">MCP Servers</h2>
              <button
                className={`btn btn-sm btn-primary ${!activeClient ? 'btn-disabled' : ''}`}
                onClick={() => setIsAddModalOpen(true)}
                disabled={!activeClient}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Server
                {Object.keys(catalog).length > 0 && (
                  <div className="badge badge-secondary badge-xs ml-1">{Object.keys(catalog).length}</div>
                )}
              </button>
            </div>

            {/* Modern Table with Progressive Disclosure */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-base-100 z-10">
                  <tr className="border-b border-gray-600">
                    <th className="text-left py-4 px-6 font-semibold text-base-content/80 text-sm uppercase tracking-wide">Server</th>
                    <th className="text-left py-4 px-4 font-semibold text-base-content/80 text-sm uppercase tracking-wide">Type & Command</th>
                    <th className="text-left py-4 px-4 font-semibold text-base-content/80 text-sm uppercase tracking-wide hidden lg:table-cell">Configuration</th>
                    <th className="sticky right-0 bg-base-100 text-right py-4 px-6 font-semibold text-base-content/80 text-sm uppercase tracking-wide min-w-[120px]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(servers).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-12 text-base-content/60">
                        {activeClient ? 'No MCP servers configured' : 'Select a client to view servers'}
                      </td>
                    </tr>
                  ) : (
                    Object.entries(servers).map(([name, server]) => (
                      <tr key={name} className="border-b border-gray-700 even:bg-base-300/5 hover:bg-base-300/20 transition-colors group">
                        {/* Server Column - Progressive Disclosure */}
                        <td className="py-5 px-6">
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-base-content text-lg leading-tight">
                              {name}
                            </div>
                            {/* Progressive Disclosure: Show description on hover */}
                            {server.description && (
                              <div className="text-xs text-base-content/60 mt-1 group-hover:text-base-content/80 transition-colors">
                                {server.description}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Type & Command Column - Clean Typography */}
                        <td className="py-5 px-4">
                          {server.type === 'remote' ? (
                            <div className="space-y-2">
                              <div className="text-sm font-medium text-base-content/40">
                                {server.url ? new URL(server.url).hostname : 'Remote'}
                              </div>
                              <div className="text-xs text-base-content/60 font-mono">
                                {server.url}
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="text-sm font-medium text-base-content/40 font-mono">
                                {server.command}
                              </div>
                              {server.args && server.args.length > 0 && (
                                <div className="text-xs text-base-content/80">
                                  {server.args.slice(0, 2).join(' ')}
                                  {server.args.length > 2 && ' ...'}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        {/* Configuration Column - Minimal Info */}
                        <td className="py-4 px-4 hidden lg:table-cell">
                          {editingArgs && editingArgs.name === name ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                className="input input-sm input-bordered flex-1 text-xs"
                                value={editingArgs.value}
                                onChange={(e) => setEditingArgs({ ...editingArgs, value: e.target.value })}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleInlineArgsSave();
                                  if (e.key === 'Escape') handleInlineArgsCancel();
                                }}
                                placeholder="arg1, arg2, arg3"
                                autoFocus
                              />
                              <button className="btn btn-xs btn-success" onClick={handleInlineArgsSave}>✓</button>
                              <button className="btn btn-xs btn-ghost" onClick={handleInlineArgsCancel}>✕</button>
                            </div>
                          ) : editingEnv && editingEnv.name === name ? (
                            <div className="flex items-start gap-2">
                              <textarea
                                className="textarea textarea-sm textarea-bordered flex-1 h-16 text-xs font-mono"
                                value={editingEnv.value}
                                onChange={(e) => setEditingEnv({ ...editingEnv, value: e.target.value })}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && e.ctrlKey) {
                                    e.preventDefault();
                                    handleInlineEnvSave();
                                  }
                                  if (e.key === 'Escape') handleInlineEnvCancel();
                                }}
                                placeholder='{"KEY": "value"}'
                                autoFocus
                              />
                              <div className="flex flex-col gap-1">
                                <button className="btn btn-xs btn-success" onClick={handleInlineEnvSave}>✓</button>
                                <button className="btn btn-xs btn-ghost" onClick={handleInlineEnvCancel}>✕</button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {/* Args - Only show basic info */}
                              {server.type !== 'remote' && server.args && server.args.length > 0 && (
                                <div 
                                  className="text-xs cursor-pointer hover:text-primary transition-colors"
                                  onClick={() => handleInlineArgsEdit(name, server.args)}
                                  title="Click to edit arguments"
                                >
                                  <span className="font-semibold">Args:</span> {server.args.slice(0, 1).join(' ')}
                                  {server.args.length > 1 && ` +${server.args.length - 1}`}
                                </div>
                              )}
                              
                              {/* Environment Variables - Show count only */}
                              {server.env && Object.keys(server.env).length > 0 ? (
                                <div 
                                  className="flex items-center gap-1 cursor-pointer hover:text-primary transition-colors"
                                  onClick={() => handleInlineEnvEdit(name, server.env)}
                                  title="Click to edit environment variables"
                                >
                                  <span className="text-xs font-semibold">Env:</span>
                                  <div className="flex gap-1">
                                    {Object.keys(server.env).slice(0, 2).map(key => (
                                      <span key={key} className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">{key}</span>
                                    ))}
                                    {Object.keys(server.env).length > 2 && (
                                      <span className="text-xs text-base-content/60">+{Object.keys(server.env).length - 2}</span>
                                    )}
                                  </div>
                                </div>
                              ) : server.type === 'remote' && server.headers && Object.keys(server.headers).length > 0 ? (
                                <div 
                                  className="flex items-center gap-1 cursor-pointer hover:text-primary transition-colors"
                                  onClick={() => handleInlineEnvEdit(name, server.env)}
                                  title="Click to edit headers"
                                >
                                  <span className="text-xs font-semibold">Headers:</span>
                                  <span className="text-xs bg-info text-info-content px-1.5 py-0.5 rounded">
                                    {Object.keys(server.headers).length}
                                  </span>
                                </div>
                              ) : null}
                              
                              {/* Show "No configuration" only if truly empty */}
                              {(!server.args || server.args.length === 0) && 
                               (!server.env || Object.keys(server.env).length === 0) && 
                               (server.type !== 'remote' || !server.headers || Object.keys(server.headers).length === 0) && (
                                <div className="text-xs text-base-content/40">No configuration</div>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Actions Column - Clean Icons */}
                        <td className="sticky right-0 bg-base-100 group-even:bg-base-300/5 group-hover:bg-base-300/20 py-5 px-6">
                          <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                            <button 
                              className="btn btn-xs btn-ghost hover:btn-primary"
                              onClick={() => setCopyModalOpen({ serverName: name, server })}
                              title="Copy to another client"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                            <button 
                              className="btn btn-xs btn-ghost hover:btn-warning"
                              onClick={() => handleEdit(name, server)}
                              title="Edit"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button 
                              className="btn btn-xs btn-ghost hover:btn-error"
                              onClick={() => {
                                if (confirm(`Delete server "${name}"?`)) {
                                  deleteServer(name);
                                }
                              }}
                              title="Delete"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="alert alert-error mt-4">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
            <button 
              className="btn btn-sm btn-ghost"
              onClick={() => useConfigStore.setState({ error: null })}
            >
              ✕
            </button>
          </div>
        )}

        {/* Spacer for bottom padding */}
        <div className="h-8"></div>
      </div>
      )}

      {/* Add/Edit Modal */}
      {(isAddModalOpen || editingServer) && (
        <div className="modal modal-open">
          <div className="modal-box w-11/12 max-w-2xl">
            <h3 className="font-bold text-lg mb-6">
              {editingServer ? 'Edit Server' : 'Add New Server'}
            </h3>

            {/* Catalog Quick Select (only for Add mode) */}
            {!editingServer && Object.keys(catalog).length > 0 && (
              <div className="alert alert-info mb-6">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <span className="text-sm">Quick Add from Catalog</span>
                  <select
                    className="select select-bordered select-sm w-full mt-2 bg-base-100 text-base-content"
                    value=""
                    onChange={(e) => {
                      if (e.target.value) {
                        const [serverName, ...rest] = e.target.value.split('|');
                        const serverData = catalog[serverName];
                        if (serverData) {
                          setFormData({
                            name: serverName,
                            type: (serverData.type || 'local') as 'local' | 'remote',
                            command: serverData.command || '',
                            args: serverData.args?.join(', ') || '',
                            env: serverData.env ? JSON.stringify(serverData.env, null, 2) : '',
                            url: serverData.url || '',
                            headers: serverData.headers ? JSON.stringify(serverData.headers, null, 2) : ''
                          });
                        }
                      }
                    }}
                  >
                    <option value="">Select a server from catalog...</option>
                    {Object.entries(catalog).map(([name, server]) => (
                      <option key={name} value={name}>
                        {name} ({server.type || 'local'}) - {server.description || server.command || server.url || 'No description'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="space-y-6">
              {/* Server Name */}
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text font-semibold">Server Name</span>
                </label>
                <input 
                  type="text" 
                  className="input input-bordered w-full"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  disabled={!!editingServer}
                  placeholder="e.g., filesystem, github"
                />
              </div>

              {/* Server Type Selector */}
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text font-semibold">Server Type</span>
                </label>
                <div className="btn-group w-full">
                  <button
                    type="button"
                    className={`btn btn-sm flex-1 ${formData.type === 'local' ? 'btn-active' : ''}`}
                    onClick={() => setFormData({...formData, type: 'local'})}
                  >
                    Local (Command)
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm flex-1 ${formData.type === 'remote' ? 'btn-active' : ''}`}
                    onClick={() => setFormData({...formData, type: 'remote'})}
                  >
                    Remote (HTTP/SSE)
                  </button>
                </div>
              </div>

              {/* Local Server Fields */}
              {formData.type === 'local' && (
                <>
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-semibold">Command</span>
                    </label>
                    <input 
                      type="text" 
                      className="input input-bordered w-full"
                      value={formData.command}
                      onChange={(e) => setFormData({...formData, command: e.target.value})}
                      placeholder="e.g., npx, python, node"
                    />
                  </div>

                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-semibold">Arguments</span>
                      <span className="label-text-alt text-base-content/60">comma-separated</span>
                    </label>
                    <input 
                      type="text" 
                      className="input input-bordered w-full"
                      value={formData.args}
                      onChange={(e) => setFormData({...formData, args: e.target.value})}
                      placeholder="e.g., -y, @modelcontextprotocol/server-filesystem"
                    />
                  </div>

                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-semibold">Environment Variables</span>
                      <span className="label-text-alt text-base-content/60">JSON format, optional</span>
                    </label>
                    <textarea 
                      className="textarea textarea-bordered w-full h-24 resize-none"
                      value={formData.env}
                      onChange={(e) => setFormData({...formData, env: e.target.value})}
                      placeholder='{"API_KEY": "value", "DEBUG": "true"}'
                    />
                  </div>
                </>
              )}

              {/* Remote Server Fields */}
              {formData.type === 'remote' && (
                <>
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-semibold">Server URL</span>
                    </label>
                    <input 
                      type="text" 
                      className="input input-bordered w-full"
                      value={formData.url}
                      onChange={(e) => setFormData({...formData, url: e.target.value})}
                      placeholder="e.g., https://api.example.com/mcp"
                    />
                  </div>

                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-semibold">Headers</span>
                      <span className="label-text-alt text-base-content/60">JSON format, optional</span>
                    </label>
                    <textarea 
                      className="textarea textarea-bordered w-full h-24 resize-none"
                      value={formData.headers}
                      onChange={(e) => setFormData({...formData, headers: e.target.value})}
                      placeholder='{"Authorization": "Bearer token", "X-API-Key": "key"}'
                    />
                  </div>
                </>
              )}
            </div>

            <div className="modal-action mt-8">
              <button 
                className="btn btn-ghost"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingServer(null);
                  setFormData({ name: '', type: 'local', command: '', args: '', env: '', url: '', headers: '' });
                }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={editingServer ? handleUpdateServer : handleAddServer}
                disabled={formData.type === 'local' ? (!formData.name || !formData.command) : (!formData.name || !formData.url)}
              >
                {editingServer ? 'Update' : 'Add'} Server
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Copy Modal */}
      {copyModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">
              Copy Server to Another Client
            </h3>
            
            <div className="mb-4">
              <p className="text-sm text-base-content/70 mb-2">
                Copying server <span className="font-mono font-semibold">"{copyModalOpen.serverName}"</span>
              </p>
              <p className="text-sm text-base-content/70">
                Select the target client:
              </p>
            </div>

            <div className="space-y-2">
              {clients
                .filter(c => c.installed && c.name !== activeClient)
                .map(client => (
                  <button
                    key={client.name}
                    className="btn btn-block btn-outline justify-start"
                    onClick={() => handleCopyToClient(client.name)}
                  >
                    <span className="font-semibold">{client.displayName}</span>
                    <span className="text-xs ml-auto text-base-content/60">
                      {client.configPath ? 'Config exists' : 'New config'}
                    </span>
                  </button>
                ))}
              {clients.filter(c => c.installed && c.name !== activeClient).length === 0 && (
                <div className="text-center text-base-content/60 py-4">
                  No other installed clients available
                </div>
              )}
            </div>

            <div className="modal-action">
              <button 
                className="btn"
                onClick={() => setCopyModalOpen(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast - Position above status bar */}
      {showSuccessToast && (
        <div className="fixed bottom-16 right-4 z-50">
          <div className="alert alert-success shadow-lg">
            <div>
              <span className="font-semibold">Configuration saved successfully!</span>
              {backupPath && (
                <div className="text-xs mt-1 opacity-90">
                  Backup created: {backupPath.split('/').pop()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      )}

      {/* Status Bar - Fixed at bottom */}
      {activeClient && (activeClient === 'catalog' || activeClientData) && (
        <div className="fixed bottom-0 left-0 right-0 bg-base-100 px-4 py-2 flex items-center justify-between text-sm z-40" style={{boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 -2px 4px -1px rgba(0, 0, 0, 0.06)'}}>
          <div className="flex items-center gap-2">
            {activeClient === 'catalog' ? (
              <>
                <span className="text-base-content/60">Catalog Storage:</span>
                <code className="bg-base-100 px-2 py-1 rounded text-xs">Local Browser Storage</code>
              </>
            ) : (
              <>
                <span className="text-base-content/60">Config File:</span>
                <code className="bg-base-100 px-2 py-1 rounded text-xs">
                  {currentConfigPath || 'Not found'}
                </code>
                {currentConfigPath && (
                  <button
                    className="btn btn-xs btn-ghost"
                    onClick={() => {
                      if (currentConfigPath) {
                        window.electronAPI.showItemInFolder?.(currentConfigPath);
                      }
                    }}
                    title="Open in file explorer"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Open
                  </button>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-4">
            {activeClient !== 'catalog' && activeClientData && (
              <span className="text-base-content/60">
                Format: <span className="badge badge-xs">{activeClientData.format.toUpperCase()}</span>
              </span>
            )}
            <span className="text-base-content/60">
              Servers: <span className="badge badge-xs badge-primary">{Object.keys(servers).length}</span>
            </span>
            {isDirty && activeClient !== 'catalog' && (
              <span className="text-warning font-semibold">● Unsaved</span>
            )}
          </div>
        </div>
      )}

      {/* Save Profile Modal */}
      {profileModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Save Configuration Profile</h3>
            <p className="py-2 text-sm text-base-content/70">
              Save the current configuration as a reusable profile
            </p>
            
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">Profile Name</span>
              </label>
              <input
                type="text"
                placeholder="e.g., Development Setup"
                className="input input-bordered w-full"
                value={profileFormData.name}
                onChange={(e) => setProfileFormData({ ...profileFormData, name: e.target.value })}
              />
            </div>
            
            <div className="form-control w-full mt-4">
              <label className="label">
                <span className="label-text">Description (Optional)</span>
              </label>
              <textarea
                placeholder="Brief description of this profile"
                className="textarea textarea-bordered"
                value={profileFormData.description}
                onChange={(e) => setProfileFormData({ ...profileFormData, description: e.target.value })}
              />
            </div>
            
            <div className="modal-action">
              <button 
                className="btn"
                onClick={() => {
                  setProfileModalOpen(false);
                  setProfileFormData({ name: '', description: '' });
                }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={() => {
                  if (profileFormData.name) {
                    saveProfile(profileFormData.name, profileFormData.description);
                    setProfileModalOpen(false);
                    setProfileFormData({ name: '', description: '' });
                  }
                }}
                disabled={!profileFormData.name}
              >
                Save Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {settingsOpen && (
        <SettingsPage
          onClose={() => setSettingsOpen(false)}
          onSave={(settings) => {
            setAppSettings(settings);
            // TODO: Apply settings to client detection
            localStorage.setItem('mcp-app-settings', JSON.stringify(settings));
          }}
          currentSettings={appSettings}
        />
      )}

      {/* Discovery Modal */}
      {discoveryOpen && (
        <div className="fixed inset-0 z-50 bg-base-100">
          <div className="h-full flex flex-col">
            <div className="border-b border-base-300 px-4 py-3 flex items-center justify-between">
              <h2 className="text-xl font-bold">MCP Server Discovery</h2>
              <button
                onClick={() => setDiscoveryOpen(false)}
                className="btn btn-sm btn-ghost btn-circle"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <DiscoveryPage />
            </div>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {helpModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box w-11/12 max-w-4xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">MCP Configuration Manager - User Guide</h3>
              <button 
                className="btn btn-sm btn-ghost"
                onClick={() => setHelpModalOpen(false)}
                title="Close"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="prose prose-sm max-w-none">
              {/* Beta Version Disclaimer */}
              <div className="alert alert-warning mb-4">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="text-sm">
                  <p className="font-semibold">Beta Version - Testing Required</p>
                  <p className="mt-1">
                    This application is in active development. Basic functionality has been confirmed and automatic backups
                    are created for all configuration changes. However, further testing is still required.
                    Please <a
                      href="#"
                      className="underline font-medium hover:text-blue-300"
                      onClick={(e) => {
                        e.preventDefault();
                        window.electronAPI?.openExternal('https://github.com/itsocialist/mcp-config-manager/issues');
                      }}
                    >report any bugs on GitHub</a>.
                  </p>
                </div>
              </div>

              <h4 className="text-md font-semibold mt-4 mb-2">Getting Started</h4>
              <p className="text-sm mb-3">
                MCP Configuration Manager helps you manage Model Context Protocol (MCP) server configurations 
                across multiple AI client applications like Claude Desktop, Claude Code, VS Code, and others.
              </p>

              <h4 className="text-md font-semibold mt-4 mb-2">Basic Usage</h4>
              <ol className="text-sm space-y-1 ml-4">
                <li><strong>Select a Client:</strong> Use the Client dropdown to choose which AI client to configure</li>
                <li><strong>Choose Scope:</strong> Select User (personal), Project (directory-specific), or System (global)</li>
                <li><strong>Add Servers:</strong> Click "Add Server" to configure new MCP servers</li>
                <li><strong>Edit Servers:</strong> Click edit icons or configuration badges for quick edits</li>
                <li><strong>Save Changes:</strong> Click Save to apply your configuration</li>
              </ol>

              <h4 className="text-md font-semibold mt-4 mb-2">Server Types</h4>
              <ul className="text-sm space-y-1 ml-4">
                <li><strong>Local:</strong> Runs commands on your machine (e.g., Python scripts, Node.js)</li>
                <li><strong>Remote:</strong> Connects to HTTP/SSE servers via URL</li>
              </ul>

              <h4 className="text-md font-semibold mt-4 mb-2">Quick Tips</h4>
              <ul className="text-sm space-y-1 ml-4">
                <li>Click argument or environment badges to edit them inline</li>
                <li>Use the Server Catalog to manage templates across clients</li>
                <li>Save Profiles to create reusable server configurations</li>
                <li>Environment variables should be in JSON format: {"{"}"KEY": "value"{"}"}</li>
                <li>Arguments are comma-separated: arg1, arg2, arg3</li>
              </ul>

              <h4 className="text-md font-semibold mt-4 mb-2">Official MCP Servers</h4>
              <p className="text-sm mb-2">
                Browse the complete list of official MCP servers: 
                <br />
                <a 
                  href="#" 
                  className="text-blue-400 hover:text-blue-300 underline text-xs"
                  onClick={(e) => {
                    e.preventDefault();
                    window.electronAPI?.openExternal('https://github.com/modelcontextprotocol/servers');
                  }}
                >
                  https://github.com/modelcontextprotocol/servers
                </a>
              </p>
              <ul className="text-sm space-y-1 ml-4">
                <li><strong>File System:</strong> <code className="text-xs">npx @modelcontextprotocol/server-filesystem</code></li>
                <li><strong>GitHub:</strong> <code className="text-xs">npx @modelcontextprotocol/server-github</code></li>
                <li><strong>Brave Search:</strong> <code className="text-xs">npx @modelcontextprotocol/server-brave-search</code></li>
                <li><strong>PostgreSQL:</strong> <code className="text-xs">npx @modelcontextprotocol/server-postgres</code></li>
                <li><strong>SQLite:</strong> <code className="text-xs">npx @modelcontextprotocol/server-sqlite</code></li>
                <li><strong>Google Drive:</strong> <code className="text-xs">npx @modelcontextprotocol/server-gdrive</code></li>
              </ul>

              <h4 className="text-md font-semibold mt-4 mb-2">Documentation & Support</h4>
              <p className="text-sm mb-2">
                <strong>📖 Complete User Guides:</strong>
                <br />
                <a
                  href="#"
                  className="text-blue-400 hover:text-blue-300 underline text-xs"
                  onClick={(e) => {
                    e.preventDefault();
                    window.electronAPI?.openExternal('https://github.com/itsocialist/mcp-config-manager/blob/main/docs/USER_GUIDE.md');
                  }}
                >
                  📖 Complete User Guide - Step-by-step instructions
                </a>
                <br />
                <a
                  href="#"
                  className="text-blue-400 hover:text-blue-300 underline text-xs"
                  onClick={(e) => {
                    e.preventDefault();
                    window.electronAPI?.openExternal('https://github.com/itsocialist/mcp-config-manager/blob/main/docs/QUICK_START.md');
                  }}
                >
                  🚀 Quick Start Guide - Get running in 5 minutes
                </a>
                <br />
                <a
                  href="#"
                  className="text-blue-400 hover:text-blue-300 underline text-xs"
                  onClick={(e) => {
                    e.preventDefault();
                    window.electronAPI?.openExternal('https://github.com/itsocialist/mcp-config-manager/blob/main/docs/FEATURES_OVERVIEW.md');
                  }}
                >
                  ✨ Features Overview - Visual tour of all features
                </a>
                <br />
                <a
                  href="#"
                  className="text-blue-400 hover:text-blue-300 underline text-xs"
                  onClick={(e) => {
                    e.preventDefault();
                    window.electronAPI?.openExternal('https://github.com/itsocialist/mcp-config-manager/issues');
                  }}
                >
                  🐛 Report Issues & Get Support
                </a>
              </p>

              <h4 className="text-md font-semibold mt-4 mb-2">Learn More About MCP</h4>
              <p className="text-sm mb-2">
                <a
                  href="#"
                  className="text-blue-400 hover:text-blue-300 underline text-xs"
                  onClick={(e) => {
                    e.preventDefault();
                    window.electronAPI?.openExternal('https://modelcontextprotocol.io/');
                  }}
                >
                  Model Context Protocol Documentation
                </a>
                <br />
                <a
                  href="#"
                  className="text-blue-400 hover:text-blue-300 underline text-xs"
                  onClick={(e) => {
                    e.preventDefault();
                    window.electronAPI?.openExternal('https://github.com/modelcontextprotocol');
                  }}
                >
                  MCP GitHub Organization
                </a>
              </p>

              <h4 className="text-md font-semibold mt-4 mb-2">Safety & Backups</h4>
              <p className="text-sm mb-3">
                The app automatically creates backups before saving changes. 
                Backups are stored in <code className="text-xs">~/.mcp-config-backups/</code> and you can restore from them manually if needed.
              </p>
            </div>

            <div className="modal-action">
              <button 
                className="btn"
                onClick={() => setHelpModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </ErrorBoundary>
  );
};