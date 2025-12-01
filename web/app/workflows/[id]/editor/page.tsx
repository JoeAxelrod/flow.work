'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useToast } from '../../../components/ToastContext';
import { io, Socket } from 'socket.io-client';

import { useNodesState, useEdgesState, Edge, Node } from 'reactflow';

import 'reactflow/dist/style.css';
import { getWorkflow, getInstance, API } from '../../../api-client';
import { NodeConfig, EdgeConfig, WorkflowData } from './_editor/domain/types';
import {
  nodesToFlowNodes,
  edgesToFlowEdges,
  generateNodeId,
  calculateNewNodePosition,
  createNodeFromConfig,
  updateEdgeWithConfig,
  updateNodeFromConfig,
} from './_editor/domain/helpers';
import { WorkflowEditorProvider } from './_editor/WorkflowEditorContext';
import { FlowCanvas } from './_editor/components/FlowCanvas';
import { EditorModals } from './_editor/components/EditorModals';
import { useNodeEvents } from './_editor/hooks/useNodeEvents';
import { useEditorHistory } from './_editor/hooks/useEditorHistory';
import { useAutosaveWorkflow } from './_editor/hooks/useAutosaveWorkflow';
import { useConnectEdge } from './_editor/hooks/useConnectEdge';

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

  // Refs for hooks
  const isInitialLoadRef = useRef(true);
  const isServerSyncRef = useRef(false);

  // Metadata panel state
  const [selectedNodeForMetadata, setSelectedNodeForMetadata] = useState<string | null>(null);

  // Socket connection for real-time updates
  const socketRef = useRef<Socket | null>(null);

  // Track last processed instance data to prevent infinite loops
  const lastProcessedInstanceDataRef = useRef<string | null>(null);

  // Use hooks
  const { canUndo, canRedo, undo, redo } = useEditorHistory({
    nodes,
    edges,
    setNodes,
    setEdges,
    workflowData,
    isInitialLoadRef,
    isServerSyncRef,
  });

  const { isSaving, debouncedSaveRef } = useAutosaveWorkflow({
    workflowData,
    nodes,
    edges,
    setNodes,
    setEdges,
    isInstanceMode,
    isInitialLoadRef,
    isServerSyncRef,
  });

  const { onConnect, onConnectStart, onConnectEnd } = useConnectEdge({
    nodes,
    setEdges,
    toast,
  });

  useNodeEvents({
    nodes,
    setNodes,
    setEdges,
    setEditingNode,
    setNodeConfig,
  });

  // Fetch workflow
  const fetchWorkflow = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getWorkflow(workflowId);
      setWorkflowData(data);
      console.log(data);

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
            nodes: [
              {
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
              },
            ],
          };
        }

        const nodes = [...(prev.nodes || [])];
        const normalized = {
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
          createdAt: activityData.createdAt || activityData.startedAt,
          updatedAt: activityData.updatedAt || activityData.finishedAt || activityData.startedAt,
        };
        // Keep full history: update by activityId, append if it's a new execution
        const existingActivityIndex = nodes.findIndex((n: any) => n.id === activityData.id);
        if (existingActivityIndex >= 0) {
          nodes[existingActivityIndex] = { ...nodes[existingActivityIndex], ...normalized };
        } else {
          nodes.push(normalized);
        }
        return { ...prev, nodes };
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
      const byNode = new Map<string, { count: number; latest: any; latestTs: number }>();
      for (const act of instanceData.nodes || []) {
        const nodeId = act.nodeId;
        const ts = new Date(
          act.updatedAt || act.finishedAt || act.startedAt || act.createdAt || 0
        ).getTime();
        const prevAgg = byNode.get(nodeId);
        if (!prevAgg) {
          byNode.set(nodeId, { count: 1, latest: act, latestTs: ts });
        } else {
          const nextCount = prevAgg.count + 1;
          if (ts >= prevAgg.latestTs) {
            byNode.set(nodeId, { count: nextCount, latest: act, latestTs: ts });
          } else {
            byNode.set(nodeId, { ...prevAgg, count: nextCount });
          }
        }
      }
      const enrichedNodes = nodes.map((node) => {
        const agg = byNode.get(node.id);
        if (!agg) return node;
        const instanceNode = agg.latest;
        return {
          ...node,
          data: {
            ...node.data,
            instanceData: {
              activityId: instanceNode.id,
              executionCount: agg.count,
              status: instanceNode.status,
              input: instanceNode.input,
              output: instanceNode.output,
              error: instanceNode.error,
              startedAt: instanceNode.startedAt,
              finishedAt: instanceNode.finishedAt,
            },
          },
        };
      });
      setNodes(enrichedNodes);
    }
  }, [instanceData, isInstanceMode, setNodes]);

  // Enrich edges with instance data - mark used edges in green and add traversal counts
  useEffect(() => {
    if (!isInstanceMode || !instanceData || !edges || edges.length === 0 || nodes.length === 0) {
      return;
    }

    // Create a signature of the instance data to detect actual changes
    const instanceDataSignature = JSON.stringify(
      instanceData.nodes?.map((n: any) => ({
        nodeId: n.nodeId,
        status: n.status,
        startedAt: n.startedAt,
        finishedAt: n.finishedAt,
      })) || []
    );

    // Skip if we've already processed this exact instance data
    if (lastProcessedInstanceDataRef.current === instanceDataSignature) {
      return;
    }

    lastProcessedInstanceDataRef.current = instanceDataSignature;

    // Group all activities by nodeId for traversal counting
    const activitiesByNode = new Map<string, any[]>();
    instanceData.nodes?.forEach((n: any) => {
      const nodeId = n.nodeId;
      if (!activitiesByNode.has(nodeId)) {
        activitiesByNode.set(nodeId, []);
      }
      activitiesByNode.get(nodeId)!.push(n);
    });

    // Sort activities by time for each node
    activitiesByNode.forEach((activities, nodeId) => {
      activities.sort((a, b) => {
        const aTime = new Date(a.updatedAt || a.finishedAt || a.startedAt || a.createdAt || 0).getTime();
        const bTime = new Date(b.updatedAt || b.finishedAt || b.startedAt || b.createdAt || 0).getTime();
        return aTime - bTime;
      });
    });

    // Create a map of nodeId -> latest instance activity for quick lookup
    const nodeInstanceMap = new Map<string, any>();
    instanceData.nodes?.forEach((n: any) => {
      const prev = nodeInstanceMap.get(n.nodeId);
      if (!prev) {
        nodeInstanceMap.set(n.nodeId, n);
        return;
      }
      const prevTs = new Date(
        prev.updatedAt || prev.finishedAt || prev.startedAt || prev.createdAt || 0
      ).getTime();
      const ts = new Date(
        n.updatedAt || n.finishedAt || n.startedAt || n.createdAt || 0
      ).getTime();
      if (ts >= prevTs) nodeInstanceMap.set(n.nodeId, n);
    });

    // Create a map of nodeId -> kind (http/timer/join/...)
    const nodeKindMap = new Map<string, string>();
    nodes.forEach((n) => {
      nodeKindMap.set(n.id, n.data?.kind);
    });

    // Function to count edge traversals
    const countEdgeTraversals = (
      sourceNodeId: string,
      targetNodeId: string,
      edgeType: string,
      sourceKind: string,
      targetKind: string,
      targetIn: number
    ): number => {
      const sourceActivities = activitiesByNode.get(sourceNodeId) || [];
      const targetActivities = activitiesByNode.get(targetNodeId) || [];

      if (sourceActivities.length === 0 || targetActivities.length === 0) {
        return 0;
      }

      // For most cases, count how many times target executed after source succeeded
      // This is a simplified heuristic that works for most workflow patterns
      let count = 0;

      // Sort all activities chronologically to find sequences
      const allActivities: Array<{ nodeId: string; activity: any; time: number }> = [];

      sourceActivities.forEach((act) => {
        const time = new Date(act.updatedAt || act.finishedAt || act.startedAt || act.createdAt || 0).getTime();
        allActivities.push({ nodeId: sourceNodeId, activity: act, time });
      });

      targetActivities.forEach((act) => {
        const time = new Date(act.updatedAt || act.finishedAt || act.startedAt || act.createdAt || 0).getTime();
        allActivities.push({ nodeId: targetNodeId, activity: act, time });
      });

      allActivities.sort((a, b) => a.time - b.time);

      // Count sequences where source succeeded, then target executed
      let lastSourceSuccessTime = -1;
      for (const item of allActivities) {
        if (item.nodeId === sourceNodeId) {
          if (item.activity.status?.toLowerCase() === 'success') {
            lastSourceSuccessTime = item.time;
          }
        } else if (item.nodeId === targetNodeId) {
          if (lastSourceSuccessTime >= 0 && item.time >= lastSourceSuccessTime) {
            count++;
            // Reset to avoid double counting
            lastSourceSuccessTime = -1;
          }
        }
      }

      // For special cases, use simpler heuristics
      if (edgeType === 'if') {
        // For conditional edges, count is already calculated above
        return count;
      } else if (targetKind === 'join') {
        if (sourceKind === 'timer') {
          // Timer → join: count join successes (simpler)
          return targetActivities.filter((a) => a.status?.toLowerCase() === 'success').length;
        } else {
          // Other inputs into join: count source successes
          return sourceActivities.filter((a) => a.status?.toLowerCase() === 'success').length;
        }
      } else if (sourceKind === 'timer') {
        // Timer → non-join: count timer successes
        return sourceActivities.filter((a) => a.status?.toLowerCase() === 'success').length;
      } else if (targetIn > 1) {
        // Merge into non-join: count source successes
        return sourceActivities.filter((a) => a.status?.toLowerCase() === 'success').length;
      }

      // For simple linear flows, return the sequence count
      return count;
    };

    setEdges((currentEdges) => {
      if (!currentEdges || currentEdges.length === 0) {
        return currentEdges;
      }

      // Calculate in-degree for each node (for merge detection)
      const indegree = new Map<string, number>();
      currentEdges.forEach((e) => {
        indegree.set(e.target, (indegree.get(e.target) || 0) + 1);
      });

      let hasChanges = false;
      const updatedEdges = currentEdges.map((edge) => {
        const sourceInstance = nodeInstanceMap.get(edge.source);
        const targetInstance = nodeInstanceMap.get(edge.target);
        const sourceKind = nodeKindMap.get(edge.source);
        const targetKind = nodeKindMap.get(edge.target);
        const edgeType = (edge.data as any)?.type ?? 'normal';
        const targetIn = indegree.get(edge.target) || 0;

        let isUsed = false;

        if (edgeType === 'if') {
          // Conditional edge: only green if that branch actually ran
          isUsed =
            sourceInstance?.status === 'success' &&
            !!sourceInstance?.startedAt &&
            !!targetInstance?.startedAt &&
            new Date(targetInstance.startedAt) >= new Date(sourceInstance.startedAt);
        } else {
          if (targetKind === 'join') {
            if (sourceKind === 'timer') {
              // Timer → join: only green after join finished
              isUsed = sourceInstance?.status === 'success' && targetInstance?.status === 'success';
            } else {
              // Other inputs into join: green as soon as source succeeded
              isUsed = sourceInstance?.status === 'success';
            }
          } else if (sourceKind === 'timer') {
            // Timer → non-join: only after timer fired (timer success)
            isUsed = sourceInstance?.status === 'success';
          } else if (targetIn > 1) {
            // Merge into non-join: prerequisite-style
            isUsed = sourceInstance?.status === 'success';
          } else {
            // Simple linear: keep ordering semantics
            isUsed =
              !!sourceInstance?.startedAt &&
              !!targetInstance?.startedAt &&
              new Date(targetInstance.startedAt) >= new Date(sourceInstance.startedAt);
          }
        }

        // Count edge traversals
        const traversalCount = countEdgeTraversals(
          edge.source,
          edge.target,
          edgeType,
          sourceKind || '',
          targetKind || '',
          targetIn
        );

        // Edge should be green if it was used in the latest execution OR if it has a historical count > 0
        // This ensures edges that were traversed multiple times (like in loops) stay green even if the last execution didn't use them
        const shouldBeGreen = isUsed || traversalCount > 0;
        const isCurrentlyGreen = edge.style?.stroke === '#10b981';
        const currentLabel = edge.label as string;
        // Always show label in instance mode, even if count is 0
        const newLabel = String(traversalCount);

        // Check if we need to update
        const needsStyleUpdate = shouldBeGreen !== isCurrentlyGreen;
        const needsLabelUpdate = newLabel !== currentLabel;

        if (needsStyleUpdate || needsLabelUpdate) {
          hasChanges = true;
          const updatedEdge: any = {
            ...edge,
            label: newLabel,
            labelStyle: {
              fill: traversalCount > 0 ? '#10b981' : '#9ca3af', // green if used, gray if 0
              fontWeight: 'bold',
              fontSize: '12px',
            },
            labelBgStyle: {
              fill: 'white',
              fillOpacity: 0.8,
            },
          };

          if (shouldBeGreen) {
            updatedEdge.style = {
              stroke: '#10b981', // green color
              strokeWidth: 3,
            };
          } else if (!shouldBeGreen && isCurrentlyGreen) {
            const { style, ...rest } = updatedEdge;
            return rest;
          }

          return updatedEdge;
        }
        return edge;
      });

      // Only return new array if something changed
      return hasChanges ? updatedEdges : currentEdges;
    });
  }, [instanceData, isInstanceMode, nodes, setEdges]);

  // Handle node click for metadata
  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      if (isInstanceMode && node.data?.instanceData) {
        setSelectedNodeForMetadata(selectedNodeForMetadata === node.id ? null : node.id);
      }
    },
    [isInstanceMode, selectedNodeForMetadata]
  );

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
  const onEdgeUpdate = useCallback((oldEdge: Edge, newConnection: any) => {
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

    setEdges((eds) => eds.map((e) => (e.id === editingEdge.id ? updateEdgeWithConfig(e, edgeConfig) : e)));

    setEditingEdge(null);
    setEdgeConfig({ type: 'normal', condition: '' });
    // Explicitly trigger workflow save
    setTimeout(() => {
      if (debouncedSaveRef.current) {
        debouncedSaveRef.current();
      }
    }, 0);
  }, [editingEdge, edgeConfig, setEdges, debouncedSaveRef]);

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

    setNodes((nds) => nds.map((n) => (n.id === editingNode ? updateNodeFromConfig(n, nodeConfig) : n)));

    setEditingNode(null);
    setNodeConfig({ name: '', kind: 'http', data: {} });
    // Explicitly trigger workflow save
    setTimeout(() => {
      if (debouncedSaveRef.current) {
        debouncedSaveRef.current();
      }
    }, 0);
  }, [editingNode, nodeConfig, setNodes, debouncedSaveRef]);

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
                  onClick={undo}
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
                  onClick={redo}
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
        <FlowCanvas
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onConnectStart={onConnectStart}
          onConnectEnd={onConnectEnd}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          onEdgeDoubleClick={onEdgeDoubleClick}
          onEdgeMouseEnter={onEdgeMouseEnter}
          onEdgeMouseMove={onEdgeMouseMove}
          onEdgeMouseLeave={onEdgeMouseLeave}
          onEdgeContextMenu={onEdgeContextMenu}
          onEdgeUpdate={onEdgeUpdate}
          onEdgeUpdateStart={onEdgeUpdateStart}
          onEdgeUpdateEnd={onEdgeUpdateEnd}
          isInstanceMode={isInstanceMode}
          selectedNodeForMetadata={selectedNodeForMetadata}
          onCloseMetadata={() => setSelectedNodeForMetadata(null)}
        />

        {/* Modals */}
        <EditorModals
          showAddNodeModal={showAddNodeModal}
          newNodeConfig={newNodeConfig}
          onNewNodeConfigChange={setNewNodeConfig}
          onAddNode={handleAddNode}
          onCancelAddNode={() => {
            setShowAddNodeModal(false);
            setNewNodeConfig({ name: '', kind: 'http', data: {} });
          }}
          editingEdge={editingEdge}
          edgeConfig={edgeConfig}
          onEdgeConfigChange={setEdgeConfig}
          onSaveEdge={handleSaveEdge}
          onDeleteEdge={handleDeleteEdge}
          onCancelEditEdge={() => {
            setEditingEdge(null);
            setEdgeConfig({ type: 'normal', condition: '' });
          }}
          editingNode={editingNode}
          nodeConfig={nodeConfig}
          onNodeConfigChange={setNodeConfig}
          onSaveNode={handleSaveNode}
          onCancelEditNode={() => {
            setEditingNode(null);
            setNodeConfig({ name: '', kind: 'http', data: {} });
          }}
          isInstanceMode={isInstanceMode}
        />
      </div>
    </WorkflowEditorProvider>
  );
}
