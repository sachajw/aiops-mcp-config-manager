import React, { useState, useEffect } from 'react';
import { Card, Tabs, Button, Space, message, Spin } from 'antd';
import { 
  FormOutlined, 
  CodeOutlined, 
  SaveOutlined, 
  UndoOutlined,
  EyeOutlined 
} from '@ant-design/icons';
import { MCPClient, Configuration, ResolvedConfiguration } from '../../../shared/types';
import FormEditor from './FormEditor';
import JsonEditor from './JsonEditor';
import ConfigurationPreview from './ConfigurationPreview';

const { TabPane } = Tabs;

export interface ConfigurationEditorProps {
  client?: MCPClient;
  configuration?: ResolvedConfiguration;
  loading?: boolean;
  onSave?: (configuration: Configuration) => Promise<void>;
  onCancel?: () => void;
  onPreview?: (configuration: Configuration) => void;
}

export type EditorMode = 'form' | 'json' | 'preview';

const ConfigurationEditor: React.FC<ConfigurationEditorProps> = ({
  client,
  configuration,
  loading = false,
  onSave,
  onCancel,
  onPreview
}) => {
  const [activeMode, setActiveMode] = useState<EditorMode>('form');
  const [formData, setFormData] = useState<Configuration | null>(null);
  const [jsonData, setJsonData] = useState<string>('');
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [jsonErrors, setJsonErrors] = useState<string[]>([]);

  // Initialize editor data when configuration changes
  useEffect(() => {
    if (configuration) {
      const config: Configuration = {
        mcpServers: configuration.servers,
        metadata: {
          lastModified: new Date(),
          version: '1.0.0',
          scope: 'user' as any, // Will be determined by scope selection
          sourcePath: client?.configPaths.primary
        }
      };
      
      setFormData(config);
      setJsonData(JSON.stringify(config, null, 2));
      setIsDirty(false);
      setJsonErrors([]);
    }
  }, [configuration, client]);

  const handleFormChange = (newFormData: Configuration) => {
    setFormData(newFormData);
    setJsonData(JSON.stringify(newFormData, null, 2));
    setIsDirty(true);
  };

  const handleJsonChange = (newJsonData: string) => {
    setJsonData(newJsonData);
    
    try {
      const parsed = JSON.parse(newJsonData);
      setFormData(parsed);
      setJsonErrors([]);
      setIsDirty(true);
    } catch (error: any) {
      setJsonErrors([error.message]);
    }
  };

  const handleSave = async () => {
    if (!formData || !client) return;

    // Validate that we have valid data
    if (jsonErrors.length > 0) {
      message.error('Cannot save: JSON contains errors');
      return;
    }

    setSaving(true);
    try {
      await onSave?.(formData);
      message.success('Configuration saved successfully');
      setIsDirty(false);
    } catch (error: any) {
      message.error(`Failed to save configuration: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (configuration) {
      const config: Configuration = {
        mcpServers: configuration.servers,
        metadata: {
          lastModified: new Date(),
          version: '1.0.0',
          scope: 'user' as any,
          sourcePath: client?.configPaths.primary
        }
      };
      
      setFormData(config);
      setJsonData(JSON.stringify(config, null, 2));
      setIsDirty(false);
      setJsonErrors([]);
      message.info('Configuration reset to original state');
    }
  };

  const handlePreview = () => {
    if (formData) {
      onPreview?.(formData);
    }
  };

  const tabItems = [
    {
      key: 'form',
      label: (
        <Space>
          <FormOutlined />
          Form Editor
        </Space>
      ),
      children: (
        <FormEditor
          configuration={formData}
          client={client}
          loading={loading}
          onChange={handleFormChange}
          readonly={saving}
        />
      )
    },
    {
      key: 'json',
      label: (
        <Space>
          <CodeOutlined />
          JSON Editor
        </Space>
      ),
      children: (
        <JsonEditor
          value={jsonData}
          onChange={handleJsonChange}
          errors={jsonErrors}
          readonly={saving}
          client={client}
        />
      )
    },
    {
      key: 'preview',
      label: (
        <Space>
          <EyeOutlined />
          Preview
        </Space>
      ),
      children: (
        <ConfigurationPreview
          configuration={formData}
          client={client}
          resolvedConfiguration={configuration}
        />
      )
    }
  ];

  if (!client) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
          Select a client to edit its configuration
        </div>
      </Card>
    );
  }

  return (
    <Card
      title={`Configuration Editor - ${client.name}`}
      extra={
        <Space>
          {isDirty && (
            <span style={{ color: '#faad14', marginRight: '8px' }}>
              • Unsaved changes
            </span>
          )}
          <Button
            icon={<UndoOutlined />}
            onClick={handleReset}
            disabled={!isDirty || saving}
          >
            Reset
          </Button>
          <Button
            icon={<EyeOutlined />}
            onClick={handlePreview}
            disabled={!formData || saving}
          >
            Preview
          </Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            loading={saving}
            disabled={!isDirty || jsonErrors.length > 0}
          >
            Save Changes
          </Button>
        </Space>
      }
    >
      <Spin spinning={loading}>
        <Tabs
          activeKey={activeMode}
          onChange={(key) => setActiveMode(key as EditorMode)}
          items={tabItems}
          size="small"
        />
      </Spin>
    </Card>
  );
};

export default ConfigurationEditor;