import React from 'react';

interface CardHeaderProps {
  title: string;
  badge?: {
    text: string;
    variant: 'success' | 'primary' | 'info' | 'warning' | 'error' | 'ghost';
  };
  onActionClick?: (e: React.MouseEvent) => void;
  actionIcon?: React.ReactNode;
  actionTitle?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  title,
  badge,
  onActionClick,
  actionIcon,
  actionTitle = "Show details"
}) => {
  return (
    <div className="bg-base-300 px-2 py-1 flex items-center justify-between">
      <h3 className="font-semibold text-xs truncate">{title}</h3>
      <div className="flex items-center gap-1">
        {badge && (
          <div className={`badge badge-${badge.variant} badge-xs`}>
            {badge.text}
          </div>
        )}
        {onActionClick && (
          <button
            className="btn btn-ghost btn-xs p-0 h-4 w-4 min-h-0"
            onClick={onActionClick}
            title={actionTitle}
          >
            {actionIcon || (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
};