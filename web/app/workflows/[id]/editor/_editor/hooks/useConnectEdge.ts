import { useCallback, useRef } from 'react';
import { Connection, Edge, MarkerType, addEdge } from 'reactflow';
import { useToast } from '../../../../components/ToastContext';

interface UseConnectEdgeProps {
  nodes: any[];
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  toast: ReturnType<typeof useToast>;
}

/**
 * Hook to handle edge connection logic
 * Handles source/target swap fix and hook-node restriction
 */
export function useConnectEdge({ nodes, setEdges, toast }: UseConnectEdgeProps) {
  // Track the node where connection started to fix source/target swap issue
  const connectionStartNodeId = useRef<string | null>(null);

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

      console.log(1);

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
    [nodes, setEdges, toast]
  );

  // Handle connection start
  const onConnectStart = useCallback(
    (event: React.MouseEvent | React.TouchEvent, params: { nodeId: string | null; handleId: string | null; handleType: string | null }) => {
      console.log('[StationNode] ReactFlow onConnectStart Event:', { event, params });
      // Track which node the connection started from
      connectionStartNodeId.current = params.nodeId || null;
    },
    []
  );

  // Handle connection end
  const onConnectEnd = useCallback((event: MouseEvent | TouchEvent) => {
    console.log('[StationNode] ReactFlow onConnectEnd Event:', event);
    // Reset connection start tracking if connection was cancelled
    connectionStartNodeId.current = null;
  }, []);

  return {
    onConnect,
    onConnectStart,
    onConnectEnd,
  };
}


