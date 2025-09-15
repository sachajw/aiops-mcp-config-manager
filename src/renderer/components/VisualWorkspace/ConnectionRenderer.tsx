import React from 'react';

interface ConnectionRendererProps {
  isDragging: boolean;
}

export const ConnectionRenderer: React.FC<ConnectionRendererProps> = ({ isDragging }) => {
  if (!isDragging) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-50">
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-primary/90 text-white px-4 py-2 rounded-lg shadow-lg animate-pulse">
        <span className="font-semibold">Drag to a client to connect</span>
      </div>
    </div>
  );
};