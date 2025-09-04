import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Button,
  Space,
  Divider,
  Alert,
  Row,
  Col,
  Typography,
  Tag,
  Tooltip,
  Card,
  Progress
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  FolderOpenOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  LoadingOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { MCPServer, MCPClient, ServerTestResult } from '../../../shared/types';
import { ConfigScope } from '../../../shared/types/enums';
import ScopeTag from '../common/ScopeTag';
import { ScopeSelector } from '../scope';

const { Option } = Select;
const { Text, Title } = Typography;
const { TextArea } = Input;

export interface ServerConfigDialogProps {
  visible: boolean;
  server?: MCPServer;
  client?: MCPClient;
  mode: 'add' | 'edit';
  onSave: (server: MCPServer) => Promise<void>;
  onCancel: () => void;
  onTest?: (server: MCPServer) => Promise<ServerTestResult>;
}

interface FormData {
  name: string;
  command: string;
  args: string[];
  env: Record<string, string>;
  cwd?: string;
  enabled: boolean;
  scope: ConfigScope;
}

const ServerConfigDialog: React.FC<ServerConfigDialogProps> = ({
  visible,
  server,
  client,
  mode,
  onSave,
  onCancel,
  onTest
}) => {
  const [form] = Form.useForm<FormData>();
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<ServerTestResult | null>(null);
  const [args, setArgs] = useState<string[]>([]);
  const [envVars, setEnvVars] = useState<Record<string, string>>({});

  // Initialize form data
  useEffect(() => {
    if (visible) {
      if (server && mode === 'edit') {
        const formData: FormData = {
          name: server.name,
          command: server.command,
          args: server.args || [],
          env: server.env || {},
          cwd: server.cwd,
          enabled: server.enabled !== false,
          scope: server.scope || ConfigScope.USER
        };
        
        form.setFieldsValue(formData);
        setArgs(server.args || []);
        setEnvVars(server.env || {});
      } else {
        // Default values for new server
        const defaultData: FormData = {
          name: '',
          command: '',
          args: [],
          env: {},
          enabled: true,
          scope: ConfigScope.USER
        };
        
        form.setFieldsValue(defaultData);
        setArgs([]);
        setEnvVars({});
      }
      setTestResult(null);
    }
  }, [visible, server, mode, form]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      
      const serverConfig: MCPServer = {
        name: values.name.trim(),
        command: values.command.trim(),
        args: args.filter(arg => arg.trim() !== ''),
        env: Object.fromEntries(
          Object.entries(envVars).filter(([key, value]) => key.trim() && value.trim())
        ),
        cwd: values.cwd?.trim() || undefined,
        enabled: values.enabled,
        scope: values.scope
      };

      setSaving(true);
      await onSave(serverConfig);
      form.resetFields();
      setArgs([]);
      setEnvVars({});
      setTestResult(null);
    } catch (error) {
      console.error('Form validation failed:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    try {
      const values = await form.validateFields(['command', 'args']);
      
      const testServer: MCPServer = {
        name: values.name || 'test-server',
        command: values.command.trim(),
        args: args.filter(arg => arg.trim() !== ''),
        env: Object.fromEntries(
          Object.entries(envVars).filter(([key, value]) => key.trim() && value.trim())
        ),
        cwd: form.getFieldValue('cwd')?.trim() || undefined,
        enabled: true,
        scope: ConfigScope.USER
      };

      setTesting(true);
      setTestResult(null);
      
      if (onTest) {
        const result = await onTest(testServer);
        setTestResult(result);
      }
    } catch (error) {
      console.error('Test failed:', error);
      setTestResult({
        success: false,
        error: 'Test configuration failed',
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date()
      });
    } finally {
      setTesting(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setArgs([]);
    setEnvVars({});
    setTestResult(null);
    onCancel();
  };

  const addArgument = () => {
    setArgs([...args, '']);
  };

  const updateArgument = (index: number, value: string) => {
    const newArgs = [...args];
    newArgs[index] = value;
    setArgs(newArgs);
  };

  const removeArgument = (index: number) => {
    const newArgs = args.filter((_, i) => i !== index);
    setArgs(newArgs);
  };

  const addEnvironmentVariable = () => {
    const newKey = `VAR_${Object.keys(envVars).length + 1}`;
    setEnvVars({ ...envVars, [newKey]: '' });
  };

  const updateEnvironmentKey = (oldKey: string, newKey: string) => {
    if (oldKey === newKey) return;
    
    const newEnv = { ...envVars };
    const value = newEnv[oldKey];
    delete newEnv[oldKey];
    newEnv[newKey] = value;
    setEnvVars(newEnv);
  };

  const updateEnvironmentValue = (key: string, value: string) => {
    setEnvVars({ ...envVars, [key]: value });
  };

  const removeEnvironmentVariable = (key: string) => {
    const { [key]: deleted, ...rest } = envVars;
    setEnvVars(rest);
  };

  const renderTestResult = () => {
    if (!testResult) return null;

    return (
      <Alert
        message={testResult.success ? 'Server Test Passed' : 'Server Test Failed'}
        description={
          <div>
            <p>{testResult.success ? 'The server configuration is valid and can be reached.' : testResult.error}</p>
            {testResult.details && (
              <details style={{ marginTop: 8 }}>
                <summary>Details</summary>
                <pre style={{ fontSize: 12, marginTop: 4 }}>
                  {testResult.details}
                </pre>
              </details>
            )}
            <Text type="secondary" style={{ fontSize: 12 }}>
              Tested at: {testResult.timestamp.toLocaleString()}
            </Text>
          </div>
        }
        type={testResult.success ? 'success' : 'error'}
        showIcon
        style={{ marginTop: 16 }}
      />
    );
  };

  return (
    <Modal
      title={
        <Space>
          {mode === 'add' ? 'Add MCP Server' : 'Edit MCP Server'}
          {client && (
            <>
              <span>-</span>
              <Text type="secondary">{client.name}</Text>
            </>
          )}
        </Space>
      }
      open={visible}
      width={800}
      onCancel={handleCancel}
      footer={[
        <Button key="cancel" onClick={handleCancel} disabled={saving || testing}>
          Cancel
        </Button>,
        <Button
          key="test"
          icon={testing ? <LoadingOutlined /> : <PlayCircleOutlined />}
          onClick={handleTest}
          disabled={saving || testing}
          loading={testing}
        >
          Test Configuration
        </Button>,
        <Button
          key="save"
          type="primary"
          onClick={handleSave}
          loading={saving}
          disabled={testing}
        >
          {mode === 'add' ? 'Add Server' : 'Update Server'}
        </Button>
      ]}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        size="small"
      >
        <Row gutter={[16, 0]}>
          <Col span={16}>
            <Form.Item
              label="Server Name"
              name="name"
              rules={[
                { required: true, message: 'Server name is required' },
                { min: 1, max: 50, message: 'Name must be between 1 and 50 characters' }
              ]}
            >
              <Input placeholder="my-server" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              label="Scope"
              name="scope"
              rules={[{ required: true, message: 'Scope is required' }]}
            >
              <ScopeSelector
                showDescription={true}
                placeholder="Select configuration scope"
                size="small"
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label="Command"
          name="command"
          rules={[
            { required: true, message: 'Command path is required' },
            { min: 1, message: 'Command cannot be empty' }
          ]}
        >
          <Input 
            placeholder="/path/to/mcp-server or node server.js" 
            suffix={
              <Tooltip title="Browse for executable">
                <FolderOpenOutlined style={{ color: '#bfbfbf' }} />
              </Tooltip>
            }
          />
        </Form.Item>

        <Form.Item label="Arguments">
          <Card size="small" style={{ background: '#fafafa' }}>
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              {args.map((arg, index) => (
                <Input.Group key={index} compact>
                  <Input
                    style={{ width: 'calc(100% - 32px)' }}
                    value={arg}
                    onChange={(e) => updateArgument(index, e.target.value)}
                    placeholder={`Argument ${index + 1}`}
                  />
                  <Button
                    icon={<DeleteOutlined />}
                    onClick={() => removeArgument(index)}
                  />
                </Input.Group>
              ))}
              <Button
                type="dashed"
                icon={<PlusOutlined />}
                onClick={addArgument}
                style={{ width: '100%' }}
              >
                Add Argument
              </Button>
            </Space>
          </Card>
        </Form.Item>

        <Form.Item label="Working Directory" name="cwd">
          <Input 
            placeholder="/path/to/working/directory (optional)"
            suffix={
              <Tooltip title="Browse for directory">
                <FolderOpenOutlined style={{ color: '#bfbfbf' }} />
              </Tooltip>
            }
          />
        </Form.Item>

        <Form.Item label="Environment Variables">
          <Card size="small" style={{ background: '#fafafa' }}>
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              {Object.entries(envVars).map(([key, value]) => (
                <Input.Group key={key} compact>
                  <Input
                    style={{ width: '40%' }}
                    value={key}
                    onChange={(e) => updateEnvironmentKey(key, e.target.value)}
                    placeholder="Variable name"
                  />
                  <Input
                    style={{ width: 'calc(60% - 32px)' }}
                    value={value}
                    onChange={(e) => updateEnvironmentValue(key, e.target.value)}
                    placeholder="Value"
                  />
                  <Button
                    icon={<DeleteOutlined />}
                    onClick={() => removeEnvironmentVariable(key)}
                  />
                </Input.Group>
              ))}
              <Button
                type="dashed"
                icon={<PlusOutlined />}
                onClick={addEnvironmentVariable}
                style={{ width: '100%' }}
              >
                Add Environment Variable
              </Button>
            </Space>
          </Card>
        </Form.Item>

        <Form.Item>
          <Row justify="space-between" align="middle">
            <Col>
              <Form.Item name="enabled" valuePropName="checked" style={{ margin: 0 }}>
                <Switch
                  checkedChildren="Enabled"
                  unCheckedChildren="Disabled"
                />
              </Form.Item>
            </Col>
            <Col>
              <Space>
                <InfoCircleOutlined style={{ color: '#1890ff' }} />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Test the configuration before saving to ensure it works correctly.
                </Text>
              </Space>
            </Col>
          </Row>
        </Form.Item>

        {renderTestResult()}
      </Form>
    </Modal>
  );
};

export default ServerConfigDialog;