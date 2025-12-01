import React from 'react';
import ReactFlow, {
  Background,
  ConnectionMode,
  Edge,
  Node,
  OnNodesChange,
  OnEdgesChange,
  Connection,
} from 'reactflow';
import { MetadataPanelOverlay } from './MetadataPanelOverlay';
import { StationNode } from '../StationNode';

const nodeTypes = {
  node: StationNode,
};
const edgeTypes = {};

interface FlowCanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect?: (params: Connection) => void;
  onConnectStart?: (event: React.MouseEvent | React.TouchEvent, params: { nodeId: string | null; handleId: string | null; handleType: string | null }) => void;
  onConnectEnd?: (event: MouseEvent | TouchEvent) => void;
  onNodeClick: (event: React.MouseEvent, node: Node) => void;
  onEdgeClick: (event: React.MouseEvent, edge: Edge) => void;
  onEdgeDoubleClick: (event: React.MouseEvent, edge: Edge) => void;
  onEdgeMouseEnter: (event: React.MouseEvent, edge: Edge) => void;
  onEdgeMouseMove: (event: React.MouseEvent, edge: Edge) => void;
  onEdgeMouseLeave: (event: React.MouseEvent, edge: Edge) => void;
  onEdgeContextMenu: (event: React.MouseEvent, edge: Edge) => void;
  onEdgeUpdate?: (oldEdge: Edge, newConnection: Connection) => void;
  onEdgeUpdateStart?: (event: React.MouseEvent | React.TouchEvent, edge: Edge) => void;
  onEdgeUpdateEnd?: (event: MouseEvent | TouchEvent | null, edge: Edge) => void;
  isInstanceMode: boolean;
  selectedNodeForMetadata: string | null;
  onCloseMetadata: () => void;
}

/**
 * ReactFlow Canvas Component
 * Extracted from page.tsx to separate concerns
 */
export function FlowCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onConnectStart,
  onConnectEnd,
  onNodeClick,
  onEdgeClick,
  onEdgeDoubleClick,
  onEdgeMouseEnter,
  onEdgeMouseMove,
  onEdgeMouseLeave,
  onEdgeContextMenu,
  onEdgeUpdate,
  onEdgeUpdateStart,
  onEdgeUpdateEnd,
  isInstanceMode,
  selectedNodeForMetadata,
  onCloseMetadata,
}: FlowCanvasProps) {
  return (
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
            onClose={onCloseMetadata}
          />
        )}
      </ReactFlow>
    </div>
  );
}


