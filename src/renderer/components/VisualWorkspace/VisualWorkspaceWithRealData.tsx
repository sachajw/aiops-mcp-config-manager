import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
import { InsightsPanel } from './InsightsPanel';
import { ServerNode } from './nodes/ServerNode';
import { ClientNode } from './nodes/ClientNode';
import { CableEdge } from './edges/CableEdge';

// Import real data hooks - NO MOCK DATA
import { useClients } from '@/renderer/hooks/useClients';
import { useServers } from '@/renderer/hooks/useServers';
import { useDiscovery } from '@/renderer/hooks/useDiscovery';

// Define node types for React Flow
const nodeTypes = {
  server: ServerNode as any,
  client: ClientNode as any,
};

// Define edge types for React Flow
const edgeTypes = {
  cable: CableEdge as any,
};

export const VisualWorkspaceWithRealData: React.FC = () => {
  // Use REAL data from hooks - NO MOCK DATA
  const { clients, loading: clientsLoading, error: clientsError } = useClients();
  const { servers, loading: serversLoading, error: serversError, getServerMetrics } = useServers();
  const { servers: discoveryServers, categories } = useDiscovery();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [activeClientId, setActiveClientId] = useState<string>('');
  const [draggedServer, setDraggedServer] = useState<any>(null);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);

  // Initialize nodes from REAL client and server data
  useEffect(() => {
    const clientNodes: Node[] = clients.map((client, index) => ({
      id: `client-${client.id}`,
      type: 'client',
      position: { x: 50, y: 100 + index * 150 },
      data: {
        label: client.name,
        icon: '💻',
        serverCount: 0, // Will be calculated from real servers
        client: client
      }
    }));

    const serverNodes: Node[] = servers.map((server, index) => ({
      id: `server-${server.name}`,
      type: 'server',
      position: { x: 350, y: 100 + index * 100 },
      data: {
        label: server.name,
        server: server,
        icon: '📦',
        tools: 0, // Will be loaded from real metrics
        tokens: 0, // Will be loaded from real metrics
        loading: true,
        metricsLoaded: false
      }
    }));

    (setNodes as any)([...clientNodes, ...serverNodes]);
  }, [clients, servers]);

  // Load REAL metrics for each server
  useEffect(() => {
    const loadMetrics = async () => {
      for (const server of servers) {
        try {
          const metrics = await getServerMetrics(server.name);

          (setNodes as any)((nds: any) => nds.map((n: any) => {
            if (n.id === `server-${server.name}`) {
              return {
                ...n,
                data: {
                  ...n.data,
                  tools: metrics?.toolCount ?? 0,
                  tokens: metrics?.tokenUsage ?? 0,
                  loading: false,
                  metricsLoaded: true,
                  metricsTimestamp: Date.now()
                }
              };
            }
            return n;
          }));
        } catch (err) {
          console.error(`Failed to load metrics for server ${server.name}:`, err);
          // On error, show zeros instead of placeholders
          (setNodes as any)((nds: any) => nds.map((n: any) => {
            if (n.id === `server-${server.name}`) {
              return {
                ...n,
                data: {
                  ...n.data,
                  tools: 0,
                  tokens: 0,
                  loading: false,
                  metricsLoaded: false
                }
              };
            }
            return n;
          }));
        }
      }
    };

    if (servers.length > 0) {
      loadMetrics();
    }
  }, [servers, getServerMetrics]);

  // Create edges based on real client-server relationships
  useEffect(() => {
    const newEdges: Edge[] = [];

    // For each client, create edges to its configured servers
    clients.forEach(client => {
      const clientServers = servers.filter(s => (s as any).clientId === client.id);
      clientServers.forEach(server => {
        newEdges.push({
          id: `server-${server.name}-client-${client.id}`,
          source: `server-${server.name}`,
          target: `client-${client.id}`,
          type: 'cable',
          animated: (server as any).isConnected === true,
          data: {
            tension: 0.5,
            sag: 20,
          }
        });
      });
    });

    setEdges(newEdges);
  }, [clients, servers]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setDraggedServer(event.active.data.current);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && over.id === 'canvas') {
      const dragData = active.data.current;
      const serverName = dragData?.name || 'New Server';

      // Add real server, not mock
      console.log('Would add server:', serverName);
      // Server addition through API not yet implemented
    }

    setDraggedServer(null);
  }, []);

  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge({ ...params, type: 'cable', animated: true }, eds));
  }, [setEdges]);

  // Loading state
  if (clientsLoading || serversLoading) {
    return (
      <div className="visual-workspace">
        <div className="loading-state">
          Loading real data...
        </div>
      </div>
    );
  }

  // Error state
  if (clientsError || serversError) {
    return (
      <div className="visual-workspace">
        <div className="error-state">
          Error loading data: {clientsError?.message || serversError?.message}
        </div>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="visual-workspace">
        <ServerLibrary />

        <ReactFlowProvider>
          <div className="canvas-container" id="canvas">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              fitView
              attributionPosition="bottom-left"
            >
              <Background color="#aaa" gap={16} />
              <Controls />
              <MiniMap />
            </ReactFlow>
          </div>
        </ReactFlowProvider>

        <ClientDock />

        <InsightsPanel />

        <DragOverlay>
          {draggedServer ? (
            <div className="drag-preview">
              <span className="drag-icon">{draggedServer.icon}</span>
              <span className="drag-label">{draggedServer.name}</span>
            </div>
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
};

// Wrapper to provide React Flow context
export const VisualWorkspace: React.FC = () => {
  return (
    <ReactFlowProvider>
      <VisualWorkspaceWithRealData />
    </ReactFlowProvider>
  );
};