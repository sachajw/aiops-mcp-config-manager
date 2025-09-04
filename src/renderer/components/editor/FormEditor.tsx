import React from 'react';
import { 
  Form, 
  Input, 
  Button, 
  Space, 
  Card, 
  Row, 
  Col, 
  Tag, 
  Switch,
  Divider,
  Typography,
  Tooltip,
  Empty
} from 'antd';
import { 
  PlusOutlined, 
  DeleteOutlined, 
  EditOutlined,
  InfoCircleOutlined,
  FolderOutlined 
} from '@ant-design/icons';
import { MCPClient, Configuration, MCPServer } from '../../../shared/types';
import { ConfigScope } from '../../../shared/types/enums';
import ScopeTag from '../common/ScopeTag';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

export interface FormEditorProps {
  configuration?: Configuration | null;
  client?: MCPClient;
  loading?: boolean;
  readonly?: boolean;
  onChange?: (configuration: Configuration) => void;
}

const FormEditor: React.FC<FormEditorProps> = ({
  configuration,
  client,
  loading = false,
  readonly = false,
  onChange
}) => {
  const [form] = Form.useForm();

  const handleServerAdd = () => {
    if (!configuration) return;

    const newServerName = `new-server-${Date.now()}`;
    const newServer: MCPServer = {
      name: newServerName,
      command: '',
      args: [],
      env: {},
      enabled: true,
      scope: ConfigScope.USER
    };

    const updatedConfig: Configuration = {
      ...configuration,
      mcpServers: {
        ...configuration.mcpServers,
        [newServerName]: newServer
      },
      metadata: {
        ...configuration.metadata,
        lastModified: new Date()
      }
    };

    onChange?.(updatedConfig);
  };

  const handleServerUpdate = (serverName: string, updatedServer: MCPServer) => {
    if (!configuration) return;

    const updatedConfig: Configuration = {
      ...configuration,
      mcpServers: {
        ...configuration.mcpServers,
        [serverName]: updatedServer
      },
      metadata: {
        ...configuration.metadata,
        lastModified: new Date()
      }
    };

    onChange?.(updatedConfig);
  };

  const handleServerDelete = (serverName: string) => {
    if (!configuration) return;

    const { [serverName]: deleted, ...remainingServers } = configuration.mcpServers;

    const updatedConfig: Configuration = {
      ...configuration,
      mcpServers: remainingServers,
      metadata: {
        ...configuration.metadata,
        lastModified: new Date()
      }
    };

    onChange?.(updatedConfig);
  };

  if (!configuration) {
    return (
      <Empty
        description="No configuration data available"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  const servers = Object.entries(configuration.mcpServers || {});

  return (
    <div style={{ padding: '16px 0' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Header */}
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={4} style={{ margin: 0 }}>
              Server Configurations
              <Text type="secondary" style={{ fontSize: '14px', marginLeft: '8px' }}>
                ({servers.length} servers)
              </Text>
            </Title>
          </Col>
          <Col>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleServerAdd}
              disabled={readonly}
            >
              Add Server
            </Button>
          </Col>
        </Row>

        {/* Server List */}
        {servers.length === 0 ? (
          <Empty
            description="No servers configured"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleServerAdd}
              disabled={readonly}
            >
              Add Your First Server
            </Button>
          </Empty>
        ) : (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            {servers.map(([serverName, server]) => (
              <ServerForm
                key={serverName}
                serverName={serverName}
                server={server}
                readonly={readonly}
                onUpdate={(updatedServer) => handleServerUpdate(serverName, updatedServer)}
                onDelete={() => handleServerDelete(serverName)}
              />
            ))}
          </Space>
        )}

        {/* Configuration Metadata */}
        <Divider />
        <Card size="small" title="Configuration Metadata">
          <Row gutter={[16, 8]}>
            <Col span={12}>
              <Text strong>Last Modified:</Text>
              <div>{configuration.metadata.lastModified.toLocaleString()}</div>
            </Col>
            <Col span={12}>
              <Text strong>Version:</Text>
              <div>{configuration.metadata.version}</div>
            </Col>
            {configuration.metadata.sourcePath && (
              <Col span={24}>
                <Text strong>Source Path:</Text>
                <div style={{ fontFamily: 'monospace', fontSize: '12px', marginTop: '4px' }}>
                  {configuration.metadata.sourcePath}
                </div>
              </Col>
            )}
          </Row>
        </Card>
      </Space>
    </div>
  );
};

interface ServerFormProps {
  serverName: string;
  server: MCPServer;
  readonly?: boolean;
  onUpdate: (server: MCPServer) => void;
  onDelete: () => void;
}

const ServerForm: React.FC<ServerFormProps> = ({
  serverName,
  server,
  readonly = false,
  onUpdate,
  onDelete
}) => {
  const handleFieldChange = (field: keyof MCPServer, value: any) => {
    const updatedServer = { ...server, [field]: value };
    onUpdate(updatedServer);
  };

  const handleArgsChange = (args: string[]) => {
    handleFieldChange('args', args);
  };

  const handleEnvChange = (env: Record<string, string>) => {
    handleFieldChange('env', env);
  };

  return (
    <Card
      size="small"
      title={
        <Space>
          <Text strong>{serverName}</Text>
          <ScopeTag scope={server.scope} size="small" />
          <Switch
            size="small"
            checked={server.enabled !== false}
            onChange={(checked) => handleFieldChange('enabled', checked)}
            disabled={readonly}
          />
        </Space>
      }
      extra={
        <Space>
          <Tooltip title="Delete server">
            <Button
              type="text"
              size="small"
              icon={<DeleteOutlined />}
              onClick={onDelete}
              disabled={readonly}
              danger
            />
          </Tooltip>
        </Space>
      }
    >
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <div>
              <Text strong>Command *</Text>
              <Input
                value={server.command}
                onChange={(e) => handleFieldChange('command', e.target.value)}
                placeholder="Path to MCP server executable"
                disabled={readonly}
              />
            </div>

            <div>
              <Text strong>Arguments</Text>
              <ArgumentsEditor
                args={server.args || []}
                onChange={handleArgsChange}
                readonly={readonly}
              />
            </div>

            {server.cwd && (
              <div>
                <Text strong>Working Directory</Text>
                <Input
                  value={server.cwd}
                  onChange={(e) => handleFieldChange('cwd', e.target.value)}
                  placeholder="Optional working directory"
                  prefix={<FolderOutlined />}
                  disabled={readonly}
                />
              </div>
            )}

            <div>
              <Text strong>Environment Variables</Text>
              <EnvironmentEditor
                env={server.env || {}}
                onChange={handleEnvChange}
                readonly={readonly}
              />
            </div>
          </Space>
        </Col>
      </Row>
    </Card>
  );
};

interface ArgumentsEditorProps {
  args: string[];
  onChange: (args: string[]) => void;
  readonly?: boolean;
}

const ArgumentsEditor: React.FC<ArgumentsEditorProps> = ({ args, onChange, readonly }) => {
  const handleAdd = () => {
    onChange([...args, '']);
  };

  const handleChange = (index: number, value: string) => {
    const newArgs = [...args];
    newArgs[index] = value;
    onChange(newArgs);
  };

  const handleDelete = (index: number) => {
    const newArgs = args.filter((_, i) => i !== index);
    onChange(newArgs);
  };

  return (
    <Space direction="vertical" size="small" style={{ width: '100%' }}>
      {args.map((arg, index) => (
        <Input.Group key={index} compact>
          <Input
            style={{ width: 'calc(100% - 32px)' }}
            value={arg}
            onChange={(e) => handleChange(index, e.target.value)}
            placeholder={`Argument ${index + 1}`}
            disabled={readonly}
          />
          <Button
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(index)}
            disabled={readonly}
          />
        </Input.Group>
      ))}
      <Button
        type="dashed"
        icon={<PlusOutlined />}
        onClick={handleAdd}
        disabled={readonly}
        style={{ width: '100%' }}
      >
        Add Argument
      </Button>
    </Space>
  );
};

interface EnvironmentEditorProps {
  env: Record<string, string>;
  onChange: (env: Record<string, string>) => void;
  readonly?: boolean;
}

const EnvironmentEditor: React.FC<EnvironmentEditorProps> = ({ env, onChange, readonly }) => {
  const handleAdd = () => {
    onChange({ ...env, '': '' });
  };

  const handleKeyChange = (oldKey: string, newKey: string) => {
    if (oldKey === newKey) return;

    const newEnv = { ...env };
    const value = newEnv[oldKey];
    delete newEnv[oldKey];
    newEnv[newKey] = value;
    onChange(newEnv);
  };

  const handleValueChange = (key: string, value: string) => {
    onChange({ ...env, [key]: value });
  };

  const handleDelete = (key: string) => {
    const { [key]: deleted, ...rest } = env;
    onChange(rest);
  };

  const entries = Object.entries(env);

  return (
    <Space direction="vertical" size="small" style={{ width: '100%' }}>
      {entries.map(([key, value]) => (
        <Input.Group key={key} compact>
          <Input
            style={{ width: '40%' }}
            value={key}
            onChange={(e) => handleKeyChange(key, e.target.value)}
            placeholder="Variable name"
            disabled={readonly}
          />
          <Input
            style={{ width: 'calc(60% - 32px)' }}
            value={value}
            onChange={(e) => handleValueChange(key, e.target.value)}
            placeholder="Value"
            disabled={readonly}
          />
          <Button
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(key)}
            disabled={readonly}
          />
        </Input.Group>
      ))}
      <Button
        type="dashed"
        icon={<PlusOutlined />}
        onClick={handleAdd}
        disabled={readonly}
        style={{ width: '100%' }}
      >
        Add Environment Variable
      </Button>
    </Space>
  );
};

export default FormEditor;