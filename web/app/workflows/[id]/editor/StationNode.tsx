'use client';

import { useEffect } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from 'reactflow';
import { FlowNode, NodeKind } from './types';

interface StationNodeProps extends NodeProps {
  data: FlowNode['data'];
}

function getKindIcon(kind: NodeKind) {
  const iconSize = 12;
  switch (kind) {
    case 'http':
      return (
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      );
    case 'hook':
      return (
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z" />
        </svg>
      );
    case 'timer':
      return (
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      );
    case 'join':
      return (
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
        </svg>
      );
    case 'noop':
    default:
      return (
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
        </svg>
      );
  }
}

export function StationNode({ data, id }: StationNodeProps) {
  const isHook = data.kind === 'hook';
  const { getEdges } = useReactFlow();

  useEffect(() => {
    console.log('[StationNode] mounted, edges:', getEdges());
  }, [getEdges]);

  return (
    <div
      style={{
        background: 'white',
        border: '2px solid #4f46e5',
        borderRadius: '8px',
        padding: '12px',
        minWidth: '150px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        position: 'relative',
      }}
    >
      {/* 2 handles: left + right. Each can be start OR end (with ConnectionMode.Loose). */}
      {!isHook && (
        <>
          <Handle
            id="left"
            type="source"
            position={Position.Left}
            style={{ top: '50%' }}
            isConnectableStart
            isConnectableEnd
          />
          <Handle
            id="right"
            type="source"
            position={Position.Right}
            style={{ top: '50%' }}
            isConnectableStart
            isConnectableEnd
          />
        </>
      )}

      {/* kind badge */}
      <div
        style={{
          position: 'absolute',
          top: '4px',
          left: '4px',
          background: '#4f46e5',
          color: 'white',
          padding: '2px 4px 2px 2px',
          borderRadius: '4px',
          fontSize: '10px',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        <div
          style={{
            background: '#3730a3',
            borderRadius: '3px',
            padding: '2px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {getKindIcon(data.kind)}
        </div>
        <span>{data.kind}</span>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '16px',
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
            {data.label} 
            {/* {id.slice(-3)} */}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              const event = new CustomEvent('editNode', { detail: { nodeId: id } });
              window.dispatchEvent(event);
            }}
            style={{
              background: '#4f46e5',
              border: 'none',
              borderRadius: '4px',
              width: '24px',
              height: '24px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
            }}
            title="Edit node"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm('Are you sure you want to delete this node?')) {
                const event = new CustomEvent('deleteNode', { detail: { nodeId: id } });
                window.dispatchEvent(event);
              }
            }}
            style={{
              background: '#ef4444',
              border: 'none',
              borderRadius: '4px',
              width: '24px',
              height: '24px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
            }}
            title="Delete node"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 0-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
