'use client';

import { useEffect, useState } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from 'reactflow';
import { FlowNode, NodeKind } from './domain/types';

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
    case 'workflow':
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
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <rect x="7" y="7" width="10" height="10" rx="1" ry="1" />
          <line x1="7" y1="7" x2="17" y2="17" />
          <line x1="17" y1="7" x2="7" y2="17" />
        </svg>
      );
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
  const isInstanceMode = data.isInstanceMode || false;
  const instanceData = data.instanceData;
  const executionCount = instanceData?.executionCount ?? 0;
  const { getEdges } = useReactFlow();
  const allowConnections = !isInstanceMode;

  useEffect(() => {
    console.log('[StationNode] mounted, edges:', getEdges());
  }, [getEdges]);

  // Get border color based on instance status
  const getBorderColor = () => {
    if (!instanceData) return '#9ca3af'; // gray for no activity
    const status = instanceData.status?.toLowerCase();
    if (status === 'success' || status === 'completed') return '#10b981'; // green for success
    if (status === 'failed' || status === 'error') return '#ef4444'; // red for failed/error
    return '#9ca3af'; // gray for other statuses (no activity)
  };

  const handleMetadataToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const event = new CustomEvent('toggleMetadata', { detail: { nodeId: id } });
    window.dispatchEvent(event);
  };

  // Check if node is currently running (started but not finished)
  const isRunning = instanceData && 
    instanceData.startedAt && 
    !instanceData.finishedAt &&
    instanceData.status?.toLowerCase() !== 'success' &&
    instanceData.status?.toLowerCase() !== 'completed' &&
    instanceData.status?.toLowerCase() !== 'failed' &&
    instanceData.status?.toLowerCase() !== 'error';

  // In instance mode, always use activity-based colors (gray/green/red), never purple
  // Outside instance mode, use purple for nodes without activity, gray/green/red for nodes with activity
  const borderColor = isInstanceMode
    ? getBorderColor() // In instance mode: always gray/green/red based on activity
    : (instanceData ? getBorderColor() : '#4f46e5'); // Outside instance mode: purple if no activity, otherwise activity-based

  return (
    <div
      style={{
        background: 'white',
        border: `2px solid ${borderColor}`,
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
            style={{
              top: '50%',
              pointerEvents: allowConnections ? 'auto' : 'none',
              opacity: allowConnections ? 1 : 0,
            }}
            isConnectableStart={allowConnections}
            isConnectableEnd={allowConnections}
          />
          <Handle
            id="right"
            type="source"
            position={Position.Right}
            style={{
              top: '50%',
              pointerEvents: allowConnections ? 'auto' : 'none',
              opacity: allowConnections ? 1 : 0,
            }}
            isConnectableStart={allowConnections}
            isConnectableEnd={allowConnections}
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

      {/* execution count badge (always show in instance mode, including 0) */}
      {isInstanceMode && (
        <div
          style={{
            position: 'absolute',
            top: '4px',
            right: '4px',
            background: '#111827',
            color: 'white',
            padding: '2px 6px',
            borderRadius: '999px',
            fontSize: '10px',
            fontWeight: 'bold',
            lineHeight: 1,
            minWidth: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
          }}
          title={executionCount === 0 
            ? 'Not executed' 
            : `Executed ${executionCount} time${executionCount !== 1 ? 's' : ''}`}
        >
          <span>{executionCount}</span>
          {isRunning && (
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              style={{ 
                flexShrink: 0,
                animation: 'spin 0.8s linear infinite',
              }}
            >
              <circle 
                cx="12" 
                cy="12" 
                r="10" 
                strokeDasharray="47" 
                strokeDashoffset="23.5"
                opacity="0.8"
              />
            </svg>
          )}
          {!isRunning && executionCount > 0 && instanceData && (instanceData.status?.toLowerCase() === 'success' || instanceData.status?.toLowerCase() === 'completed') && (
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#10b981"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ flexShrink: 0 }}
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </div>
      )}
      
      {/* Add CSS animation for spinner */}
      <style>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '16px',
        }}
      >
        <div style={{ flex: 1, marginRight: '8px' }}>
          <div style={{ fontWeight: 'bold', fontSize: '14px' }}>
            {data.label}
          </div>
          <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>
            {id.slice(-4)}
          </div>
          {instanceData && (
            <div style={{ fontSize: '10px', color: instanceData.status === 'success' ? '#10b981' : instanceData.status === 'failed' ? '#ef4444' : '#6b7280', marginTop: '4px' }}>
              Status: {instanceData.status}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', flexShrink: 0, marginLeft: '8px' }}>
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
            title="Settings"
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
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
          {instanceData && (
            <button
              onClick={handleMetadataToggle}
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
              title="View metadata"
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
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </button>
          )}
          {!isInstanceMode && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const event = new CustomEvent('copyNode', { detail: { nodeId: id } });
                  window.dispatchEvent(event);
                }}
                style={{
                  background: '#10b981',
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
                title="Copy node"
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
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
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
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


