import React, { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { MCPServer } from '@/main/services/UnifiedConfigService';
import { CardHeader } from './CardHeader';
import { useConfigStore } from '@/renderer/store/simplifiedStore';

interface ServerCardProps {
  id: string;
  name: string;
  server: MCPServer;
  icon: string;
  description?: string;
  installed?: boolean;
  author?: string;
  repository?: string;
  website?: string;
}

const ServerCard: React.FC<ServerCardProps> = ({
  id,
  name,
  server,
  icon,
  description,
  installed = false,
  author,
  repository,
  website
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `server-${id}`,
    data: {
      server,
      name,
      icon
    }
  });

  // Debug drag events
  React.useEffect(() => {
    if (isDragging) {
      console.log(`[ServerCard] Dragging started for: ${name}`);
    }
  }, [isDragging, name]);

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
      onMouseDown={(e) => {
        console.log(`[ServerCard] Mouse down on ${name}`, { listeners, attributes });
      }}
      className={`
        server-card bg-base-200 rounded cursor-grab
        relative overflow-hidden
        ${isDragging ? 'dragging' : ''}
      `}
    >
      {/* Dark Header */}
      <CardHeader
        title={name}
        badge={installed ? { text: 'Active', variant: 'success' } : undefined}
        onActionClick={(e) => {
          e.stopPropagation();
          setShowDetails(!showDetails);
        }}
      />

      {/* Compact Card View */}
      <div className="p-2">

        {/* Description - show full description if no details panel */}
        {description && !showDetails && (
          <p className="text-xs text-base-content/60 line-clamp-2">{description}</p>
        )}
      </div>

      {/* Expandable Details Section */}
      {showDetails && (
        <div className="px-2 pb-2 border-t border-base-300 mt-1 pt-2">
          {description && (
            <p className="text-xs text-base-content/60 mb-2">{description}</p>
          )}

          <div className="space-y-1">
            {author && (
              <div className="flex items-center gap-1 text-xs">
                <svg className="w-3 h-3 text-base-content/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-base-content/70">{author}</span>
              </div>
            )}

            {repository && (
              <div className="flex items-center gap-1 text-xs">
                <svg className="w-3 h-3 text-base-content/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                <button
                  className="text-primary hover:underline truncate text-left"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    window.electronAPI?.openExternal(repository);
                  }}
                >
                  Repository
                </button>
              </div>
            )}

            {website && (
              <div className="flex items-center gap-1 text-xs">
                <svg className="w-3 h-3 text-base-content/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
                <button
                  className="text-primary hover:underline truncate text-left"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    window.electronAPI?.openExternal(website);
                  }}
                >
                  Website
                </button>
              </div>
            )}
          </div>

          <div className="flex gap-1 mt-2">
            <button
              className="btn btn-xs btn-ghost flex-1"
              onClick={(e) => {
                e.stopPropagation();
                // TODO: Implement settings
              }}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Config
            </button>
            <button
              className="btn btn-xs btn-primary flex-1"
              onClick={(e) => {
                e.stopPropagation();
                // TODO: Add to canvas
              }}
            >
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

interface ServerLibraryProps {
  activeClient?: string;
  clientServers?: any[];
}

export const ServerLibrary: React.FC<ServerLibraryProps> = ({ activeClient, clientServers }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Get catalog from the store instead of loading separately
  const storeCatalog = useConfigStore(state => state.catalog);
  const [catalog, setCatalog] = useState<any[]>([]);

  // Convert store catalog (object) to array format and merge with backend catalog
  React.useEffect(() => {
    const loadCatalog = async () => {
      try {
        // Convert the store catalog (object) to array format
        const storeServers = Object.entries(storeCatalog || {}).map(([name, server]: [string, any]) => ({
          name,
          ...server,
          description: server.description || server.summary || '',
          category: server.category || 'community',
          author: server.author || 'Unknown',
          installed: server.installed || false
        }));

        // Try to get additional servers from backend
        const backendServers = await (window as any).electronAPI?.getCatalogServers?.();

        if (backendServers && backendServers.length > 0) {
          // Merge both catalogs, avoiding duplicates based on name
          const serverMap = new Map();

          // Add store servers first
          storeServers.forEach(server => {
            serverMap.set(server.name.toLowerCase(), server);
          });

          // Add backend servers (will override store servers if same name)
          backendServers.forEach((server: any) => {
            serverMap.set(server.name.toLowerCase(), server);
          });

          const mergedCatalog = Array.from(serverMap.values());
          setCatalog(mergedCatalog);
          console.log('Loaded', mergedCatalog.length, 'servers from merged catalog');
        } else {
          // Use only store servers if backend unavailable
          setCatalog(storeServers);
          console.log('Loaded', storeServers.length, 'servers from store catalog');
        }
      } catch (err) {
        console.error('Failed to load catalog:', err);
        // Fallback to store catalog only
        const storeServers = Object.entries(storeCatalog || {}).map(([name, server]: [string, any]) => ({
          name,
          ...server,
          description: server.description || server.summary || '',
          category: server.category || 'community',
          author: server.author || 'Unknown',
          installed: server.installed || false
        }));
        setCatalog(storeServers);
      }
    };

    loadCatalog();

    // Listen for catalog updates
    const handleCatalogUpdate = () => loadCatalog();
    window.addEventListener('catalog-updated', handleCatalogUpdate);

    return () => window.removeEventListener('catalog-updated', handleCatalogUpdate);
  }, [storeCatalog]);



  // Determine which servers to show based on context
  let serversToShow: any[] = [];

  if (activeClient && activeClient !== 'catalog' && clientServers) {
    // Show available servers using the incremental approach:
    // Show installed servers that are NOT configured for this client
    serversToShow = catalog.filter((server: any) => {
      // Use the new fields if available, fallback to old logic
      if (server.installationStatus && server.configuredClients) {
        // New incremental approach: show installed servers not configured for this client
        return (server.installationStatus === 'installed' || server.installationStatus === 'configured') &&
               !server.configuredClients.includes(activeClient);
      } else {
        // Fallback to old logic for backward compatibility
        const configuredServerNames = new Set(clientServers.map((s: string) =>
          typeof s === 'string' ? s.toLowerCase() : (s as any).name?.toLowerCase()
        ));
        const serverName = server.name?.toLowerCase() || '';
        const npmName = server.npm?.toLowerCase() || '';
        return !configuredServerNames.has(serverName) && !configuredServerNames.has(npmName);
      }
    });
  } else {
    // Show all catalog servers when "Server Catalog" is selected or no client
    // Optionally filter to only show installed servers
    serversToShow = catalog.filter((server: any) => {
      // If we have installation status, only show installed/configured servers in catalog view
      if (server.installationStatus) {
        return server.installationStatus === 'installed' || server.installationStatus === 'configured';
      }
      // Otherwise show all for backward compatibility
      return true;
    });
  }

  const availableServers = serversToShow
    .map((server: any) => {
      // If it's already formatted from client servers, return as is
      if (server.id) return server;

      // Otherwise format catalog server
      const serverId = server.name.toLowerCase().replace(/\s+/g, '-');
      return {
        id: serverId,
        name: server.name,
        server: {
          command: server.command || 'npx',
          args: server.args || (server.npm ? ['-y', server.npm] : ['-y', server.name]),
          type: 'local' as const
        },
        icon: server.name.substring(0, 2).toUpperCase(),
        description: server.description || server.summary,
        installed: server.installed || false,
        category: server.category || 'community',
        author: server.author || 'Community',
        repository: server.repository || server.github,
        website: server.website || server.docs
      };
    });

  // NO HARDCODED CATEGORIES - Use real categories from props or discovery
  // Add 'All' as the first option, then use actual categories from data
  const categories = React.useMemo(() => {
    const uniqueCategories = new Set<string>();
    availableServers.forEach(server => {
      if (server.category) uniqueCategories.add(server.category);
    });

    return [
      { id: 'all', name: 'All' },
      ...Array.from(uniqueCategories).map(cat => ({
        id: cat.toLowerCase(),
        name: cat
      }))
    ];
  }, [availableServers]);

  const filteredServers = availableServers.filter(server => {
    const matchesSearch = server.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          server.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || server.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="p-2 h-full flex flex-col animate-slideInLeft">
      <h2 className="text-xs font-bold mb-2 animate-fadeIn">Server Library</h2>

      {/* Search */}
      <div className="relative mb-2">
        <input
          type="text"
          placeholder="Search servers..."
          className="input input-bordered input-xs w-full pr-8 text-xs"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <svg className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 text-base-content/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* Category filter */}
      <div className="flex gap-1 mb-2 flex-wrap">
        {categories.map(category => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`btn btn-xs ${selectedCategory === category.id ? 'btn-primary' : 'btn-ghost'}`}
          >
            {category.name}
          </button>
        ))}
      </div>

      {/* Server list */}
      <div className="flex-1 overflow-y-auto space-y-1.5 stagger-children">
        {filteredServers.map(server => (
          <ServerCard key={server.id} {...server} />
        ))}
      </div>

      {filteredServers.length === 0 && (
        <div className="text-center py-4 text-base-content/50">
          <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs">No servers found</p>
        </div>
      )}
    </div>
  );
};