import React, { useEffect, useState } from 'react';
import { useConfigStore } from './store/simplifiedStore';
import { MCPServer } from '@/main/services/UnifiedConfigService';

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

  useEffect(() => {
    detectClients().then(() => {
      loadCatalog();
    });
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
      type: serverType,
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

  return (
    <div className="min-h-screen bg-base-200" data-theme="corporate">
      {/* Fixed Header with improved UX layout */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-base-100 shadow-lg">
        {/* Main header bar - single row layout */}
        <div className="px-4 py-4 border-b border-base-200">
          <div className="flex items-center justify-between gap-6">
            {/* Left: App Identity */}
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-xl font-bold">MCP Configuration Manager</h1>
              </div>
            </div>

            {/* Center: Main Controls */}
            <div className="flex items-center gap-6 flex-1 max-w-4xl">
              {/* Client Selector */}
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-base-content/70 whitespace-nowrap">Client:</label>
                <select 
                  className="select select-bordered select-sm w-64"
                  value={activeClient || ''}
                  onChange={(e) => {
                    if (e.target.value === 'catalog') {
                      useConfigStore.setState({ 
                        activeClient: 'catalog',
                        servers: catalog,
                        currentConfigPath: null,
                        isDirty: false
                      });
                    } else {
                      selectClient(e.target.value);
                    }
                  }}
                  disabled={isLoading}
                >
                  <option value="" disabled>Select a client</option>
                  <option value="catalog" className="font-semibold">
                    📚 Server Catalog ({Object.keys(catalog).length} servers)
                  </option>
                  <optgroup label="Installed Clients">
                    {clients.map(client => (
                      <option key={client.name} value={client.name}>
                        {client.displayName} {client.installed ? '✓' : '✗'}
                      </option>
                    ))}
                  </optgroup>
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

              {/* Status Indicator - Compact */}
              {activeClient && (
                <div className="flex items-center gap-2 text-sm">
                  <div className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${activeClient === 'catalog' ? 'bg-blue-500' : 'bg-green-500'}`}></div>
                    <span className="text-base-content/70">
                      {activeClient === 'catalog' ? 'Catalog' : activeClientData?.displayName}
                    </span>
                    {isDirty && activeClient !== 'catalog' && (
                      <span className="text-xs text-warning font-medium">● Unsaved</span>
                    )}
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
                                {profile.name}
                                {profile.description && (
                                  <span className="text-xs opacity-60 block">{profile.description}</span>
                                )}
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
          <div className="px-4 py-4 bg-base-50 border-b border-base-200">
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

      {/* Main Content - with proper padding for fixed header and status bar */}
      <div className="container mx-auto px-4" style={{ paddingTop: activeScope === 'project' && activeClient && activeClient !== 'catalog' ? '160px' : '100px', paddingBottom: activeClient ? '60px' : '20px' }}>
        {/* Servers Table Card */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <div className="flex justify-between items-center mb-4">
              <h2 className="card-title">MCP Servers</h2>
              <button 
                className={`btn btn-primary ${!activeClient ? 'btn-disabled' : ''}`}
                onClick={() => setIsAddModalOpen(true)}
                disabled={!activeClient}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Server
              </button>
            </div>

            {/* Table with fixed Actions column */}
            <div className="overflow-x-auto">
              <table className="table table-zebra w-full">
                <thead>
                  <tr>
                    <th className="min-w-[150px]">Server Name</th>
                    <th className="min-w-[100px]">Command</th>
                    <th className="hidden lg:table-cell">Arguments</th>
                    <th className="hidden xl:table-cell">Environment</th>
                    <th className="sticky right-0 bg-base-100 shadow-[-2px_0_4px_rgba(0,0,0,0.1)] min-w-[100px]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(servers).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center text-base-content/60">
                        {activeClient ? 'No MCP servers configured' : 'Select a client to view servers'}
                      </td>
                    </tr>
                  ) : (
                    Object.entries(servers).map(([name, server]) => (
                      <tr key={name}>
                        <td className="font-mono font-semibold break-all">
                          {name}
                          {server.type === 'remote' && (
                            <span className="badge badge-xs badge-info ml-2">Remote</span>
                          )}
                        </td>
                        <td>
                          {server.type === 'remote' ? (
                            <code className="badge badge-outline badge-info" title={server.url}>
                              {server.url ? new URL(server.url).hostname : 'Remote'}
                            </code>
                          ) : (
                            <code className="badge badge-outline">{server.command}</code>
                          )}
                        </td>
                        <td className="hidden lg:table-cell">
                          {server.type === 'remote' ? (
                            // Show headers for remote servers
                            server.headers && Object.keys(server.headers).length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {Object.keys(server.headers).slice(0, 2).map(key => (
                                  <span key={key} className="badge badge-sm badge-info">{key}</span>
                                ))}
                                {Object.keys(server.headers).length > 2 && (
                                  <span className="badge badge-sm badge-info">+{Object.keys(server.headers).length - 2}</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-base-content/40 text-sm">No headers</span>
                            )
                          ) : editingArgs && editingArgs.name === name ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                className="input input-sm input-bordered flex-1"
                                value={editingArgs.value}
                                onChange={(e) => setEditingArgs({ ...editingArgs, value: e.target.value })}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleInlineArgsSave();
                                  if (e.key === 'Escape') handleInlineArgsCancel();
                                }}
                                placeholder="arg1, arg2, arg3"
                                autoFocus
                              />
                              <div className="flex gap-1">
                                <button
                                  className="btn btn-xs btn-success"
                                  onClick={handleInlineArgsSave}
                                  title="Save"
                                >
                                  ✓
                                </button>
                                <button
                                  className="btn btn-xs btn-ghost"
                                  onClick={handleInlineArgsCancel}
                                  title="Cancel"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div 
                              className="flex flex-wrap gap-1 cursor-pointer hover:opacity-70 transition-opacity"
                              onClick={() => handleInlineArgsEdit(name, server.args)}
                              title="Click to edit arguments"
                            >
                              {server.args && server.args.length > 0 ? (
                                <>
                                  {server.args.slice(0, 3).map((arg, i) => (
                                    <span key={i} className="badge badge-sm">{arg}</span>
                                  ))}
                                  {server.args.length > 3 && (
                                    <span className="badge badge-sm">+{server.args.length - 3}</span>
                                  )}
                                </>
                              ) : (
                                <span className="text-base-content/40 text-sm">Click to add arguments</span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="hidden xl:table-cell">
                          {editingEnv && editingEnv.name === name ? (
                            <div className="flex items-center gap-2">
                              <textarea
                                className="textarea textarea-sm textarea-bordered flex-1 h-20 text-xs font-mono"
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
                                <button
                                  className="btn btn-xs btn-success"
                                  onClick={handleInlineEnvSave}
                                  title="Save (Ctrl+Enter)"
                                >
                                  ✓
                                </button>
                                <button
                                  className="btn btn-xs btn-ghost"
                                  onClick={handleInlineEnvCancel}
                                  title="Cancel (Esc)"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          ) : (
                            server.env && Object.keys(server.env).length > 0 ? (
                              <div 
                                className="flex flex-wrap gap-1 cursor-pointer hover:opacity-70 transition-opacity"
                                onClick={() => handleInlineEnvEdit(name, server.env)}
                                title="Click to edit environment variables"
                              >
                                {Object.keys(server.env).slice(0, 2).map(key => (
                                  <span key={key} className="badge badge-sm badge-info">{key}</span>
                                ))}
                                {Object.keys(server.env).length > 2 && (
                                  <span className="badge badge-sm badge-info">+{Object.keys(server.env).length - 2}</span>
                                )}
                              </div>
                            ) : (
                              <span 
                                className="cursor-pointer hover:opacity-70 transition-opacity text-base-content/40"
                                onClick={() => handleInlineEnvEdit(name, server.env)}
                                title="Click to add environment variables"
                              >
                                -
                              </span>
                            )
                          )}
                        </td>
                        <td className="sticky right-0 bg-base-100 shadow-[-2px_0_4px_rgba(0,0,0,0.1)]">
                          <div className="flex gap-1">
                            <button 
                              className="btn btn-sm btn-ghost"
                              onClick={() => setCopyModalOpen({ serverName: name, server })}
                              title="Copy to another client"
                            >
                              📋
                            </button>
                            <button 
                              className="btn btn-sm btn-ghost"
                              onClick={() => handleEdit(name, server)}
                              title="Edit"
                            >
                              ✏️
                            </button>
                            <button 
                              className="btn btn-sm btn-ghost text-error"
                              onClick={() => {
                                if (confirm(`Delete server "${name}"?`)) {
                                  deleteServer(name);
                                }
                              }}
                              title="Delete"
                            >
                              🗑️
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

      {/* Add/Edit Modal */}
      {(isAddModalOpen || editingServer) && (
        <div className="modal modal-open">
          <div className="modal-box w-11/12 max-w-2xl">
            <h3 className="font-bold text-lg mb-6">
              {editingServer ? 'Edit Server' : 'Add New Server'}
            </h3>
            
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
        <div className="fixed bottom-0 left-0 right-0 bg-base-300 border-t border-base-content/20 px-4 py-2 flex items-center justify-between text-sm z-40">
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
    </div>
  );
};