import { useEffect } from 'react';
import { Node } from 'reactflow';
import { NodeConfig, FlowNode } from '../domain/types';
import { generateNodeId } from '../domain/helpers';

interface UseNodeEventsProps {
  nodes: Node[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<any[]>>;
  setEditingNode: (nodeId: string | null) => void;
  setNodeConfig: (config: NodeConfig) => void;
}

/**
 * Hook to handle window custom events for node operations (edit, copy, delete)
 * StationNode dispatches these events, and this hook listens and handles them
 */
export function useNodeEvents({
  nodes,
  setNodes,
  setEdges,
  setEditingNode,
  setNodeConfig,
}: UseNodeEventsProps) {
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
      const nodeId = event.detail?.nodeId;
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
  }, [nodes, setNodes, setEdges, setEditingNode, setNodeConfig]);
}


