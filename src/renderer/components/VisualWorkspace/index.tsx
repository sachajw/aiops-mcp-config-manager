import React, { useState, useCallback, useMemo } from 'react';
import { ReactFlow, Background, Controls, MiniMap, ReactFlowProvider, Node, Edge, Connection, useNodesState, useEdgesState, addEdge } from '@xyflow/react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useDroppable,
  DragOverEvent,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import '@xyflow/react/dist/style.css';
import './VisualWorkspace.css';

import { ServerLibrary } from './ServerLibrary';
import { ClientDock } from './ClientDock';
// Removed ConnectionRenderer import - was causing white rectangle
import { InsightsPanel } from './InsightsPanel';
import { RefreshCw, Code2, Eye } from 'lucide-react';
import { ServerNode } from './nodes/ServerNode';
import { ClientNode } from './nodes/ClientNode';
import { CableEdge } from './edges/CableEdge';
import { useConfigStore } from '@/renderer/store/simplifiedStore';
import { useSettingsStore } from '@/renderer/store/settingsStore';
import { MCPServer } from '@/main/services/UnifiedConfigService';
import JsonEditor from '../editor/JsonEditor';

// Define node types for React Flow
const nodeTypes = {
  server: ServerNode as any,
  client: ClientNode as any,
};

// Define edge types for React Flow
const edgeTypes = {
  cable: CableEdge as any,
};

export const VisualWorkspace: React.FC = () => {
  const {
    servers,
    clients,
    activeClient,
    addServer,
    updateServer,
    deleteServer,
    activeScope,
    setServers,
    setActiveClient,
    detectClients,
    selectClient
  } = useConfigStore() as any;

  const { settings } = useSettingsStore();
  // Check for dark mode from settings or system preference
  const isDarkMode = settings?.theme?.mode === 'dark' ||
    (settings?.theme?.mode === 'system' && window.matchMedia?.('(prefers-color-scheme: dark)')?.matches);
  const theme = isDarkMode ? 'vs-dark' : 'vs-light';

  // Canvas drop zone ref
  const { setNodeRef: setCanvasDropRef, isOver: isOverCanvas } = useDroppable({
    id: 'react-flow-wrapper',
    data: { type: 'canvas' }
  });

  // Configure drag sensors with activation constraints
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px drag before activation
      },
    })
  );

  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Track client server counts
  const [clientServerCounts, setClientServerCounts] = React.useState<Record<string, number>>({});

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [draggedItem, setDraggedItem] = useState<{ id: string; type: string; data: any } | null>(null);
  const [autoSave, setAutoSave] = useState(false);

  // Panel visibility
  const [showInsights, setShowInsights] = useState(true);
  const [showJsonEditor, setShowJsonEditor] = useState(false);
  const [isJsonEditorCollapsed, setIsJsonEditorCollapsed] = useState(false);
  const [jsonEditorContent, setJsonEditorContent] = useState('{}');
  const [jsonErrors, setJsonErrors] = useState<string[]>([]);
  const [jsonEditorHeight, setJsonEditorHeight] = useState(300);
  const [isResizingJson, setIsResizingJson] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Metrics cache to avoid repeated fetches
  const metricsCache = React.useRef<Map<string, { data: any; timestamp: number }>>(new Map());
  const METRICS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache TTL

  // Initialize clients on mount
  React.useEffect(() => {
    const initializeClients = async () => {
      console.log('[VisualWorkspace] Initializing clients...');

      // Detect available clients if not already loaded
      if (clients.length === 0) {
        await detectClients();
      }

      // If no active client, select claude-desktop by default
      if (!activeClient) {
        // Wait a bit for clients to load
        setTimeout(async () => {
          const updatedClients = useConfigStore.getState().clients;
          const claudeDesktop = updatedClients.find((c: any) => c.name === 'claude-desktop' && c.installed);
          if (claudeDesktop) {
            console.log('[VisualWorkspace] Auto-selecting claude-desktop');
            await selectClient('claude-desktop');
          } else {
            // Select first installed client
            const firstInstalled = updatedClients.find((c: any) => c.installed);
            if (firstInstalled) {
              console.log(`[VisualWorkspace] Auto-selecting ${firstInstalled.name}`);
              await selectClient(firstInstalled.name);
            }
          }
        }, 500);
      }
    };

    initializeClients();
  }, []); // Only run once on mount

  // Load actual server counts for each client
  React.useEffect(() => {
    const loadClientServerCounts = async () => {
      const counts: Record<string, number> = {};

      for (const client of clients) {
        if ((client as any).installed) {
          try {
            // Get the actual configuration for this client
            const config = await (window as any).electronAPI?.readConfig?.(client.name, activeScope);
            if (config?.data) {
              counts[client.name] = Object.keys(config.data).length;
            } else {
              counts[client.name] = 0;
            }
          } catch (err) {
            console.warn(`Failed to load server count for ${client.name}:`, err);
            counts[client.name] = 0;
          }
        }
      }

      setClientServerCounts(counts);
    };

    if (clients.length > 0) {
      loadClientServerCounts();
    }
  }, [clients, activeScope]);

  // Function to fetch metrics with optional force refresh
  const fetchMetrics = async (forceRefresh = false) => {
      console.log(`[VisualWorkspace] Servers from store:`, servers);
      const serverNames = Object.keys(servers);
      console.log(`[VisualWorkspace] Server names:`, serverNames);
      const metrics: Record<string, any> = {};

      // Fetch metrics for each server
      for (const name of serverNames) {
        const cacheKey = `${name}-${JSON.stringify(servers[name])}`;
        const cached = metricsCache.current.get(cacheKey);

        // Use cache if available and not expired (unless force refresh)
        if (!forceRefresh && cached && (Date.now() - cached.timestamp < METRICS_CACHE_TTL)) {
          console.log(`[VisualWorkspace] Using cached metrics for ${name}`);
          metrics[name] = cached.data;
          continue;
        }

        try {
          console.log(`[VisualWorkspace] Fetching fresh metrics for server: ${name}`);
          const serverConfig = servers[name]; // Pass the actual server config
          console.log(`[VisualWorkspace] Server config for ${name}:`, serverConfig);
          const serverMetrics = await (window as any).electronAPI?.getServerMetrics?.(name, serverConfig, forceRefresh);
          console.log(`[VisualWorkspace] Received metrics for ${name}:`, serverMetrics);

          // Use real metrics if available, otherwise use unique generated values
          if (serverMetrics && typeof serverMetrics.toolCount === 'number') {
            metrics[name] = serverMetrics;
            // Cache the successful result
            metricsCache.current.set(cacheKey, {
              data: serverMetrics,
              timestamp: Date.now()
            });
          } else {
            // No real metrics available - show loading state
            metrics[name] = {
              toolCount: undefined,
              tokenUsage: undefined,
              loading: true
            };
          }
        } catch (err) {
          console.warn(`Failed to fetch metrics for ${name}:`, err);
          // No real metrics available - show error state
          metrics[name] = {
            toolCount: undefined,
            tokenUsage: undefined,
            error: true
          };
        }
      }

      return metrics;
  };

  // Initialize nodes from current configuration - Client-specific view
  React.useEffect(() => {
    fetchMetrics(false).then((metrics) => {
      // Only show servers for the active client - NO FAKE DATA
      const serverNodes: Node[] = Object.entries(servers).map(([name, server], index) => {
        return {
          id: `server-${name}`,
          type: 'server',
          position: { x: 200, y: 100 + index * 100 },
          data: {
            label: name,
            server,
            icon: '📦',
            tools: metrics[name]?.loading ? '—' : (typeof metrics[name]?.toolCount === 'number' ? metrics[name].toolCount : '—'),  // Show actual value or dash
            tokens: metrics[name]?.loading ? '—' : (typeof metrics[name]?.tokenUsage === 'number' ? metrics[name].tokenUsage : '—'), // Show actual value or dash
            loading: metrics[name]?.loading === true, // Explicit loading check
            error: metrics[name]?.error === true // Explicit error check, no fallback
          },
        };
      });

      // Show the active client as the main node
      const activeClientData = clients.find((c: any) => c.name === activeClient);
      const clientNodes: Node[] = activeClientData ? [{
        id: `client-${activeClient}`,
        type: 'client',
        position: { x: 600, y: 250 },
        data: {
          label: (activeClientData as any).displayName || activeClientData.name,
          client: activeClientData,
          icon: '🤖',
          serverCount: clientServerCounts[activeClient as string] || Object.keys(servers).length,
          maxServers: 20,
          isMain: true
        },
      }] : [];

      // Create edges between servers and the active client
      const newEdges: Edge[] = serverNodes.map((serverNode) => ({
        id: `${serverNode.id}-client-${activeClient}`,
        source: serverNode.id,
        target: `client-${activeClient}`,
        type: 'cable',
        animated: true,
        data: {
          tension: 0.5,
          sag: 20,
        }
      }));

      setNodes([...serverNodes, ...clientNodes]);
      setEdges(newEdges);
    });
  }, [servers, clients, activeClient, setNodes, setEdges, clientServerCounts]);

  // Handle connection creation
  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge: Edge = {
        ...params,
        id: `${params.source}-${params.target}`,
        type: 'cable',
        animated: true,
        data: {
          tension: 0.5,
          sag: 20,
        }
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges]
  );

  // Handle keyboard events for delete
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if Delete or Backspace key is pressed
      if (event.key === 'Delete' || event.key === 'Backspace') {
        // Get selected nodes and edges
        const selectedNodes = nodes.filter(node => node.selected);
        const selectedEdges = edges.filter(edge => edge.selected);

        if (selectedNodes.length > 0 || selectedEdges.length > 0) {
          // Prevent default browser behavior
          event.preventDefault();

          // Remove selected nodes
          if (selectedNodes.length > 0) {
            const nodeIdsToRemove = selectedNodes.map(n => n.id);
            setNodes(nds => nds.filter(n => !nodeIdsToRemove.includes(n.id)));

            // Also remove edges connected to deleted nodes
            setEdges(eds => eds.filter(e =>
              !nodeIdsToRemove.includes(e.source) && !nodeIdsToRemove.includes(e.target)
            ));
          }

          // Remove selected edges
          if (selectedEdges.length > 0) {
            const edgeIdsToRemove = selectedEdges.map(e => e.id);
            setEdges(eds => eds.filter(e => !edgeIdsToRemove.includes(e.id)));
          }
        }
      }
    };

    // Add event listener
    window.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [nodes, edges, setNodes, setEdges]);

  // Track metrics fetch queue to prevent overwhelming the system
  const metricsQueueRef = React.useRef<Set<string>>(new Set());
  const fetchingRef = React.useRef<boolean>(false);

  // Fetch real metrics for server nodes that are loading with rate limiting
  React.useEffect(() => {
    const fetchServerMetrics = async () => {
      if (fetchingRef.current) return; // Already fetching, skip

      const loadingNodes = nodes.filter(n =>
        n.type === 'server' &&
        n.data.loading &&
        !n.data.metricsLoaded &&
        !metricsQueueRef.current.has(n.id)
      );

      if (loadingNodes.length === 0) return;

      fetchingRef.current = true;

      // Process nodes with rate limiting - max 2 at a time
      const batchSize = 2;
      for (let i = 0; i < loadingNodes.length; i += batchSize) {
        const batch = loadingNodes.slice(i, i + batchSize);

        await Promise.all(batch.map(async (node) => {
          // Mark as being processed
          metricsQueueRef.current.add(node.id);

          try {
            const cacheKey = `${node.data.label}-${JSON.stringify(node.data.server)}`;
            const cached = metricsCache.current.get(cacheKey);

            // Check cache first
            let serverMetrics;
            if (cached && (Date.now() - cached.timestamp < METRICS_CACHE_TTL)) {
              console.log(`Using cached metrics for server: ${node.data.label}`);
              serverMetrics = cached.data;
            } else {
              console.log(`Fetching fresh metrics for server: ${node.data.label}`);
              serverMetrics = await (window as any).electronAPI?.getServerMetrics?.(
                node.data.label,
                node.data.server
              );
              // Cache the result
              if (serverMetrics && typeof serverMetrics.toolCount === 'number') {
                metricsCache.current.set(cacheKey, {
                  data: serverMetrics,
                  timestamp: Date.now()
                });
              }
            }

            if (serverMetrics && typeof serverMetrics.toolCount === 'number') {
              setNodes(nds => nds.map(n => {
                if (n.id === node.id) {
                  return {
                    ...n,
                    data: {
                      ...n.data,
                      tools: serverMetrics.toolCount,
                      tokens: serverMetrics.tokenUsage ?? 0,
                      loading: false,
                      metricsLoaded: true,
                      metricsTimestamp: Date.now()
                    }
                  };
                }
                return n;
              }));
            } else {
              // No valid metrics returned, keep placeholders
              setNodes(nds => nds.map(n => {
                if (n.id === node.id) {
                  return {
                    ...n,
                    data: {
                      ...n.data,
                      loading: false,
                      metricsLoaded: false
                    }
                  };
                }
                return n;
              }));
            }
          } catch (err) {
            console.warn(`Failed to fetch metrics for ${node.data.label}:`, err);
            // Keep placeholder on error but mark as not loading
            setNodes(nds => nds.map(n => {
              if (n.id === node.id) {
                return {
                  ...n,
                  data: {
                    ...n.data,
                    loading: false,
                    metricsLoaded: false
                  }
                };
              }
              return n;
            }));
          } finally {
            // Remove from processing queue
            metricsQueueRef.current.delete(node.id);
          }
        }));

        // Add delay between batches to prevent overwhelming the system
        if (i + batchSize < loadingNodes.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      fetchingRef.current = false;
    };

    // Only run if there are loading nodes
    const hasLoadingNodes = nodes.some(n =>
      n.type === 'server' &&
      n.data.loading &&
      !n.data.metricsLoaded
    );

    if (hasLoadingNodes) {
      // Debounce the fetch to avoid rapid repeated calls
      const timer = setTimeout(fetchServerMetrics, 100);
      return () => clearTimeout(timer);
    }
  }, [nodes, setNodes]);

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setIsDragging(true);

    const itemType = active.id.toString().startsWith('client-') ? 'client' : 'server';
    setDraggedItem({
      id: active.id as string,
      type: itemType,
      data: active.data.current
    });
  };

  // Handle drag over
  const handleDragOver = (event: DragOverEvent) => {
    // This allows us to track when dragging over the canvas
    const { over, active } = event;
    if (over?.id === 'react-flow-wrapper') {
      // Visual feedback when over canvas
      console.log('Dragging over canvas', { activeId: active.id, overId: over.id });
    } else if (over) {
      console.log('Dragging over element', { activeId: active.id, overId: over.id });
    }
  };

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const wasJustDragging = isDragging; // Store the value before resetting
    setIsDragging(false);

    console.log('Drag ended', { activeId: active.id, overId: over?.id, wasJustDragging });

    // Handle client drag
    if (active.id.toString().startsWith('client-')) {
      const clientName = active.id.toString().replace('client-', '');
      const clientData = clients.find((c: any) => c.name === clientName);

      console.log('Processing client drop', {
        clientName,
        hasClientData: !!clientData,
        isActiveClient: clientName === activeClient,
        overId: over?.id,
        wasJustDragging
      });

      // Add to canvas if:
      // 1. We have client data
      // 2. It's not the currently active client
      // 3. Either dropped on canvas OR was just dragging (handles React Flow not registering drops)
      if (clientData && clientName !== activeClient && (!over || over?.id === 'react-flow-wrapper' || wasJustDragging)) {
        console.log('Adding client to canvas:', clientName);

        // Add additional client node for multi-client configuration
        const newClientNode: Node = {
          id: `client-extra-${clientName}`,
          type: 'client',
          position: { x: 800, y: 100 + nodes.filter(n => n.type === 'client').length * 150 },
          data: {
            label: (clientData as any).displayName || clientData.name,
            client: clientData,
            icon: '🤖',
            serverCount: clientServerCounts[clientName] ?? 0,
            maxServers: 20,
            isMain: false
          },
        };
        setNodes((nds) => {
          console.log('Current nodes:', nds.length, 'Adding new client node');
          return [...nds, newClientNode];
        });
      } else {
        console.log('Client not added to canvas - conditions not met');
      }
      setDraggedItem(null);
      return;
    }

    // Handle server drag
    if (active.id.toString().startsWith('server-')) {
      const dragData = active.data.current as any;
      const serverName = dragData?.name || active.id.toString().replace('server-', '');
      const serverData = dragData?.server;
      const serverNodeId = `server-node-${serverName}`;

      // Check if dropped on a client node
      const isClientDrop = over && (over.id.toString().startsWith('client-') || over.id.toString().startsWith('client-extra-'));

      // If no specific drop target (over is null) or dropped on canvas, add server to canvas
      // This handles the case where React Flow might not register as a drop target
      if (!over || over.id === 'react-flow-wrapper' || (!isClientDrop && wasJustDragging)) {
        console.log('Adding server to canvas', { over: over?.id, serverName });

        // Check if server already exists on the canvas
        const serverExists = nodes.some(n => n.id === serverNodeId);

        // Check if server is already in the configuration
        const serverInConfig = Object.keys(servers).some(name =>
          name.toLowerCase() === serverName.toLowerCase()
        );

        if (serverExists) {
          console.log('Server already exists on canvas:', serverName);
          setDraggedItem(null);
          return;
        }

        if (serverInConfig) {
          console.log('Server already in configuration:', serverName);
          // Optionally show a notification to the user
          setDraggedItem(null);
          return;
        }

        if (!serverExists && !serverInConfig) {
          const nodeIndex = nodes.filter(n => n.type === 'server').length;

          // No fake metrics - use zeros until real data loads
          const initialTools = 0;
          const initialTokens = 0;

          // Start with unique generated values
          const newServerNode: Node = {
            id: serverNodeId,
            type: 'server',
            position: { x: 350, y: 200 + nodeIndex * 100 },
            data: {
              label: serverName,
              server: serverData,
              icon: dragData?.icon || '📦',
              tools: initialTools,
              tokens: initialTokens,
              loading: true,
              metricsLoaded: false,
              onRefresh: () => {
                // Reset loading state to trigger re-fetch
                setNodes(nds => nds.map(n => {
                  if (n.id === serverNodeId) {
                    return {
                      ...n,
                      data: {
                        ...n.data,
                        loading: true,
                        metricsLoaded: false
                      }
                    };
                  }
                  return n;
                }));
              }
            },
          };
          setNodes((nds) => [...nds, newServerNode]);

          // Automatically create edge to active client if exists
          const activeClientNode = nodes.find(n => n.id === `client-${activeClient}`);
          if (activeClientNode) {
            const newEdge: Edge = {
              id: `${serverNodeId}-client-${activeClient}`,
              source: serverNodeId,
              target: `client-${activeClient}`,
              type: 'cable',
              animated: true,
              data: {
                tension: 0.5,
                sag: 20,
              }
            };
            setEdges((eds) => [...eds, newEdge]);
          }

          // Save to configuration if auto-save is enabled
          if (autoSave && activeClient && activeClient !== 'catalog' && serverData) {
            const serverConfig = {
              ...serverData,
              name: serverName
            };
            addServer(serverName, serverConfig);
          }
        }
      }
      // Dropped specifically on a client
      else if (isClientDrop) {
        const targetClientId = over.id.toString();

        // Check if server already exists on the canvas
        const serverExists = nodes.some(n => n.id === serverNodeId);

        // Check if server is already in the configuration
        const serverInConfig = Object.keys(servers).some(name =>
          name.toLowerCase() === serverName.toLowerCase()
        );

        if (serverInConfig) {
          console.log('Server already in configuration, cannot add duplicate:', serverName);
          setDraggedItem(null);
          return;
        }

        // Add server node if it doesn't exist
        if (!serverExists) {
          // No fake metrics - use zeros until real data loads
          const initialTools = 0;
          const initialTokens = 0;

          // Start with unique generated values
          const newServerNode: Node = {
            id: serverNodeId,
            type: 'server',
            position: { x: 350, y: 200 + nodes.filter(n => n.type === 'server').length * 100 },
            data: {
              label: serverName,
              server: serverData,
              icon: dragData?.icon || '📦',
              tools: initialTools,
              tokens: initialTokens,
              loading: true,
              metricsLoaded: false,
              onRefresh: () => {
                // Reset loading state to trigger re-fetch
                setNodes(nds => nds.map(n => {
                  if (n.id === serverNodeId) {
                    return {
                      ...n,
                      data: {
                        ...n.data,
                        loading: true,
                        metricsLoaded: false
                      }
                    };
                  }
                  return n;
                }));
              }
            },
          };
          setNodes((nds) => [...nds, newServerNode]);
        }

        // Create edge between server and client
        const newEdge: Edge = {
          id: `${serverNodeId}-${targetClientId}`,
          source: serverNodeId,
          target: targetClientId,
          type: 'cable',
          animated: true,
          data: {
            tension: 0.5,
            sag: 20,
          }
        };
        setEdges((eds) => [...eds, newEdge]);

        // Save to configuration if auto-save is enabled
        if (autoSave && activeClient && activeClient !== 'catalog' && serverData) {
          const serverConfig = {
            ...serverData,
            name: serverName
          };
          addServer(serverName, serverConfig);
        }
      }
    }

    setDraggedItem(null);
  };

  // Save current configuration
  const handleSaveConfiguration = () => {
    // Save all nodes and edges to the active client's configuration
    const serverNodes = nodes.filter(n => n.type === 'server');
    const clientNodes = nodes.filter(n => n.type === 'client');

    // For each server node, save it to configuration
    serverNodes.forEach(node => {
      const serverName = node.data.label;
      const serverData = node.data.server;
      if (serverData) {
        addServer(serverName, serverData);
      }
    });

    // Multi-client save not yet implemented
    console.log('Configuration saved');
  };

  // Load configuration as JSON for the editor
  const loadConfigurationAsJson = React.useCallback(async () => {
    try {
      if (!activeClient || activeClient === 'catalog') {
        setJsonEditorContent(JSON.stringify({ mcpServers: {} }, null, 2));
        return;
      }

      // Get the current servers configuration
      const config = {
        mcpServers: servers || {}
      };

      const jsonString = JSON.stringify(config, null, 2);
      setJsonEditorContent(jsonString);
      setJsonErrors([]);
    } catch (error) {
      console.error('Failed to load configuration as JSON:', error);
      setJsonErrors(['Failed to load configuration']);
    }
  }, [activeClient, servers]);

  // Track if JSON has unsaved changes
  const [hasUnsavedJsonChanges, setHasUnsavedJsonChanges] = React.useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = React.useState(false);

  // Handle JSON editor changes (validation only, no auto-save)
  const handleJsonChange = React.useCallback((newContent: string) => {
    setJsonEditorContent(newContent);
    setHasUnsavedJsonChanges(true);

    // Validate JSON for error display only
    try {
      JSON.parse(newContent);
      setJsonErrors([]);
    } catch (error: any) {
      setJsonErrors([error.message || 'Invalid JSON']);
    }
  }, []);

  // Save JSON changes explicitly
  const saveJsonChanges = React.useCallback(() => {
    // Only save if valid JSON
    try {
      const parsed = JSON.parse(jsonEditorContent);

      // Update servers if valid
      if (parsed.mcpServers && typeof parsed.mcpServers === 'object') {
        setServers(parsed.mcpServers);
        setHasUnsavedJsonChanges(false);

        // Show success feedback
        setShowSaveSuccess(true);
        console.log('[JsonEditor] Changes saved successfully');

        // Clear success message after 2 seconds
        setTimeout(() => {
          setShowSaveSuccess(false);
        }, 2000);
      }
    } catch (error: any) {
      // Don't save if JSON is invalid
      console.error('[JsonEditor] Cannot save invalid JSON:', error.message);
    }
  }, [jsonEditorContent, setServers]);

  // Handle keyboard shortcuts for JSON editor
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Save on Ctrl+S or Cmd+S when JSON editor is open
      if (showJsonEditor && (e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveJsonChanges();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showJsonEditor, saveJsonChanges]);

  // Toggle JSON editor and load config when opening
  const toggleJsonEditor = React.useCallback(() => {
    const newState = !showJsonEditor;

    // Check for unsaved changes when closing
    if (!newState && hasUnsavedJsonChanges) {
      const confirmClose = window.confirm('You have unsaved changes. Do you want to discard them?');
      if (!confirmClose) {
        return; // Don't close if user cancels
      }
    }

    setShowJsonEditor(newState);
    setHasUnsavedJsonChanges(false);

    if (newState) {
      loadConfigurationAsJson();
    }
  }, [showJsonEditor, hasUnsavedJsonChanges, loadConfigurationAsJson]);

  // Sync servers changes with JSON editor when it's visible
  React.useEffect(() => {
    if (showJsonEditor) {
      loadConfigurationAsJson();
      setHasUnsavedJsonChanges(false); // Reset unsaved changes when loading fresh config
    }
  }, [servers, showJsonEditor]);

  // Handle JSON editor resize
  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingJson) return;

      const container = document.querySelector('.visual-workspace');
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const newHeight = containerRect.bottom - e.clientY;
      if (newHeight > 100 && newHeight < 600) {
        setJsonEditorHeight(newHeight);
      }
    };

    const handleMouseUp = () => {
      setIsResizingJson(false);
    };

    if (isResizingJson) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingJson]);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="visual-workspace flex h-full bg-base-200 relative">
          {/* Left Panel - Server Library */}
          <div className="w-64 bg-base-100 border-r border-base-300 overflow-y-auto flex-shrink-0">
            <ServerLibrary
              key={`server-library-${activeClient}`}
              activeClient={activeClient}
              clientServers={activeClient === 'catalog' ? undefined : Object.keys(servers)}
            />
          </div>

          {/* Center - Canvas */}
          <div className="flex-1 relative overflow-hidden">
            {/* Canvas Header Bar */}
            <div className="absolute top-0 left-0 right-0 bg-base-100 border-b border-base-300 px-3 py-2 z-10 flex items-center justify-between">
              <h2 className="text-sm font-semibold">
                {activeClient ? `${activeClient} Configuration` : 'Select a Client'}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  className={`btn btn-sm btn-ghost ${isRefreshing ? 'loading' : ''}`}
                  onClick={async () => {
                    setIsRefreshing(true);
                    try {
                      const metrics = await fetchMetrics(true);
                      // Update nodes with refreshed metrics
                      setNodes(prevNodes => {
                        return prevNodes.map(node => {
                          if (node.type === 'server' && node.data) {
                            const serverName = (node.data.server && typeof node.data.server === 'object' && 'name' in node.data.server && typeof node.data.server.name === 'string' && node.data.server.name) || node.id.replace('server-', '');
                            const metric = typeof serverName === 'string' ? metrics[serverName] : undefined;
                            if (metric) {
                              return {
                                ...node,
                                data: {
                                  ...node.data,
                                  tools: metric.toolCount ?? 0,
                                  tokens: metric.tokenUsage ?? 0
                                }
                              };
                            }
                          }
                          return node;
                        });
                      });
                    } catch (error) {
                      console.error('Failed to refresh metrics:', error);
                    } finally {
                      setIsRefreshing(false);
                    }
                  }}
                  title="Refresh all metrics"
                  disabled={!activeClient || isRefreshing || showJsonEditor}
                >
                  <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
                  <span className="text-xs">Refresh</span>
                </button>
                <button
                  className={`btn btn-sm btn-ghost ${showJsonEditor ? 'btn-active' : ''}`}
                  onClick={toggleJsonEditor}
                  title="Toggle JSON editor"
                >
                  {showJsonEditor ? <Eye size={14} /> : <Code2 size={14} />}
                  <span className="text-xs">{showJsonEditor ? 'Visual' : 'JSON'}</span>
                </button>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-xs"
                    checked={autoSave}
                    onChange={(e) => setAutoSave(e.target.checked)}
                  />
                  <span>Auto-save</span>
                </label>
                {!autoSave && !showJsonEditor && (
                  <button
                    className="btn btn-primary btn-xs"
                    onClick={handleSaveConfiguration}
                  >
                    Save Configuration
                  </button>
                )}
              </div>
            </div>

            <ReactFlowProvider>
              <div
                className={`transition-all duration-300 ${
                  isDragging && isOverCanvas ? 'drop-zone-hover' : ''
                } ${
                  isDragging && !isOverCanvas ? 'drop-zone-active' : ''
                }`}
                id="react-flow-wrapper"
                ref={setCanvasDropRef}
                style={{
                  position: 'absolute',
                  top: '40px',
                  left: 0,
                  right: 0,
                  bottom: showJsonEditor
                    ? `${(isJsonEditorCollapsed ? 32 : jsonEditorHeight) + (showInsights ? 150 : 0)}px`
                    : showInsights ? '150px' : '0',
                  width: '100%',
                  height: showJsonEditor
                    ? `calc(100% - ${40 + (isJsonEditorCollapsed ? 32 : jsonEditorHeight) + (showInsights ? 150 : 0)}px)`
                    : `calc(100% - ${40 + (showInsights ? 150 : 0)}px)`
                }}
              >
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={onConnect}
                  nodeTypes={nodeTypes}
                  edgeTypes={edgeTypes}
                  fitView
                  className="bg-base-200"
                  proOptions={{ hideAttribution: true }}
                >
                <Background color="#4a5568" gap={20} />
                <Controls
                  className="!bg-base-300 !border-base-content/20 !shadow-lg [&>button]:!bg-base-300 [&>button]:!border-base-content/20 [&>button:hover]:!bg-base-100"
                />
                <MiniMap
                  className="!bg-base-300 !border-base-content/20"
                  maskColor="rgba(0, 0, 0, 0.7)"
                  nodeColor={(node) => {
                    if (node.type === 'server') return '#3B82F6';
                    if (node.type === 'client') return '#10B981';
                    return '#6B7280';
                  }}
                  pannable
                  zoomable
                />
                </ReactFlow>
              </div>
            </ReactFlowProvider>

            {/* Removed ConnectionRenderer - was causing white rectangle */}

            {/* JSON Editor Panel - Resizable split panel */}
            {showJsonEditor && (
              <>
                {/* Collapsed JSON Editor */}
                {isJsonEditorCollapsed ? (
                  <div
                    className="absolute left-0 right-0 bg-base-100 border-t border-base-300 z-20"
                    style={{ bottom: showInsights ? '150px' : '0' }}
                  >
                    <div
                      className="flex items-center justify-between px-4 py-1 cursor-pointer hover:bg-base-200"
                      onClick={() => setIsJsonEditorCollapsed(false)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">JSON Configuration</span>
                        {hasUnsavedJsonChanges && (
                          <span className="text-xs text-warning">● Unsaved</span>
                        )}
                      </div>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </div>
                  </div>
                ) : (
                  /* Expanded JSON Editor */
                  <div
                    className="absolute left-0 right-0 bg-base-100 border-t border-base-300 z-20"
                    style={{
                      bottom: showInsights ? '150px' : '0',
                      height: `${jsonEditorHeight}px`
                    }}
                  >
                {/* Resize Handle */}
                <div
                  className="h-1 bg-base-300 hover:bg-primary cursor-ns-resize transition-colors"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setIsResizingJson(true);
                  }}
                />

                {/* JSON Editor Header Bar */}
                <div className="flex items-center justify-between px-4 py-2 bg-base-200 border-b border-base-300">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">JSON Configuration</span>
                    {showSaveSuccess ? (
                      <span className="text-xs text-success">✓ Saved successfully</span>
                    ) : hasUnsavedJsonChanges ? (
                      <span className="text-xs text-warning">● Unsaved changes</span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className={`btn btn-sm ${
                        showSaveSuccess ? 'btn-success' :
                        hasUnsavedJsonChanges ? 'btn-primary' : 'btn-disabled'
                      }`}
                      onClick={saveJsonChanges}
                      disabled={(!hasUnsavedJsonChanges || jsonErrors.length > 0) && !showSaveSuccess}
                      title="Save changes (Ctrl+S)"
                    >
                      {showSaveSuccess ? '✓ Saved' : 'Save'}
                    </button>
                    <span className="text-xs text-base-content/60">
                      Ctrl+S to save
                    </span>
                    <button
                      className="btn btn-ghost btn-xs"
                      onClick={() => setIsJsonEditorCollapsed(true)}
                      title="Minimize JSON editor"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* JSON Editor Container */}
                <div className="h-full overflow-hidden" style={{ paddingTop: '4px', paddingBottom: '40px' }}>
                  <JsonEditor
                    value={jsonEditorContent}
                    onChange={handleJsonChange}
                    errors={jsonErrors}
                    readonly={false}
                    height={jsonEditorHeight - 50} // Account for header bar
                    theme={theme}
                  />
                </div>
                  </div>
                )}
              </>
            )}

            {/* Bottom Panel - Insights (Within canvas area) */}
            {showInsights && <InsightsPanel />}
          </div>

          {/* Right Panel - Client Dock */}
          <div className="w-64 bg-base-100 border-l border-base-300 overflow-y-auto flex-shrink-0">
            <ClientDock />
          </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {draggedItem && (
            <div className="p-2 bg-base-100 rounded shadow-xl border border-primary">
              <div className="font-semibold text-xs">
                {draggedItem.type === 'client'
                  ? draggedItem.data?.client?.displayName || draggedItem.id.replace('client-', '')
                  : draggedItem.id.replace('server-', '')}
              </div>
              <div className="text-xs text-base-content/60">
                {draggedItem.type === 'client'
                  ? 'Drop on canvas for multi-client'
                  : 'Drop on canvas or client'}
              </div>
            </div>
          )}
        </DragOverlay>
      </div>
    </DndContext>
  );
};