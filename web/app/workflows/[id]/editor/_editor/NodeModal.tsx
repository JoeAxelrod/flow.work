'use client';

import { useState } from 'react';
import { NodeConfig, NodeKind } from './domain/types';

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

interface NodeModalProps {
  nodeId?: string; // Optional - if provided, it's edit mode
  config: NodeConfig;
  onConfigChange: (config: NodeConfig) => void;
  onSave: () => void;
  onCancel: () => void;
  isReadOnly?: boolean; // If true, form is read-only (instance mode)
}

export function NodeModal({ nodeId, config, onConfigChange, onSave, onCancel, isReadOnly = false }: NodeModalProps) {
  const [showInfo, setShowInfo] = useState(false);
  const isEditMode = !!nodeId;
  const title = isReadOnly ? 'view node' : (isEditMode ? 'edit node' : 'new node');
  const saveButtonText = isEditMode ? 'save' : 'add node';
  const saveButtonColor = isEditMode ? colors.cursor : colors.success;

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
          maxHeight: '90vh',
          overflow: 'auto',
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

        {isEditMode && nodeId && (
          <div style={{ marginBottom: '16px', padding: '8px', background: colors.bgAlt, borderRadius: '4px', border: `1px solid ${colors.border}` }}>
            <div style={{ fontSize: '0.75rem', color: colors.textMuted }}>
              <span style={{ color: colors.comment }}>// </span>
              id: <span style={{ color: colors.string }}>{nodeId}</span>
            </div>
          </div>
        )}

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: colors.textMuted, fontSize: '12px' }}>name</label>
          <input
            type="text"
            value={normalizedConfig.name}
            onChange={(e) => onConfigChange({ ...normalizedConfig, name: e.target.value })}
            placeholder="node-name"
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
              color: colors.text,
              cursor: isReadOnly ? 'not-allowed' : 'text',
              outline: 'none',
            }}
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: colors.textMuted, fontSize: '12px' }}>kind <span style={{ color: colors.function }}>{normalizedConfig.kind}</span></label>
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
            <option value="http">http</option>
            <option value="hook">hook</option>
            <option value="timer">timer</option>
            <option value="join">join</option>
            <option value="workflow">workflow</option>
          </select>
        </div>

        {normalizedConfig.kind === 'http' && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: colors.textMuted, fontSize: '12px' }}>url</label>
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
          </div>
        )}

        {normalizedConfig.kind === 'timer' && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: colors.textMuted, fontSize: '12px' }}>
              delay <span style={{ color: colors.comment }}>(ms)</span>
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
                padding: '10px 12px',
                border: `1px solid ${colors.border}`,
                borderRadius: '4px',
                fontSize: '14px',
                fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", Consolas, monospace',
                backgroundColor: isReadOnly ? colors.bgAlt : colors.bg,
                color: colors.variable,
                cursor: isReadOnly ? 'not-allowed' : 'text',
                outline: 'none',
              }}
            />
          </div>
        )}

        {normalizedConfig.kind === 'workflow' && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: colors.textMuted, fontSize: '12px' }}>
              workflowId
            </label>
            <input
              type="text"
              value={normalizedConfig.data.workflowId || normalizedConfig.data.workflow_id || ''}
              onChange={(e) =>
                onConfigChange({
                  ...normalizedConfig,
                  data: { 
                    ...normalizedConfig.data, 
                    workflowId: e.target.value,
                    workflow_id: e.target.value // Support both formats
                  },
                })
              }
              placeholder="uuid-of-nested-workflow"
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
              // uuid of the workflow to execute as nested workflow
            </div>
          </div>
        )}

        <div style={{ marginBottom: '16px', marginTop: '24px', paddingTop: '16px', borderTop: `1px solid ${colors.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <h4 style={{ marginTop: 0, marginBottom: 0, fontSize: '0.875rem', fontWeight: '600', color: colors.function }}>
              // JSONata Expressions
            </h4>
            <button
              onClick={() => setShowInfo(!showInfo)}
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                border: `1px solid ${colors.border}`,
                backgroundColor: colors.bgAlt,
                color: colors.textMuted,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: 'bold',
                padding: 0,
              }}
              title="Show JSONata examples"
            >
              ?
            </button>
          </div>
          <p style={{ marginBottom: '16px', fontSize: '0.75rem', color: colors.comment }}>
            Use JSONata expressions to transform input and output.
            <a 
              href="https://docs.jsonata.org/simple" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ marginLeft: '8px', color: colors.cursor, textDecoration: 'none' }}
            >
              docs →
            </a>
          </p>

          {showInfo && (
            <div style={{
              marginBottom: '16px',
              padding: '16px',
              backgroundColor: colors.bgAlt,
              border: `1px solid ${colors.border}`,
              borderRadius: '6px',
              fontSize: '0.75rem',
            }}>
              <div style={{ marginBottom: '12px', fontWeight: '600', color: colors.text }}>
                JSONata Examples:
              </div>
              
              <div style={{ marginBottom: '12px', padding: '8px', backgroundColor: colors.bg, borderRadius: '4px', fontSize: '0.7rem', color: colors.cursor, border: `1px solid ${colors.border}` }}>
                <strong>Context Variables:</strong>
                <div style={{ marginTop: '4px', color: colors.textMuted }}>
                  • <code style={{ color: colors.variable }}>input</code> = instanceState + currentInput<br/>
                  • <code style={{ color: colors.variable }}>currentInput</code> = raw input to this node<br/>
                  • <code style={{ color: colors.variable }}>instanceState</code> = outputs from previous nodes<br/>
                  • <code style={{ color: colors.variable }}>node</code> = node metadata (id, name, label, kind)
                </div>
              </div>
              
              <div style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.text }}>1. Simple Queries:</strong>
                <div style={{ marginTop: '4px', padding: '8px', backgroundColor: colors.bg, borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.7rem', color: colors.string, border: `1px solid ${colors.border}` }}>
                  {`{ "userId": input.userId, "name": input.profile.name }`}
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.text }}>2. Array Operations:</strong>
                <div style={{ marginTop: '4px', padding: '8px', backgroundColor: colors.bg, borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.7rem', color: colors.string, border: `1px solid ${colors.border}` }}>
                  {`{ "firstItem": input.items[0], "lastItem": input.items[-1] }`}
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.text }}>3. String Functions:</strong>
                <div style={{ marginTop: '4px', padding: '8px', backgroundColor: colors.bg, borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.7rem', color: colors.string, border: `1px solid ${colors.border}` }}>
                  {`{ "upper": $uppercase(input.name), "lower": $lowercase(input.email) }`}
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <strong style={{ color: colors.text }}>4. Filtering:</strong>
                <div style={{ marginTop: '4px', padding: '8px', backgroundColor: colors.bg, borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.7rem', color: colors.string, border: `1px solid ${colors.border}` }}>
                  {`{ "active": input.users[status = "active"] }`}
                </div>
              </div>

              <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${colors.border}`, fontSize: '0.7rem', color: colors.comment }}>
                <a 
                  href="https://docs.jsonata.org/simple" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ color: colors.cursor, textDecoration: 'none' }}
                >
                  full docs →
                </a>
              </div>
            </div>
          )}
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: colors.textMuted, fontSize: '12px' }}>
              inputExpression
            </label>
            <textarea
              value={normalizedConfig.data.inputExpression || normalizedConfig.data.input_expression || ''}
              onChange={(e) =>
                onConfigChange({
                  ...normalizedConfig,
                  data: { 
                    ...normalizedConfig.data, 
                    inputExpression: e.target.value,
                    input_expression: e.target.value // Support both formats
                  },
                })
              }
              placeholder='{ "userId": input.userId }'
              readOnly={isReadOnly}
              disabled={isReadOnly}
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: `1px solid ${colors.border}`,
                borderRadius: '4px',
                fontSize: '13px',
                fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", Consolas, monospace',
                backgroundColor: isReadOnly ? colors.bgAlt : colors.bg,
                color: colors.string,
                cursor: isReadOnly ? 'not-allowed' : 'text',
                resize: 'vertical',
                outline: 'none',
              }}
            />
            <div style={{ marginTop: '4px', fontSize: '0.65rem', color: colors.comment }}>
              // context: input, instanceState, currentInput, node
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', color: colors.textMuted, fontSize: '12px' }}>
              outputExpression
            </label>
            <textarea
              value={normalizedConfig.data.outputExpression || normalizedConfig.data.output_expression || ''}
              onChange={(e) =>
                onConfigChange({
                  ...normalizedConfig,
                  data: { 
                    ...normalizedConfig.data, 
                    outputExpression: e.target.value,
                    output_expression: e.target.value // Support both formats
                  },
                })
              }
              placeholder='{ "result": output.data }'
              readOnly={isReadOnly}
              disabled={isReadOnly}
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: `1px solid ${colors.border}`,
                borderRadius: '4px',
                fontSize: '13px',
                fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", Consolas, monospace',
                backgroundColor: isReadOnly ? colors.bgAlt : colors.bg,
                color: colors.string,
                cursor: isReadOnly ? 'not-allowed' : 'text',
                resize: 'vertical',
                outline: 'none',
              }}
            />
            <div style={{ marginTop: '4px', fontSize: '0.65rem', color: colors.comment }}>
              // context: input, output, instanceState, node
            </div>
          </div>
        </div>

        {!isReadOnly && (
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
              cancel
            </button>
            <button
              onClick={onSave}
              style={{
                padding: '8px 16px',
                background: saveButtonColor,
                color: colors.bg,
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontFamily: '"JetBrains Mono", "Fira Code", "SF Mono", Consolas, monospace',
                fontSize: '13px',
              }}
            >
              {saveButtonText}
            </button>
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
