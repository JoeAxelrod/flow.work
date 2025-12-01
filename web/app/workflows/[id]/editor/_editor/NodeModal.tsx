'use client';

import { useState } from 'react';
import { NodeConfig, NodeKind } from './domain/types';

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
            <option value="join">Join</option>
            <option value="workflow">Workflow</option>
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

        {normalizedConfig.kind === 'workflow' && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
              Workflow ID
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
              placeholder="Enter workflow UUID"
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
            <div style={{ marginTop: '4px', fontSize: '0.75rem', color: '#6b7280' }}>
              The UUID of the workflow to execute as a nested workflow
            </div>
          </div>
        )}

        <div style={{ marginBottom: '16px', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <h4 style={{ marginTop: 0, marginBottom: 0, fontSize: '1rem', fontWeight: '600', color: '#374151' }}>
              JSONata Expressions
            </h4>
            <button
              onClick={() => setShowInfo(!showInfo)}
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                border: '1px solid #d1d5db',
                backgroundColor: '#f9fafb',
                color: '#6b7280',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 'bold',
                padding: 0,
              }}
              title="Show JSONata examples"
            >
              i
            </button>
          </div>
          <p style={{ marginBottom: '16px', fontSize: '0.875rem', color: '#6b7280' }}>
            Use JSONata expressions to transform input and output. Input/output are always JSON objects.
            <a 
              href="https://docs.jsonata.org/simple" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ marginLeft: '8px', color: '#3b82f6', textDecoration: 'underline' }}
            >
              Documentation
            </a>
          </p>

          {showInfo && (
            <div style={{
              marginBottom: '16px',
              padding: '16px',
              backgroundColor: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '0.875rem',
            }}>
              <div style={{ marginBottom: '12px', fontWeight: '600', color: '#374151' }}>
                JSONata Examples:
              </div>
              
              <div style={{ marginBottom: '12px', padding: '8px', backgroundColor: '#eff6ff', borderRadius: '4px', fontSize: '0.75rem', color: '#1e40af' }}>
                <strong>Context Variables:</strong>
                <div style={{ marginTop: '4px' }}>
                  • <code>input</code> = instanceState + currentInput (merged, for convenience)<br/>
                  • <code>currentInput</code> = raw input passed to this node<br/>
                  • <code>instanceState</code> = all outputs from previous nodes<br/>
                  • <code>node</code> = node metadata (id, name, label, kind)
                </div>
              </div>
              
              <div style={{ marginBottom: '12px' }}>
                <strong style={{ color: '#374151' }}>1. Simple Queries - Navigating Objects:</strong>
                <div style={{ marginTop: '4px', padding: '8px', backgroundColor: 'white', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                  {`{ "userId": input.userId, "name": input.profile.name }`}
                </div>
                <div style={{ marginTop: '4px', fontSize: '0.75rem', color: '#6b7280' }}>
                  Access nested properties using dot notation
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <strong style={{ color: '#374151' }}>2. Array Operations:</strong>
                <div style={{ marginTop: '4px', padding: '8px', backgroundColor: 'white', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                  {`{ "firstItem": input.items[0], "lastItem": input.items[-1], "allIds": input.items.id }`}
                </div>
                <div style={{ marginTop: '4px', fontSize: '0.75rem', color: '#6b7280' }}>
                  Access array elements by index (0-based, -1 for last)
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <strong style={{ color: '#374151' }}>3. String Functions:</strong>
                <div style={{ marginTop: '4px', padding: '8px', backgroundColor: 'white', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                  {`{ "upperName": $uppercase(input.name), "lowerEmail": $lowercase(input.email), "trimmed": $trim(input.description) }`}
                </div>
                <div style={{ marginTop: '4px', fontSize: '0.75rem', color: '#6b7280' }}>
                  Transform strings: $uppercase(), $lowercase(), $trim()
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <strong style={{ color: '#374151' }}>4. Predicate Queries - Filtering:</strong>
                <div style={{ marginTop: '4px', padding: '8px', backgroundColor: 'white', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                  {`{ "activeUsers": input.users[status = "active"], "highValue": input.orders[total > 100] }`}
                </div>
                <div style={{ marginTop: '4px', fontSize: '0.75rem', color: '#6b7280' }}>
                  Filter arrays based on conditions
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <strong style={{ color: '#374151' }}>5. Date/Time Functions:</strong>
                <div style={{ marginTop: '4px', padding: '8px', backgroundColor: 'white', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                  {`{ "timestamp": $now(), "millis": $millis(), "date": $fromMillis(input.timestamp) }`}
                </div>
                <div style={{ marginTop: '4px', fontSize: '0.75rem', color: '#6b7280' }}>
                  Work with dates: $now(), $millis(), $fromMillis()
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <strong style={{ color: '#374151' }}>6. Node Metadata:</strong>
                <div style={{ marginTop: '4px', padding: '8px', backgroundColor: 'white', borderRadius: '4px', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                  {`{ "nodeName": node.name, "nodeId": node.id, "nodeKind": node.kind, "message": "Processing in " & node.name }`}
                </div>
                <div style={{ marginTop: '4px', fontSize: '0.75rem', color: '#6b7280' }}>
                  Access node information: node.id, node.name, node.label, node.kind
                </div>
              </div>

              <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e5e7eb', fontSize: '0.75rem', color: '#6b7280' }}>
                <a 
                  href="https://docs.jsonata.org/simple" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ color: '#3b82f6', textDecoration: 'underline' }}
                >
                  View full JSONata documentation →
                </a>
              </div>
            </div>
          )}
          
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
              Input Expression (JSONata)
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
              placeholder='Example: { "userId": input.userId, "nodeName": node.name }'
              readOnly={isReadOnly}
              disabled={isReadOnly}
              rows={4}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '14px',
                fontFamily: 'monospace',
                backgroundColor: isReadOnly ? '#f3f4f6' : 'white',
                cursor: isReadOnly ? 'not-allowed' : 'text',
                resize: 'vertical',
              }}
            />
            <div style={{ marginTop: '4px', fontSize: '0.75rem', color: '#6b7280' }}>
              Available context: input (instanceState + currentInput), instanceState, currentInput (raw input), node (id, name, label, kind)
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>
              Output Expression (JSONata)
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
              placeholder='Example: { "processed": true, "result": output.data }'
              readOnly={isReadOnly}
              disabled={isReadOnly}
              rows={4}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '14px',
                fontFamily: 'monospace',
                backgroundColor: isReadOnly ? '#f3f4f6' : 'white',
                cursor: isReadOnly ? 'not-allowed' : 'text',
                resize: 'vertical',
              }}
            />
            <div style={{ marginTop: '4px', fontSize: '0.75rem', color: '#6b7280' }}>
              Available context: input, output, instanceState, currentOutput (same as output), node (id, name, label, kind)
            </div>
          </div>
        </div>

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


