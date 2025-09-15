import React, { useState, useEffect } from 'react';
import { McpServerEntry } from '@/shared/types/mcp-discovery';
import { ClientType } from '@/shared/types';

interface ConfigureServerModalProps {
  server: McpServerEntry;
  onClose: () => void;
}

export const ConfigureServerModal: React.FC<ConfigureServerModalProps> = ({ server, onClose }) => {
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [availableClients, setAvailableClients] = useState<{ name: string; type: ClientType; hasServer: boolean }[]>([]);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [configureError, setConfigureError] = useState<string | null>(null);
  const [configureSuccess, setConfigureSuccess] = useState(false);

  useEffect(() => {
    // Fetch available clients
    loadAvailableClients();
  }, []);

  const loadAvailableClients = async () => {
    try {
      const clients = await window.electronAPI.config.getClients();

      // Get enabled clients from settings (stored in localStorage)
      let enabledClients: Record<string, boolean> | null = null;
      const storedSettings = localStorage.getItem('mcp-app-settings');
      if (storedSettings) {
        try {
          const settings = JSON.parse(storedSettings);
          enabledClients = settings.enabledClients;
        } catch (err) {
          console.error('Failed to parse settings:', err);
        }
      }

      // Filter to only enabled clients and check which have this server
      const clientsWithStatus = await Promise.all(
        clients
          .filter(client => {
            // If no settings or client not in settings, default to enabled
            if (!enabledClients) return true;
            return enabledClients[client.type] !== false;
          })
          .map(async (client) => {
            const config = await window.electronAPI.config.readConfig(client.name, 'user');
            const hasServer = config?.mcpServers?.[server.name] !== undefined;
            return {
              name: client.name,
              type: client.type,
              hasServer
            };
          })
      );

      setAvailableClients(clientsWithStatus);
    } catch (error) {
      console.error('Failed to load clients:', error);
    }
  };

  const handleClientToggle = (clientName: string) => {
    setSelectedClients(prev =>
      prev.includes(clientName)
        ? prev.filter(c => c !== clientName)
        : [...prev, clientName]
    );
  };

  const handleConfigure = async () => {
    if (selectedClients.length === 0) {
      setConfigureError('Please select at least one client');
      return;
    }

    setIsConfiguring(true);
    setConfigureError(null);

    try {
      // Build server configuration
      const serverConfig = {
        command: server.config?.command || server.npmPackage?.split('/').pop() || 'mcp-server',
        args: server.config?.args || [],
        env: server.config?.env || {}
      };

      // Add server to each selected client
      for (const clientName of selectedClients) {
        const config = await window.electronAPI.config.readConfig(clientName, 'user');

        if (!config.mcpServers) {
          config.mcpServers = {};
        }

        // Add the server to the client's configuration
        config.mcpServers[server.name] = serverConfig;

        // Save the updated configuration
        await window.electronAPI.config.saveConfig(clientName, 'user', config);
      }

      setConfigureSuccess(true);

      // Reload clients to reflect changes
      await loadAvailableClients();

      // Close modal after success
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      setConfigureError(`Failed to configure: ${error.message}`);
    } finally {
      setIsConfiguring(false);
    }
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Configure {server.name}</h2>
          <button onClick={onClose} className="btn btn-sm btn-ghost btn-circle">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4">
          <p className="text-base-content/80">
            Select the clients where you want to add this server:
          </p>

          {/* Client Selection */}
          <div className="space-y-2">
            {availableClients.map((client) => (
              <label
                key={client.name}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  client.hasServer ? 'border-success bg-success/10' : 'border-base-300 hover:bg-base-200'
                }`}
              >
                <input
                  type="checkbox"
                  className="checkbox checkbox-primary"
                  checked={selectedClients.includes(client.name)}
                  onChange={() => handleClientToggle(client.name)}
                  disabled={client.hasServer || isConfiguring}
                />
                <div className="flex-1">
                  <div className="font-semibold">{client.name}</div>
                  <div className="text-sm text-base-content/60">
                    Type: {client.type}
                    {client.hasServer && (
                      <span className="ml-2 text-success">• Already configured</span>
                    )}
                  </div>
                </div>
              </label>
            ))}

            {availableClients.length === 0 && (
              <div className="text-center py-8 text-base-content/60">
                No MCP clients detected on this system
              </div>
            )}
          </div>

          {/* Configuration Preview */}
          {selectedClients.length > 0 && (
            <div className="bg-base-200 rounded-lg p-4">
              <h3 className="font-semibold mb-2">Configuration to be added:</h3>
              <pre className="text-sm overflow-x-auto">
                <code>{JSON.stringify({
                  [server.name]: {
                    command: server.config?.command || server.npmPackage?.split('/').pop() || 'mcp-server',
                    args: server.config?.args || [],
                    env: server.config?.env || {}
                  }
                }, null, 2)}</code>
              </pre>
            </div>
          )}

          {/* Messages */}
          {configureError && (
            <div className="alert alert-error">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{configureError}</span>
            </div>
          )}

          {configureSuccess && (
            <div className="alert alert-success">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Server successfully configured for selected clients!</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-action">
          <button onClick={onClose} className="btn btn-ghost" disabled={isConfiguring}>
            Cancel
          </button>
          <button
            onClick={handleConfigure}
            className="btn btn-primary"
            disabled={isConfiguring || selectedClients.length === 0 || configureSuccess}
          >
            {isConfiguring ? 'Configuring...' : 'Add to Clients'}
          </button>
        </div>
      </div>
    </div>
  );
};