'use client';

import { NodeConfig, NodeKind } from './types';

interface NodeModalProps {
  nodeId?: string; // Optional - if provided, it's edit mode
  config: NodeConfig;
  onConfigChange: (config: NodeConfig) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function NodeModal({ nodeId, config, onConfigChange, onSave, onCancel }: NodeModalProps) {
  const isEditMode = !!nodeId;
  const title = isEditMode ? 'Edit Node' : 'Add New Node';
  const saveButtonText = isEditMode ? 'Save' : 'Add Node';
  const saveButtonColor = isEditMode ? '#4f46e5' : '#10b981';

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

        {isEditMode && nodeId && (
          <div style={{ marginBottom: '16px', padding: '8px', background: '#f3f4f6', borderRadius: '4px' }}>
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              Node ID: <strong>{nodeId}</strong>
            </div>
          </div>
        )}

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Name</label>
          <input
            type="text"
            value={config.name}
            onChange={(e) => onConfigChange({ ...config, name: e.target.value })}
            placeholder="Node name"
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '14px',
            }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Kind</label>
          <select
            value={config.kind}
            onChange={(e) =>
              onConfigChange({
                ...config,
                kind: e.target.value as NodeKind,
                data: {}, // Reset data when kind changes
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
            <option value="noop">Noop</option>
            <option value="http">HTTP</option>
            <option value="hook">Hook</option>
            <option value="timer">Timer</option>
            <option value="join">Join</option>
          </select>
        </div>

        {config.kind === 'http' && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>URL</label>
            <input
              type="text"
              value={config.data.url || ''}
              onChange={(e) =>
                onConfigChange({
                  ...config,
                  data: { ...config.data, url: e.target.value },
                })
              }
              placeholder="https://httpbin.org/post"
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            />
          </div>
        )}

        {config.kind === 'timer' && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
              Delay (milliseconds)
            </label>
            <input
              type="number"
              value={config.data.ms || ''}
              onChange={(e) =>
                onConfigChange({
                  ...config,
                  data: { ...config.data, ms: parseInt(e.target.value) || 0 },
                })
              }
              placeholder="30000"
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            />
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
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
              background: saveButtonColor,
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            {saveButtonText}
          </button>
        </div>
      </div>
    </div>
  );
}

