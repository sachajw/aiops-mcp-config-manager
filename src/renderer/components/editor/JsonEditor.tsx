import React, { useRef, useEffect, useState } from 'react';
import { Alert, Space, Button, Typography, Row, Col } from 'antd';
import { 
  FormatPainterOutlined, 
  CheckCircleOutlined, 
  ExclamationCircleOutlined,
  InfoCircleOutlined 
} from '@ant-design/icons';
import Editor from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import type * as monaco from 'monaco-editor';
import { MCPClient } from '../../../shared/types';

const { Text } = Typography;

export interface JsonEditorProps {
  value: string;
  onChange: (value: string) => void;
  errors?: string[];
  readonly?: boolean;
  client?: MCPClient;
  height?: number;
  theme?: 'vs-light' | 'vs-dark';
}

const JsonEditor: React.FC<JsonEditorProps> = ({
  value,
  onChange,
  errors = [],
  readonly = false,
  client,
  height = 500,
  theme = 'vs-light'
}) => {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const [isFormatted, setIsFormatted] = useState(true);

  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor, monacoInstance: typeof monaco) => {
    editorRef.current = editor;

    // Configure editor options
    editor.updateOptions({
      readOnly: readonly,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      tabSize: 2,
      insertSpaces: true,
      wordWrap: 'on',
      lineNumbers: 'on',
      folding: true,
      bracketPairColorization: { enabled: true }
    });

    // Add keyboard shortcuts
    editor.addCommand(
      monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyS,
      () => {
        // Handle save - could trigger parent save action
        console.log('Save shortcut triggered');
      }
    );

    editor.addCommand(
      monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyMod.Shift | monacoInstance.KeyCode.KeyF,
      () => {
        handleFormat();
      }
    );
  };

  const handleEditorChange = (newValue: string | undefined) => {
    if (newValue !== undefined) {
      onChange(newValue);
      
      // Check if content is formatted
      try {
        const parsed = JSON.parse(newValue);
        const formatted = JSON.stringify(parsed, null, 2);
        setIsFormatted(formatted === newValue);
      } catch {
        setIsFormatted(false);
      }
    }
  };

  const handleFormat = () => {
    if (!editorRef.current) return;

    try {
      const parsed = JSON.parse(value);
      const formatted = JSON.stringify(parsed, null, 2);
      editorRef.current.setValue(formatted);
      onChange(formatted);
      setIsFormatted(true);
    } catch (error) {
      console.warn('Cannot format invalid JSON');
    }
  };

  const getEditorLanguage = () => {
    // Could customize based on client type if needed
    return 'json';
  };

  const getJsonSchema = () => {
    // Basic MCP configuration schema
    return {
      type: 'object',
      properties: {
        mcpServers: {
          type: 'object',
          patternProperties: {
            '^.*$': {
              type: 'object',
              properties: {
                command: {
                  type: 'string',
                  description: 'Path to the MCP server executable'
                },
                args: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Command line arguments for the server'
                },
                env: {
                  type: 'object',
                  patternProperties: {
                    '^.*$': { type: 'string' }
                  },
                  description: 'Environment variables for the server'
                },
                cwd: {
                  type: 'string',
                  description: 'Working directory for the server'
                },
                enabled: {
                  type: 'boolean',
                  description: 'Whether the server is enabled'
                }
              },
              required: ['command']
            }
          }
        },
        metadata: {
          type: 'object',
          properties: {
            lastModified: {
              type: 'string',
              format: 'date-time'
            },
            version: {
              type: 'string'
            },
            scope: {
              type: 'string',
              enum: ['global', 'user', 'local', 'project']
            }
          }
        }
      },
      required: ['mcpServers']
    };
  };

  // Configure Monaco Editor options
  const editorOptions: editor.IStandaloneEditorConstructionOptions = {
    theme: theme,
    language: 'json',
    readOnly: readonly,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    automaticLayout: true,
    tabSize: 2,
    insertSpaces: true,
    wordWrap: 'on',
    lineNumbers: 'on',
    folding: true,
    bracketPairColorization: { enabled: true },
    suggest: {
      showKeywords: true,
      showSnippets: true
    },
    quickSuggestions: {
      other: true,
      comments: true,
      strings: true
    }
  };

  return (
    <div>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {/* Editor Status Bar */}
        <Row justify="space-between" align="middle">
          <Col>
            <Space size="middle">
              <Space size="small">
                {errors.length === 0 ? (
                  <>
                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    <Text type="success">Valid JSON</Text>
                  </>
                ) : (
                  <>
                    <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
                    <Text type="danger">{errors.length} error{errors.length !== 1 ? 's' : ''}</Text>
                  </>
                )}
              </Space>

              {!isFormatted && errors.length === 0 && (
                <Space size="small">
                  <InfoCircleOutlined style={{ color: '#faad14' }} />
                  <Text type="warning">Unformatted</Text>
                </Space>
              )}
            </Space>
          </Col>
          <Col>
            <Space>
              <Button
                size="small"
                icon={<FormatPainterOutlined />}
                onClick={handleFormat}
                disabled={readonly || errors.length > 0}
              >
                Format
              </Button>
            </Space>
          </Col>
        </Row>

        {/* Error Display */}
        {errors.length > 0 && (
          <Alert
            message="JSON Syntax Errors"
            description={
              <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            }
            type="error"
            showIcon
          />
        )}

        {/* Help Text */}
        {client && (
          <Alert
            message={`Editing configuration for ${client.name}`}
            description={
              <div>
                <p>This JSON configuration will be saved to: <code>{client.configPaths.primary}</code></p>
                <p>Use <kbd>Ctrl+S</kbd> to save, <kbd>Ctrl+Shift+F</kbd> to format.</p>
              </div>
            }
            type="info"
            showIcon
            style={{ fontSize: '12px' }}
          />
        )}

        {/* Monaco Editor */}
        <div style={{ border: '1px solid #d9d9d9', borderRadius: '6px', overflow: 'hidden' }}>
          <Editor
            height={height}
            value={value}
            options={editorOptions}
            onMount={handleEditorDidMount}
            onChange={handleEditorChange}
            loading={<div style={{ padding: '20px', textAlign: 'center' }}>Loading editor...</div>}
          />
        </div>

        {/* Editor Footer */}
        <Row justify="space-between" align="middle">
          <Col>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Lines: {value.split('\n').length} • 
              Characters: {value.length} • 
              Language: JSON
            </Text>
          </Col>
          <Col>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {readonly ? 'Read-only mode' : 'Edit mode'}
            </Text>
          </Col>
        </Row>
      </Space>
    </div>
  );
};

export default JsonEditor;