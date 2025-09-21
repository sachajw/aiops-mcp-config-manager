import React, { useEffect, useRef } from 'react';

interface InstallationConsoleProps {
  logs: string[];
  isInstalling: boolean;
}

export const InstallationConsole: React.FC<InstallationConsoleProps> = ({ logs, isInstalling }) => {
  const consoleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new logs are added
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [logs]);

  if (!isInstalling && logs.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 border border-base-300 rounded-lg bg-base-300/20">
      <div className="px-3 py-2 border-b border-base-300 flex items-center justify-between">
        <span className="text-sm font-semibold">Installation Output</span>
        {isInstalling && (
          <span className="loading loading-spinner loading-xs"></span>
        )}
      </div>
      <div
        ref={consoleRef}
        className="p-3 bg-black text-green-400 font-mono text-sm h-24 overflow-y-auto"
        style={{ minHeight: '96px', maxHeight: '120px' }}
      >
        {logs.length === 0 ? (
          <div className="text-gray-500">Starting installation...</div>
        ) : (
          logs.map((log, index) => (
            <div key={index} className="whitespace-pre-wrap break-all">
              <span className="text-gray-500 mr-2">&gt;</span>
              {log}
            </div>
          ))
        )}
      </div>
    </div>
  );
};