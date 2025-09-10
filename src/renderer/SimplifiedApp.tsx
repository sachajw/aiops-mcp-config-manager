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
    servers 
  } = useConfigStore();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<{ name: string; server: MCPServer } | null>(null);
  const [formData, setFormData] = useState({ name: '', command: '', args: '', env: '' });
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  useEffect(() => {
    detectClients();
  }, []);

  const handleSave = async () => {
    await saveConfig();
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
  };

  const handleAddServer = () => {
    if (!formData.name || !formData.command) return;
    
    const server: MCPServer = {
      command: formData.command,
      args: formData.args ? formData.args.split(',').map(s => s.trim()) : [],
      env: formData.env ? JSON.parse(formData.env) : {}
    };
    
    addServer(formData.name, server);
    setFormData({ name: '', command: '', args: '', env: '' });
    setIsAddModalOpen(false);
  };

  const handleUpdateServer = () => {
    if (!editingServer || !formData.command) return;
    
    const server: MCPServer = {
      command: formData.command,
      args: formData.args ? formData.args.split(',').map(s => s.trim()) : [],
      env: formData.env ? JSON.parse(formData.env) : {}
    };
    
    updateServer(editingServer.name, server);
    setEditingServer(null);
    setFormData({ name: '', command: '', args: '', env: '' });
  };

  const handleEdit = (name: string, server: MCPServer) => {
    setEditingServer({ name, server });
    setFormData({
      name,
      command: server.command,
      args: server.args?.join(', ') || '',
      env: server.env ? JSON.stringify(server.env, null, 2) : ''
    });
  };

  const activeClientData = clients.find(c => c.name === activeClient);

  return (
    <div className="min-h-screen bg-base-200" data-theme="corporate">
      {/* Fixed Header with all controls */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-base-100 shadow-lg">
        {/* Top bar with title and save/refresh */}
        <div className="navbar">
          <div className="flex-1">
            <h1 className="text-xl font-bold px-4">MCP Configuration Manager</h1>
            <span className="badge badge-ghost">Simplified Edition</span>
          </div>
          <div className="flex-none gap-2">
            <button 
              className="btn btn-sm btn-ghost"
              onClick={() => detectClients()}
              disabled={isLoading}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
            <button 
              className={`btn btn-sm btn-primary ${!isDirty || !activeClient ? 'btn-disabled' : ''}`}
              onClick={handleSave}
              disabled={!isDirty || !activeClient || isLoading}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V2" />
              </svg>
              Save Changes
            </button>
          </div>
        </div>

        {/* Client and Scope Selection - also fixed */}
        <div className="px-4 pb-4 bg-base-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Client Selector */}
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text font-semibold">MCP Client</span>
              </label>
              <select 
                className="select select-bordered select-sm w-full"
                value={activeClient || ''}
                onChange={(e) => selectClient(e.target.value)}
                disabled={isLoading}
              >
                <option value="" disabled>Select a client</option>
                {clients.map(client => (
                  <option key={client.name} value={client.name}>
                    {client.displayName} {client.installed ? '✓' : '✗'}
                  </option>
                ))}
              </select>
            </div>

            {/* Scope Selector */}
            <div className="form-control">
              <label className="label py-1">
                <span className="label-text font-semibold">Configuration Scope</span>
              </label>
              <div className="btn-group">
                <button 
                  className={`btn btn-sm ${activeScope === 'user' ? 'btn-active' : ''}`}
                  onClick={() => setScope('user')}
                  disabled={!activeClient}
                >
                  User
                </button>
                <button 
                  className={`btn btn-sm ${activeScope === 'project' ? 'btn-active' : ''}`}
                  onClick={() => setScope('project')}
                  disabled={!activeClient}
                >
                  Project
                </button>
                <button 
                  className={`btn btn-sm ${activeScope === 'system' ? 'btn-active' : ''}`}
                  onClick={() => setScope('system')}
                  disabled={!activeClient}
                >
                  System
                </button>
              </div>
            </div>
          </div>

          {/* Status Alert */}
          {activeClient && (
            <div className="alert alert-info mt-3">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                Editing <strong>{activeClientData?.displayName}</strong> configuration
                {isDirty && <span className="text-warning ml-2">(unsaved changes)</span>}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content - with proper padding for fixed header */}
      <div className="container mx-auto px-4" style={{ paddingTop: activeClient ? '200px' : '160px' }}>
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
                        <td className="font-mono font-semibold break-all">{name}</td>
                        <td><code className="badge badge-outline">{server.command}</code></td>
                        <td className="hidden lg:table-cell">
                          {server.args && server.args.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {server.args.slice(0, 3).map((arg, i) => (
                                <span key={i} className="badge badge-sm">{arg}</span>
                              ))}
                              {server.args.length > 3 && (
                                <span className="badge badge-sm">+{server.args.length - 3}</span>
                              )}
                            </div>
                          ) : '-'}
                        </td>
                        <td className="hidden xl:table-cell">
                          {server.env && Object.keys(server.env).length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {Object.keys(server.env).slice(0, 2).map(key => (
                                <span key={key} className="badge badge-sm badge-info">{key}</span>
                              ))}
                              {Object.keys(server.env).length > 2 && (
                                <span className="badge badge-sm badge-info">+{Object.keys(server.env).length - 2}</span>
                              )}
                            </div>
                          ) : '-'}
                        </td>
                        <td className="sticky right-0 bg-base-100 shadow-[-2px_0_4px_rgba(0,0,0,0.1)]">
                          <div className="flex gap-1">
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
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">
              {editingServer ? 'Edit Server' : 'Add New Server'}
            </h3>
            
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">Server Name</span>
              </label>
              <input 
                type="text" 
                className="input input-bordered"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                disabled={!!editingServer}
                placeholder="e.g., filesystem, github"
              />
            </div>

            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">Command</span>
              </label>
              <input 
                type="text" 
                className="input input-bordered"
                value={formData.command}
                onChange={(e) => setFormData({...formData, command: e.target.value})}
                placeholder="e.g., npx, python, node"
              />
            </div>

            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">Arguments (comma-separated)</span>
              </label>
              <input 
                type="text" 
                className="input input-bordered"
                value={formData.args}
                onChange={(e) => setFormData({...formData, args: e.target.value})}
                placeholder="e.g., -y, @modelcontextprotocol/server-filesystem"
              />
            </div>

            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">Environment Variables (JSON)</span>
              </label>
              <textarea 
                className="textarea textarea-bordered h-24"
                value={formData.env}
                onChange={(e) => setFormData({...formData, env: e.target.value})}
                placeholder='{"API_KEY": "value"}'
              />
            </div>

            <div className="modal-action">
              <button 
                className="btn"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingServer(null);
                  setFormData({ name: '', command: '', args: '', env: '' });
                }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={editingServer ? handleUpdateServer : handleAddServer}
              >
                {editingServer ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {showSuccessToast && (
        <div className="toast toast-top toast-end">
          <div className="alert alert-success">
            <span>Configuration saved successfully!</span>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      )}
    </div>
  );
};