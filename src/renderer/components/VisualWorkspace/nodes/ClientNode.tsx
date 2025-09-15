import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

interface ClientNodeData {
  label: string;
  icon?: string;
  serverCount?: number;
  maxServers?: number;
  status?: 'active' | 'inactive' | 'error';
  client?: any;
}

export const ClientNode: React.FC<NodeProps<ClientNodeData>> = ({ data, selected }) => {
  const { label, icon = 'CL', serverCount = 0, maxServers = 10, status = 'active' } = data;

  const statusColors = {
    active: 'border-success bg-success/10',
    inactive: 'border-base-300 bg-base-200',
    error: 'border-error bg-error/10'
  };

  const capacityPercentage = (serverCount / maxServers) * 100;

  return (
    <div
      className={`
        client-node relative min-w-[200px] rounded-lg border-2 p-3
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

      {/* Icon and label */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded bg-success/20 border border-success flex items-center justify-center text-xs font-bold text-success">
          {typeof icon === 'string' && icon.length <= 2 ? icon : 'CL'}
        </div>
        <div className="flex-1">
          <div className="font-semibold text-sm">{label}</div>
          <div className="text-xs text-base-content/60">AI Client</div>
        </div>
      </div>

      {/* Server capacity */}
      <div className="mb-2">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-base-content/60">Servers</span>
          <span className="font-semibold">{serverCount}/{maxServers}</span>
        </div>
        <div className="w-full bg-base-300 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              capacityPercentage >= 80 ? 'bg-warning' :
              capacityPercentage >= 50 ? 'bg-info' :
              'bg-success'
            }`}
            style={{ width: `${capacityPercentage}%` }}
          />
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex gap-1">
        <button className="btn btn-ghost btn-xs flex-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
        <button className="btn btn-ghost btn-xs flex-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Connection handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="!w-3 !h-3 !bg-success !border-2 !border-white"
        style={{
          background: '#10B981',
          border: '2px solid white',
        }}
      />
    </div>
  );
};