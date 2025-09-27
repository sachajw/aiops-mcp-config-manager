import React, { useState, useEffect } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useConfigStore } from '@/renderer/store/simplifiedStore';
import { MCPClient, ClientStatus, ClientType } from '@/shared/types';
import { AppSettings } from '@/renderer/pages/Settings/SettingsPage';
import { CardHeader } from './CardHeader';
import { ClientConfigDialog } from '../ClientConfigDialog';

interface ClientCardProps {
  client: MCPClient;
  serverCount: number;
  isActive: boolean;
  isOver: boolean;
  onSettingsClick: (clientName: string) => void;
}

const ClientCard: React.FC<ClientCardProps> = ({ client, serverCount, isActive, isOver, onSettingsClick }) => {
  const { selectClient } = useConfigStore() as any;

  // Only make it droppable, not draggable
  const { setNodeRef: setDropRef } = useDroppable({
    id: `client-${client.name}`,
  });

  const handleClick = () => {
    selectClient(client.name);
    console.log('Client selected:', client.name);
  };

  return (
    <div
      ref={setDropRef}
      onClick={handleClick}
      className={`
        client-card bg-base-200 rounded cursor-pointer
        relative overflow-hidden
        ${isActive ? 'active' : ''}
        ${isOver ? 'drop-zone-hover' : ''}
      `}
    >

      {/* Dark Header */}
      <div className="pointer-events-none">
        <CardHeader
          title={(client as any).displayName || client.name}
          badge={
            isActive ? { text: 'Selected', variant: 'primary' } :
            (client as any).installed ? { text: 'Active', variant: 'success' } :
            undefined
          }
        />
      </div>

      {/* Card Body */}
      <div className="p-2 pointer-events-none">
        {/* Stats */}
        <div className="space-y-1 mb-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-base-content/60">Servers</span>
            <span className="font-semibold text-xs">{serverCount}</span>
          </div>
          <div className="w-full bg-base-300 rounded-full h-1">
            <div
              className="bg-primary h-1 rounded-full transition-all duration-300"
              style={{ width: `${Math.min((serverCount / 20) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Drop zone indicator */}
        {isOver && (
          <div className="mt-2 p-1 bg-success/10 rounded border border-success/30 text-center">
            <span className="text-xs font-semibold text-success">Drop server here</span>
          </div>
        )}

        {/* Status indicators */}
        <div className="flex items-center justify-between mt-1">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1">
              <div className={`w-1.5 h-1.5 rounded-full ${(client as any).installed ? 'bg-success' : 'bg-base-content/30'}`} />
              <span className="text-[10px] text-base-content/60">
                {(client as any).installed ? 'Client installed' : 'Not installed'}
              </span>
            </div>
            {(client as any).installed && serverCount > 0 && (
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span className="text-[10px] text-base-content/60">
                  {serverCount} configured
                </span>
              </div>
            )}
          </div>
          {serverCount > 0 && (
            <button
              className="btn btn-ghost btn-xs p-0 h-4 w-4 min-h-0 pointer-events-auto"
              onClick={(e) => {
                e.stopPropagation();
                onSettingsClick(client.name);
              }}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Adapter to convert DetectedClient to MCPClient
const detectedToMCPClient = (detected: any): MCPClient => {
  return {
    id: detected.name,
    name: detected.name,
    type: (detected.type || ClientType.CLAUDE_DESKTOP) as ClientType,
    configPaths: {
      primary: detected.configPath || '',
      alternatives: [],
      scopePaths: {} as any
    },
    status: detected.installed ? ClientStatus.ACTIVE : ClientStatus.INACTIVE,
    isActive: detected.installed === true
  };
};

export const ClientDock: React.FC = () => {
  const { clients, activeClient, servers } = useConfigStore();
  const [showNotInstalled, setShowNotInstalled] = useState(false);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [clientServerCounts, setClientServerCounts] = useState<Record<string, number>>({});
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<string>('');

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('mcp-app-settings');
    if (savedSettings) {
      try {
        setAppSettings(JSON.parse(savedSettings));
      } catch (e) {
        console.error('Failed to load settings:', e);
      }
    }
  }, []);

  // Load actual server counts for each client
  useEffect(() => {
    const loadServerCounts = async () => {
      const counts: Record<string, number> = {};

      for (const client of clients) {
        if ((client as any).installed) {
          try {
            // Get configuration for this client
            const config = await (window as any).electronAPI?.readConfig?.(client.name, 'user');
            if (config?.mcpServers) {
              counts[client.name] = Object.keys(config.mcpServers).length;
            } else {
              counts[client.name] = 0;
            }
          } catch (err) {
            console.warn(`Failed to load server count for ${client.name}:`, err);
            counts[client.name] = 0;
          }
        } else {
          counts[client.name] = 0;
        }
      }

      setClientServerCounts(counts);
    };

    loadServerCounts();

    // Reload counts when servers change
    const interval = setInterval(loadServerCounts, 5000);
    return () => clearInterval(interval);
  }, [clients, servers]);

  // Get server count for a client
  const getServerCount = (clientName: string) => {
    return clientServerCounts[clientName] ?? 0;
  };

  // Handle settings click
  const handleSettingsClick = (clientName: string) => {
    setSelectedClient(clientName);
    setConfigDialogOpen(true);
  };

  // Filter clients based on enabled settings
  const enabledClients = clients.filter(c => {
    if (!appSettings?.enabledClients) return true;
    const clientType = (c as any).type || c.name;
    return appSettings.enabledClients[clientType as keyof typeof appSettings.enabledClients] !== false;
  });

  const installedClients = enabledClients.filter(c => (c as any).installed);
  const notInstalledClients = enabledClients.filter(c => !(c as any).installed);

  return (
    <div className="p-2 animate-slideInRight">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xs font-bold animate-fadeIn">Client Selector</h2>
        <button
          className="btn btn-ghost btn-xs"
          onClick={() => setShowNotInstalled(!showNotInstalled)}
        >
          {showNotInstalled ? 'Hide' : 'Show'} All
        </button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-1 mb-2">
        <div className="bg-base-200 rounded p-1 text-center">
          <div className="text-sm font-bold text-primary">{installedClients.length}</div>
          <div className="text-xs text-base-content/60">Active</div>
        </div>
        <div className="bg-base-200 rounded p-1 text-center">
          <div className="text-sm font-bold text-base-content/60">{Object.keys(servers).length}</div>
          <div className="text-xs text-base-content/60">Servers</div>
        </div>
      </div>

      {/* Installed clients */}
      <div className="space-y-2 mb-4 stagger-children">
        <h3 className="text-xs font-semibold text-base-content/60 uppercase tracking-wide">Installed</h3>
        {installedClients.map(client => (
          <ClientCard
            key={client.name}
            client={detectedToMCPClient(client)}
            serverCount={getServerCount(client.name)}
            isActive={activeClient === client.name}
            isOver={false}
            onSettingsClick={handleSettingsClick}
          />
        ))}
        {installedClients.length === 0 && (
          <div className="text-center py-2 text-base-content/50">
            <p className="text-xs">No clients installed</p>
          </div>
        )}
      </div>

      {/* Not installed clients */}
      {notInstalledClients.length > 0 && showNotInstalled && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-base-content/60 uppercase tracking-wide">Available</h3>
          {notInstalledClients.map(client => (
            <div key={client.name} className="opacity-50">
              <ClientCard
                client={detectedToMCPClient(client)}
                serverCount={0}
                isActive={false}
                isOver={false}
                onSettingsClick={handleSettingsClick}
              />
            </div>
          ))}
        </div>
      )}

      {/* Help text */}
      <div className="mt-4 p-2 bg-info/10 rounded">
        <div className="flex gap-1">
          <svg className="w-3 h-3 text-info flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-xs text-base-content/70">
            <p className="font-semibold">Multi-Client Config</p>
            <p className="text-xs">Click to switch clients or drag to canvas for multi-client setup.</p>
          </div>
        </div>
      </div>

      {/* Client Configuration Dialog */}
      {configDialogOpen && (
        <ClientConfigDialog
          open={configDialogOpen}
          clientName={selectedClient}
          onClose={() => {
            setConfigDialogOpen(false);
            setSelectedClient('');
          }}
        />
      )}
    </div>
  );
};