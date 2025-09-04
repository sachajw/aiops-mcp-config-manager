import React, { useState } from 'react';
import {
  Modal,
  Form,
  Select,
  Button,
  Space,
  Typography,
  Alert,
  Card,
  Row,
  Col,
  Checkbox,
  Divider,
  Progress,
  message
} from 'antd';
import {
  SwapOutlined,
  InfoCircleOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import { ConfigScope } from '../../../shared/types/enums';
import { MCPServer, MCPClient } from '../../../shared/types';
import ScopeTag from '../common/ScopeTag';
import ScopeSelector from './ScopeSelector';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

export interface ScopeMigrationDialogProps {
  visible: boolean;
  client?: MCPClient;
  servers: Array<{
    name: string;
    server: MCPServer;
    currentScope: ConfigScope;
  }>;
  onMigrate: (migrations: ServerMigration[]) => Promise<void>;
  onCancel: () => void;
}

export interface ServerMigration {
  serverName: string;
  fromScope: ConfigScope;
  toScope: ConfigScope;
  action: 'move' | 'copy' | 'remove';
  keepOriginal?: boolean;
}

const ScopeMigrationDialog: React.FC<ScopeMigrationDialogProps> = ({
  visible,
  client,
  servers,
  onMigrate,
  onCancel
}) => {
  const [form] = Form.useForm();
  const [selectedServers, setSelectedServers] = useState<string[]>([]);
  const [targetScope, setTargetScope] = useState<ConfigScope>();
  const [migrationAction, setMigrationAction] = useState<'move' | 'copy'>('move');
  const [migrating, setMigrating] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleServerSelection = (serverNames: string[]) => {
    setSelectedServers(serverNames);
  };

  const getAvailableTargetScopes = (): ConfigScope[] => {
    if (selectedServers.length === 0) return [];
    
    const currentScopes = new Set(
      selectedServers.map(name => 
        servers.find(s => s.name === name)?.currentScope
      ).filter(Boolean)
    );

    return Object.values(ConfigScope).filter(scope => 
      !currentScopes.has(scope)
    );
  };

  const getMigrationPreview = (): ServerMigration[] => {
    if (!targetScope) return [];

    return selectedServers.map(serverName => {
      const serverInfo = servers.find(s => s.name === serverName);
      if (!serverInfo) return null;

      return {
        serverName,
        fromScope: serverInfo.currentScope,
        toScope: targetScope,
        action: migrationAction,
        keepOriginal: migrationAction === 'copy'
      };
    }).filter(Boolean) as ServerMigration[];
  };

  const handleMigrate = async () => {
    const migrations = getMigrationPreview();
    if (migrations.length === 0) return;

    setMigrating(true);
    setProgress(0);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      await onMigrate(migrations);
      
      clearInterval(progressInterval);
      setProgress(100);
      
      message.success(`Successfully ${migrationAction}d ${migrations.length} server${migrations.length !== 1 ? 's' : ''}`);
      
      // Reset form
      setSelectedServers([]);
      setTargetScope(undefined);
      setMigrationAction('move');
      form.resetFields();
    } catch (error) {
      message.error(`Failed to ${migrationAction} servers: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setMigrating(false);
      setProgress(0);
    }
  };

  const renderServerPreview = (serverName: string) => {
    const serverInfo = servers.find(s => s.name === serverName);
    if (!serverInfo) return null;

    return (
      <Card key={serverName} size="small" style={{ marginBottom: 8 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space direction="vertical" size="small">
              <Text strong>{serverName}</Text>
              <Text code style={{ fontSize: 11 }}>{serverInfo.server.command}</Text>
            </Space>
          </Col>
          <Col>
            <Space>
              <ScopeTag scope={serverInfo.currentScope} size="small" />
              <SwapOutlined style={{ color: '#1890ff' }} />
              <ScopeTag scope={targetScope!} size="small" />
            </Space>
          </Col>
        </Row>
      </Card>
    );
  };

  const getWarningMessage = () => {
    if (migrationAction === 'move') {
      return 'Moving servers will remove them from their current scope and add them to the target scope.';
    } else {
      return 'Copying servers will create duplicates in the target scope. This may create scope conflicts.';
    }
  };

  const canMigrate = selectedServers.length > 0 && targetScope && !migrating;

  return (
    <Modal
      title={
        <Space>
          <SwapOutlined style={{ color: '#1890ff' }} />
          <Title level={4} style={{ margin: 0 }}>
            Migrate Server Configurations
          </Title>
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
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel} disabled={migrating}>
          Cancel
        </Button>,
        <Button
          key="migrate"
          type="primary"
          onClick={handleMigrate}
          disabled={!canMigrate}
          loading={migrating}
        >
          {migrationAction === 'move' ? 'Move' : 'Copy'} Servers
        </Button>
      ]}
      destroyOnClose
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {migrating && (
          <Alert
            message="Migration in Progress"
            description={
              <div>
                <Progress percent={progress} size="small" />
                <Text style={{ marginTop: 8, display: 'block' }}>
                  {progress < 100 ? 'Processing server migrations...' : 'Migration completed successfully!'}
                </Text>
              </div>
            }
            type="info"
            showIcon
          />
        )}

        {!migrating && (
          <>
            <Alert
              message="Server Migration"
              description="Move or copy server configurations between different scopes. This allows you to reorganize your configuration hierarchy."
              type="info"
              showIcon
            />

            <Form form={form} layout="vertical">
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Form.Item label="Select Servers" required>
                    <Select
                      mode="multiple"
                      placeholder="Choose servers to migrate"
                      value={selectedServers}
                      onChange={handleServerSelection}
                      style={{ width: '100%' }}
                    >
                      {servers.map(({ name, currentScope }) => (
                        <Option key={name} value={name}>
                          <Space>
                            <Text>{name}</Text>
                            <ScopeTag scope={currentScope} size="small" />
                          </Space>
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>

                <Col span={12}>
                  <Form.Item label="Migration Action" required>
                    <Select
                      value={migrationAction}
                      onChange={setMigrationAction}
                      style={{ width: '100%' }}
                    >
                      <Option value="move">
                        <Space>
                          <SwapOutlined />
                          <Text>Move (recommended)</Text>
                        </Space>
                      </Option>
                      <Option value="copy">
                        <Space>
                          <CheckCircleOutlined />
                          <Text>Copy</Text>
                        </Space>
                      </Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item label="Target Scope" required>
                <ScopeSelector
                  value={targetScope}
                  onChange={setTargetScope}
                  allowedScopes={getAvailableTargetScopes()}
                  showDescription={true}
                  placeholder="Select target scope"
                />
              </Form.Item>
            </Form>

            {selectedServers.length > 0 && targetScope && (
              <>
                <Divider />
                
                <Alert
                  message="Migration Preview"
                  description={getWarningMessage()}
                  type="warning"
                  showIcon
                />

                <Card title="Selected Servers" size="small">
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {selectedServers.map(renderServerPreview)}
                  </Space>
                </Card>

                <Alert
                  message="Impact Analysis"
                  description={
                    <Space direction="vertical" size="small">
                      <div>
                        <Text strong>Servers affected:</Text> {selectedServers.length}
                      </div>
                      <div>
                        <Text strong>Action:</Text> {migrationAction === 'move' ? 'Move' : 'Copy'} 
                        {migrationAction === 'move' && ' (original configurations will be removed)'}
                      </div>
                      <div>
                        <Text strong>Target scope:</Text> <ScopeTag scope={targetScope} size="small" />
                      </div>
                      {migrationAction === 'copy' && (
                        <div style={{ color: '#faad14' }}>
                          <WarningOutlined /> This may create scope conflicts that will need to be resolved.
                        </div>
                      )}
                    </Space>
                  }
                  type="info"
                  showIcon
                />
              </>
            )}
          </>
        )}
      </Space>
    </Modal>
  );
};

export default ScopeMigrationDialog;