import { useState, useEffect, useCallback } from 'react';
import { Node, useReactFlow } from 'reactflow';

// Dark theme colors (matching CodeLayout)
const colors = {
  bg: '#0d1117',
  bgAlt: '#161b22',
  border: '#30363d',
  text: '#c9d1d9',
  textMuted: '#8b949e',
  keyword: '#ff7b72',
  string: '#a5d6ff',
  function: '#d2a8ff',
  variable: '#79c0ff',
  comment: '#8b949e',
  success: '#3fb950',
  cursor: '#58a6ff',
  error: '#f85149',
};

interface MetadataPanelOverlayProps {
  nodeId: string;
  nodes: Node[];
  onClose: () => void;
}

/**
 * Metadata Panel Overlay Component (must be inside ReactFlow context)
 * Displays node instance data in instance mode
 */
export function MetadataPanelOverlay({ nodeId, nodes, onClose }: MetadataPanelOverlayProps) {
  const { getNode, project } = useReactFlow();
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const selectedNode = nodes.find(n => n.id === nodeId);
  const metadata = selectedNode?.data?.instanceData;
  
  const updatePosition = useCallback(() => {
    if (!selectedNode) return;
    
    const node = getNode(nodeId);
    if (!node) return;
    
    // Try to get the actual DOM element
    const nodeElement = document.querySelector(`[data-id="${nodeId}"]`) as HTMLElement;
    
    if (nodeElement) {
      // Get the ReactFlow container
      const reactFlowContainer = nodeElement.closest('.react-flow') as HTMLElement;
      if (reactFlowContainer) {
        const containerRect = reactFlowContainer.getBoundingClientRect();
        const nodeRect = nodeElement.getBoundingClientRect();
        
        // Calculate position relative to ReactFlow container
        const x = nodeRect.right - containerRect.left + 20; // 20px spacing
        const y = nodeRect.top - containerRect.top;
        
        setPosition({ x, y });
        return;
      }
    }
    
    // Fallback: use project function
    const nodeWidth = node.width || 180;
    const spacing = 20;
    const screenPosition = project({
      x: node.position.x + nodeWidth + spacing,
      y: node.position.y,
    });
    setPosition(screenPosition);
  }, [nodeId, getNode, project, selectedNode]);
  
  useEffect(() => {
    updatePosition();
    
    // Update position on viewport changes (pan, zoom)
    const handleViewportChange = () => {
      updatePosition();
    };
    
    // Listen for ReactFlow viewport changes
    window.addEventListener('resize', handleViewportChange);
    const reactFlowContainer = document.querySelector('.react-flow');
    if (reactFlowContainer) {
      reactFlowContainer.addEventListener('wheel', handleViewportChange, { passive: true });
    }
    
    // Use MutationObserver to detect when node position changes
    const observer = new MutationObserver(updatePosition);
    const nodeElement = document.querySelector(`[data-id="${nodeId}"]`);
    if (nodeElement) {
      observer.observe(nodeElement, { attributes: true, attributeFilter: ['style', 'transform'] });
    }
    
    // Update position periodically to handle pan/zoom
    const intervalId = setInterval(updatePosition, 100);
    
    return () => {
      window.removeEventListener('resize', handleViewportChange);
      if (reactFlowContainer) {
        reactFlowContainer.removeEventListener('wheel', handleViewportChange);
      }
      observer.disconnect();
      clearInterval(intervalId);
    };
  }, [nodeId, updatePosition]);
  
  if (!metadata || !selectedNode) return null;
  
  return (
    <div
      style={{
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: '400px',
        maxHeight: '80vh',
        background: colors.bg,
        border: `1px solid ${colors.cursor}`,
        borderRadius: '8px',
        padding: '16px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        zIndex: 1000,
        overflow: 'auto',
        pointerEvents: 'auto',
        fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", Consolas, monospace',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: colors.variable }}>
          {selectedNode?.data?.label || 'node metadata'}
        </h3>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: `1px solid ${colors.border}`,
            borderRadius: '4px',
            fontSize: '14px',
            cursor: 'pointer',
            padding: '0',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: colors.textMuted,
          }}
        >
          ×
        </button>
      </div>
      <div style={{ fontSize: '12px', marginBottom: '12px', color: colors.textMuted }}>
        <span style={{ color: colors.comment }}>// </span>
        <span style={{ color: colors.keyword }}>status: </span>
        <span style={{ 
          color: metadata.status === 'success' ? colors.success : 
                 metadata.status === 'failed' ? colors.error : colors.textMuted 
        }}>
          {metadata.status}
        </span>
      </div>
      {metadata.input && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontWeight: '600', marginBottom: '4px', fontSize: '12px', color: colors.function }}>input:</div>
          <pre style={{ 
            background: colors.bgAlt, 
            border: `1px solid ${colors.border}`,
            padding: '8px', 
            borderRadius: '4px', 
            fontSize: '11px', 
            overflow: 'auto', 
            maxHeight: '200px',
            margin: 0,
            color: colors.string,
          }}>
            {JSON.stringify(metadata.input, null, 2)}
          </pre>
        </div>
      )}
      {metadata.output && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontWeight: '600', marginBottom: '4px', fontSize: '12px', color: colors.function }}>output:</div>
          <pre style={{ 
            background: colors.bgAlt, 
            border: `1px solid ${colors.border}`,
            padding: '8px', 
            borderRadius: '4px', 
            fontSize: '11px', 
            overflow: 'auto', 
            maxHeight: '200px',
            margin: 0,
            color: colors.string,
          }}>
            {JSON.stringify(metadata.output, null, 2)}
          </pre>
        </div>
      )}
      {metadata.error && (
        <div style={{ marginTop: '12px' }}>
          <div style={{ fontWeight: '600', marginBottom: '4px', fontSize: '12px', color: colors.error }}>error:</div>
          <div style={{ fontSize: '11px', color: colors.error, background: colors.bgAlt, border: `1px solid ${colors.error}`, padding: '8px', borderRadius: '4px' }}>{metadata.error}</div>
        </div>
      )}
    </div>
  );
}


