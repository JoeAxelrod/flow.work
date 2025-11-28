'use client';

import { NodeConfig, NodeKind } from './types';

interface NodeModalProps {
  nodeId?: string; // Optional - if provided, it's edit mode
  config: NodeConfig;
  onConfigChange: (config: NodeConfig) => void;
  onSave: () => void;
  onCancel: () => void;
  isReadOnly?: boolean; // If true, form is read-only (instance mode)
}

export function NodeModal({ nodeId, config, onConfigChange, onSave, onCancel, isReadOnly = false }: NodeModalProps) {
  const isEditMode = !!nodeId;
  const title = isReadOnly ? 'View Node' : (isEditMode ? 'Edit Node' : 'Add New Node');
  const saveButtonText = isEditMode ? 'Save' : 'Add Node';
  const saveButtonColor = isEditMode ? '#4f46e5' : '#10b981';

  // Ensure config.data is always an object and kind defaults to 'http'
  const normalizedConfig = {
    ...config,
    kind: config.kind || 'http',
    data: config.data || {},
  };

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
            value={normalizedConfig.name}
            onChange={(e) => onConfigChange({ ...normalizedConfig, name: e.target.value })}
            placeholder="Node name"
            readOnly={isReadOnly}
            disabled={isReadOnly}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '14px',
              backgroundColor: isReadOnly ? '#f3f4f6' : 'white',
              cursor: isReadOnly ? 'not-allowed' : 'text',
            }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Kind {normalizedConfig.kind}</label>
          <select
            value={normalizedConfig.kind || 'http'}
            onChange={(e) =>
              onConfigChange({
                ...normalizedConfig,
                kind: e.target.value as NodeKind,
                data: {}, // Reset data when kind changes
              })
            }
            disabled={isReadOnly}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '14px',
              backgroundColor: isReadOnly ? '#f3f4f6' : 'white',
              cursor: isReadOnly ? 'not-allowed' : 'pointer',
            }}
          >
            <option value="http">HTTP</option>
            <option value="hook">Hook</option>
            <option value="timer">Timer</option>
          </select>
        </div>

        {normalizedConfig.kind === 'http' && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>URL</label>
            <input
              type="text"
              value={normalizedConfig.data.url || ''}
              onChange={(e) =>
                onConfigChange({
                  ...normalizedConfig,
                  data: { ...normalizedConfig.data, url: e.target.value },
                })
              }
              placeholder="https://httpbin.org/post"
              readOnly={isReadOnly}
              disabled={isReadOnly}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '14px',
                backgroundColor: isReadOnly ? '#f3f4f6' : 'white',
                cursor: isReadOnly ? 'not-allowed' : 'text',
              }}
            />
          </div>
        )}

        {normalizedConfig.kind === 'timer' && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
              Delay (milliseconds)
            </label>
            <input
              type="number"
              value={normalizedConfig.data.ms || ''}
              onChange={(e) =>
                onConfigChange({
                  ...normalizedConfig,
                  data: { ...normalizedConfig.data, ms: parseInt(e.target.value) || 0 },
                })
              }
              placeholder="30000"
              readOnly={isReadOnly}
              disabled={isReadOnly}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '14px',
                backgroundColor: isReadOnly ? '#f3f4f6' : 'white',
                cursor: isReadOnly ? 'not-allowed' : 'text',
              }}
            />
          </div>
        )}

        {!isReadOnly && (
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
        )}
        {isReadOnly && (
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
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

