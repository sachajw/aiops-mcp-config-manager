import React, { useEffect, useState } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Typography, 
  Button, 
  Space, 
  Spin,
  Empty,
  Tag,
  Descriptions,
  Divider,
  Badge,
  Alert,
  Collapse,
  List
} from 'antd';
import {
  ArrowLeftOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  MinusCircleOutlined,
  SettingOutlined,
  InfoCircleOutlined,
  FolderOpenOutlined,
  GlobalOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  CodeOutlined
} from '@ant-design/icons';
import { MCPClient, ResolvedConfiguration, MCPServer } from '../../../shared/types';
import { ConfigScope } from '../../../shared/types/enums';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

export interface OverviewPageProps {
  clients: MCPClient[];
  configurations: Record<string, ResolvedConfiguration>;
  onBack: () => void;
  onRefresh: () => void;
  onLoadConfiguration: (clientId: string) => Promise<void>;
}

const OverviewPage: React.FC<OverviewPageProps> = ({
  clients,
  configurations,
  onBack,
  onRefresh,
  onLoadConfiguration
}) => {
  const [loading, setLoading] = useState(false);
  const [loadingConfigs, setLoadingConfigs] = useState<Set<string>>(new Set());

  // Load configurations for discovered clients
  useEffect(() => {
    const loadAllConfigurations = async () => {
      if (clients.length === 0) return;
      
      setLoading(true);
      try {
        // Load configurations for all clients
        await Promise.all(
          clients.map(async (client) => {
            if (!configurations[client.id]) {
              setLoadingConfigs(prev => new Set(prev).add(client.id));
              try {
                await onLoadConfiguration(client.id);
              } catch (error) {
                console.error(`Failed to load config for ${client.id}:`, error);
              } finally {
                setLoadingConfigs(prev => {
                  const next = new Set(prev);
                  next.delete(client.id);
                  return next;
                });
              }
            }
          })
        );
      } finally {
        setLoading(false);
      }
    };

    loadAllConfigurations();
  }, [clients, configurations, onLoadConfiguration]);

  // Get server icon based on server type/name
  const getServerIcon = (serverName: string) => {
    const name = serverName.toLowerCase();
    if (name.includes('file') || name.includes('filesystem')) return <FolderOpenOutlined />;
    if (name.includes('web') || name.includes('search') || name.includes('brave')) return <GlobalOutlined />;
    if (name.includes('database') || name.includes('sqlite') || name.includes('postgres')) return <DatabaseOutlined />;
    if (name.includes('git') || name.includes('github')) return <CodeOutlined />;
    return <SettingOutlined />;
  };

  // Get server description
  const getServerDescription = (server: MCPServer) => {
    const name = server.name.toLowerCase();
    if (name.includes('filesystem')) return 'Provides access to local files and directories';
    if (name.includes('git')) return 'Git repository access and version control operations';
    if (name.includes('brave') || name.includes('search')) return 'Web search capabilities';
    if (name.includes('sqlite')) return 'SQLite database access and queries';
    if (name.includes('postgres')) return 'PostgreSQL database connection';
    if (name.includes('memory')) return 'Persistent memory and context storage';
    if (name.includes('fetch')) return 'HTTP requests and web content fetching';
    if (name.includes('github')) return 'GitHub repository and API access';
    return 'Custom MCP server capability';
  };

  // Calculate totals
  const totalServers = Object.values(configurations).reduce(
    (sum, config) => sum + Object.keys(config?.servers || {}).length, 0
  );
  const activeServers = Object.values(configurations).reduce(
    (sum, config) => sum + Object.values(config?.servers || {}).filter(s => s.enabled).length, 0
  );
  const totalConflicts = Object.values(configurations).reduce(
    (sum, config) => sum + (config?.conflicts?.length ?? 0), 0
  );

  if (clients.length === 0) {
    return (
      <div style={{ padding: '24px' }}>
        <div style={{ marginBottom: '24px' }}>
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={onBack}
            style={{ marginBottom: '16px' }}
          >
            Back to Dashboard
          </Button>
          <Title level={2}>Your AI Setup Overview</Title>
        </div>

        <Empty
          image="/api/placeholder/400/300"
          description={
            <span>
              <Text strong>No AI applications found</Text>
              <br />
              <Text type="secondary">
                We couldn't find any supported AI applications on your system.
                Supported apps include Claude Desktop, VS Code with Claude extensions, and more.
              </Text>
            </span>
          }
        >
          <Button type="primary" icon={<ReloadOutlined />} onClick={onRefresh}>
            Scan Again
          </Button>
        </Empty>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <Button 
          icon={<ArrowLeftOutlined />} 
          onClick={onBack}
          style={{ marginBottom: '16px' }}
        >
          Back to Dashboard
        </Button>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={2} style={{ margin: 0 }}>Your AI Setup Overview</Title>
          <Button icon={<ReloadOutlined />} onClick={onRefresh} loading={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={6}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <Text type="secondary">AI Applications</Text>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}>
                {clients.length}
              </div>
              <Text type="secondary">{clients.filter(c => c.isActive).length} active</Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <Text type="secondary">Total Capabilities</Text>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#52c41a' }}>
                {totalServers}
              </div>
              <Text type="secondary">{activeServers} enabled</Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <Text type="secondary">Configuration Issues</Text>
              <div style={{ 
                fontSize: '24px', 
                fontWeight: 'bold', 
                color: totalConflicts > 0 ? '#faad14' : '#52c41a' 
              }}>
                {totalConflicts}
              </div>
              <Text type="secondary">{totalConflicts === 0 ? 'All good!' : 'Need attention'}</Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <Text type="secondary">System Health</Text>
              <div style={{ fontSize: '24px', margin: '8px 0' }}>
                {totalConflicts === 0 && activeServers > 0 ? 
                  <CheckCircleOutlined style={{ color: '#52c41a' }} /> :
                  totalConflicts > 0 ?
                  <ExclamationCircleOutlined style={{ color: '#faad14' }} /> :
                  <MinusCircleOutlined style={{ color: '#999' }} />
                }
              </div>
              <Text type="secondary">
                {totalConflicts === 0 && activeServers > 0 ? 'Healthy' :
                 totalConflicts > 0 ? 'Issues Found' : 'Not Set Up'}
              </Text>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Client Configurations */}
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {clients.map((client) => {
          const config = configurations[client.id];
          const isLoading = loadingConfigs.has(client.id);
          const hasConfig = !!config;
          const servers = config?.servers || {};
          const serverCount = Object.keys(servers).length;
          const enabledCount = Object.values(servers).filter(s => s.enabled).length;
          const conflicts = config?.conflicts ?? [];

          return (
            <Card
              key={client.id}
              title={
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Space>
                    <span>{client.name}</span>
                    <Tag color={client.isActive ? 'green' : 'orange'}>
                      {client.isActive ? 'Active' : 'Inactive'}
                    </Tag>
                    {hasConfig && (
                      <Badge count={enabledCount} style={{ backgroundColor: '#52c41a' }} />
                    )}
                  </Space>
                  <Button 
                    size="small" 
                    icon={<InfoCircleOutlined />}
                    type="link"
                    onClick={() => onLoadConfiguration(client.id)}
                  >
                    Reload
                  </Button>
                </div>
              }
            >
              {isLoading ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <Spin size="large" />
                  <div style={{ marginTop: '16px' }}>
                    <Text type="secondary">Loading configuration...</Text>
                  </div>
                </div>
              ) : !hasConfig ? (
                <Alert
                  message="Configuration not loaded"
                  description="Click reload to fetch the current configuration for this AI application."
                  type="info"
                  showIcon
                />
              ) : (
                <div>
                  {/* Configuration Summary */}
                  <Descriptions column={2} size="small" style={{ marginBottom: '16px' }}>
                    <Descriptions.Item label="Total Capabilities">{serverCount}</Descriptions.Item>
                    <Descriptions.Item label="Enabled">{enabledCount}</Descriptions.Item>
                    <Descriptions.Item label="Configuration File">
                      <Text code style={{ fontSize: '12px' }}>
                        {client.configPaths.primary}
                      </Text>
                    </Descriptions.Item>
                    <Descriptions.Item label="Last Updated">
                      {config.metadata?.resolvedAt ? 
                        new Date(config.metadata.resolvedAt).toLocaleString() : 
                        'Unknown'
                      }
                    </Descriptions.Item>
                  </Descriptions>

                  {/* Conflicts Warning */}
                  {conflicts.length > 0 && (
                    <Alert
                      message={`${conflicts.length} Configuration Conflict${conflicts.length > 1 ? 's' : ''} Found`}
                      description="Some MCP servers have conflicting configurations that may cause issues."
                      type="warning"
                      showIcon
                      style={{ marginBottom: '16px' }}
                    />
                  )}

                  {/* Server List */}
                  {serverCount > 0 ? (
                    <Collapse ghost>
                      <Panel 
                        header={`View ${serverCount} Capabilit${serverCount > 1 ? 'ies' : 'y'}`} 
                        key="servers"
                      >
                        <List
                          dataSource={Object.values(servers)}
                          renderItem={(server: MCPServer) => (
                            <List.Item
                              actions={[
                                <Tag color={server.enabled ? 'green' : 'default'} key="status">
                                  {server.enabled ? 'Enabled' : 'Disabled'}
                                </Tag>,
                                <Tag color="blue" key="scope">
                                  {server.scope || ConfigScope.USER}
                                </Tag>
                              ]}
                            >
                              <List.Item.Meta
                                avatar={getServerIcon(server.name)}
                                title={<Text strong>{server.name}</Text>}
                                description={
                                  <div>
                                    <Paragraph style={{ margin: 0, color: '#666' }}>
                                      {getServerDescription(server)}
                                    </Paragraph>
                                    <Text code style={{ fontSize: '12px' }}>
                                      {server.command} {server.args?.join(' ')}
                                    </Text>
                                  </div>
                                }
                              />
                            </List.Item>
                          )}
                        />
                      </Panel>
                    </Collapse>
                  ) : (
                    <Empty
                      description="No MCP servers configured"
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      style={{ margin: '20px 0' }}
                    />
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </Space>

      {/* Help Section */}
      <Card style={{ marginTop: '24px', backgroundColor: '#fafafa' }}>
        <Title level={4}>What You're Looking At</Title>
        <Paragraph>
          This overview shows all the AI applications we found on your system and their current capabilities (MCP servers). 
          Each capability extends what your AI can do - like reading files, searching the web, or accessing databases.
        </Paragraph>
        <Paragraph>
          <Text strong>Green badges</Text> show enabled capabilities that are ready to use. 
          <Text strong>Warning symbols</Text> indicate configuration issues that might prevent capabilities from working properly.
        </Paragraph>
      </Card>
    </div>
  );
};

export default OverviewPage;