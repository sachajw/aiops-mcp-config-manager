import React, { useState } from 'react';
import {
  Modal,
  Table,
  Button,
  Space,
  Typography,
  Alert,
  Radio,
  Card,
  Row,
  Col,
  Divider,
  Tag,
  Tooltip,
  Collapse
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  DeleteOutlined,
  MergeOutlined
} from '@ant-design/icons';
import { ConfigScope } from '../../../shared/types/enums';
import { MCPServer, ScopeConflict } from '../../../shared/types';
import ScopeTag from '../common/ScopeTag';
import ScopeSelector from './ScopeSelector';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

export interface ScopeConflictDialogProps {
  visible: boolean;
  conflicts: ScopeConflict[];
  onResolve: (resolutions: ConflictResolution[]) => Promise<void>;
  onCancel: () => void;
}

export interface ConflictResolution {
  serverName: string;
  action: 'keep-highest' | 'keep-specific' | 'merge' | 'remove-duplicates';
  targetScope?: ConfigScope;
  mergeStrategy?: 'override' | 'combine';
}

interface ConflictTableRow {
  key: string;
  serverName: string;
  conflicts: Array<{
    scope: ConfigScope;
    server: MCPServer;
    priority: number;
  }>;
}

const ScopeConflictDialog: React.FC<ScopeConflictDialogProps> = ({
  visible,
  conflicts,
  onResolve,
  onCancel
}) => {
  const [resolutions, setResolutions] = useState<Record<string, ConflictResolution>>({});
  const [resolving, setResolving] = useState(false);

  const scopePriority = {
    [ConfigScope.PROJECT]: 1,
    [ConfigScope.LOCAL]: 2,
    [ConfigScope.USER]: 3,
    [ConfigScope.GLOBAL]: 4
  };

  const buildTableData = (): ConflictTableRow[] => {
    return conflicts.map(conflict => ({
      key: conflict.serverName,
      serverName: conflict.serverName,
      conflicts: conflict.scopes.map(scope => ({
        scope,
        server: conflict.servers[scope],
        priority: scopePriority[scope]
      })).sort((a, b) => a.priority - b.priority)
    }));
  };

  const handleResolutionChange = (serverName: string, resolution: ConflictResolution) => {
    setResolutions(prev => ({
      ...prev,
      [serverName]: resolution
    }));
  };

  const getDefaultResolution = (serverName: string): ConflictResolution => {
    return resolutions[serverName] || {
      serverName,
      action: 'keep-highest'
    };
  };

  const handleResolve = async () => {
    const resolutionList = Object.values(resolutions);
    
    // Add default resolutions for conflicts without explicit choices
    const allResolutions = conflicts.map(conflict => 
      resolutions[conflict.serverName] || {
        serverName: conflict.serverName,
        action: 'keep-highest' as const
      }
    );

    setResolving(true);
    try {
      await onResolve(allResolutions);
      setResolutions({});
    } catch (error) {
      console.error('Failed to resolve conflicts:', error);
    } finally {
      setResolving(false);
    }
  };

  const renderConflictDetails = (record: ConflictTableRow) => {
    const resolution = getDefaultResolution(record.serverName);

    return (
      <Card size="small" style={{ margin: '8px 0' }}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <Text strong>Resolution Strategy:</Text>
            <Radio.Group
              value={resolution.action}
              onChange={(e) => handleResolutionChange(record.serverName, {
                ...resolution,
                action: e.target.value
              })}
              style={{ marginTop: 8, width: '100%' }}
            >
              <Space direction="vertical">
                <Radio value="keep-highest">
                  <Space>
                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    <Text>Keep Highest Priority</Text>
                    <Text type="secondary">(Recommended)</Text>
                  </Space>
                </Radio>
                <Radio value="keep-specific">
                  <Space>
                    <InfoCircleOutlined style={{ color: '#1890ff' }} />
                    <Text>Keep Specific Scope</Text>
                  </Space>
                </Radio>
                <Radio value="remove-duplicates">
                  <Space>
                    <DeleteOutlined style={{ color: '#ff4d4f' }} />
                    <Text>Remove Duplicates</Text>
                  </Space>
                </Radio>
              </Space>
            </Radio.Group>
          </div>

          {resolution.action === 'keep-specific' && (
            <div>
              <Text strong>Target Scope:</Text>
              <ScopeSelector
                value={resolution.targetScope}
                onChange={(scope) => handleResolutionChange(record.serverName, {
                  ...resolution,
                  targetScope: scope
                })}
                allowedScopes={record.conflicts.map(c => c.scope)}
                size="small"
                style={{ marginTop: 8, width: 200 }}
              />
            </div>
          )}

          <div>
            <Text strong>Preview Result:</Text>
            <div style={{ marginTop: 8, padding: 8, background: '#f5f5f5', borderRadius: 4 }}>
              {renderResolutionPreview(record, resolution)}
            </div>
          </div>
        </Space>
      </Card>
    );
  };

  const renderResolutionPreview = (record: ConflictTableRow, resolution: ConflictResolution) => {
    switch (resolution.action) {
      case 'keep-highest':
        const highest = record.conflicts[0]; // Already sorted by priority
        return (
          <Space>
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
            <Text>Will keep configuration from</Text>
            <ScopeTag scope={highest.scope} size="small" />
            <Text type="secondary">(highest priority)</Text>
          </Space>
        );

      case 'keep-specific':
        if (!resolution.targetScope) {
          return <Text type="secondary">Select a scope to see preview</Text>;
        }
        return (
          <Space>
            <InfoCircleOutlined style={{ color: '#1890ff' }} />
            <Text>Will keep configuration from</Text>
            <ScopeTag scope={resolution.targetScope} size="small" />
            <Text type="secondary">(manual selection)</Text>
          </Space>
        );

      case 'remove-duplicates':
        return (
          <Space>
            <DeleteOutlined style={{ color: '#ff4d4f' }} />
            <Text>Will remove {record.conflicts.length - 1} duplicate(s), keeping</Text>
            <ScopeTag scope={record.conflicts[0].scope} size="small" />
          </Space>
        );

      default:
        return null;
    }
  };

  const columns: ColumnsType<ConflictTableRow> = [
    {
      title: 'Server Name',
      dataIndex: 'serverName',
      key: 'serverName',
      width: 200,
      render: (name: string, record) => (
        <Space direction="vertical" size="small">
          <Text strong>{name}</Text>
          <Tag color="warning" icon={<WarningOutlined />}>
            {record.conflicts.length} conflicts
          </Tag>
        </Space>
      )
    },
    {
      title: 'Conflicting Scopes',
      key: 'conflicts',
      render: (_, record) => (
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          {record.conflicts.map(({ scope, server, priority }) => (
            <Card key={scope} size="small" style={{ width: '100%' }}>
              <Row justify="space-between" align="top">
                <Col>
                  <Space direction="vertical" size="small">
                    <Space>
                      <ScopeTag scope={scope} />
                      <Tag style={{ fontSize: 10 }}>Priority {priority}</Tag>
                    </Space>
                    <Text code style={{ fontSize: 11 }}>{server.command}</Text>
                  </Space>
                </Col>
                <Col>
                  <Space direction="vertical" align="end" size="small">
                    {server.args && server.args.length > 0 && (
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {server.args.length} args
                      </Text>
                    )}
                    {server.env && Object.keys(server.env).length > 0 && (
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {Object.keys(server.env).length} env vars
                      </Text>
                    )}
                  </Space>
                </Col>
              </Row>
            </Card>
          ))}
        </Space>
      )
    }
  ];

  const expandedRowRender = (record: ConflictTableRow) => renderConflictDetails(record);

  return (
    <Modal
      title={
        <Space>
          <ExclamationCircleOutlined style={{ color: '#faad14' }} />
          <Title level={4} style={{ margin: 0 }}>
            Resolve Scope Conflicts
          </Title>
        </Space>
      }
      open={visible}
      width={1000}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel} disabled={resolving}>
          Cancel
        </Button>,
        <Button
          key="resolve"
          type="primary"
          onClick={handleResolve}
          loading={resolving}
          icon={<MergeOutlined />}
        >
          Resolve All Conflicts
        </Button>
      ]}
      destroyOnClose
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Alert
          message="Configuration Conflicts Detected"
          description={
            <div>
              <Paragraph>
                {conflicts.length} server{conflicts.length !== 1 ? 's have' : ' has'} conflicting 
                definitions across different scopes. These conflicts must be resolved before 
                the configuration can be properly applied.
              </Paragraph>
              <Paragraph style={{ margin: 0 }}>
                <strong>Scope Priority:</strong> Project &gt; Local &gt; User &gt; Global
              </Paragraph>
            </div>
          }
          type="warning"
          showIcon
        />

        <Collapse defaultActiveKey={conflicts.map(c => c.serverName)}>
          {conflicts.map(conflict => (
            <Panel
              key={conflict.serverName}
              header={
                <Space>
                  <Text strong>{conflict.serverName}</Text>
                  <Tag color="warning">
                    {conflict.scopes.length} scopes
                  </Tag>
                </Space>
              }
            >
              {renderConflictDetails(buildTableData().find(row => row.serverName === conflict.serverName)!)}
            </Panel>
          ))}
        </Collapse>

        <Divider />

        <Alert
          message="Resolution Summary"
          description={
            <div>
              <Text>
                {conflicts.length} conflict{conflicts.length !== 1 ? 's' : ''} will be resolved.
                Changes will be applied to the respective configuration files.
              </Text>
            </div>
          }
          type="info"
          showIcon
        />
      </Space>
    </Modal>
  );
};

export default ScopeConflictDialog;