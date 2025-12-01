'use client';

import { createContext, useContext, ReactNode } from 'react';
import { Node } from 'reactflow';

interface WorkflowEditorContextValue {
  nodes: Node[];
  getNodeName: (nodeId: string) => string;
}

const WorkflowEditorContext = createContext<WorkflowEditorContextValue | null>(null);

export function WorkflowEditorProvider({
  children,
  nodes,
}: {
  children: ReactNode;
  nodes: Node[];
}) {
  const getNodeName = (nodeId: string): string => {
    const node = nodes.find((n) => n.id === nodeId);
    return node?.data?.label || nodeId;
  };

  return (
    <WorkflowEditorContext.Provider value={{ nodes, getNodeName }}>
      {children}
    </WorkflowEditorContext.Provider>
  );
}

export function useWorkflowEditor() {
  const context = useContext(WorkflowEditorContext);
  if (!context) {
    throw new Error('useWorkflowEditor must be used within WorkflowEditorProvider');
  }
  return context;
}


