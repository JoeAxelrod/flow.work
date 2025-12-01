import { Edge, Node } from 'reactflow';

export type NodeKind = 'http' | 'hook' | 'timer' | 'join' | 'workflow';
export type EdgeType = 'normal' | 'if';

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
  sourceHandle?: string | null;
  targetHandle?: string | null;
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
  isInstanceMode?: boolean;
  instanceData?: {
    activityId?: string;
    executionCount?: number;
    status: string;
    input: any;
    output: any;
    error: string | null;
    startedAt: string | null;
    finishedAt: string | null;
  };
}>;

export type FlowEdge = Edge<{
  type: EdgeType;
  condition?: string;
}>;

