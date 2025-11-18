'use client';

import { Edge } from 'reactflow';
import { EdgeConfig, EdgeType } from './types';
import { useWorkflowEditor } from './WorkflowEditorContext';

interface EdgeModalProps {
  edgeId?: string; // Optional - if provided, it's edit mode (for future add-edge support)
  edge?: Edge; // Required for edit mode
  config: EdgeConfig;
  onConfigChange: (config: EdgeConfig) => void;
  onSave: () => void;
  onDelete?: () => void;
  onCancel: () => void;
}

export function EdgeModal({
  edgeId,
  edge,
  config,
  onConfigChange,
  onSave,
  onDelete,
  onCancel,
}: EdgeModalProps) {
  const { getNodeName } = useWorkflowEditor();

  const isEditMode = !!edge;
  const title = isEditMode ? 'Edit Edge' : 'Add New Edge';
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
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '8px',
          minWidth: '400px',
          maxWidth: '90vw',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '1.25rem', fontWeight: 'bold' }}>
          {title}
        </h3>

        {isEditMode && edge && (
          <div style={{ marginBottom: '16px', padding: '8px', background: '#f3f4f6', borderRadius: '4px' }}>
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              From: <strong>{sourceName}</strong> → To: <strong>{targetName}</strong>
            </div>
          </div>
        )}

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Edge Type</label>
          <select
            value={config.type}
            onChange={(e) =>
              onConfigChange({
                ...config,
                type: e.target.value as EdgeType,
                condition: e.target.value !== 'if' ? '' : config.condition,
              })
            }
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '14px',
            }}
          >
            <option value="normal">Normal</option>
            <option value="if">If (Conditional)</option>
            <option value="loop">Loop</option>
          </select>
        </div>

        {config.type === 'if' && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Condition</label>
            <input
              type="text"
              value={config.condition}
              onChange={(e) => onConfigChange({ ...config, condition: e.target.value })}
              placeholder="activity_metadata.body.someparam = 5"
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            />
            <div style={{ marginTop: '4px', fontSize: '0.75rem', color: '#6b7280' }}>
              Example: activity_metadata.body.someparam = 5
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between', alignItems: 'center' }}>
          {isEditMode && onDelete && (
            <button
              onClick={() => {
                if (confirm('Are you sure you want to delete this edge?')) {
                  onDelete();
                }
              }}
              style={{
                padding: '8px 16px',
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              Delete
            </button>
          )}
          <div style={{ display: 'flex', gap: '8px', marginLeft: isEditMode && onDelete ? '0' : 'auto' }}>
            <button
              onClick={onCancel}
              style={{
                padding: '8px 16px',
                background: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              style={{
                padding: '8px 16px',
                background: '#4f46e5',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

