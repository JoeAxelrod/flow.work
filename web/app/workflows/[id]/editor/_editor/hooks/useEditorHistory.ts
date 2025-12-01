import { useState, useEffect, useCallback, useRef } from 'react';
import { Node, Edge } from 'reactflow';

const MAX_HISTORY = 50;

interface UseEditorHistoryProps {
  nodes: Node[];
  edges: Edge[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  workflowData: any;
  isInitialLoadRef: React.MutableRefObject<boolean>;
  isServerSyncRef: React.MutableRefObject<boolean>;
}

/**
 * Hook to manage undo/redo history for the workflow editor
 * Handles history tracking, debouncing, and undo/redo operations
 */
export function useEditorHistory({
  nodes,
  edges,
  setNodes,
  setEdges,
  workflowData,
  isInitialLoadRef,
  isServerSyncRef,
}: UseEditorHistoryProps) {
  const historyRef = useRef<Array<{ nodes: Node[]; edges: Edge[] }>>([]);
  const historyIndexRef = useRef(-1);
  const isUndoRedoRef = useRef(false);
  const historyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Update undo/redo button states
  const updateUndoRedoState = useCallback(() => {
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  }, []);

  // Mark initial load as complete after first render
  useEffect(() => {
    if (workflowData && nodes.length > 0) {
      // Small delay to ensure all state is set
      setTimeout(() => {
        isInitialLoadRef.current = false;
        // Initialize history with initial state
        historyRef.current = [{ nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) }];
        historyIndexRef.current = 0;
        updateUndoRedoState();
      }, 100);
    }
  }, [workflowData, nodes.length, edges.length, updateUndoRedoState, isInitialLoadRef]);

  // Save state to history (debounced to avoid too many entries)
  const saveToHistory = useCallback(() => {
    if (isInitialLoadRef.current || isUndoRedoRef.current || isServerSyncRef.current) {
      return;
    }

    const currentState = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    };

    // Remove any history after current index (when user makes new change after undo)
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    }

    // Add new state to history
    historyRef.current.push(currentState);

    // Limit history size
    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current.shift(); // [1, 2, 3] -> [2, 3]
    }
    historyIndexRef.current++;
    updateUndoRedoState();
  }, [nodes, edges, updateUndoRedoState, isInitialLoadRef, isServerSyncRef]);

  // Debounced history save
  const debouncedSaveToHistory = useCallback(() => {
    if (historyTimeoutRef.current) {
      clearTimeout(historyTimeoutRef.current);
    }
    historyTimeoutRef.current = setTimeout(() => {
      saveToHistory();
    }, 300);
  }, [saveToHistory]);

  // Undo function
  const handleUndo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      isUndoRedoRef.current = true;
      historyIndexRef.current--;
      const previousState = historyRef.current[historyIndexRef.current];
      setNodes(previousState.nodes);
      setEdges(previousState.edges);
      updateUndoRedoState();
      setTimeout(() => {
        isUndoRedoRef.current = false;
      }, 100);
    }
  }, [setNodes, setEdges, updateUndoRedoState]);

  // Redo function
  const handleRedo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      isUndoRedoRef.current = true;
      historyIndexRef.current++;
      const nextState = historyRef.current[historyIndexRef.current];
      setNodes(nextState.nodes);
      setEdges(nextState.edges);
      updateUndoRedoState();
      setTimeout(() => {
        isUndoRedoRef.current = false;
      }, 100);
    }
  }, [setNodes, setEdges, updateUndoRedoState]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Ctrl+Z (undo) or Ctrl+Y (redo) or Ctrl+Shift+Z (redo)
      if (event.ctrlKey || event.metaKey) {
        if (event.key === 'z' && !event.shiftKey) {
          event.preventDefault();
          handleUndo();
        } else if (event.key === 'y' || (event.key === 'z' && event.shiftKey)) {
          event.preventDefault();
          handleRedo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleUndo, handleRedo]);

  // Save to history when nodes or edges change
  useEffect(() => {
    if (!workflowData || isInitialLoadRef.current) {
      return;
    }

    if (isUndoRedoRef.current || isServerSyncRef.current) {
      return;
    }

    debouncedSaveToHistory();

    return () => {
      if (historyTimeoutRef.current) {
        clearTimeout(historyTimeoutRef.current);
      }
    };
  }, [nodes, edges, debouncedSaveToHistory, workflowData, isInitialLoadRef, isServerSyncRef]);

  return {
    canUndo,
    canRedo,
    undo: handleUndo,
    redo: handleRedo,
    debouncedSaveToHistory,
  };
}


