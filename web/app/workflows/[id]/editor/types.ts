import { Edge, Node } from 'reactflow';

export type NodeKind = 'http' | 'hook' | 'timer' | 'join' | 'noop';
export type EdgeType = 'normal' | 'if' | 'loop';

export interface WorkflowData {
  workflow: {
    id: string;
    name: string;
  };
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface WorkflowNode {
  id: string;
  name: string;
  kind: NodeKind;
  position: { x: number; y: number };
  data: Record<string, any>;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  type: EdgeType;
  condition?: string;
}

export interface NodeConfig {
  name: string;
  kind: NodeKind;
  data: Record<string, any>;
}

export interface EdgeConfig {
  type: EdgeType;
  condition: string;
}

export type FlowNode = Node<{
  label: string;
  kind: NodeKind;
  data: Record<string, any>;
}>;

export type FlowEdge = Edge<{
  type: EdgeType;
  condition?: string;
}>;

