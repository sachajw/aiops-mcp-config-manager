import React from 'react';
import { McpServerEntry } from '@/shared/types/mcp-discovery';
import { useDiscoveryStore } from '../../../stores/discoveryStore';

interface ServerCardProps {
  server: McpServerEntry;
  onClick: () => void;
}

export const ServerCard: React.FC<ServerCardProps> = ({ server, onClick }) => {
  const { isServerInstalled, getInstallationState } = useDiscoveryStore();

  const isInstalled = isServerInstalled(server.id);
  const installState = getInstallationState(server.id);
  const isInstalling = installState?.status === 'pending' || installState?.status === 'downloading' || installState?.status === 'installing';

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      'AI & Language Models': 'badge-primary',
      'Development Tools': 'badge-secondary',
      'Data & Analytics': 'badge-accent',
      'Productivity': 'badge-info',
      'File Management': 'badge-success',
      'APIs & Integration': 'badge-warning',
      'Security': 'badge-error',
      'Communication': 'badge-primary',
      'Custom': 'badge-ghost',
      'Other': 'badge-ghost'
    };
    return colors[category] || 'badge-ghost';
  };

  return (
    <div
      className="card bg-base-200 hover:bg-base-300 cursor-pointer transition-all duration-200 hover:shadow-lg relative overflow-hidden min-h-[280px] max-h-[320px] flex flex-col"
      onClick={onClick}
    >
      {isInstalled && (
        <div className="absolute top-2 right-2">
          <div className="badge badge-success badge-sm">Installed</div>
        </div>
      )}

      {isInstalling && (
        <div className="absolute top-2 right-2">
          <div className="badge badge-warning badge-sm">
            <span className="loading loading-spinner loading-xs mr-1"></span>
            Installing
          </div>
        </div>
      )}

      <div className="card-body flex flex-col flex-1">
        {/* Header */}
        <h3 className="card-title text-lg">{server.name}</h3>

        {/* Author */}
        <p className="text-sm text-base-content/60">by {server.author}</p>

        {/* Description */}
        <p className="text-sm mt-2 line-clamp-2">{server.description}</p>

        {/* Categories */}
        <div className="flex flex-wrap gap-1 mt-3">
          {(server.category ?? []).slice(0, 2).map((cat) => (
            <span key={cat} className={`badge badge-sm ${getCategoryColor(cat)}`}>
              {cat}
            </span>
          ))}
          {server.category && server.category.length > 2 && (
            <span className="badge badge-sm badge-ghost">+{server.category.length - 2}</span>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mt-4 text-sm text-base-content/60">
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
            <span>{formatNumber(server.stats?.downloads ?? 0)}</span>
          </div>
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            <span>{formatNumber(server.stats?.stars ?? 0)}</span>
          </div>
        </div>

        {/* Installation Type */}
        <div className="mt-3">
          <span className="text-xs text-base-content/50">
            Install via: {server.installation.type}
          </span>
        </div>
      </div>
    </div>
  );
};