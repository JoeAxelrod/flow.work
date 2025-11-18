'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';

import ReactFlow, {
  addEdge,
  Background,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  MarkerType,
  ConnectionMode,            // ⬅️ add this
} from 'reactflow';

import 'reactflow/dist/style.css';
import { getWorkflow, importWorkflow } from '../../../api-client';
import { NodeConfig, EdgeConfig, WorkflowData } from './types';
import {
  nodesToFlowNodes,
  edgesToFlowEdges,
  generateNodeId,
  calculateNewNodePosition,
  createNodeFromConfig,
  createWorkflowDefinition,
  updateEdgeWithConfig,
  updateNodeFromConfig,
} from './helpers';
import { NodeModal } from './NodeModal';
import { EdgeModal } from './EdgeModal';
import { StationNode } from './StationNode';
import { WorkflowEditorProvider } from './WorkflowEditorContext';

// Node and edge types outside component
const nodeTypes = {
  node: StationNode,
};
const edgeTypes = {};

export default function WorkflowEditorPage() {
  const params = useParams();
  const workflowId = params.id as string;

  // State
  const [workflowData, setWorkflowData] = useState<WorkflowData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddNodeModal, setShowAddNodeModal] = useState(false);
  const [newNodeConfig, setNewNodeConfig] = useState<NodeConfig>({
    name: '',
    kind: 'noop',
    data: {},
  });
  const [editingEdge, setEditingEdge] = useState<Edge | null>(null);
  const [edgeConfig, setEdgeConfig] = useState<EdgeConfig>({
    type: 'normal',
    condition: '',
  });
  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [nodeConfig, setNodeConfig] = useState<NodeConfig>({
    name: '',
    kind: 'noop',
    data: {},
  });

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  // Track the node where connection started to fix source/target swap issue
  const connectionStartNodeId = useRef<string | null>(null);

  // Fetch workflow
  const fetchWorkflow = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getWorkflow(workflowId);
      setWorkflowData(data);
      console.log(data)

      const flowNodes = nodesToFlowNodes(data.nodes || data.stations || []);
      const flowEdges = edgesToFlowEdges(data.edges);

      setNodes(flowNodes);
      setEdges(flowEdges);
    } catch (err: any) {
      setError(err.message || 'Failed to load workflow');
      console.error('Error fetching workflow:', err);
    } finally {
      setLoading(false);
    }
  }, [workflowId, setNodes, setEdges]);

  useEffect(() => {
    fetchWorkflow();
  }, [fetchWorkflow]);

  // Listen for edit and delete node events from custom node component
  useEffect(() => {
    const handleEditNode = (event: CustomEvent) => {
      const nodeId = event.detail.nodeId;
      const node = nodes.find((n) => n.id === nodeId);
      if (node) {
        setEditingNode(nodeId);
        setNodeConfig({
          name: node.data.label || '',
          kind: node.data.kind || 'noop',
          data: node.data.data || {},
        });
      }
    };

    const handleDeleteNode = (event: CustomEvent) => {
      const nodeId = event.detail.nodeId;
      // Delete the node
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      // Delete all edges connected to this node
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    };

    window.addEventListener('editNode' as any, handleEditNode);
    window.addEventListener('deleteNode' as any, handleDeleteNode);
    return () => {
      window.removeEventListener('editNode' as any, handleEditNode);
      window.removeEventListener('deleteNode' as any, handleDeleteNode);
    };
  }, [nodes, setNodes, setEdges]);

  // Handle node connection
  const onConnect = useCallback(
    (params: Connection) => {
      console.log('[StationNode] ReactFlow onConnect Event:', params);
      console.log('[StationNode] Connection start node ID:', connectionStartNodeId.current);
      
      if (!params.source || !params.target) {
        connectionStartNodeId.current = null;
        return;
      }
      
      // Fix source/target swap: if connection started from a node, that node should be the source
      let correctedParams = { ...params };
      if (connectionStartNodeId.current) {
        // If ReactFlow swapped source/target, correct it
        // The node where connection started should always be the source
        if (connectionStartNodeId.current === params.target) {
          // Connection started from what ReactFlow thinks is the target, so swap them
          correctedParams = {
            ...params,
            source: params.target,
            target: params.source,
            sourceHandle: params.targetHandle,
            targetHandle: params.sourceHandle,
          };
          console.log('[StationNode] Swapped source/target. Corrected params:', correctedParams);
        } else if (connectionStartNodeId.current === params.source) {
          // Connection started from source - this is correct, no swap needed
          console.log('[StationNode] Source/target already correct');
        } else {
          // Edge case: connection start node doesn't match either source or target
          console.warn('[StationNode] Connection start node does not match source or target!', {
            startNode: connectionStartNodeId.current,
            source: params.source,
            target: params.target,
          });
        }
        // Reset the tracking
        connectionStartNodeId.current = null;
      }
      
      // Prevent connections to/from hook nodes
      const sourceNode = nodes.find((n) => n.id === correctedParams.source);
      const targetNode = nodes.find((n) => n.id === correctedParams.target);

      console.log(1)
      
      if (sourceNode?.data.kind === 'hook' || targetNode?.data.kind === 'hook') {
        alert('Hook nodes cannot have edges connected to them');
        return;
      }
      
      console.log('[StationNode] Final corrected params for edge creation:', correctedParams);
      
      setEdges((eds) => {
        const newEdge = addEdge(
          {
            ...correctedParams,
            markerEnd: {
              type: MarkerType.ArrowClosed,
            },
          },
          eds
        );
        if (newEdge.length > 0) {
          const lastEdge = newEdge[newEdge.length - 1];
          lastEdge.data = { type: 'normal' };
        }
        return newEdge;
      });
    },
    [nodes, setEdges]
  );

  // Handle connection start
  const onConnectStart = useCallback((event: React.MouseEvent | React.TouchEvent, params: { nodeId: string | null; handleId: string | null; handleType: string | null }) => {
    console.log('[StationNode] ReactFlow onConnectStart Event:', { event, params });
    // Track which node the connection started from
    connectionStartNodeId.current = params.nodeId || null;
  }, []);

  // Handle connection end
  const onConnectEnd = useCallback((event: MouseEvent | TouchEvent) => {
    console.log('[StationNode] ReactFlow onConnectEnd Event:', event);
    // Reset connection start tracking if connection was cancelled
    connectionStartNodeId.current = null;
  }, []);

  // Handle edge click to edit
  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.stopPropagation();
    setEditingEdge(edge);
    setEdgeConfig({
      type: (edge.data as any)?.type || 'normal',
      condition: (edge.data as any)?.condition || '',
    });
  }, []);

  // Handle edge double click
  const onEdgeDoubleClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    // Edge double click handler
  }, []);

  // Handle edge mouse enter
  const onEdgeMouseEnter = useCallback((event: React.MouseEvent, edge: Edge) => {
    // Mouse enter handler (no logging)
  }, []);

  // Handle edge mouse move
  const onEdgeMouseMove = useCallback((event: React.MouseEvent, edge: Edge) => {
    // Mouse move handler (no logging)
  }, []);

  // Handle edge mouse leave
  const onEdgeMouseLeave = useCallback((event: React.MouseEvent, edge: Edge) => {
    // Mouse leave handler (no logging)
  }, []);

  // Handle edge context menu
  const onEdgeContextMenu = useCallback((event: React.MouseEvent, edge: Edge) => {
    // Edge context menu handler
  }, []);

  // Handle edge update
  const onEdgeUpdate = useCallback((oldEdge: Edge, newConnection: Connection) => {
    console.log('[StationNode] ReactFlow onEdgeUpdate Event:', { oldEdge, newConnection });
  }, []);

  // Handle edge update start
  const onEdgeUpdateStart = useCallback((event: React.MouseEvent | React.TouchEvent, edge: Edge) => {
    // Edge update start handler
  }, []);

  // Handle edge update end
  const onEdgeUpdateEnd = useCallback((event: MouseEvent | TouchEvent | null, edge: Edge) => {
    // Edge update end handler
  }, []);


  // Add new node
  const handleAddNode = useCallback(() => {
    const newNodeId = generateNodeId(nodes);
    const position = calculateNewNodePosition(nodes);
    const newNode = createNodeFromConfig(newNodeId, position, newNodeConfig);

    setNodes((nds) => [...nds, newNode]);
    setShowAddNodeModal(false);
    setNewNodeConfig({ name: '', kind: 'noop', data: {} });
  }, [nodes, newNodeConfig, setNodes]);

  // Save edge configuration
  const handleSaveEdge = useCallback(() => {
    if (!editingEdge) return;

    setEdges((eds) =>
      eds.map((e) => (e.id === editingEdge.id ? updateEdgeWithConfig(e, edgeConfig) : e))
    );

    setEditingEdge(null);
    setEdgeConfig({ type: 'normal', condition: '' });
  }, [editingEdge, edgeConfig, setEdges]);

  // Delete edge
  const handleDeleteEdge = useCallback(() => {
    if (!editingEdge) return;

    setEdges((eds) => eds.filter((e) => e.id !== editingEdge.id));
    setEditingEdge(null);
    setEdgeConfig({ type: 'normal', condition: '' });
  }, [editingEdge, setEdges]);

  // Save node configuration
  const handleSaveNode = useCallback(() => {
    if (!editingNode) return;

    setNodes((nds) =>
      nds.map((n) => (n.id === editingNode ? updateNodeFromConfig(n, nodeConfig) : n))
    );

    setEditingNode(null);
    setNodeConfig({ name: '', kind: 'noop', data: {} });
  }, [editingNode, nodeConfig, setNodes]);

  // Save workflow
  const save = useCallback(async () => {
    if (!workflowData) return;

    const def = createWorkflowDefinition(
      workflowData.workflow.id,
      workflowData.workflow.name,
      nodes,
      edges
    );
    const result = await importWorkflow(def);
    
    // Update node IDs with database-generated IDs if mapping provided
    if (result.nodeIdMap || result.stationIdMap) {
      const idMap = (result.nodeIdMap || result.stationIdMap) as Record<string, string>;
      setNodes((nds) =>
        nds.map((node) => {
          const newId = idMap[node.id] || node.id;
          if (newId !== node.id) {
            return { ...node, id: newId };
          }
          return node;
        })
      );
      setEdges((eds) =>
        eds.map((edge) => {
          const newSource = idMap[edge.source] || edge.source;
          const newTarget = idMap[edge.target] || edge.target;
          if (newSource !== edge.source || newTarget !== edge.target) {
            return { ...edge, source: newSource, target: newTarget };
          }
          return edge;
        })
      );
    }
    
    alert('Workflow saved!');
  }, [workflowData, nodes, edges, setNodes, setEdges]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Loading workflow...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg">{error}</p>
          <button
            onClick={fetchWorkflow}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <WorkflowEditorProvider nodes={nodes}>
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div
          style={{
            padding: 8,
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            background: '#f9fafb',
            borderBottom: '1px solid #e5e7eb',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>
            {workflowData?.workflow?.name || 'Workflow'}
          </h2>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button
              onClick={() => setShowAddNodeModal(true)}
              style={{
                padding: '8px 16px',
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Add Node
            </button>
            <button
              onClick={save}
              style={{
                padding: '8px 16px',
                background: '#4f46e5',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Save
            </button>
          </div>
        </div>

        {/* ReactFlow Canvas */}
        <div style={{ flex: 1 }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onConnectStart={onConnectStart}
            onConnectEnd={onConnectEnd}
            onEdgeClick={onEdgeClick}
            onEdgeDoubleClick={onEdgeDoubleClick}
            onEdgeMouseEnter={onEdgeMouseEnter}
            onEdgeMouseMove={onEdgeMouseMove}
            onEdgeMouseLeave={onEdgeMouseLeave}
            onEdgeContextMenu={onEdgeContextMenu}
            onEdgeUpdate={onEdgeUpdate}
            onEdgeUpdateStart={onEdgeUpdateStart}
            onEdgeUpdateEnd={onEdgeUpdateEnd}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            connectionMode={ConnectionMode.Loose} 
            fitView
          >
            <Background />
          </ReactFlow>
        </div>

        {/* Modals */}
        {showAddNodeModal && (
          <NodeModal
            config={newNodeConfig}
            onConfigChange={setNewNodeConfig}
            onSave={handleAddNode}
            onCancel={() => {
              setShowAddNodeModal(false);
              setNewNodeConfig({ name: '', kind: 'noop', data: {} });
            }}
          />
        )}

        {editingEdge && (
          <EdgeModal
            edge={editingEdge}
            config={edgeConfig}
            onConfigChange={setEdgeConfig}
            onSave={handleSaveEdge}
            onDelete={handleDeleteEdge}
            onCancel={() => {
              setEditingEdge(null);
              setEdgeConfig({ type: 'normal', condition: '' });
            }}
          />
        )}

        {editingNode && (
          <NodeModal
            nodeId={editingNode}
            config={nodeConfig}
            onConfigChange={setNodeConfig}
            onSave={handleSaveNode}
            onCancel={() => {
              setEditingNode(null);
              setNodeConfig({ name: '', kind: 'noop', data: {} });
            }}
          />
        )}
      </div>
    </WorkflowEditorProvider>
  );
}
