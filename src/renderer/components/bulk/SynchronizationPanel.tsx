import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Space,
  Typography,
  Table,
  Select,
  Alert,
  Progress,
  Row,
  Col,
  Statistic,
  Badge,
  Tag,
  Tooltip,
  Switch,
  message,
  Divider
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  SyncOutlined,
  DiffOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
  SettingOutlined,
  ClockCircleOutlined,
  BranchesOutlined
} from '@ant-design/icons';
import { MCPClient, ResolvedConfiguration } from '../../../shared/types';
import { ConfigScope } from '../../../shared/types/enums';
import ClientIcon from '../common/ClientIcon';
import ScopeTag from '../common/ScopeTag';
import BulkOperationsDialog, { BulkOperation, BulkOperationResult } from './BulkOperationsDialog';

const { Title, Text } = Typography;
const { Option } = Select;

export interface SynchronizationPanelProps {
  clients: MCPClient[];
  configurations: Record<string, ResolvedConfiguration>;
  loading?: boolean;
  onSyncConfiguration?: (sourceClientId: string, targetClientIds: string[]) => Promise<void>;
  onBulkOperation?: (operation: BulkOperation) => Promise<BulkOperationResult>;
  onRefresh?: () => void;
  autoSyncEnabled?: boolean;
  onAutoSyncToggle?: (enabled: boolean) => void;
}

interface SyncComparison {
  clientId: string;
  client: MCPClient;
  serverCount: number;
  uniqueServers: string[];
  conflicts: number;
  lastSync?: Date;
  status: 'synced' | 'outdated' | 'conflicts' | 'unknown';
}

const SynchronizationPanel: React.FC<SynchronizationPanelProps> = ({
  clients,
  configurations,
  loading = false,
  onSyncConfiguration,
  onBulkOperation,
  onRefresh,
  autoSyncEnabled = false,
  onAutoSyncToggle
}) => {
  const [primaryClientId, setPrimaryClientId] = useState<string>();
  const [bulkDialogVisible, setBulkDialogVisible] = useState(false);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date>();

  useEffect(() => {
    if (clients.length > 0 && !primaryClientId) {
      // Auto-select first client with configurations as primary
      const clientWithConfigs = clients.find(client => 
        configurations[client.id] && Object.keys(configurations[client.id].servers).length > 0
      );
      if (clientWithConfigs) {
        setPrimaryClientId(clientWithConfigs.id);
      }
    }
  }, [clients, configurations, primaryClientId]);

  const generateSyncComparisons = (): SyncComparison[] => {
    if (!primaryClientId) return [];

    const primaryConfig = configurations[primaryClientId];
    if (!primaryConfig) return [];

    const primaryServers = new Set(Object.keys(primaryConfig.servers));

    return clients.map(client => {
      const config = configurations[client.id];
      const clientServers = config ? new Set(Object.keys(config.servers)) : new Set();
      
      // Find unique servers (not in primary)
      const uniqueServers = Array.from(clientServers).filter(server => !primaryServers.has(server));
      
      // Count conflicts (same server name but different configuration)
      let conflicts = 0;
      if (config) {
        Object.entries(config.servers).forEach(([name, server]) => {
          if (primaryConfig.servers[name] && 
              JSON.stringify(server) !== JSON.stringify(primaryConfig.servers[name])) {
            conflicts++;
          }
        });
      }

      let status: SyncComparison['status'] = 'unknown';
      if (client.id === primaryClientId) {
        status = 'synced';
      } else if (conflicts > 0) {
        status = 'conflicts';
      } else if (uniqueServers.length > 0 || clientServers.size !== primaryServers.size) {
        status = 'outdated';
      } else {
        status = 'synced';
      }

      return {
        clientId: client.id,
        client,
        serverCount: clientServers.size,
        uniqueServers,
        conflicts,
        lastSync: client.id === primaryClientId ? new Date() : undefined,
        status
      };
    });
  };

  const handleSyncAll = async () => {
    if (!primaryClientId || !onSyncConfiguration) return;

    const targetClients = clients
      .filter(client => client.id !== primaryClientId)
      .map(client => client.id);

    if (targetClients.length === 0) return;

    setSyncInProgress(true);
    setSyncProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setSyncProgress(prev => Math.min(prev + 20, 90));
      }, 300);

      await onSyncConfiguration(primaryClientId, targetClients);
      
      clearInterval(progressInterval);
      setSyncProgress(100);
      setLastSyncTime(new Date());
      
      message.success(`Synchronized ${targetClients.length} client${targetClients.length !== 1 ? 's' : ''} with ${clients.find(c => c.id === primaryClientId)?.name}`);
      
      onRefresh?.();
    } catch (error) {
      message.error(`Synchronization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSyncInProgress(false);
      setSyncProgress(0);
    }
  };

  const handleSyncSelected = async (targetClientIds: string[]) => {
    if (!primaryClientId || !onSyncConfiguration || targetClientIds.length === 0) return;

    setSyncInProgress(true);
    setSyncProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setSyncProgress(prev => Math.min(prev + 25, 90));
      }, 200);

      await onSyncConfiguration(primaryClientId, targetClientIds);
      
      clearInterval(progressInterval);
      setSyncProgress(100);
      setLastSyncTime(new Date());
      
      message.success(`Synchronized ${targetClientIds.length} selected client${targetClientIds.length !== 1 ? 's' : ''}`);
      
      onRefresh?.();
    } catch (error) {
      message.error(`Synchronization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSyncInProgress(false);
      setSyncProgress(0);
    }
  };

  const syncComparisons = generateSyncComparisons();
  const totalServers = Object.keys(configurations[primaryClientId]?.servers || {}).length;
  const outOfSyncClients = syncComparisons.filter(comp => comp.status !== 'synced').length;
  const conflictsCount = syncComparisons.reduce((sum, comp) => sum + comp.conflicts, 0);

  const columns: ColumnsType<SyncComparison> = [
    {
      title: 'Client',
      dataIndex: 'client',
      render: (client: MCPClient, record) => (
        <Space>
          <ClientIcon clientType={client.type} size={20} />
          <Space direction="vertical" size="small">
            <Text strong>{client.name}</Text>
            {record.clientId === primaryClientId && (
              <Tag color="blue" size="small">Primary</Tag>
            )}
          </Space>
        </Space>
      )
    },
    {
      title: 'Servers',
      dataIndex: 'serverCount',
      render: (count: number, record) => (
        <Space direction="vertical" size="small">
          <Text>{count} total</Text>
          {record.uniqueServers.length > 0 && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              +{record.uniqueServers.length} unique
            </Text>
          )}
        </Space>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (status: SyncComparison['status'], record) => {
        const statusConfig = {
          synced: { color: 'success', icon: <CheckCircleOutlined />, text: 'Synced' },
          outdated: { color: 'warning', icon: <ClockCircleOutlined />, text: 'Outdated' },
          conflicts: { color: 'error', icon: <WarningOutlined />, text: 'Conflicts' },
          unknown: { color: 'default', icon: <InfoCircleOutlined />, text: 'Unknown' }
        };

        const config = statusConfig[status];
        
        return (
          <Space direction="vertical" size="small">
            <Tag color={config.color} icon={config.icon}>
              {config.text}
            </Tag>
            {record.conflicts > 0 && (
              <Text type="danger" style={{ fontSize: 12 }}>
                {record.conflicts} conflict{record.conflicts !== 1 ? 's' : ''}
              </Text>
            )}
          </Space>
        );
      }
    },
    {
      title: 'Last Sync',
      dataIndex: 'lastSync',
      render: (lastSync?: Date) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {lastSync ? lastSync.toLocaleString() : 'Never'}
        </Text>
      )
    },
    {
      title: 'Actions',
      render: (_, record) => (
        <Space>
          {record.clientId !== primaryClientId && (
            <Button
              size="small"
              type="link"
              icon={<SyncOutlined />}
              onClick={() => handleSyncSelected([record.clientId])}
              disabled={syncInProgress}
            >
              Sync
            </Button>
          )}
          <Button
            size="small"
            type="link"
            icon={<DiffOutlined />}
            disabled={!configurations[record.clientId]}
          >
            Compare
          </Button>
        </Space>
      )
    }
  ];

  return (
    <>
      <Card
        title={
          <Space>
            <BranchesOutlined />
            <Title level={5} style={{ margin: 0 }}>
              Configuration Synchronization
            </Title>
          </Space>
        }
        extra={
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={onRefresh}
              loading={loading}
              size="small"
            />
            <Button
              icon={<SettingOutlined />}
              onClick={() => setBulkDialogVisible(true)}
              size="small"
            >
              Bulk Operations
            </Button>
          </Space>
        }
        loading={loading}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {syncInProgress && (
            <Alert
              message="Synchronization in Progress"
              description={
                <div>
                  <Progress percent={syncProgress} size="small" />
                  <Text style={{ marginTop: 8, display: 'block' }}>
                    Synchronizing configurations across clients...
                  </Text>
                </div>
              }
              type="info"
              showIcon
            />
          )}

          {/* Configuration Options */}
          <Row gutter={[16, 16]} align="middle">
            <Col span={12}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text strong>Primary Client (Source)</Text>
                <Select
                  value={primaryClientId}
                  onChange={setPrimaryClientId}
                  placeholder="Select primary client"
                  style={{ width: '100%' }}
                  disabled={syncInProgress}
                >
                  {clients.map(client => (
                    <Option key={client.id} value={client.id}>
                      <Space>
                        <ClientIcon clientType={client.type} size={16} />
                        <Text>{client.name}</Text>
                        <Text type="secondary">
                          ({Object.keys(configurations[client.id]?.servers || {}).length} servers)
                        </Text>
                      </Space>
                    </Option>
                  ))}
                </Select>
              </Space>
            </Col>
            <Col span={12}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Space>
                  <Text strong>Auto-Sync</Text>
                  <Tooltip title="Automatically synchronize configurations when changes are detected">
                    <InfoCircleOutlined style={{ color: '#1890ff' }} />
                  </Tooltip>
                </Space>
                <Switch
                  checked={autoSyncEnabled}
                  onChange={onAutoSyncToggle}
                  disabled={syncInProgress}
                  checkedChildren="Enabled"
                  unCheckedChildren="Disabled"
                />
              </Space>
            </Col>
          </Row>

          {/* Summary Statistics */}
          {primaryClientId && (
            <Card size="small" title="Synchronization Status">
              <Row gutter={[16, 16]}>
                <Col span={6}>
                  <Statistic
                    title="Total Servers"
                    value={totalServers}
                    prefix={<BranchesOutlined />}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="Out of Sync"
                    value={outOfSyncClients}
                    valueStyle={{ color: outOfSyncClients > 0 ? '#faad14' : '#52c41a' }}
                    prefix={<ClockCircleOutlined />}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="Conflicts"
                    value={conflictsCount}
                    valueStyle={{ color: conflictsCount > 0 ? '#ff4d4f' : '#52c41a' }}
                    prefix={<WarningOutlined />}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="Last Sync"
                    value={lastSyncTime ? lastSyncTime.toLocaleTimeString() : 'Never'}
                    valueStyle={{ fontSize: 14 }}
                    prefix={<SyncOutlined />}
                  />
                </Col>
              </Row>
            </Card>
          )}

          {/* Action Buttons */}
          <Row gutter={[8, 8]}>
            <Col span={12}>
              <Button
                type="primary"
                icon={<SyncOutlined />}
                onClick={handleSyncAll}
                disabled={!primaryClientId || syncInProgress || clients.length <= 1}
                loading={syncInProgress}
                style={{ width: '100%' }}
              >
                Sync All Clients
              </Button>
            </Col>
            <Col span={12}>
              <Button
                icon={<DiffOutlined />}
                onClick={() => setBulkDialogVisible(true)}
                disabled={!primaryClientId || syncInProgress}
                style={{ width: '100%' }}
              >
                Advanced Operations
              </Button>
            </Col>
          </Row>

          {/* Sync Status Alerts */}
          {outOfSyncClients > 0 && (
            <Alert
              message={`${outOfSyncClients} client${outOfSyncClients !== 1 ? 's are' : ' is'} out of sync`}
              description="Some clients have different server configurations. Consider synchronizing to maintain consistency."
              type="warning"
              showIcon
              action={
                <Button
                  size="small"
                  type="primary"
                  onClick={handleSyncAll}
                  disabled={syncInProgress}
                >
                  Sync Now
                </Button>
              }
            />
          )}

          {conflictsCount > 0 && (
            <Alert
              message={`${conflictsCount} configuration conflict${conflictsCount !== 1 ? 's' : ''} detected`}
              description="Some servers have the same name but different configurations across clients. Resolve these conflicts before synchronizing."
              type="error"
              showIcon
              action={
                <Button
                  size="small"
                  onClick={() => setBulkDialogVisible(true)}
                >
                  Resolve
                </Button>
              }
            />
          )}

          <Divider />

          {/* Client Comparison Table */}
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text strong>Client Status Overview</Text>
            <Table
              columns={columns}
              dataSource={syncComparisons}
              rowKey="clientId"
              size="small"
              pagination={false}
            />
          </Space>
        </Space>
      </Card>

      <BulkOperationsDialog
        visible={bulkDialogVisible}
        clients={clients}
        configurations={configurations}
        onBulkOperation={onBulkOperation || (async () => ({ success: true, results: [], summary: { total: 0, successful: 0, failed: 0 } }))}
        onCancel={() => setBulkDialogVisible(false)}
      />
    </>
  );
};

export default SynchronizationPanel;