import React, { useState, useEffect } from 'react';
import { McpDiscoverySettings } from '@/shared/types/mcp-discovery';

interface DiscoverySettingsProps {
  onClose: () => void;
}

export const DiscoverySettings: React.FC<DiscoverySettingsProps> = ({ onClose }) => {
  const [settings, setSettings] = useState<McpDiscoverySettings>({
    catalogUrl: 'https://registry.modelcontextprotocol.io/v0/servers',
    catalogSource: 'registry',
    autoRefresh: false,
    refreshInterval: 60,
    installLocation: '~/.mcp/servers',
    cacheExpiry: 60
  });

  useEffect(() => {
    // Load current settings
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Load from backend via IPC
      const backendSettings = await window.electronAPI.discovery?.getSettings?.();
      if (backendSettings) {
        setSettings(backendSettings);
      } else {
        // Fallback to localStorage if backend doesn't have settings yet
        const stored = localStorage.getItem('mcpDiscoverySettings');
        if (stored) {
          setSettings(JSON.parse(stored));
        }
      }
    } catch (error) {
      console.error('Failed to load discovery settings:', error);
      // Fallback to localStorage
      const stored = localStorage.getItem('mcpDiscoverySettings');
      if (stored) {
        setSettings(JSON.parse(stored));
      }
    }
  };

  const saveSettings = async () => {
    try {
      // Save to localStorage
      localStorage.setItem('mcpDiscoverySettings', JSON.stringify(settings));

      // Try to update backend settings if available
      try {
        await window.electronAPI.discovery?.updateSettings?.(settings);
      } catch (err) {
        console.log('Backend settings update not available, using localStorage only');
      }

      // Trigger catalog refresh - always fire the event
      console.log('[DiscoverySettings] Saving settings and triggering refresh...');
      window.dispatchEvent(new CustomEvent('discovery-settings-changed'));

      // Close modal after triggering event
      onClose();
    } catch (error) {
      console.error('Failed to save discovery settings:', error);
    }
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Discovery Settings</h2>
          <button onClick={onClose} className="btn btn-sm btn-ghost btn-circle">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Settings Form */}
        <div className="space-y-6">
          {/* Catalog Source */}
          <div>
            <label className="label">
              <span className="label-text font-semibold">Catalog Source</span>
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-base-200 transition-colors">
                <input
                  type="radio"
                  name="catalogSource"
                  value="registry"
                  checked={settings.catalogSource === 'registry'}
                  onChange={(e) => setSettings({ ...settings, catalogSource: e.target.value as 'registry' | 'github' })}
                  className="radio radio-primary"
                />
                <div className="flex-1">
                  <div className="font-semibold">Official Registry</div>
                  <div className="text-sm text-base-content/60">
                    Use the official MCP registry API (registry.modelcontextprotocol.io)
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-base-200 transition-colors">
                <input
                  type="radio"
                  name="catalogSource"
                  value="github"
                  checked={settings.catalogSource === 'github'}
                  onChange={(e) => setSettings({ ...settings, catalogSource: e.target.value as 'registry' | 'github' })}
                  className="radio radio-primary"
                />
                <div className="flex-1">
                  <div className="font-semibold">GitHub Repository</div>
                  <div className="text-sm text-base-content/60">
                    Fetch directly from the MCP servers GitHub repository
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Auto Refresh */}
          <div>
            <label className="label cursor-pointer">
              <span className="label-text font-semibold">Auto-refresh catalog</span>
              <input
                type="checkbox"
                className="toggle toggle-primary"
                checked={settings.autoRefresh}
                onChange={(e) => setSettings({ ...settings, autoRefresh: e.target.checked })}
              />
            </label>
            <p className="text-sm text-base-content/60 mt-1">
              Automatically refresh the server catalog at regular intervals
            </p>
          </div>

          {/* Refresh Interval */}
          {settings.autoRefresh && (
            <div>
              <label className="label">
                <span className="label-text font-semibold">Refresh Interval (minutes)</span>
              </label>
              <input
                type="number"
                className="input input-bordered w-full"
                value={settings.refreshInterval}
                onChange={(e) => setSettings({ ...settings, refreshInterval: parseInt(e.target.value) || 60 })}
                min="5"
                max="1440"
                step="5"
              />
              <p className="text-sm text-base-content/60 mt-1">
                How often to check for catalog updates (5-1440 minutes)
              </p>
            </div>
          )}

          {/* Cache Expiry */}
          <div>
            <label className="label">
              <span className="label-text font-semibold">Cache Duration (minutes)</span>
            </label>
            <input
              type="number"
              className="input input-bordered w-full"
              value={settings.cacheExpiry}
              onChange={(e) => setSettings({ ...settings, cacheExpiry: parseInt(e.target.value) || 60 })}
              min="5"
              max="1440"
              step="5"
            />
            <p className="text-sm text-base-content/60 mt-1">
              How long to keep catalog data before considering it stale
            </p>
          </div>

          {/* Install Location */}
          <div>
            <label className="label">
              <span className="label-text font-semibold">Server Install Location</span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full font-mono"
              value={settings.installLocation}
              onChange={(e) => setSettings({ ...settings, installLocation: e.target.value })}
              placeholder="~/.mcp/servers"
            />
            <p className="text-sm text-base-content/60 mt-1">
              Directory where MCP servers will be installed
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-action">
          <button onClick={onClose} className="btn btn-ghost">
            Cancel
          </button>
          <button onClick={saveSettings} className="btn btn-primary">
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};