'use client';

import { useEffect, useState } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from 'reactflow';
import { FlowNode, NodeKind } from './_editor/domain/types';
import {
  Language as HttpIcon,
  Webhook as HookIcon,
  Schedule as TimerIcon,
  CallMerge as JoinIcon,
  AccountTree as WorkflowIcon,
  RadioButtonUnchecked as DefaultIcon,
  Autorenew as SpinnerIcon,
  Check as CheckIcon,
  Settings as SettingsIcon,
  Info as InfoIcon,
  ContentCopy as CopyIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';

interface StationNodeProps extends NodeProps {
  data: FlowNode['data'];
}

const iconSize = 12;

function getKindIcon(kind: NodeKind) {
  const iconStyle = { fontSize: iconSize };
  switch (kind) {
    case 'http':
      return <HttpIcon sx={iconStyle} />;
    case 'hook':
      return <HookIcon sx={iconStyle} />;
    case 'timer':
      return <TimerIcon sx={iconStyle} />;
    case 'join':
      return <JoinIcon sx={iconStyle} />;
    case 'workflow':
      return <WorkflowIcon sx={iconStyle} />;
    default:
      return <DefaultIcon sx={iconStyle} />;
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
            <SpinnerIcon
              sx={{
                fontSize: 10,
                flexShrink: 0,
                animation: 'spin 0.8s linear infinite',
                color: 'white',
              }}
            />
          )}
          {!isRunning && executionCount > 0 && instanceData && (instanceData.status?.toLowerCase() === 'success' || instanceData.status?.toLowerCase() === 'completed') && (
            <CheckIcon
              sx={{
                fontSize: 10,
                flexShrink: 0,
                color: '#10b981',
              }}
            />
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
        <div style={{ flex: 1 }}>
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', flexShrink: 0 }}>
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
            <SettingsIcon sx={{ fontSize: 14, color: 'white' }} />
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
              <InfoIcon sx={{ fontSize: 14, color: 'white' }} />
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
                <CopyIcon sx={{ fontSize: 14, color: 'white' }} />
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
                <DeleteIcon sx={{ fontSize: 14, color: 'white' }} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
