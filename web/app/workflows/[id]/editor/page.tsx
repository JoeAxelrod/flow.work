'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Snackbar, Alert, Slide, SlideProps } from '@mui/material';
import { CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import { useToast } from '../../../components/ToastContext';
import { io, Socket } from 'socket.io-client';

import ReactFlow, {
  addEdge,
  Background,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  Node,
  MarkerType,
  ConnectionMode,            // ⬅️ add this
  useReactFlow,
} from 'reactflow';

import 'reactflow/dist/style.css';
import { getWorkflow, importWorkflow, getInstance, API } from '../../../api-client';
import { NodeConfig, EdgeConfig, WorkflowData, FlowNode } from './types';
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

// Metadata Panel Overlay Component (must be inside ReactFlow context)
function MetadataPanelOverlay({ nodeId, nodes, onClose }: { nodeId: string; nodes: Node[]; onClose: () => void }) {
  const { getNode, project, getViewport } = useReactFlow();
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const selectedNode = nodes.find(n => n.id === nodeId);
  const metadata = selectedNode?.data?.instanceData;
  
  const updatePosition = useCallback(() => {
    if (!selectedNode) return;
    
    const node = getNode(nodeId);
    if (!node) return;
    
    // Try to get the actual DOM element
    const nodeElement = document.querySelector(`[data-id="${nodeId}"]`) as HTMLElement;
    
    if (nodeElement) {
      // Get the ReactFlow container
      const reactFlowContainer = nodeElement.closest('.react-flow') as HTMLElement;
      if (reactFlowContainer) {
        const containerRect = reactFlowContainer.getBoundingClientRect();
        const nodeRect = nodeElement.getBoundingClientRect();
        
        // Calculate position relative to ReactFlow container
        const x = nodeRect.right - containerRect.left + 20; // 20px spacing
        const y = nodeRect.top - containerRect.top;
        
        setPosition({ x, y });
        return;
      }
    }
    
    // Fallback: use project function
    const nodeWidth = node.width || 180;
    const spacing = 20;
    const screenPosition = project({
      x: node.position.x + nodeWidth + spacing,
      y: node.position.y,
    });
    setPosition(screenPosition);
  }, [nodeId, getNode, project, selectedNode]);
  
  useEffect(() => {
    updatePosition();
    
    // Update position on viewport changes (pan, zoom)
    const handleViewportChange = () => {
      updatePosition();
    };
    
    // Listen for ReactFlow viewport changes
    window.addEventListener('resize', handleViewportChange);
    const reactFlowContainer = document.querySelector('.react-flow');
    if (reactFlowContainer) {
      reactFlowContainer.addEventListener('wheel', handleViewportChange, { passive: true });
    }
    
    // Use MutationObserver to detect when node position changes
    const observer = new MutationObserver(updatePosition);
    const nodeElement = document.querySelector(`[data-id="${nodeId}"]`);
    if (nodeElement) {
      observer.observe(nodeElement, { attributes: true, attributeFilter: ['style', 'transform'] });
    }
    
    // Update position periodically to handle pan/zoom
    const intervalId = setInterval(updatePosition, 100);
    
    return () => {
      window.removeEventListener('resize', handleViewportChange);
      if (reactFlowContainer) {
        reactFlowContainer.removeEventListener('wheel', handleViewportChange);
      }
      observer.disconnect();
      clearInterval(intervalId);
    };
  }, [nodeId, updatePosition]);
  
  if (!metadata || !selectedNode) return null;
  
  return (
    <div
      style={{
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: '400px',
        maxHeight: '80vh',
        background: 'white',
        border: '2px solid #4f46e5',
        borderRadius: '8px',
        padding: '16px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        zIndex: 1000,
        overflow: 'auto',
        pointerEvents: 'auto',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>
          {selectedNode?.data?.label || 'Node Metadata'}
        </h3>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '0',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ×
        </button>
      </div>
      <div style={{ fontSize: '12px', marginBottom: '12px' }}>
        <strong>Status:</strong>{' '}
        <span style={{ 
          color: metadata.status === 'success' ? '#10b981' : 
                 metadata.status === 'failed' ? '#ef4444' : '#6b7280' 
        }}>
          {metadata.status}
        </span>
      </div>
      {metadata.input && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px', fontSize: '13px' }}>Input:</div>
          <pre style={{ 
            background: '#f3f4f6', 
            padding: '8px', 
            borderRadius: '4px', 
            fontSize: '11px', 
            overflow: 'auto', 
            maxHeight: '200px',
            margin: 0,
          }}>
            {JSON.stringify(metadata.input, null, 2)}
          </pre>
        </div>
      )}
      {metadata.output && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px', fontSize: '13px' }}>Output:</div>
          <pre style={{ 
            background: '#f3f4f6', 
            padding: '8px', 
            borderRadius: '4px', 
            fontSize: '11px', 
            overflow: 'auto', 
            maxHeight: '200px',
            margin: 0,
          }}>
            {JSON.stringify(metadata.output, null, 2)}
          </pre>
        </div>
      )}
      {metadata.error && (
        <div style={{ marginTop: '12px', color: '#ef4444' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Error:</div>
          <div style={{ fontSize: '12px' }}>{metadata.error}</div>
        </div>
      )}
    </div>
  );
}

export default function WorkflowEditorPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const workflowId = params.id as string;
  const instanceId = searchParams.get('instanceId');
  const isInstanceMode = !!instanceId;
  const toast = useToast();

  // State
  const [workflowData, setWorkflowData] = useState<WorkflowData | null>(null);
  const [instanceData, setInstanceData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddNodeModal, setShowAddNodeModal] = useState(false);
  const [newNodeConfig, setNewNodeConfig] = useState<NodeConfig>({
    name: '',
    kind: 'http',
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
    kind: 'http',
    data: {},
  });

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  // Track the node where connection started to fix source/target swap issue
  const connectionStartNodeId = useRef<string | null>(null);
  
  // Auto-save: debounce timer and saving state
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveToast, setShowSaveToast] = useState(false);
  const isInitialLoadRef = useRef(true);
  const isServerSyncRef = useRef(false);
  const debouncedSaveRef = useRef<(() => void) | null>(null);
  
  // Undo/Redo history
  const historyRef = useRef<Array<{ nodes: Node[]; edges: Edge[] }>>([]);
  const historyIndexRef = useRef(-1);
  const isUndoRedoRef = useRef(false);
  const historyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const MAX_HISTORY = 50;
  
  // Metadata panel state
  const [selectedNodeForMetadata, setSelectedNodeForMetadata] = useState<string | null>(null);

  // Socket connection for real-time updates
  const socketRef = useRef<Socket | null>(null);

  // Fetch workflow
  const fetchWorkflow = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getWorkflow(workflowId);
      setWorkflowData(data);
      console.log(data)

      const flowNodes = nodesToFlowNodes(data.nodes || data.stations || []).map((node) => {
        // Preserve all existing node data and add isInstanceMode
        return {
          ...node,
          data: {
            ...(node.data || {}),
            isInstanceMode: isInstanceMode,
          },
        };
      });
      const flowEdges = edgesToFlowEdges(data.edges || []);

      setNodes(flowNodes);
      setEdges(flowEdges);
    } catch (err: any) {
      setError(err.message || 'Failed to load workflow');
      console.error('Error fetching workflow:', err);
    } finally {
      setLoading(false);
    }
  }, [workflowId, isInstanceMode, setNodes, setEdges]);

  // Fetch instance data if in instance mode
  const fetchInstance = useCallback(async () => {
    if (!isInstanceMode || !instanceId) return;
    
    try {
      const instance = await getInstance(instanceId);
      setInstanceData(instance);
      console.log('Instance data:', instance);
    } catch (err: any) {
      console.error('Error fetching instance:', err);
      toast.showToast(`Failed to load instance: ${err.message}`, 'error');
    }
  }, [isInstanceMode, instanceId, toast]);

  useEffect(() => {
    fetchWorkflow();
  }, [fetchWorkflow]);

  useEffect(() => {
    fetchInstance();
  }, [fetchInstance]);

  // Socket connection for real-time updates
  useEffect(() => {
    if (!isInstanceMode || !instanceId) {
      // Disconnect socket if not in instance mode
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    // Connect to socket
    const socketUrl = API.replace('/api/v1', '');
    const socket = io(`${socketUrl}/workflow-instances`, {
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket connected');
      socket.emit('join-instance', instanceId);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    socket.on('joined-instance', (data) => {
      console.log('Joined instance room:', data);
    });

    // Listen for activity updates
    socket.on('activity-update', (activityData: any) => {
      console.log('Activity update received:', activityData);
      
      // Update instance data with new activity
      setInstanceData((prev: any) => {
        // If no previous data, create initial structure
        if (!prev) {
          return {
            id: activityData.instanceId,
            workflowId: '',
            status: 'running',
            input: {},
            output: null,
            error: null,
            startedAt: activityData.startedAt,
            finishedAt: null,
            nodes: [{
              id: activityData.id,
              nodeId: activityData.nodeId,
              nodeName: activityData.nodeName,
              nodeKind: activityData.nodeKind,
              status: activityData.status,
              input: activityData.input,
              output: activityData.output,
              error: activityData.error,
              startedAt: activityData.startedAt,
              finishedAt: activityData.finishedAt,
              createdAt: activityData.startedAt,
              updatedAt: activityData.finishedAt || activityData.startedAt,
            }],
          };
        }
        
        const existingNodeIndex = prev.nodes?.findIndex((n: any) => n.nodeId === activityData.nodeId);
        
        if (existingNodeIndex !== undefined && existingNodeIndex >= 0) {
          // Update existing node
          const updatedNodes = [...(prev.nodes || [])];
          updatedNodes[existingNodeIndex] = {
            ...updatedNodes[existingNodeIndex],
            status: activityData.status,
            input: activityData.input,
            output: activityData.output,
            error: activityData.error,
            startedAt: activityData.startedAt,
            finishedAt: activityData.finishedAt,
          };
          return { ...prev, nodes: updatedNodes };
        } else {
          // Add new node activity
          const newNode = {
            id: activityData.id,
            nodeId: activityData.nodeId,
            nodeName: activityData.nodeName,
            nodeKind: activityData.nodeKind,
            status: activityData.status,
            input: activityData.input,
            output: activityData.output,
            error: activityData.error,
            startedAt: activityData.startedAt,
            finishedAt: activityData.finishedAt,
            createdAt: activityData.startedAt,
            updatedAt: activityData.finishedAt || activityData.startedAt,
          };
          return {
            ...prev,
            nodes: [...(prev.nodes || []), newNode],
          };
        }
      });
    });

    // Listen for instance status updates
    socket.on('instance-status-update', (statusData: any) => {
      console.log('Instance status update received:', statusData);
      setInstanceData((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          status: statusData.status,
          finishedAt: statusData.finishedAt,
        };
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isInstanceMode, instanceId]);

  // Enrich nodes with instance data when instance data is loaded
  useEffect(() => {
    if (isInstanceMode && instanceData && nodes.length > 0) {
      const enrichedNodes = nodes.map((node) => {
        const instanceNode = instanceData.nodes?.find((n: any) => n.nodeId === node.id);
        if (instanceNode) {
          return {
            ...node,
            data: {
              ...node.data,
              instanceData: {
                status: instanceNode.status,
                input: instanceNode.input,
                output: instanceNode.output,
                error: instanceNode.error,
                startedAt: instanceNode.startedAt,
                finishedAt: instanceNode.finishedAt,
              },
            },
          };
        }
        return node;
      });
      setNodes(enrichedNodes);
    }
  }, [instanceData, isInstanceMode, setNodes]);

  // Enrich edges with instance data - mark used edges in green
  useEffect(() => {
    if (!isInstanceMode || !instanceData || edges.length === 0 || nodes.length === 0) {
      return;
    }
    
    // Create a map of nodeId -> instanceData for quick lookup
    const nodeInstanceMap = new Map<string, any>();
    instanceData.nodes?.forEach((n: any) => {
      nodeInstanceMap.set(n.nodeId, n);
    });

    setEdges((currentEdges) => {
      return currentEdges.map((edge) => {
        const sourceInstance = nodeInstanceMap.get(edge.source);
        const targetInstance = nodeInstanceMap.get(edge.target);

        // An edge is used if both source and target nodes were executed
        // and the target was executed after (or at the same time as) the source
        const isUsed = 
          sourceInstance?.startedAt && 
          targetInstance?.startedAt &&
          new Date(targetInstance.startedAt) >= new Date(sourceInstance.startedAt);

        if (isUsed) {
          return {
            ...edge,
            style: {
              stroke: '#10b981', // green color
              strokeWidth: 3,
            },
          };
        }
        // Reset style if edge was previously marked but is no longer used
        if (edge.style?.stroke === '#10b981') {
          const { style, ...rest } = edge;
          return rest;
        }
        return edge;
      });
    });
  }, [instanceData, isInstanceMode, setEdges]);

  // Handle node click for metadata
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (isInstanceMode && node.data?.instanceData) {
      setSelectedNodeForMetadata(selectedNodeForMetadata === node.id ? null : node.id);
    }
  }, [isInstanceMode, selectedNodeForMetadata]);

  // Listen for metadata toggle events from nodes
  useEffect(() => {
    const handleToggleMetadata = (event: CustomEvent) => {
      const nodeId = event.detail?.nodeId;
      if (nodeId) {
        setSelectedNodeForMetadata(selectedNodeForMetadata === nodeId ? null : nodeId);
      }
    };

    window.addEventListener('toggleMetadata', handleToggleMetadata as EventListener);
    return () => {
      window.removeEventListener('toggleMetadata', handleToggleMetadata as EventListener);
    };
  }, [selectedNodeForMetadata]);

    // Update undo/redo button states
    const updateUndoRedoState = useCallback(() => {
      setCanUndo(historyIndexRef.current > 0);
      setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
    }, []);

  // Mark initial load as complete after first render
  useEffect(() => {
    if (workflowData && nodes.length > 0) {
      // Small delay to ensure all state is set
      setTimeout(() => {
        isInitialLoadRef.current = false;
        // Initialize history with initial state
        historyRef.current = [{ nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) }];
        historyIndexRef.current = 0;
        updateUndoRedoState();
      }, 100);
    }
  }, [workflowData, nodes.length, edges.length, updateUndoRedoState]);
  
  // Save state to history (debounced to avoid too many entries)
  const saveToHistory = useCallback(() => {
    if (isInitialLoadRef.current || isUndoRedoRef.current || isServerSyncRef.current) {
      return;
    }
    
    const currentState = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    };
    
    // Remove any history after current index (when user makes new change after undo)
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    }
    
    // Add new state to history
    historyRef.current.push(currentState);
    
    // Limit history size
    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current.shift(); // [1, 2, 3] -> [2, 3]
    }
    historyIndexRef.current++;
    updateUndoRedoState();
  }, [nodes, edges, updateUndoRedoState]);
  
  // Debounced history save
  const debouncedSaveToHistory = useCallback(() => {
    if (historyTimeoutRef.current) {
      clearTimeout(historyTimeoutRef.current);
    }
    historyTimeoutRef.current = setTimeout(() => {
      saveToHistory();
    }, 300);
  }, [saveToHistory]);
  
  // Undo function
  const handleUndo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      isUndoRedoRef.current = true;
      historyIndexRef.current--;
      const previousState = historyRef.current[historyIndexRef.current];
      setNodes(previousState.nodes);
      setEdges(previousState.edges);
      updateUndoRedoState();
      setTimeout(() => {
        isUndoRedoRef.current = false;
      }, 100);
    }
  }, [setNodes, setEdges, updateUndoRedoState]);
  
  // Redo function
  const handleRedo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      isUndoRedoRef.current = true;
      historyIndexRef.current++;
      const nextState = historyRef.current[historyIndexRef.current];
      setNodes(nextState.nodes);
      setEdges(nextState.edges);
      updateUndoRedoState();
      setTimeout(() => {
        isUndoRedoRef.current = false;
      }, 100);
    }
  }, [setNodes, setEdges, updateUndoRedoState]);
  
  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Ctrl+Z (undo) or Ctrl+Y (redo) or Ctrl+Shift+Z (redo)
      if (event.ctrlKey || event.metaKey) {
        if (event.key === 'z' && !event.shiftKey) {
          event.preventDefault();
          handleUndo();
        } else if (event.key === 'y' || (event.key === 'z' && event.shiftKey)) {
          event.preventDefault();
          handleRedo();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleUndo, handleRedo]);
  
  // Save to history when nodes or edges change
  useEffect(() => {
    if (!workflowData || isInitialLoadRef.current) {
      return;
    }
    
    if (isUndoRedoRef.current || isServerSyncRef.current) {
      return;
    }
    
    debouncedSaveToHistory();
    
    return () => {
      if (historyTimeoutRef.current) {
        clearTimeout(historyTimeoutRef.current);
      }
    };
  }, [nodes, edges, debouncedSaveToHistory, workflowData]);

  // Listen for edit, copy, and delete node events from custom node component
  useEffect(() => {
    const handleEditNode = (event: CustomEvent) => {
      const nodeId = event.detail.nodeId;
      const node = nodes.find((n) => n.id === nodeId);
      if (node) {
        setEditingNode(nodeId);
        setNodeConfig({
          name: node.data.label || '',
          kind: node.data.kind,
          data: node.data.data || {},
        });
      }
    };

    const handleCopyNode = (event: CustomEvent) => {
      const nodeId = event.detail.nodeId;
      const nodeToCopy = nodes.find((n) => n.id === nodeId);
      if (nodeToCopy) {
        // Generate new ID for the copied node
        const newId = generateNodeId(nodes);
        // Calculate new position (offset by 50px to the right and down)
        const newPosition = {
          x: (nodeToCopy.position?.x || 0) + 50,
          y: (nodeToCopy.position?.y || 0) + 50,
        };
        // Create copied node with same data but new ID and position
        const copiedNode: FlowNode = {
          ...nodeToCopy,
          id: newId,
          position: newPosition,
        };
        // Add the copied node
        setNodes((nds) => [...nds, copiedNode]);
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
    window.addEventListener('copyNode' as any, handleCopyNode);
    window.addEventListener('deleteNode' as any, handleDeleteNode);
    return () => {
      window.removeEventListener('editNode' as any, handleEditNode);
      window.removeEventListener('copyNode' as any, handleCopyNode);
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
        toast.showToast('Hook nodes cannot have edges connected to them', 'warning');
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
        // Auto-save will be triggered by the edges change effect
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
    const condition = (edge.data as any)?.condition || '';
    // Normalize condition to start with "input." if it's an "if" type edge
    const edgeType = (edge.data as any)?.type || 'normal';
    let normalizedCondition = condition;
    if (edgeType === 'if' && condition && !condition.startsWith('input.')) {
      normalizedCondition = 'input.' + condition;
    } else if (edgeType === 'if' && !condition) {
      normalizedCondition = 'input.';
    }
    setEdgeConfig({
      type: edgeType,
      condition: normalizedCondition,
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
    setNewNodeConfig({ name: '', kind: 'http', data: {} });
    // Auto-save will be triggered by the nodes change effect
  }, [nodes, newNodeConfig, setNodes]);

  // Save edge configuration
  const handleSaveEdge = useCallback(() => {
    if (!editingEdge) return;

    setEdges((eds) =>
      eds.map((e) => (e.id === editingEdge.id ? updateEdgeWithConfig(e, edgeConfig) : e))
    );

    setEditingEdge(null);
    setEdgeConfig({ type: 'normal', condition: '' });
    // Explicitly trigger workflow save
    setTimeout(() => {
      if (debouncedSaveRef.current) {
        debouncedSaveRef.current();
      }
    }, 0);
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
    setNodeConfig({ name: '', kind: 'http', data: {} });
    // Explicitly trigger workflow save
    setTimeout(() => {
      if (debouncedSaveRef.current) {
        debouncedSaveRef.current();
      }
    }, 0);
  }, [editingNode, nodeConfig, setNodes]);

  // Auto-save workflow (debounced)
  const autoSave = useCallback(async () => {
    if (isInitialLoadRef.current || !workflowData) return;
  
    const saveStartTime = Date.now();
    setIsSaving(true);
    try {
      const def = createWorkflowDefinition(
        workflowData.workflow.id,
        workflowData.workflow.name,
        nodes,
        edges
      );
      const result = await importWorkflow(def);
  
      if (result.nodeIdMap || result.stationIdMap) {
        const idMap = (result.nodeIdMap || result.stationIdMap) as Record<string, string>;
  
        // mark that the next nodes/edges change is from the server
        isServerSyncRef.current = true;
  
        setNodes((nds) => {
          let changed = false;
          const updated = nds.map((node) => {
            const newId = idMap[node.id];
            if (newId && newId !== node.id) {
              changed = true;
              return { ...node, id: newId };
            }
            return node;
          });
          return changed ? updated : nds;
        });
  
        setEdges((eds) => {
          let changed = false;
          const updated = eds.map((edge) => {
            const newSource = idMap[edge.source] || edge.source;
            const newTarget = idMap[edge.target] || edge.target;
            if (newSource !== edge.source || newTarget !== edge.target) {
              changed = true;
              return { ...edge, source: newSource, target: newTarget };
            }
            return edge;
          });
          return changed ? updated : eds;
        });
      }
  
      setShowSaveToast(true);
    } catch (err: any) {
      console.error('Auto-save failed:', err);
    } finally {
      // Ensure minimum 600ms display time for "Saving..." message
      const elapsedTime = Date.now() - saveStartTime;
      const remainingTime = Math.max(0, 600 - elapsedTime);
      
      if (remainingTime > 0) {
        setTimeout(() => {
          setIsSaving(false);
        }, remainingTime);
      } else {
        setIsSaving(false);
      }
    }
  }, [workflowData, nodes, edges, setNodes, setEdges]);
  

  // Debounced save function
  const debouncedSave = useCallback(() => {
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Set new timeout (500ms debounce)
    saveTimeoutRef.current = setTimeout(() => {
      autoSave();
    }, 500);
  }, [autoSave]);
  
  // Store debouncedSave in ref so it can be called from handlers defined earlier
  useEffect(() => {
    debouncedSaveRef.current = debouncedSave;
  }, [debouncedSave]);

  // Auto-save when nodes or edges change
  useEffect(() => {
    if (!workflowData || isInitialLoadRef.current) {
      return;
    }
  
    // If this change came from server mapping, don't auto-save again
    if (isServerSyncRef.current) {
      isServerSyncRef.current = false;
      return;
    }
  
    debouncedSave();
  
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [nodes, edges, debouncedSave, workflowData]);
  

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
            {isInstanceMode && (
              <span style={{ marginLeft: '12px', fontSize: '0.875rem', color: '#6b7280', fontWeight: 'normal' }}>
                (Instance View - Read Only)
              </span>
            )}
          </h2>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            {isSaving && (
              <span style={{ fontSize: '0.875rem', color: '#6b7280', marginRight: '8px' }}>
                Saving...
              </span>
            )}
            {/* Undo/Redo buttons - hidden in instance mode */}
            {!isInstanceMode && (
              <>
                <button
                  onClick={handleUndo}
                  disabled={!canUndo}
                  style={{
                    padding: '8px 16px',
                    background: !canUndo ? '#d1d5db' : '#6366f1',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: !canUndo ? 'not-allowed' : 'pointer',
                    opacity: !canUndo ? 0.6 : 1,
                  }}
                  title="Undo (Ctrl+Z)"
                >
                  Undo
                </button>
                <button
                  onClick={handleRedo}
                  disabled={!canRedo}
                  style={{
                    padding: '8px 16px',
                    background: !canRedo ? '#d1d5db' : '#6366f1',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: !canRedo ? 'not-allowed' : 'pointer',
                    opacity: !canRedo ? 0.6 : 1,
                  }}
                  title="Redo (Ctrl+Y or Ctrl+Shift+Z)"
                >
                  Redo
                </button>
              </>
            )}
            {!isInstanceMode && (
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
            )}
          </div>
        </div>


        {/* ReactFlow Canvas */}
        <div style={{ flex: 1 }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={isInstanceMode ? undefined : onConnect}
            onConnectStart={isInstanceMode ? undefined : onConnectStart}
            onConnectEnd={isInstanceMode ? undefined : onConnectEnd}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onEdgeDoubleClick={onEdgeDoubleClick}
            onEdgeMouseEnter={onEdgeMouseEnter}
            onEdgeMouseMove={onEdgeMouseMove}
            onEdgeMouseLeave={onEdgeMouseLeave}
            onEdgeContextMenu={onEdgeContextMenu}
            onEdgeUpdate={isInstanceMode ? undefined : onEdgeUpdate}
            onEdgeUpdateStart={isInstanceMode ? undefined : onEdgeUpdateStart}
            onEdgeUpdateEnd={isInstanceMode ? undefined : onEdgeUpdateEnd}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            connectionMode={ConnectionMode.Loose}
            nodesConnectable={!isInstanceMode}
            elementsSelectable={!isInstanceMode}
            nodesDraggable={!isInstanceMode}
            edgesUpdatable={!isInstanceMode}
            fitView
          >
            <Background />
            {isInstanceMode && selectedNodeForMetadata && (
              <MetadataPanelOverlay
                nodeId={selectedNodeForMetadata}
                nodes={nodes}
                onClose={() => setSelectedNodeForMetadata(null)}
              />
            )}
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
              setNewNodeConfig({ name: '', kind: 'http', data: {} });
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
            isReadOnly={isInstanceMode}
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
              setNodeConfig({ name: '', kind: 'http', data: {} });
            }}
            isReadOnly={isInstanceMode}
          />
        )}

        {/* Save Toast Notification */}
        {/* <Snackbar
          open={showSaveToast}
          autoHideDuration={1500}
          onClose={() => setShowSaveToast(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          TransitionComponent={Slide}
          TransitionProps={{ direction: 'up' } as SlideProps}
          sx={{
            '& .MuiSnackbar-root': {
              bottom: 16,
            },
          }}
        >
          <Alert
            onClose={() => setShowSaveToast(false)}
            severity="success"
            icon={<CheckCircleIcon sx={{ fontSize: '16px' }} />}
            sx={{
              backgroundColor: 'rgba(16, 185, 129, 0.95)',
              color: 'white',
              padding: '6px 12px',
              minWidth: 'auto',
              '& .MuiAlert-icon': {
                color: 'white',
                fontSize: '16px',
                marginRight: '8px',
              },
              '& .MuiAlert-message': {
                color: 'white',
                fontWeight: 500,
                fontSize: '0.75rem',
                padding: 0,
              },
              borderRadius: 1,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
              backdropFilter: 'blur(10px)',
            }}
          >
            Workflow saved
          </Alert>
        </Snackbar> */}
      </div>
    </WorkflowEditorProvider>
  );
}
