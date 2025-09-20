import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

interface ServerNodeData {
  label: string;
  icon?: string;
  tools?: number | string;
  tokens?: number | string;
  status?: 'active' | 'inactive' | 'error';
  server?: any;
  loading?: boolean;
  metricsLoaded?: boolean;
  metricsTimestamp?: number;
  onRefresh?: () => void;
}

export const ServerNode: React.FC<NodeProps<ServerNodeData>> = ({ data, selected }) => {
  const { label, icon = 'SR', tools = '—', tokens = '—', status = 'inactive', loading = false } = data;

  const statusColors = {
    active: 'border-success bg-success/10',
    inactive: 'border-base-300 bg-base-200',
    error: 'border-error bg-error/10'
  };

  return (
    <div
      className={`
        server-node relative min-w-[180px] rounded-lg border-2 p-3
        transition-all duration-200 backdrop-blur-sm
        ${statusColors[status]}
        ${selected ? 'shadow-2xl scale-105 ring-2 ring-primary ring-offset-2' : 'shadow-lg hover:shadow-xl'}
      `}
      style={{
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
      }}
    >
      {/* Status indicator */}
      <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${
        status === 'active' ? 'bg-success animate-pulse' :
        status === 'error' ? 'bg-error' :
        'bg-base-content/30'
      }`} />

      {/* Refresh button - show when metrics are loaded */}
      {data.metricsLoaded && (
        <button
          className="absolute top-1 right-1 p-1 rounded hover:bg-base-300 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            if (data.onRefresh) data.onRefresh();
          }}
          title="Refresh metrics"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      )}

      {/* Icon and label */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded bg-base-300 flex items-center justify-center text-xs font-bold">
          {typeof icon === 'string' && icon.length <= 2 ? icon : 'SR'}
        </div>
        <div className="flex-1">
          <div className="font-semibold text-sm">{label}</div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-3 text-xs text-base-content/60">
        <div className="flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          <span className={loading ? 'opacity-50' : ''}>{tools}</span>
        </div>
        <div className="flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          <span className={loading ? 'opacity-50' : ''}>
            {typeof tokens === 'number' ? tokens.toLocaleString() : tokens}
          </span>
        </div>
      </div>

      {/* Connection handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="!w-3 !h-3 !bg-primary !border-2 !border-white"
        style={{
          background: '#3B82F6',
          border: '2px solid white',
        }}
      />
    </div>
  );
};