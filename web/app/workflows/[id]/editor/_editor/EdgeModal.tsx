'use client';

import { Edge } from 'reactflow';
import { EdgeConfig, EdgeType } from './domain/types';
import { useWorkflowEditor } from './WorkflowEditorContext';
import { Delete as DeleteIcon } from '@mui/icons-material';

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

interface EdgeModalProps {
  edgeId?: string; // Optional - if provided, it's edit mode (for future add-edge support)
  edge?: Edge; // Required for edit mode
  config: EdgeConfig;
  onConfigChange: (config: EdgeConfig) => void;
  onSave: () => void;
  onDelete?: () => void;
  onCancel: () => void;
  isReadOnly?: boolean; // If true, form is read-only (instance mode)
}

export function EdgeModal({
  edgeId,
  edge,
  config,
  onConfigChange,
  onSave,
  onDelete,
  onCancel,
  isReadOnly = false,
}: EdgeModalProps) {
  const { getNodeName } = useWorkflowEditor();

  const isEditMode = !!edge;
  const title = isReadOnly ? 'view edge' : (isEditMode ? 'edit edge' : 'new edge');
  const sourceName = edge ? getNodeName(edge.source) : '';
  const targetName = edge ? getNodeName(edge.target) : '';

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          backgroundColor: colors.bg,
          border: `1px solid ${colors.border}`,
          padding: '24px',
          borderRadius: '8px',
          minWidth: '400px',
          maxWidth: '90vw',
          fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", Consolas, monospace',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ 
          marginTop: 0, 
          marginBottom: '16px', 
          fontSize: '1rem', 
          fontWeight: '600',
          color: colors.text,
        }}>
          <span style={{ color: colors.keyword }}>const</span>{' '}
          <span style={{ color: colors.variable }}>{title}</span>{' '}
          <span style={{ color: colors.text }}>=</span>{' '}
          <span style={{ color: colors.function }}>{`{}`}</span>
        </h3>

        {isEditMode && edge && (
          <div style={{ marginBottom: '16px', padding: '8px', background: colors.bgAlt, borderRadius: '4px', border: `1px solid ${colors.border}` }}>
            <div style={{ fontSize: '0.75rem', color: colors.textMuted }}>
              <span style={{ color: colors.variable }}>{sourceName}</span>
              <span style={{ color: colors.keyword }}> → </span>
              <span style={{ color: colors.variable }}>{targetName}</span>
            </div>
          </div>
        )}

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: colors.textMuted, fontSize: '12px' }}>type</label>
          <select
            value={config.type}
            onChange={(e) => {
              const newType = e.target.value as EdgeType;
              let newCondition = config.condition;
              if (newType === 'if') {
                // When switching to "if", ensure condition starts with "input."
                if (!newCondition || !newCondition.startsWith('input.')) {
                  newCondition = newCondition ? 'input.' + newCondition.replace(/^input\./, '') : 'input.';
                }
              } else {
                newCondition = '';
              }
              onConfigChange({
                ...config,
                type: newType,
                condition: newCondition,
              });
            }}
            disabled={isReadOnly}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: `1px solid ${colors.border}`,
              borderRadius: '4px',
              fontSize: '14px',
              fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", Consolas, monospace',
              backgroundColor: isReadOnly ? colors.bgAlt : colors.bg,
              color: colors.text,
              cursor: isReadOnly ? 'not-allowed' : 'pointer',
              outline: 'none',
            }}
          >
            <option value="normal">normal</option>
            <option value="if">if (conditional)</option>
          </select>
        </div>

        {config.type === 'if' && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: colors.textMuted, fontSize: '12px' }}>condition</label>
            <input
              type="text"
              value={config.condition}
              onChange={(e) => {
                let value = e.target.value;
                // Force value to start with "input."
                if (!value.startsWith('input.')) {
                  if (value.startsWith('input')) {
                    // If it starts with "input" but missing the dot, add the dot after "input"
                    value = 'input.' + value.slice(5);
                  } else if (value.length > 0) {
                    // If user is typing something else, prepend "input."
                    value = 'input.' + value;
                  } else {
                    // Empty value, set to "input."
                    value = 'input.';
                  }
                }
                onConfigChange({ ...config, condition: value });
              }}
              onBlur={(e) => {
                // Ensure value starts with "input." on blur as well
                let value = e.target.value;
                if (!value.startsWith('input.')) {
                  if (value.startsWith('input')) {
                    // If it starts with "input" but missing the dot, add the dot after "input"
                    value = 'input.' + value.slice(5);
                  } else if (value.length > 0) {
                    // If user typed something else, prepend "input."
                    value = 'input.' + value;
                  } else {
                    // Empty value, set to "input."
                    value = 'input.';
                  }
                  onConfigChange({ ...config, condition: value });
                }
              }}
              placeholder="input.someparam < 5"
              readOnly={isReadOnly}
              disabled={isReadOnly}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: `1px solid ${colors.border}`,
                borderRadius: '4px',
                fontSize: '14px',
                fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", Consolas, monospace',
                backgroundColor: isReadOnly ? colors.bgAlt : colors.bg,
                color: colors.string,
                cursor: isReadOnly ? 'not-allowed' : 'text',
                outline: 'none',
              }}
            />
            <div style={{ marginTop: '4px', fontSize: '0.7rem', color: colors.comment }}>
              // example: input.someparam {'<'} 5
            </div>
          </div>
        )}

        {!isReadOnly && (
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${colors.border}`, paddingTop: '16px' }}>
            {isEditMode && onDelete && (
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to delete this edge?')) {
                    onDelete();
                  }
                }}
                style={{
                  padding: '8px 16px',
                  background: 'transparent',
                  color: colors.error,
                  border: `1px solid ${colors.error}`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", Consolas, monospace',
                  fontSize: '13px',
                }}
              >
                <DeleteIcon sx={{ fontSize: 14 }} />
                delete
              </button>
            )}
            <div style={{ display: 'flex', gap: '8px', marginLeft: isEditMode && onDelete ? '0' : 'auto' }}>
              <button
                onClick={onCancel}
                style={{
                  padding: '8px 16px',
                  background: 'transparent',
                  color: colors.textMuted,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", Consolas, monospace',
                  fontSize: '13px',
                }}
              >
                cancel
              </button>
              <button
                onClick={onSave}
                style={{
                  padding: '8px 16px',
                  background: colors.cursor,
                  color: colors.bg,
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", Consolas, monospace',
                  fontSize: '13px',
                }}
              >
                save
              </button>
            </div>
          </div>
        )}
        {isReadOnly && (
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', borderTop: `1px solid ${colors.border}`, paddingTop: '16px' }}>
            <button
              onClick={onCancel}
              style={{
                padding: '8px 16px',
                background: 'transparent',
                color: colors.textMuted,
                border: `1px solid ${colors.border}`,
                borderRadius: '4px',
                cursor: 'pointer',
                fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", Consolas, monospace',
                fontSize: '13px',
              }}
            >
              close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
