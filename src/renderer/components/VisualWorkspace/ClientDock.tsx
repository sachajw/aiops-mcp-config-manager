import React, { useState, useEffect } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useConfigStore } from '@/renderer/store/simplifiedStore';
import { MCPClient } from '@/shared/types';
import { AppSettings } from '@/renderer/pages/Settings/SettingsPage';
import { CardHeader } from './CardHeader';

interface ClientCardProps {
  client: MCPClient;
  serverCount: number;
  isActive: boolean;
  isOver: boolean;
}

const ClientCard: React.FC<ClientCardProps> = ({ client, serverCount, isActive, isOver }) => {
  const { setActiveClient } = useConfigStore() as any;

  // Make client card both draggable and droppable
  const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({
    id: `client-${client.name}`,
    data: { type: 'client', client }
  });

  const { setNodeRef: setDropRef } = useDroppable({
    id: `client-${client.name}`,
  });

  // Combine refs
  const setNodeRef = (node: HTMLElement | null) => {
    setDragRef(node);
    setDropRef(node);
  };

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`
        client-card bg-base-200 rounded cursor-grab hover:shadow-md
        transition-all duration-200 relative overflow-hidden
        ${isActive ? 'ring-2 ring-primary shadow-lg' : ''}
        ${isOver ? 'bg-success/20 border-success animate-pulse' : ''}
        ${isDragging ? 'cursor-grabbing shadow-xl scale-105' : ''}
      `}
    >
      {/* Dark Header */}
      <div
        onDoubleClick={(e) => {
          e.stopPropagation();
          setActiveClient(client.name);
        }}
        className="cursor-pointer"
      >
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
      <div className="p-2">
        {/* Stats */}
        <div className="space-y-1 mb-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-base-content/60">Servers</span>
            <span className="font-semibold text-xs">{serverCount}/10</span>
          </div>
          <div className="w-full bg-base-300 rounded-full h-1">
            <div
              className="bg-primary h-1 rounded-full transition-all duration-300"
              style={{ width: `${(serverCount / 10) * 100}%` }}
            />
          </div>
        </div>

        {/* Drop zone indicator */}
        {isOver && (
          <div className="mt-2 p-1 bg-success/10 rounded border border-success/30 text-center">
            <span className="text-xs font-semibold text-success">Drop server here</span>
          </div>
        )}

        {/* Status indicator */}
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-1">
            <div className={`w-1.5 h-1.5 rounded-full ${(client as any).installed ? 'bg-success animate-pulse' : 'bg-base-content/30'}`} />
            <span className="text-xs text-base-content/60">
              {(client as any).installed ? 'Connected' : 'Inactive'}
            </span>
          </div>
          {serverCount > 0 && (
            <button className="btn btn-ghost btn-xs p-0 h-4 w-4 min-h-0">
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

export const ClientDock: React.FC = () => {
  const { clients, activeClient, servers } = useConfigStore();
  const [showNotInstalled, setShowNotInstalled] = useState(false);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);

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

  // Calculate server count for each client
  const getServerCount = (clientName: string) => {
    // TODO: Get actual count from configuration
    return Object.keys(servers).length > 0 ? Math.floor(Math.random() * 5) : 0;
  };

  // Filter clients based on enabled settings
  const enabledClients = clients.filter(c => {
    if (!appSettings?.enabledClients) return true;
    return appSettings.enabledClients[(c as any).type || c.name] !== false;
  });

  const installedClients = enabledClients.filter(c => (c as any).installed);
  const notInstalledClients = enabledClients.filter(c => !(c as any).installed);

  return (
    <div className="p-2">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xs font-bold">Client Selector</h2>
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
      <div className="space-y-2 mb-4">
        <h3 className="text-xs font-semibold text-base-content/60 uppercase tracking-wide">Installed</h3>
        {installedClients.map(client => (
          <ClientCard
            key={client.name}
            client={client}
            serverCount={getServerCount(client.name)}
            isActive={activeClient === client.name}
            isOver={false}
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
                client={client}
                serverCount={0}
                isActive={false}
                isOver={false}
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
    </div>
  );
};