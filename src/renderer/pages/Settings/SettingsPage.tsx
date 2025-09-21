import React, { useState, useEffect } from 'react';
import { ClientType } from '@/shared/types/enums';
import { CLIENT_DISPLAY_NAMES } from '@/shared/constants';

interface CustomClient {
  name: string;
  configPath: string;
}

export interface AppSettings {
  enabledClients: Record<ClientType, boolean>;
  autoRefresh: boolean;
  refreshInterval: number;
  showHiddenFiles: boolean;
  preserveDisabledServers: boolean;
  theme: 'light' | 'dark' | 'system';
  customClients?: CustomClient[];
  experimental?: {
    enableMcpDiscovery: boolean;
    visualWorkspaceEnabled?: boolean;
    visualWorkspaceDefault?: boolean;
    animationLevel?: 'full' | 'reduced' | 'none';
    canvasRenderer?: 'svg' | 'canvas' | 'webgl' | 'auto';
  };
}

interface SettingsPageProps {
  onClose: () => void;
  onSave: (settings: AppSettings) => void;
  currentSettings: AppSettings;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onClose, onSave, currentSettings }) => {
  // Ensure enabledClients is initialized
  const initialSettings: AppSettings = {
    ...currentSettings,
    enabledClients: currentSettings.enabledClients || {}
  };

  const [settings, setSettings] = useState<AppSettings>(initialSettings);
  const [activeTab, setActiveTab] = useState<'clients' | 'general' | 'advanced'>('clients');
  const [customClientForm, setCustomClientForm] = useState({ name: '', configPath: '' });

  const handleSave = () => {
    onSave(settings);
    onClose();
  };

  const toggleClient = (client: ClientType) => {
    setSettings(prev => ({
      ...prev,
      enabledClients: {
        ...(prev.enabledClients || {}),
        [client]: !(prev.enabledClients?.[client])
      }
    }));
  };

  const handleAddCustomClient = () => {
    if (customClientForm.name && customClientForm.configPath) {
      setSettings(prev => ({
        ...prev,
        customClients: [...(prev.customClients || []), { ...customClientForm }]
      }));
      setCustomClientForm({ name: '', configPath: '' });
    }
  };

  const handleRemoveCustomClient = (index: number) => {
    setSettings(prev => ({
      ...prev,
      customClients: prev.customClients?.filter((_, i) => i !== index) || []
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-base-100 rounded-lg shadow-2xl w-full max-w-4xl h-[600px] flex flex-col">
        {/* Header - Fixed height */}
        <div className="border-b border-base-300 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Settings</h2>
            <button 
              onClick={onClose}
              className="btn btn-ghost btn-sm btn-circle"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tab Navigation - Fixed height */}
        <div className="px-6 pt-4 pb-2 flex-shrink-0">
          <div className="tabs tabs-boxed">
            <button 
              className={`tab ${activeTab === 'clients' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('clients')}
            >
              Client Management
            </button>
            <button 
              className={`tab ${activeTab === 'general' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('general')}
            >
              General
            </button>
            <button 
              className={`tab ${activeTab === 'advanced' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('advanced')}
            >
              Advanced
            </button>
          </div>
        </div>

        {/* Tab Content - Scrollable, fixed height */}
        <div className="flex-1 px-6 pb-4 overflow-y-auto min-h-0">
          {activeTab === 'clients' && (
            <div className="space-y-4 py-4">
              <div className="alert alert-info">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <span>Disable clients you don't use to improve app performance and reduce clutter.</span>
              </div>

              <div className="space-y-2">
                {Object.values(ClientType).map(client => (
                  <div key={client} className="flex items-center justify-between p-4 bg-base-200 rounded-lg">
                    <div className="flex-1">
                      <h3 className="font-semibold">{CLIENT_DISPLAY_NAMES[client]}</h3>
                      <p className="text-sm text-base-content/60">
                        {client === ClientType.CLAUDE_DESKTOP && 'Official Anthropic desktop application'}
                        {client === ClientType.CLAUDE_CODE && 'Command-line interface for Claude'}
                        {client === ClientType.VS_CODE && 'Visual Studio Code with MCP extension'}
                        {client === ClientType.CURSOR && 'AI-powered IDE based on VS Code'}
                        {client === ClientType.KIRO && 'Kiro AI development platform'}
                        {client === ClientType.WINDSURF && 'Windsurf AI coding assistant'}
                        {client === ClientType.CODEX && 'Advanced code assistant platform'}
                        {client === ClientType.GEMINI_DESKTOP && 'Google Gemini desktop client'}
                        {client === ClientType.GEMINI_CLI && 'Google Gemini command-line interface'}
                        {client === ClientType.CUSTOM && 'Custom MCP client configuration'}
                      </p>
                    </div>
                    <div className="ml-4">
                      <input
                        type="checkbox"
                        className="toggle toggle-primary"
                        checked={settings.enabledClients?.[client] !== false}
                        onChange={() => toggleClient(client)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'general' && (
            <div className="space-y-6 py-4">
              {/* Auto-refresh toggle */}
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <label className="label">
                    <span className="label-text font-semibold">Auto-refresh configurations</span>
                  </label>
                  <span className="text-sm text-base-content/60">Automatically reload when config files change</span>
                </div>
                <div className="ml-4">
                  <input 
                    type="checkbox"
                    className="toggle toggle-primary"
                    checked={settings.autoRefresh}
                    onChange={(e) => setSettings(prev => ({ ...prev, autoRefresh: e.target.checked }))}
                  />
                </div>
              </div>

              {/* Refresh interval */}
              {settings.autoRefresh && (
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <label className="label">
                      <span className="label-text font-semibold">Refresh interval (seconds)</span>
                    </label>
                  </div>
                  <div className="ml-4">
                    <input 
                      type="number"
                      className="input input-bordered w-24 text-right"
                      value={settings.refreshInterval}
                      min={1}
                      max={60}
                      onChange={(e) => setSettings(prev => ({ ...prev, refreshInterval: parseInt(e.target.value) || 5 }))}
                    />
                  </div>
                </div>
              )}

              {/* Theme selector */}
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <label className="label">
                    <span className="label-text font-semibold">Theme</span>
                  </label>
                </div>
                <div className="ml-4">
                  <select 
                    className="select select-bordered w-40"
                    value={settings.theme}
                    onChange={(e) => setSettings(prev => ({ ...prev, theme: e.target.value as 'light' | 'dark' | 'system' }))}
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="system">System</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'advanced' && (
            <div className="space-y-6 py-4">
              {/* Danger Zone Warning at the top */}
              <div className="alert alert-warning">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>Advanced settings can affect app behavior. Change with caution.</span>
              </div>

              {/* Show hidden files */}
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <label className="label">
                    <span className="label-text font-semibold">Show hidden files</span>
                  </label>
                  <p className="text-sm text-base-content/60">Display hidden configuration files and folders</p>
                </div>
                <div className="ml-4">
                  <input 
                    type="checkbox"
                    className="toggle toggle-primary"
                    checked={settings.showHiddenFiles}
                    onChange={(e) => setSettings(prev => ({ ...prev, showHiddenFiles: e.target.checked }))}
                  />
                </div>
              </div>

              {/* Preserve disabled servers */}
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <label className="label">
                    <span className="label-text font-semibold">Preserve disabled servers in config</span>
                  </label>
                  <p className="text-sm text-base-content/60">
                    Keep disabled servers in config files with 'disabled: true' field
                  </p>
                </div>
                <div className="ml-4">
                  <input 
                    type="checkbox"
                    className="toggle toggle-primary"
                    checked={settings.preserveDisabledServers}
                    onChange={(e) => setSettings(prev => ({ ...prev, preserveDisabledServers: e.target.checked }))}
                  />
                </div>
              </div>

              <div className="divider">Experimental Features</div>

              {/* MCP Discovery Feature Flag */}
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <label className="label">
                    <span className="label-text font-semibold">Enable MCP Discovery & Download</span>
                  </label>
                  <p className="text-sm text-base-content/60">
                    Access a catalog of community MCP servers for discovery and installation
                  </p>
                  <div className="badge badge-warning badge-sm mt-1">Experimental</div>
                </div>
                <div className="ml-4">
                  <input
                    type="checkbox"
                    className="toggle toggle-primary"
                    checked={settings.experimental?.enableMcpDiscovery || false}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      experimental: {
                        ...prev.experimental,
                        enableMcpDiscovery: e.target.checked
                      }
                    }))}
                  />
                </div>
              </div>

              {/* Visual Workspace Mode */}
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <label className="label">
                    <span className="label-text font-semibold">🎯 Visual Workspace Mode</span>
                  </label>
                  <p className="text-sm text-base-content/60">
                    Enable drag-and-drop interface for managing MCP server connections
                  </p>
                  <div className="flex gap-2 mt-1">
                    <div className="badge badge-warning badge-sm">Experimental</div>
                    <div className="badge badge-info badge-sm">New!</div>
                  </div>
                </div>
                <div className="ml-4">
                  <input
                    type="checkbox"
                    className="toggle toggle-primary"
                    checked={settings.experimental?.visualWorkspaceEnabled || false}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      experimental: {
                        enableMcpDiscovery: prev.experimental?.enableMcpDiscovery ?? false,
                        ...prev.experimental,
                        visualWorkspaceEnabled: e.target.checked
                      }
                    }))}
                  />
                </div>
              </div>

              {/* Visual Workspace Settings - Only show if enabled */}
              {settings.experimental?.visualWorkspaceEnabled && (
                <>
                  <div className="pl-8 space-y-4 border-l-2 border-base-300 ml-4">
                    {/* Set as default */}
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <label className="label">
                          <span className="label-text">Set as default view</span>
                        </label>
                        <p className="text-xs text-base-content/50">
                          Open in visual mode by default
                        </p>
                      </div>
                      <div className="ml-4">
                        <input
                          type="checkbox"
                          className="toggle toggle-sm"
                          checked={settings.experimental?.visualWorkspaceDefault || false}
                          onChange={(e) => setSettings(prev => ({
                            ...prev,
                            experimental: {
                              enableMcpDiscovery: prev.experimental?.enableMcpDiscovery ?? false,
                              ...prev.experimental,
                              visualWorkspaceDefault: e.target.checked
                            }
                          }))}
                        />
                      </div>
                    </div>

                    {/* Animation Level */}
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <label className="label">
                          <span className="label-text">Animation level</span>
                        </label>
                      </div>
                      <div className="ml-4">
                        <select
                          className="select select-bordered select-sm w-32"
                          value={settings.experimental?.animationLevel || 'full'}
                          onChange={(e) => setSettings(prev => ({
                            ...prev,
                            experimental: {
                              enableMcpDiscovery: prev.experimental?.enableMcpDiscovery ?? false,
                              ...prev.experimental,
                              animationLevel: e.target.value as 'full' | 'reduced' | 'none'
                            }
                          }))}
                        >
                          <option value="full">Full</option>
                          <option value="reduced">Reduced</option>
                          <option value="none">None</option>
                        </select>
                      </div>
                    </div>

                    {/* Canvas Renderer */}
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <label className="label">
                          <span className="label-text">Canvas renderer</span>
                        </label>
                      </div>
                      <div className="ml-4">
                        <select
                          className="select select-bordered select-sm w-32"
                          value={settings.experimental?.canvasRenderer || 'auto'}
                          onChange={(e) => setSettings(prev => ({
                            ...prev,
                            experimental: {
                              enableMcpDiscovery: prev.experimental?.enableMcpDiscovery ?? false,
                              ...prev.experimental,
                              canvasRenderer: e.target.value as 'svg' | 'canvas' | 'webgl' | 'auto'
                            }
                          }))}
                        >
                          <option value="auto">Auto</option>
                          <option value="svg">SVG</option>
                          <option value="canvas">Canvas</option>
                          <option value="webgl">WebGL</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="divider">Custom Client Configuration</div>

              {/* Custom client path configuration */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <label className="label">
                      <span className="label-text font-semibold">Add Custom Client</span>
                    </label>
                    <p className="text-sm text-base-content/60">
                      Configure a custom MCP client by specifying its name and config file location
                    </p>
                  </div>
                </div>
                
                <div className="space-y-4 pl-4">
                  <div>
                    <label className="label">
                      <span className="label-text">Client Name</span>
                    </label>
                    <input 
                      type="text"
                      className="input input-bordered w-full"
                      placeholder="e.g., My Custom Client"
                      value={customClientForm.name}
                      onChange={(e) => setCustomClientForm(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  
                  <div>
                    <label className="label">
                      <span className="label-text">Configuration File Path</span>
                    </label>
                    <input 
                      type="text"
                      className="input input-bordered w-full"
                      placeholder="e.g., ~/.my-client/config.json"
                      value={customClientForm.configPath}
                      onChange={(e) => setCustomClientForm(prev => ({ ...prev, configPath: e.target.value }))}
                    />
                  </div>
                  
                  <button 
                    className="btn btn-primary btn-sm"
                    onClick={handleAddCustomClient}
                    disabled={!customClientForm.name || !customClientForm.configPath}
                  >
                    Add Custom Client
                  </button>

                  {/* Display existing custom clients */}
                  {settings.customClients && settings.customClients.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-semibold mb-2">Configured Custom Clients:</p>
                      <div className="space-y-2">
                        {settings.customClients.map((client, index) => (
                          <div key={index} className="flex items-center justify-between bg-base-200 p-2 rounded">
                            <div>
                              <span className="font-medium">{client.name}</span>
                              <span className="text-sm text-base-content/60 ml-2">({client.configPath})</span>
                            </div>
                            <button 
                              className="btn btn-ghost btn-xs"
                              onClick={() => handleRemoveCustomClient(index)}
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer - Fixed height */}
        <div className="border-t border-base-300 px-6 py-4 flex-shrink-0">
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="btn btn-ghost">
              Cancel
            </button>
            <button onClick={handleSave} className="btn btn-primary">
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Default settings factory
export const getDefaultSettings = (): AppSettings => ({
  enabledClients: {
    [ClientType.CLAUDE_DESKTOP]: true,
    [ClientType.CLAUDE_CODE]: true,
    [ClientType.CODEX]: true,
    [ClientType.VS_CODE]: true,
    [ClientType.CURSOR]: true,
    [ClientType.KIRO]: true,
    [ClientType.WINDSURF]: true,
    [ClientType.GEMINI_DESKTOP]: true,
    [ClientType.GEMINI_CLI]: true,
    [ClientType.CUSTOM]: false,
  },
  autoRefresh: true,
  refreshInterval: 5,
  showHiddenFiles: false,
  preserveDisabledServers: false,
  theme: 'system',
  customClients: [],
  experimental: {
    enableMcpDiscovery: false,
    visualWorkspaceEnabled: false,
    visualWorkspaceDefault: false,
    animationLevel: 'full',
    canvasRenderer: 'auto'
  }
});