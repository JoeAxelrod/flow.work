'use client';

import { useEffect, useState } from 'react';
import { Handle, Position, NodeProps, useReactFlow } from 'reactflow';
import { FlowNode, NodeKind } from './domain/types';
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

// Dark theme colors (matching CodeLayout)
const colors = {
  bg: '#0d1117',
  bgAlt: '#161b22',
  border: '#30363d',
  text: '#c9d1d9',
  textMuted: '#8b949e',
  function: '#d2a8ff',
  variable: '#79c0ff',
  success: '#3fb950',
  cursor: '#58a6ff',
  error: '#f85149',
};

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
    if (!instanceData) return colors.border; // dark border for no activity
    const status = instanceData.status?.toLowerCase();
    if (status === 'success' || status === 'completed') return colors.success; // green for success
    if (status === 'failed' || status === 'error') return colors.error; // red for failed/error
    return colors.border; // dark border for other statuses (no activity)
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

  // In instance mode, always use activity-based colors, never accent color
  // Outside instance mode, use accent for nodes without activity, activity-based colors for nodes with activity
  const borderColor = isInstanceMode
    ? getBorderColor() // In instance mode: always based on activity
    : (instanceData ? getBorderColor() : colors.cursor); // Outside instance mode: accent if no activity, otherwise activity-based

  return (
    <div
      style={{
        background: colors.bgAlt,
        border: `2px solid ${borderColor}`,
        borderRadius: '8px',
        padding: '12px',
        minWidth: '150px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
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
          background: colors.function,
          color: colors.bg,
          padding: '2px 4px 2px 2px',
          borderRadius: '4px',
          fontSize: '10px',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", Consolas, monospace',
        }}
      >
        <div
          style={{
            background: 'rgba(0,0,0,0.2)',
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
            background: colors.bg,
            color: colors.text,
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
            border: `1px solid ${colors.border}`,
            fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", Consolas, monospace',
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
                color: colors.cursor,
              }}
            />
          )}
          {!isRunning && executionCount > 0 && instanceData && (instanceData.status?.toLowerCase() === 'success' || instanceData.status?.toLowerCase() === 'completed') && (
            <CheckIcon
              sx={{
                fontSize: 10,
                flexShrink: 0,
                color: colors.success,
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
        <div style={{ flex: 1, marginRight: '8px' }}>
          <div style={{ 
            fontWeight: 'bold', 
            fontSize: '14px', 
            color: colors.variable,
            fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", Consolas, monospace',
          }}>
            {data.label}
          </div>
          {/* Always reserve space for status to keep consistent node size */}
          <div style={{ 
            fontSize: '10px', 
            color: instanceData?.status === 'success' ? colors.success : instanceData?.status === 'failed' ? colors.error : colors.textMuted, 
            marginTop: '4px',
            fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", Consolas, monospace',
            minHeight: '15px',
            visibility: instanceData ? 'visible' : 'hidden',
          }}>
            {instanceData?.status || 'pending'}
          </div>
        </div>
        {/* Fixed width button container to prevent node size changes */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px', flexShrink: 0, marginLeft: '8px', minWidth: '80px' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              const event = new CustomEvent('editNode', { detail: { nodeId: id } });
              window.dispatchEvent(event);
            }}
            style={{
              background: 'transparent',
              border: `1px solid ${colors.border}`,
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
            <SettingsIcon sx={{ fontSize: 14, color: colors.textMuted }} />
          </button>
          {/* Info button - only in instance mode */}
          {isInstanceMode && (
            <button
              onClick={instanceData ? handleMetadataToggle : undefined}
              style={{
                background: 'transparent',
                border: `1px solid ${instanceData ? colors.cursor : colors.border}`,
                borderRadius: '4px',
                width: '24px',
                height: '24px',
                cursor: instanceData ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                opacity: instanceData ? 1 : 0.3,
              }}
              title="View metadata"
              disabled={!instanceData}
            >
              <InfoIcon sx={{ fontSize: 14, color: instanceData ? colors.cursor : colors.textMuted }} />
            </button>
          )}
          {/* Copy button - only in edit mode */}
          {!isInstanceMode && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                const event = new CustomEvent('copyNode', { detail: { nodeId: id } });
                window.dispatchEvent(event);
              }}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.success}`,
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
              <CopyIcon sx={{ fontSize: 14, color: colors.success }} />
            </button>
          )}
          {/* Delete button - only in edit mode */}
          {!isInstanceMode && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('Are you sure you want to delete this node?')) {
                  const event = new CustomEvent('deleteNode', { detail: { nodeId: id } });
                  window.dispatchEvent(event);
                }
              }}
              style={{
                background: 'transparent',
                border: `1px solid ${colors.error}`,
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
              <DeleteIcon sx={{ fontSize: 14, color: colors.error }} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


