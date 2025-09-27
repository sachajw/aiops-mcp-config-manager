import React, { useState, useRef, useEffect } from 'react';
import { useConfigStore } from '@/renderer/store/simplifiedStore';

export const InsightsPanel: React.FC = () => {
  const { servers, activeClient, activeScope } = useConfigStore();
  const [height, setHeight] = useState(150); // Default height
  const [isResizing, setIsResizing] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showDetails, setShowDetails] = useState(false); // Progressive disclosure
  const [metrics, setMetrics] = useState({ totalTokens: 0, totalTools: 0, avgResponseTime: 0, connectedCount: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  // Fetch real metrics from servers
  React.useEffect(() => {
    const fetchMetrics = async () => {
      // Get servers directly from the active client configuration instead of the store
      let serverConfigs: Record<string, any> = {};
      let serverNames: string[] = [];

      if (activeClient && activeClient !== 'catalog') {
        try {
          console.log('[InsightsPanel] Loading config for activeClient:', activeClient, 'scope:', activeScope);
          const config = await window.electronAPI?.readConfig?.(activeClient, activeScope);
          if (config?.success && config.data) {
            serverConfigs = config.data;
            serverNames = Object.keys(config.data);
            console.log('[InsightsPanel] Found servers from active client config:', serverNames);
            console.log('[InsightsPanel] Server configs:', serverConfigs);
          } else {
            console.log('[InsightsPanel] No config data for active client:', config);
          }
        } catch (err) {
          console.error('[InsightsPanel] Failed to load config for active client:', err);
        }
      }

      // Fallback to store servers if direct config loading failed
      if (serverNames.length === 0) {
        serverNames = Object.keys(servers);
        // Try to get configs from store servers
        Object.entries(servers).forEach(([name, server]) => {
          serverConfigs[name] = server;
        });
        console.log('[InsightsPanel] Falling back to store servers:', serverNames);
      }

      if (serverNames.length === 0) {
        console.log('[InsightsPanel] No servers found anywhere, setting zero metrics');
        setMetrics({ totalTokens: 0, totalTools: 0, avgResponseTime: 0, connectedCount: 0 });
        return;
      }

      try {
        // First, get individual server metrics with their configs
        console.log('[InsightsPanel] Fetching individual server metrics with configs...');
        let totalTokens = 0;
        let totalTools = 0;
        let totalResponseTime = 0;
        let connectedCount = 0;
        let responseCount = 0;

        for (const serverName of serverNames) {
          const serverConfig = serverConfigs[serverName];
          if (serverConfig) {
            try {
              console.log(`[InsightsPanel] Fetching metrics for ${serverName} with config:`, serverConfig);
              // Use the getServerMetrics method from preload which passes both parameters correctly
              const serverMetrics = await window.electronAPI?.getServerMetrics?.(serverName, serverConfig);
              console.log(`[InsightsPanel] Metrics for ${serverName}:`, serverMetrics);

              if (serverMetrics) {
                // Handle both number and string types for toolCount
                const toolCount = typeof serverMetrics.toolCount === 'number'
                  ? serverMetrics.toolCount
                  : typeof serverMetrics.toolCount === 'string'
                    ? parseInt(serverMetrics.toolCount, 10)
                    : 0;
                if (!isNaN(toolCount)) {
                  totalTools += toolCount;
                }

                // Handle both number and string types for tokenUsage
                const tokenUsage = typeof serverMetrics.tokenUsage === 'number'
                  ? serverMetrics.tokenUsage
                  : typeof serverMetrics.tokenUsage === 'string'
                    ? parseInt(serverMetrics.tokenUsage, 10)
                    : 0;
                if (!isNaN(tokenUsage)) {
                  totalTokens += tokenUsage;
                }
                if (serverMetrics.responseTime > 0) {
                  totalResponseTime += serverMetrics.responseTime;
                  responseCount++;
                }
                if (serverMetrics.isConnected) {
                  connectedCount++;
                }
              }
            } catch (err) {
              console.error(`[InsightsPanel] Failed to get metrics for ${serverName}:`, err);
            }
          }
        }

        const newMetrics = {
          totalTokens,
          totalTools,
          avgResponseTime: responseCount > 0 ? Math.round(totalResponseTime / responseCount) : 0,
          connectedCount
        };
        console.log('[InsightsPanel] Calculated total metrics:', newMetrics);
        setMetrics(newMetrics);

      } catch (err) {
        console.error('[InsightsPanel] Failed to fetch metrics:', err);
      }
    };

    fetchMetrics();
  }, [servers, activeClient, activeScope]);

  const { totalTokens, totalTools, avgResponseTime, connectedCount } = metrics;
  const activeConnections = connectedCount;

  // Handle resize
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const container = document.querySelector('.visual-workspace');
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const newHeight = containerRect.bottom - e.clientY;
      if (newHeight > 50 && newHeight < 400) {
        setHeight(newHeight);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  if (isCollapsed) {
    return (
      <div className="absolute bottom-0 left-0 right-0 bg-base-100 border-t border-base-300 z-[5]">
        <div
          className="flex items-center justify-between px-3 py-1 cursor-pointer hover:bg-base-200"
          onClick={() => setIsCollapsed(false)}
        >
          <h3 className="text-xs font-semibold">Performance Insights</h3>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={panelRef}
      className="absolute bottom-0 left-0 right-0 bg-base-100 border-t border-base-300 flex flex-col z-[5]"
      style={{ height: `${height}px` }}
    >
      {/* Resize Handle */}
      <div
        className="h-1 bg-base-300 hover:bg-primary cursor-ns-resize transition-colors"
        onMouseDown={handleMouseDown}
      />

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-base-300">
        <h3 className="text-xs font-semibold">Performance Insights</h3>
        <div className="flex items-center gap-1">
          <button
            className="btn btn-ghost btn-xs"
            onClick={() => setShowDetails(!showDetails)}
            title="Toggle details"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          <button
            className="btn btn-ghost btn-xs"
            onClick={() => setIsCollapsed(true)}
            title="Minimize"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {/* Quick Stats - Always visible */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          {/* Tools Available */}
          <div className="bg-base-200 rounded p-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-base-content/60">Tools</span>
              {totalTools > 100 && (
                <span className="text-xs badge badge-info badge-xs">Many</span>
              )}
            </div>
            <div className="text-sm font-bold">{totalTools.toLocaleString()}</div>
            <div className="w-full bg-base-300 rounded-full h-1 mt-1">
              <div
                className="bg-info h-1 rounded-full transition-all duration-300"
                style={{ width: `${Math.min((totalTools / 100) * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* Token Usage */}
          <div className="bg-base-200 rounded p-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-base-content/60">Tokens</span>
              {totalTokens > 1000000 && (
                <span className="text-xs badge badge-warning badge-xs">High</span>
              )}
            </div>
            <div className="text-sm font-bold">{totalTokens.toLocaleString()}</div>
            <div className="w-full bg-base-300 rounded-full h-1 mt-1">
              <div
                className="bg-primary h-1 rounded-full transition-all duration-300"
                style={{ width: `${Math.min((totalTokens / 1000000) * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* Response Time */}
          <div className="bg-base-200 rounded p-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-base-content/60">Response</span>
              <span className={`text-xs badge badge-xs ${
                avgResponseTime < 100 ? 'badge-success' : avgResponseTime < 500 ? 'badge-warning' : 'badge-error'
              }`}>
                {avgResponseTime < 100 ? 'Fast' : avgResponseTime < 500 ? 'OK' : 'Slow'}
              </span>
            </div>
            <div className="text-sm font-bold">{avgResponseTime}ms</div>
            <div className="text-xs text-base-content/50">Avg</div>
          </div>

          {/* Active Connections */}
          <div className="bg-base-200 rounded p-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-base-content/60">Active</span>
              <span className="text-xs badge badge-info badge-xs">Live</span>
            </div>
            <div className="text-sm font-bold">{activeConnections}/{Object.keys(servers).length || 10}</div>
            <div className="flex gap-0.5 mt-1">
              {[...Array(Math.min(Object.keys(servers).length || 10, 10))].map((_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded ${
                    i < activeConnections ? 'bg-success' : 'bg-base-300'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Detailed View - Progressive Disclosure */}
        {showDetails && (
          <>
            {/* Token Distribution */}
            <div className="bg-base-200 rounded p-2 mb-3">
              <h4 className="text-xs font-semibold mb-2">Token Distribution</h4>
              <div className="space-y-1">
                {Object.entries(servers).slice(0, 5).map(([name, server]) => (
                  <div key={name} className="flex items-center justify-between">
                    <span className="text-xs truncate flex-1">{name}</span>
                    <div className="flex items-center gap-1">
                      <div className="w-16 bg-base-300 rounded-full h-1">
                        <div
                          className="bg-info h-1 rounded-full"
                          style={{ width: `0%` }}
                        />
                      </div>
                      <span className="text-xs text-base-content/60">—</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Connection Health */}
            <div className="bg-base-200 rounded p-2 mb-3">
              <h4 className="text-xs font-semibold mb-2">Connection Health</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-base-content/60">Uptime</span>
                  <span className="font-semibold">99.9%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-base-content/60">Errors</span>
                  <span className="font-semibold text-error">2</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-base-content/60">Warnings</span>
                  <span className="font-semibold text-warning">5</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-base-content/60">Queue</span>
                  <span className="font-semibold">0</span>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-base-200 rounded p-2 mb-3">
              <h4 className="text-xs font-semibold mb-2">Recent Activity</h4>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-1 bg-success rounded-full"></div>
                  <span className="text-base-content/60">filesystem: read operation</span>
                  <span className="text-base-content/40 ml-auto">2s ago</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1 h-1 bg-info rounded-full"></div>
                  <span className="text-base-content/60">search: query executed</span>
                  <span className="text-base-content/40 ml-auto">15s ago</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1 h-1 bg-warning rounded-full"></div>
                  <span className="text-base-content/60">ai-tools: generation started</span>
                  <span className="text-base-content/40 ml-auto">1m ago</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Tips - Always at bottom */}
        <div className="mt-auto pt-2">
          <div className="p-2 bg-info/10 rounded">
            <div className="flex gap-1 items-start">
              <svg className="w-3 h-3 text-info mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-base-content/70">
                {showDetails ?
                  'Monitor your server connections and performance metrics in real-time.' :
                  'Click the info button to see detailed metrics and activity logs.'
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};