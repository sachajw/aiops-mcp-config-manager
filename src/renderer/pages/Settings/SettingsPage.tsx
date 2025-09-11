import React, { useState, useEffect } from 'react';
import { ClientType } from '@/shared/types/enums';
import { CLIENT_DISPLAY_NAMES } from '@/shared/constants';

interface AppSettings {
  enabledClients: Record<ClientType, boolean>;
  autoRefresh: boolean;
  refreshInterval: number;
  showHiddenFiles: boolean;
  preserveDisabledServers: boolean;
  theme: 'light' | 'dark' | 'system';
}

interface SettingsPageProps {
  onClose: () => void;
  onSave: (settings: AppSettings) => void;
  currentSettings: AppSettings;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onClose, onSave, currentSettings }) => {
  const [settings, setSettings] = useState<AppSettings>(currentSettings);
  const [activeTab, setActiveTab] = useState<'clients' | 'general' | 'advanced'>('clients');

  const handleSave = () => {
    onSave(settings);
    onClose();
  };

  const toggleClient = (client: ClientType) => {
    setSettings(prev => ({
      ...prev,
      enabledClients: {
        ...prev.enabledClients,
        [client]: !prev.enabledClients[client]
      }
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-base-100 rounded-lg shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="border-b border-base-300 px-6 py-4">
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

        {/* Tab Navigation */}
        <div className="tabs tabs-boxed m-4">
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

        {/* Tab Content */}
        <div className="px-6 pb-6 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 180px)' }}>
          {activeTab === 'clients' && (
            <div className="space-y-4">
              <div className="alert alert-info">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <span>Disable clients you don't use to improve app performance and reduce clutter.</span>
              </div>

              <div className="space-y-2">
                {Object.values(ClientType).map(client => (
                  <div key={client} className="flex items-center justify-between p-4 bg-base-200 rounded-lg">
                    <div>
                      <h3 className="font-semibold">{CLIENT_DISPLAY_NAMES[client]}</h3>
                      <p className="text-sm text-base-content/60">
                        {client === ClientType.CLAUDE_DESKTOP && 'Official Anthropic desktop application'}
                        {client === ClientType.CLAUDE_CODE && 'Command-line interface for Claude'}
                        {client === ClientType.VS_CODE && 'Visual Studio Code with MCP extension'}
                        {client === ClientType.CURSOR && 'AI-powered IDE based on VS Code'}
                        {client === ClientType.CODEX && 'Advanced code assistant platform'}
                        {client === ClientType.GEMINI_DESKTOP && 'Google Gemini desktop client'}
                        {client === ClientType.GEMINI_CLI && 'Google Gemini command-line interface'}
                      </p>
                    </div>
                    <input 
                      type="checkbox"
                      className="toggle toggle-primary"
                      checked={settings.enabledClients[client] !== false}
                      onChange={() => toggleClient(client)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'general' && (
            <div className="space-y-6">
              <div className="form-control">
                <label className="label cursor-pointer">
                  <div>
                    <span className="label-text font-semibold">Auto-refresh configurations</span>
                    <span className="label-text-alt block">Automatically reload when config files change</span>
                  </div>
                  <input 
                    type="checkbox"
                    className="toggle toggle-primary"
                    checked={settings.autoRefresh}
                    onChange={(e) => setSettings(prev => ({ ...prev, autoRefresh: e.target.checked }))}
                  />
                </label>
              </div>

              {settings.autoRefresh && (
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Refresh interval (seconds)</span>
                  </label>
                  <input 
                    type="number"
                    className="input input-bordered w-32"
                    value={settings.refreshInterval}
                    min={1}
                    max={60}
                    onChange={(e) => setSettings(prev => ({ ...prev, refreshInterval: parseInt(e.target.value) || 5 }))}
                  />
                </div>
              )}

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-semibold">Theme</span>
                </label>
                <select 
                  className="select select-bordered w-48"
                  value={settings.theme}
                  onChange={(e) => setSettings(prev => ({ ...prev, theme: e.target.value as 'light' | 'dark' | 'system' }))}
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="system">System</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === 'advanced' && (
            <div className="space-y-6">
              <div className="form-control">
                <label className="label cursor-pointer">
                  <div>
                    <span className="label-text font-semibold">Show hidden files</span>
                    <span className="label-text-alt block">Display hidden configuration files and folders</span>
                  </div>
                  <input 
                    type="checkbox"
                    className="toggle toggle-primary"
                    checked={settings.showHiddenFiles}
                    onChange={(e) => setSettings(prev => ({ ...prev, showHiddenFiles: e.target.checked }))}
                  />
                </label>
              </div>

              <div className="form-control">
                <label className="label cursor-pointer">
                  <div>
                    <span className="label-text font-semibold">Preserve disabled servers in config</span>
                    <span className="label-text-alt block">
                      Write 'enabled: false' field to config files (non-standard, for advanced users)
                    </span>
                  </div>
                  <input 
                    type="checkbox"
                    className="toggle toggle-primary"
                    checked={settings.preserveDisabledServers}
                    onChange={(e) => setSettings(prev => ({ ...prev, preserveDisabledServers: e.target.checked }))}
                  />
                </label>
              </div>

              <div className="divider">Danger Zone</div>

              <div className="alert alert-warning">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>Advanced settings can affect app behavior. Change with caution.</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-base-300 px-6 py-4">
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
    [ClientType.GEMINI_DESKTOP]: true,
    [ClientType.GEMINI_CLI]: true,
  },
  autoRefresh: true,
  refreshInterval: 5,
  showHiddenFiles: false,
  preserveDisabledServers: false,
  theme: 'system'
});