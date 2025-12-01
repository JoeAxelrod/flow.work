import React from 'react';
import { Edge } from 'reactflow';
import { NodeModal } from '../NodeModal';
import { EdgeModal } from '../EdgeModal';
import { NodeConfig, EdgeConfig } from '../domain/types';

interface EditorModalsProps {
  showAddNodeModal: boolean;
  newNodeConfig: NodeConfig;
  onNewNodeConfigChange: (config: NodeConfig) => void;
  onAddNode: () => void;
  onCancelAddNode: () => void;
  editingEdge: Edge | null;
  edgeConfig: EdgeConfig;
  onEdgeConfigChange: (config: EdgeConfig) => void;
  onSaveEdge: () => void;
  onDeleteEdge: () => void;
  onCancelEditEdge: () => void;
  editingNode: string | null;
  nodeConfig: NodeConfig;
  onNodeConfigChange: (config: NodeConfig) => void;
  onSaveNode: () => void;
  onCancelEditNode: () => void;
  isInstanceMode: boolean;
}

/**
 * Editor Modals Component
 * Extracted from page.tsx to separate concerns
 * Handles all modal rendering (Add Node, Edit Node, Edit Edge)
 */
export function EditorModals({
  showAddNodeModal,
  newNodeConfig,
  onNewNodeConfigChange,
  onAddNode,
  onCancelAddNode,
  editingEdge,
  edgeConfig,
  onEdgeConfigChange,
  onSaveEdge,
  onDeleteEdge,
  onCancelEditEdge,
  editingNode,
  nodeConfig,
  onNodeConfigChange,
  onSaveNode,
  onCancelEditNode,
  isInstanceMode,
}: EditorModalsProps) {
  return (
    <>
      {showAddNodeModal && (
        <NodeModal
          config={newNodeConfig}
          onConfigChange={onNewNodeConfigChange}
          onSave={onAddNode}
          onCancel={onCancelAddNode}
        />
      )}

      {editingEdge && (
        <EdgeModal
          edge={editingEdge}
          config={edgeConfig}
          onConfigChange={onEdgeConfigChange}
          onSave={onSaveEdge}
          onDelete={onDeleteEdge}
          onCancel={onCancelEditEdge}
          isReadOnly={isInstanceMode}
        />
      )}

      {editingNode && (
        <NodeModal
          nodeId={editingNode}
          config={nodeConfig}
          onConfigChange={onNodeConfigChange}
          onSave={onSaveNode}
          onCancel={onCancelEditNode}
          isReadOnly={isInstanceMode}
        />
      )}
    </>
  );
}


