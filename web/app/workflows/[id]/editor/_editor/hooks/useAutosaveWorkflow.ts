import { useState, useEffect, useCallback, useRef } from 'react';
import { Node, Edge } from 'reactflow';
import { importWorkflow } from '../../../../../api-client';
import { createWorkflowDefinition } from '../domain/helpers';
import { WorkflowData } from '../domain/types';

interface UseAutosaveWorkflowProps {
  workflowData: WorkflowData | null;
  nodes: Node[];
  edges: Edge[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  isInstanceMode: boolean;
  isInitialLoadRef: React.MutableRefObject<boolean>;
  isServerSyncRef: React.MutableRefObject<boolean>;
}

/**
 * Hook to handle auto-saving workflow changes with debouncing
 * Also handles server sync idMap logic to update node/edge IDs after save
 */
export function useAutosaveWorkflow({
  workflowData,
  nodes,
  edges,
  setNodes,
  setEdges,
  isInstanceMode,
  isInitialLoadRef,
  isServerSyncRef,
}: UseAutosaveWorkflowProps) {
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const debouncedSaveRef = useRef<(() => void) | null>(null);

  // Auto-save workflow (debounced)
  const autoSave = useCallback(async () => {
    if (isInitialLoadRef.current || !workflowData || isInstanceMode) return;

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
  }, [workflowData, nodes, edges, setNodes, setEdges, isInstanceMode, isInitialLoadRef, isServerSyncRef]);

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
    if (!workflowData || isInitialLoadRef.current || isInstanceMode) {
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
  }, [nodes, edges, debouncedSave, workflowData, isInstanceMode, isInitialLoadRef, isServerSyncRef]);

  // Expose saveNow function for manual saves
  const saveNow = useCallback(() => {
    if (debouncedSaveRef.current) {
      debouncedSaveRef.current();
    }
  }, []);

  return {
    isSaving,
    saveNow,
    debouncedSaveRef,
  };
}


