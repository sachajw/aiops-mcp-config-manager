import React, { useState, useCallback, useMemo } from 'react';
import { ReactFlow, Background, Controls, MiniMap, ReactFlowProvider, Node, Edge, Connection, useNodesState, useEdgesState, addEdge } from '@xyflow/react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, useDroppable, DragOverEvent } from '@dnd-kit/core';
import '@xyflow/react/dist/style.css';
import './VisualWorkspace.css';

import { ServerLibrary } from './ServerLibrary';
import { ClientDock } from './ClientDock';
// Removed ConnectionRenderer import - was causing white rectangle
import { InsightsPanel } from './InsightsPanel';
import { ServerNode } from './nodes/ServerNode';
import { ClientNode } from './nodes/ClientNode';
import { CableEdge } from './edges/CableEdge';
import { useConfigStore } from '@/renderer/store/simplifiedStore';
import { MCPServer } from '@/main/services/UnifiedConfigService';

// Define node types for React Flow
const nodeTypes = {
  server: ServerNode,
  client: ClientNode,
};

// Define edge types for React Flow
const edgeTypes = {
  cable: CableEdge,
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
    setActiveClient
  } = useConfigStore() as any;

  // Canvas drop zone ref
  const { setNodeRef: setCanvasDropRef, isOver: isOverCanvas } = useDroppable({
    id: 'react-flow-wrapper',
    data: { type: 'canvas' }
  });

  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [draggedItem, setDraggedItem] = useState<{ id: string; type: string; data: any } | null>(null);
  const [autoSave, setAutoSave] = useState(true);

  // Panel visibility
  const [showInsights, setShowInsights] = useState(true);

  // Initialize nodes from current configuration - Client-specific view
  React.useEffect(() => {
    // Only show servers for the active client
    const serverNodes: Node[] = Object.entries(servers).map(([name, server], index) => ({
      id: `server-${name}`,
      type: 'server',
      position: { x: 200, y: 100 + index * 100 },
      data: {
        label: name,
        server,
        icon: '📦',
        tools: 15, // TODO: Get actual tool count
        tokens: 2500 // TODO: Calculate actual tokens
      },
    }));

    // Show the active client as the main node
    const activeClientData = clients.find((c: any) => c.name === activeClient);
    const clientNodes: Node[] = activeClientData ? [{
      id: `client-${activeClient}`,
      type: 'client',
      position: { x: 600, y: 250 },
      data: {
        label: activeClientData.displayName || activeClientData.name,
        client: activeClientData,
        icon: '🤖',
        serverCount: Object.keys(servers).length,
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
  }, [servers, clients, activeClient, setNodes, setEdges]);

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
    const { over } = event;
    if (over?.id === 'react-flow-wrapper') {
      // Visual feedback when over canvas
      console.log('Dragging over canvas');
    }
  };

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setIsDragging(false);

    console.log('Drag ended', { activeId: active.id, overId: over?.id });

    // Handle client drag
    if (active.id.toString().startsWith('client-')) {
      const clientName = active.id.toString().replace('client-', '');
      const clientData = clients.find((c: any) => c.name === clientName);

      // Only add to canvas if it's not the active client and dropped on canvas
      if (clientData && clientName !== activeClient && over?.id === 'react-flow-wrapper') {
        // Add additional client node for multi-client configuration
        const newClientNode: Node = {
          id: `client-extra-${clientName}`,
          type: 'client',
          position: { x: 800, y: 100 + nodes.filter(n => n.type === 'client').length * 150 },
          data: {
            label: clientData.displayName || clientData.name,
            client: clientData,
            icon: '🤖',
            serverCount: 0,
            isMain: false
          },
        };
        setNodes((nds) => [...nds, newClientNode]);
      }
      setDraggedItem(null);
      return;
    }

    // Handle server drag
    if (active.id.toString().startsWith('server-')) {
      const serverData = active.data.current as any;
      const serverName = active.id.toString().replace('server-', '');
      const serverNodeId = `server-node-${serverName}`;

      if (over) {
        // Dropped on client
        if (over.id.toString().startsWith('client-') || over.id.toString().startsWith('client-extra-')) {
          const targetClientId = over.id.toString();

          // Add server node if it doesn't exist
          const serverExists = nodes.some(n => n.id === serverNodeId);
          if (!serverExists) {
            const newServerNode: Node = {
              id: serverNodeId,
              type: 'server',
              position: { x: 350, y: 200 + nodes.filter(n => n.type === 'server').length * 100 },
              data: {
                label: serverName,
                server: serverData,
                tools: serverData.tools || 10,
                tokens: serverData.tokens || 1000
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
          if (autoSave && activeClient && activeClient !== 'catalog') {
            const serverConfig = {
              ...serverData,
              name: serverName
            };
            addServer(serverName, serverConfig);
          }
        }
        // Dropped on canvas
        else if (over.id === 'react-flow-wrapper') {
          // Check if server already exists
          const serverExists = nodes.some(n => n.id === serverNodeId);
          if (!serverExists) {
            const newServerNode: Node = {
              id: serverNodeId,
              type: 'server',
              position: { x: 350, y: 200 + nodes.filter(n => n.type === 'server').length * 100 },
              data: {
                label: serverName,
                server: serverData,
                tools: serverData.tools || 10,
                tokens: serverData.tokens || 1000
              },
            };
            setNodes((nds) => [...nds, newServerNode]);

            // Save to configuration if auto-save is enabled
            if (autoSave && activeClient && activeClient !== 'catalog') {
              const serverConfig = {
                ...serverData,
                name: serverName
              };
              addServer(serverName, serverConfig);
            }
          }
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

    // TODO: Save multi-client configurations
    console.log('Configuration saved');
  };

  return (
    <DndContext onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
      <div className="visual-workspace flex h-full bg-base-200 relative">
          {/* Left Panel - Server Library */}
          <div className="w-64 bg-base-100 border-r border-base-300 overflow-y-auto flex-shrink-0">
            <ServerLibrary />
          </div>

          {/* Center - Canvas */}
          <div className="flex-1 relative overflow-hidden">
            {/* Canvas Header Bar */}
            <div className="absolute top-0 left-0 right-0 bg-base-100 border-b border-base-300 px-3 py-2 z-10 flex items-center justify-between">
              <h2 className="text-sm font-semibold">
                {activeClient ? `${activeClient} Configuration` : 'Select a Client'}
              </h2>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-xs"
                    checked={autoSave}
                    onChange={(e) => setAutoSave(e.target.checked)}
                  />
                  <span>Auto-save</span>
                </label>
                {!autoSave && (
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
              <div className="h-full w-full pt-10" id="react-flow-wrapper" ref={setCanvasDropRef}>
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