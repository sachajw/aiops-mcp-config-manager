import React, { useEffect, useState } from 'react';
import { useDiscoveryStore } from '../../stores/discoveryStore';
import { ServerCard } from './components/ServerCard';
import { ServerDetailsModal } from './components/ServerDetailsModal';
import { SearchAndFilter } from './components/SearchAndFilter';
import { DiscoverySettings } from './components/DiscoverySettings';
import { McpServerEntry } from '@/shared/types/mcp-discovery';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

export const DiscoveryPage: React.FC = () => {
  const {
    catalog,
    catalogLoading,
    catalogError,
    fetchCatalog,
    getFilteredServers,
    selectedServer,
    showServerDetails,
    setSelectedServer,
    setShowServerDetails,
    clearError,
    filter
  } = useDiscoveryStore();

  const [filteredServers, setFilteredServers] = useState<McpServerEntry[]>([]);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    // Check localStorage for settings to determine catalog source
    const storedSettings = localStorage.getItem('mcpDiscoverySettings');
    if (storedSettings) {
      try {
        const settings = JSON.parse(storedSettings);
        console.log('[Discovery] Using catalog source:', settings.catalogSource || 'registry');
      } catch (err) {
        console.error('[Discovery] Failed to parse settings:', err);
      }
    }

    // Fetch catalog on mount - only once
    if (!catalog && !catalogLoading) {
      fetchCatalog();
    }
  }, []); // Empty dependency array - only run once on mount

  useEffect(() => {
    // Listen for settings changes
    const handleSettingsChange = () => {
      console.log('[Discovery] Settings changed, refreshing catalog...');
      fetchCatalog(true);
    };

    window.addEventListener('discovery-settings-changed', handleSettingsChange);
    return () => {
      window.removeEventListener('discovery-settings-changed', handleSettingsChange);
    };
  }, []); // Empty dependency array - event listener doesn't need to be recreated

  useEffect(() => {
    // Update filtered servers whenever catalog or filters change
    setFilteredServers(getFilteredServers());
  }, [catalog, filter, getFilteredServers]);

  const handleServerClick = (server: McpServerEntry) => {
    setSelectedServer(server);
    setShowServerDetails(true);
  };

  const handleCloseDetails = () => {
    setShowServerDetails(false);
    setSelectedServer(null);
  };

  const handleRefresh = () => {
    fetchCatalog(true);
  };

  if (catalogLoading && !catalog) {
    return <LoadingSpinner message="Loading MCP server catalog..." size="lg" fullScreen />;
  }

  if (catalogError) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md">
          <svg className="w-16 h-16 mx-auto text-error mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-semibold mb-2">Failed to Load Catalog</h3>
          <p className="text-base-content/60 mb-4">{catalogError}</p>
          <div className="flex gap-2 justify-center">
            <button onClick={handleRefresh} className="btn btn-primary btn-sm">
              Try Again
            </button>
            <button onClick={clearError} className="btn btn-ghost btn-sm">
              Dismiss
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-base-200 border-b border-base-300 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">MCP Server Discovery</h1>
            <p className="text-sm text-base-content/60 mt-1">
              Browse and install Model Context Protocol servers
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="badge badge-warning">Experimental</div>
            <button
              onClick={() => setShowSettings(true)}
              className="btn btn-sm btn-ghost"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Settings
            </button>
            <button
              onClick={handleRefresh}
              className="btn btn-sm btn-ghost"
              disabled={catalogLoading}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="px-6 py-4 bg-base-100 border-b border-base-300">
        <SearchAndFilter />
      </div>

      {/* Server Grid */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {filteredServers.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 mx-auto text-base-content/30 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-base-content/60">No servers found matching your criteria</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-max">
            {filteredServers.map((server) => (
              <ServerCard
                key={server.id}
                server={server}
                onClick={() => handleServerClick(server)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Server Details Modal */}
      {showServerDetails && selectedServer && (
        <ServerDetailsModal
          server={selectedServer}
          onClose={handleCloseDetails}
        />
      )}

      {/* Discovery Settings Modal */}
      {showSettings && (
        <DiscoverySettings onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
};