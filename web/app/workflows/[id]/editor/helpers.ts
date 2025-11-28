import { Edge, Node, MarkerType } from 'reactflow';
import { WorkflowData, WorkflowNode, WorkflowEdge, FlowNode, FlowEdge, NodeConfig, EdgeConfig } from './types';

/**
 * Transform workflow nodes to ReactFlow nodes
 */
export function nodesToFlowNodes(nodes: WorkflowNode[]): FlowNode[] {
  return nodes.map((node) => ({
    id: node.id,
    type: 'node',
    position: node.position || { x: 0, y: 0 },
    data: {
      label: node.name,
      kind: node.kind,
      data: node.data,
    },
  }));
}

/**
 * Transform workflow edges to ReactFlow edges
 */
export function edgesToFlowEdges(edges: WorkflowEdge[]): FlowEdge[] {
  const a =  edges.map((edge) => {
    const isConditional = edge.type === 'if' && edge.condition;
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      // 👇 restore handles from DB
      sourceHandle: edge.sourceHandle ?? undefined,
      targetHandle: edge.targetHandle ?? undefined,

      markerEnd: {
        type: MarkerType.ArrowClosed,
      },
      label: isConditional ? `if...=${edge.condition!.split('=')[1]}` : undefined,
      labelStyle: edge.type === 'if' ? { fill: '#ef4444', fontWeight: 'bold' } : undefined,
      data: {
        type: edge.type || 'normal',
        condition: edge.condition,
      },
    };
  });

  console.log("edgesToFlowEdges", a);
  return a;
}


/**
 * Transform ReactFlow nodes to workflow nodes
 */
export function flowNodesToWorkflowNodes(nodes: Node[]): WorkflowNode[] {
  return nodes.map((node) => ({
    id: node.id,
    name: node.data.label || node.id,
    kind: node.data.kind || 'http',
    position: node.position || { x: 0, y: 0 },
    data: node.data.data || {},
  }));
}

/**
 * Transform ReactFlow edges to workflow edges
 */
export function flowEdgesToWorkflowEdges(edges: Edge[]): WorkflowEdge[] {
  const a =  edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: (e.data as any)?.type || 'normal',
    condition: (e.data as any)?.condition,
    // 👇 persist handles
    sourceHandle: e.sourceHandle ?? null,
    targetHandle: e.targetHandle ?? null,
  }));

  console.log("flowEdgesToWorkflowEdges", a);
  return a;
}


/**
 * Generate a temporary node ID (will be replaced by DB-generated UUID)
 * Using a prefix to identify temp IDs that need to be replaced
 */
export function generateNodeId(existingNodes: Node[]): string {
  // Generate a temporary ID - DB will generate the real UUID
  // Use a prefix to identify these as temporary
  const existingIds = new Set(existingNodes.map((n) => n.id));
  let counter = 1;
  let tempId = `__temp_${counter}`;
  while (existingIds.has(tempId)) {
    counter++;
    tempId = `__temp_${counter}`;
  }
  return tempId;
}

/**
 * Calculate position for a new node
 */
export function calculateNewNodePosition(nodes: Node[]): { x: number; y: number } {
  if (nodes.length === 0) {
    return { x: 400, y: 300 };
  }
  const lastNode = nodes[nodes.length - 1];
  return {
    x: (lastNode.position?.x || 0) + 250,
    y: lastNode.position?.y || 0,
  };
}

/**
 * Prepare node data based on kind
 */
export function prepareNodeData(kind: string, configData: Record<string, any>): Record<string, any> {
  switch (kind) {
    case 'http':
      return { url: configData.url || 'https://httpbin.org/post' };
    case 'timer':
      return { ms: configData.ms || 30000 };
    case 'hook':
    default:
      return {};
  }
}

/**
 * Create a new ReactFlow node from config
 */
export function createNodeFromConfig(
  nodeId: string,
  position: { x: number; y: number },
  config: NodeConfig
): FlowNode {
  const nodeData = prepareNodeData(config.kind, config.data);
  return {
    id: nodeId,
    type: 'node',
    position,
    data: {
      label: config.name || nodeId,
      kind: config.kind,
      data: nodeData,
    },
  };
}

/**
 * Create workflow definition for import
 */
export function createWorkflowDefinition(
  workflowId: string,
  workflowName: string,
  nodes: Node[],
  edges: Edge[]
) {
  const getPos = (id: string) => nodes.find((n) => n.id === id)?.position ?? { x: 0, y: 0 };
  return {
    workflows: [{ name: workflowName, id: workflowId }],
    nodes: flowNodesToWorkflowNodes(nodes),
    edges: flowEdgesToWorkflowEdges(edges),
  };
}

/**
 * Update edge with new configuration
 */
export function updateEdgeWithConfig(edge: Edge, config: EdgeConfig): Edge {
  const isConditional = config.type === 'if' && config.condition;
  return {
    ...edge,
    markerEnd: {
      type: MarkerType.ArrowClosed,
    },
    label: isConditional ? `if...=${config.condition.split('=')[1]}` : undefined,
    labelStyle: config.type === 'if' ? { fill: '#ef4444', fontWeight: 'bold' } : undefined,
    data: {
      type: config.type,
      condition: config.type === 'if' ? config.condition : undefined,
    },
  };
}

/**
 * Update node with new configuration
 */
export function updateNodeFromConfig(node: Node, config: NodeConfig): FlowNode {
  const nodeData = prepareNodeData(config.kind, config.data);
  return {
    ...node,
    data: {
      label: config.name || node.id,
      kind: config.kind,
      data: nodeData,
    },
  };
}

