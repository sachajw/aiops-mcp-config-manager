import React, { useState, useEffect } from 'react';
import { McpServerEntry } from '@/shared/types/mcp-discovery';
import { useDiscoveryStore } from '../../../stores/discoveryStore';
import { ConfigureServerModal } from './ConfigureServerModal';
import { InstallationConsole } from './InstallationConsole';

interface ServerDetailsModalProps {
  server: McpServerEntry;
  onClose: () => void;
}

export const ServerDetailsModal: React.FC<ServerDetailsModalProps> = ({ server, onClose }) => {
  const {
    isServerInstalled,
    installServer,
    uninstallServer,
    getInstallationState
  } = useDiscoveryStore();

  const [isInstalling, setIsInstalling] = useState(false);
  const [installError, setInstallError] = useState<string | null>(null);
  const [showConfigureModal, setShowConfigureModal] = useState(false);
  const [installationLogs, setInstallationLogs] = useState<string[]>([]);

  const isInstalled = isServerInstalled(server.id);
  const installState = getInstallationState(server.id);

  // Listen for installation output
  useEffect(() => {
    if (!window.electronAPI?.discovery?.onInstallationOutput) return;

    const unsubscribe = window.electronAPI.discovery.onInstallationOutput((event, data) => {
      if (data.serverId === server.id) {
        // Use the last 5 lines from the server
        setInstallationLogs(data.lastFiveLines || []);
      }
    });

    // Load any existing logs when component mounts
    if (window.electronAPI?.discovery?.getInstallationLogs) {
      window.electronAPI.discovery.getInstallationLogs(server.id).then(logs => {
        setInstallationLogs(logs);
      }).catch(console.error);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [server.id]);

  const handleInstall = async () => {
    setIsInstalling(true);
    setInstallError(null);
    setInstallationLogs([]); // Clear previous logs

    try {
      await installServer(server.id);
    } catch (error) {
      setInstallError((error as Error).message || 'Installation failed');
    } finally {
      setIsInstalling(false);
    }
  };

  const handleUninstall = async () => {
    if (!confirm(`Are you sure you want to uninstall ${server.name}?`)) {
      return;
    }

    setIsInstalling(true);
    setInstallError(null);

    try {
      await uninstallServer(server.id);
    } catch (error) {
      setInstallError((error as Error).message || 'Uninstallation failed');
    } finally {
      setIsInstalling(false);
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-base-100 rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="border-b border-base-300 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">{server.name}</h2>
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Status and Author */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-base-content/60">by {server.author}</p>
            {isInstalled && (
              <div className="badge badge-success">Installed</div>
            )}
          </div>

          {/* Description */}
          <div className="mb-6">
            <h3 className="font-semibold mb-2">Description</h3>
            <p className="text-base-content/80">{server.description}</p>
          </div>

          {/* Categories and Tags */}
          <div className="mb-6">
            <h3 className="font-semibold mb-2">Categories</h3>
            <div className="flex flex-wrap gap-2">
              {server.category.map((cat) => (
                <span key={cat} className="badge badge-primary">{cat}</span>
              ))}
            </div>
            {server.tags && server.tags.length > 0 && (
              <div className="mt-3">
                <h4 className="text-sm font-semibold mb-1">Tags</h4>
                <div className="flex flex-wrap gap-1">
                  {server.tags.map((tag) => (
                    <span key={tag} className="badge badge-sm badge-ghost">{tag}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Statistics */}
          <div className="mb-6">
            <h3 className="font-semibold mb-2">Statistics</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-base-200 rounded p-3">
                <p className="text-sm text-base-content/60">Downloads</p>
                <p className="text-xl font-semibold">{server.stats.downloads.toLocaleString()}</p>
              </div>
              <div className="bg-base-200 rounded p-3">
                <p className="text-sm text-base-content/60">Stars</p>
                <p className="text-xl font-semibold">{server.stats.stars.toLocaleString()}</p>
              </div>
              <div className="bg-base-200 rounded p-3">
                <p className="text-sm text-base-content/60">Last Updated</p>
                <p className="text-sm font-semibold">{formatDate(server.stats.lastUpdated)}</p>
              </div>
            </div>
          </div>

          {/* Installation Info */}
          <div className="mb-6">
            <h3 className="font-semibold mb-2">Installation</h3>
            <div className="bg-base-200 rounded p-3">
              <p className="text-sm text-base-content/60 mb-1">Type: {server.installation.type}</p>
              {server.installation.command && (
                <code className="block bg-base-300 p-2 rounded text-sm mt-2">
                  {server.installation.command}
                </code>
              )}
              {server.installation.instructions && (
                <p className="text-sm mt-2">{server.installation.instructions}</p>
              )}
            </div>
          </div>

          {/* Compatibility */}
          <div className="mb-6">
            <h3 className="font-semibold mb-2">Compatibility</h3>
            <div className="space-y-2">
              <div>
                <p className="text-sm text-base-content/60">Supported Clients:</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {server.compatibility.clients.map((client) => (
                    <span key={client} className="badge badge-sm">{client}</span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm text-base-content/60">Platforms:</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {server.compatibility.platforms.map((platform) => (
                    <span key={platform} className="badge badge-sm">{platform}</span>
                  ))}
                </div>
              </div>
              {server.compatibility.minNodeVersion && (
                <div>
                  <p className="text-sm text-base-content/60">
                    Minimum Node Version: <span className="font-mono">{server.compatibility.minNodeVersion}</span>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Configuration Example */}
          {server.config && (
            <div className="mb-6">
              <h3 className="font-semibold mb-2">Configuration Example</h3>
              <div className="bg-base-200 rounded p-3">
                <pre className="text-sm overflow-x-auto">
                  <code>{JSON.stringify(server.config, null, 2)}</code>
                </pre>
              </div>
            </div>
          )}

          {/* Links */}
          {server.repository && (
            <div className="mb-6">
              <h3 className="font-semibold mb-2">Links</h3>
              <a
                href={server.repository}
                target="_blank"
                rel="noopener noreferrer"
                className="link link-primary flex items-center gap-1"
                onClick={(e) => {
                  e.preventDefault();
                  if (server.repository) {
                    window.electronAPI?.openExternal(server.repository);
                  }
                }}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                View on GitHub
              </a>
            </div>
          )}

          {/* Installation Console */}
          {(isInstalling || installationLogs.length > 0) && (
            <InstallationConsole
              logs={installationLogs}
              isInstalling={isInstalling}
            />
          )}

          {/* Error Message */}
          {installError && (
            <div className="alert alert-error mb-4">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{installError}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-base-300 px-6 py-4 flex-shrink-0">
          <div className="flex justify-between items-center">
            <div>
              {installState && installState.status === 'installing' && (
                <div className="flex items-center gap-2">
                  <span className="loading loading-spinner loading-sm"></span>
                  <span className="text-sm">Installing... {installState.progress}%</span>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={onClose} className="btn btn-ghost">
                Close
              </button>
              {isInstalled ? (
                <>
                  <button
                    onClick={() => setShowConfigureModal(true)}
                    className="btn btn-primary"
                    disabled={isInstalling}
                  >
                    Configure
                  </button>
                  <button
                    onClick={handleUninstall}
                    className="btn btn-error"
                    disabled={isInstalling}
                  >
                    {isInstalling ? 'Processing...' : 'Uninstall'}
                  </button>
                </>
              ) : (
                <button
                  onClick={handleInstall}
                  className="btn btn-primary"
                  disabled={isInstalling || server.installation.type === 'manual'}
                >
                  {isInstalling ? 'Installing...' : 'Install'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Configure Server Modal */}
      {showConfigureModal && (
        <ConfigureServerModal
          server={server}
          onClose={() => setShowConfigureModal(false)}
        />
      )}
    </div>
  );
};