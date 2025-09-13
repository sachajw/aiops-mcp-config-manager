import React from 'react';
import { 
  Card, 
  Descriptions, 
  Space, 
  Tag, 
  Typography, 
  Row, 
  Col, 
  Alert,
  Badge,
  Divider,
  Tooltip
} from 'antd';
import { 
  InfoCircleOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  WarningOutlined 
} from '@ant-design/icons';
import { MCPClient, Configuration, ResolvedConfiguration } from '../../../shared/types';
import { ConfigScope } from '../../../shared/types/enums';
import ScopeTag from '../common/ScopeTag';
import StatusIndicator from '../common/StatusIndicator';

const { Title, Text, Paragraph } = Typography;

export interface ConfigurationPreviewProps {
  configuration?: Configuration | null;
  client?: MCPClient;
  resolvedConfiguration?: ResolvedConfiguration;
}

const ConfigurationPreview: React.FC<ConfigurationPreviewProps> = ({
  configuration,
  client,
  resolvedConfiguration
}) => {
  if (!configuration) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
        No configuration to preview
      </div>
    );
  }

  const servers = Object.entries(configuration.mcpServers || {});
  const enabledServers = servers.filter(([, server]) => server.enabled !== false);
  const disabledServers = servers.filter(([, server]) => server.enabled === false);

  const conflicts = resolvedConfiguration?.conflicts || [];
  const hasConflicts = conflicts.length > 0;

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* Configuration Overview */}
      <Card title="Configuration Overview" size="small">
        <Row gutter={[24, 16]}>
          <Col span={8}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}>
                {servers.length}
              </div>
              <Text type="secondary">Total Servers</Text>
            </div>
          </Col>
          <Col span={8}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#52c41a' }}>
                {enabledServers.length}
              </div>
              <Text type="secondary">Enabled</Text>
            </div>
          </Col>
          <Col span={8}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: hasConflicts ? '#ff4d4f' : '#d9d9d9' }}>
                {conflicts.length}
              </div>
              <Text type="secondary">Conflicts</Text>
            </div>
          </Col>
        </Row>

        {hasConflicts && (
          <Alert
            message="Configuration Conflicts Detected"
            description={`${conflicts.length} server${conflicts.length !== 1 ? 's have' : ' has'} conflicting definitions across different scopes.`}
            type="warning"
            showIcon
            style={{ marginTop: '16px' }}
          />
        )}
      </Card>

      {/* Client Information */}
      {client && (
        <Card title="Target Client" size="small">
          <Descriptions column={2} size="small">
            <Descriptions.Item label="Client Name">{client.name}</Descriptions.Item>
            <Descriptions.Item label="Type">
              <Tag>{client.type}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <StatusIndicator status={client.status} showText />
            </Descriptions.Item>
            <Descriptions.Item label="Version">
              {client.version || 'Unknown'}
            </Descriptions.Item>
            <Descriptions.Item label="Config Path" span={2}>
              <Text code style={{ fontSize: '12px' }}>
                {client.configPaths.primary}
              </Text>
            </Descriptions.Item>
          </Descriptions>
        </Card>
      )}

      {/* Server Configurations */}
      <Card title="Server Configurations" size="small">
        {servers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
            No servers configured
          </div>
        ) : (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            {servers.map(([serverName, server]) => {
              const hasConflict = conflicts.some(c => c.serverName === serverName);
              
              return (
                <Card
                  key={serverName}
                  type="inner"
                  size="small"
                  title={
                    <Space>
                      <Text strong>{serverName}</Text>
                      <ScopeTag scope={server.scope} size="small" />
                      {!server.enabled && <Tag color="default">Disabled</Tag>}
                      {hasConflict && (
                        <Tooltip title="This server has scope conflicts">
                          <Badge count="!" style={{ backgroundColor: '#faad14' }} />
                        </Tooltip>
                      )}
                    </Space>
                  }
                  extra={
                    server.enabled ? (
                      <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    ) : (
                      <ExclamationCircleOutlined style={{ color: '#d9d9d9' }} />
                    )
                  }
                >
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="Command">
                      <Text code>{server.command}</Text>
                    </Descriptions.Item>
                    
                    {server.args && server.args.length > 0 && (
                      <Descriptions.Item label="Arguments">
                        <Space wrap>
                          {server.args.map((arg, index) => (
                            <Tag key={index} style={{ fontFamily: 'monospace' }}>
                              {arg}
                            </Tag>
                          ))}
                        </Space>
                      </Descriptions.Item>
                    )}

                    {server.cwd && (
                      <Descriptions.Item label="Working Directory">
                        <Text code>{server.cwd}</Text>
                      </Descriptions.Item>
                    )}

                    {server.env && Object.keys(server.env).length > 0 && (
                      <Descriptions.Item label="Environment">
                        <Space direction="vertical" size="small">
                          {Object.entries(server.env).map(([key, value]) => (
                            <div key={key}>
                              <Text code style={{ color: '#1890ff' }}>{key}</Text>
                              <Text>=</Text>
                              <Text code>{value}</Text>
                            </div>
                          ))}
                        </Space>
                      </Descriptions.Item>
                    )}
                  </Descriptions>

                  {hasConflict && (
                    <Alert
                      message="Scope Conflict"
                      description={
                        <div>
                          This server is defined in multiple scopes. The configuration from{' '}
                          <ScopeTag scope={server.scope} size="small" /> scope will take precedence.
                        </div>
                      }
                      type="warning"
                      showIcon
                      style={{ marginTop: '12px', fontSize: '12px' }}
                    />
                  )}
                </Card>
              );
            })}
          </Space>
        )}
      </Card>

      {/* Configuration Metadata */}
      <Card title="Metadata" size="small">
        <Descriptions column={2} size="small">
          <Descriptions.Item label="Version">
            {configuration.metadata.version}
          </Descriptions.Item>
          <Descriptions.Item label="Scope">
            <ScopeTag scope={configuration.metadata.scope} />
          </Descriptions.Item>
          <Descriptions.Item label="Last Modified">
            {configuration.metadata.lastModified.toLocaleString()}
          </Descriptions.Item>
          <Descriptions.Item label="Source">
            {configuration.metadata.sourcePath ? (
              <Text code style={{ fontSize: '12px' }}>
                {configuration.metadata.sourcePath}
              </Text>
            ) : (
              <Text type="secondary">Not saved</Text>
            )}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Validation Summary */}
      <Card title="Validation Summary" size="small">
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <div>
            <Space>
              <CheckCircleOutlined style={{ color: '#52c41a' }} />
              <Text>Valid JSON structure</Text>
            </Space>
          </div>
          
          <div>
            <Space>
              {servers.length > 0 ? (
                <CheckCircleOutlined style={{ color: '#52c41a' }} />
              ) : (
                <WarningOutlined style={{ color: '#faad14' }} />
              )}
              <Text>
                {servers.length > 0 ? 
                  `${servers.length} server${servers.length !== 1 ? 's' : ''} configured` :
                  'No servers configured'
                }
              </Text>
            </Space>
          </div>

          <div>
            <Space>
              {hasConflicts ? (
                <WarningOutlined style={{ color: '#faad14' }} />
              ) : (
                <CheckCircleOutlined style={{ color: '#52c41a' }} />
              )}
              <Text>
                {hasConflicts ? 
                  `${conflicts.length} scope conflict${conflicts.length !== 1 ? 's' : ''} detected` :
                  'No scope conflicts'
                }
              </Text>
            </Space>
          </div>

          {enabledServers.length !== servers.length && (
            <div>
              <Space>
                <InfoCircleOutlined style={{ color: '#1890ff' }} />
                <Text>
                  {disabledServers.length} server{disabledServers.length !== 1 ? 's are' : ' is'} disabled
                </Text>
              </Space>
            </div>
          )}
        </Space>
      </Card>
    </Space>
  );
};

export default ConfigurationPreview;