import React, { useState } from 'react';
import {
  Modal,
  Table,
  Button,
  Space,
  Typography,
  Checkbox,
  Select,
  Alert,
  Progress,
  Card,
  Row,
  Col,
  Divider,
  Tag,
  message,
  Tooltip
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  SyncOutlined,
  DeleteOutlined,
  CopyOutlined,
  PlayCircleOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { MCPServer, MCPClient, ResolvedConfiguration } from '../../../shared/types';
import { ConfigScope } from '../../../shared/types/enums';
import ScopeTag from '../common/ScopeTag';
import ClientIcon from '../common/ClientIcon';

const { Title, Text } = Typography;
const { Option } = Select;

export interface BulkOperationsDialogProps {
  visible: boolean;
  clients: MCPClient[];
  configurations: Record<string, ResolvedConfiguration>;
  onBulkOperation: (operation: BulkOperation) => Promise<BulkOperationResult>;
  onCancel: () => void;
}

export interface BulkOperation {
  type: 'sync' | 'copy' | 'remove' | 'test';
  sourceClientId?: string;
  targetClientIds: string[];
  servers: string[];
  options: {
    scope?: ConfigScope;
    overwriteExisting?: boolean;
    createBackup?: boolean;
    testAfterOperation?: boolean;
  };
}

export interface BulkOperationResult {
  success: boolean;
  results: Array<{
    clientId: string;
    serverName: string;
    success: boolean;
    error?: string;
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

interface ServerSelection {
  serverName: string;
  sourceClient: MCPClient;
  server: MCPServer;
  scope: ConfigScope;
  selected: boolean;
}

const BulkOperationsDialog: React.FC<BulkOperationsDialogProps> = ({
  visible,
  clients,
  configurations,
  onBulkOperation,
  onCancel
}) => {
  const [operationType, setOperationType] = useState<'sync' | 'copy' | 'remove' | 'test'>('sync');
  const [sourceClientId, setSourceClientId] = useState<string>();
  const [targetClientIds, setTargetClientIds] = useState<string[]>([]);
  const [selectedServers, setSelectedServers] = useState<string[]>([]);
  const [options, setOptions] = useState({
    scope: ConfigScope.USER,
    overwriteExisting: true,
    createBackup: true,
    testAfterOperation: false
  });
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<BulkOperationResult | null>(null);

  const getAvailableServers = (): ServerSelection[] => {
    if (!sourceClientId || operationType === 'test') {
      // For test operations or no source, show all servers from all clients
      const allServers: ServerSelection[] = [];
      
      clients.forEach(client => {
        const config = configurations[client.id];
        if (config) {
          Object.entries(config.servers).forEach(([name, server]) => {
            allServers.push({
              serverName: name,
              sourceClient: client,
              server,
              scope: config.sources[name] || ConfigScope.USER,
              selected: selectedServers.includes(`${client.id}:${name}`)
            });
          });
        }
      });
      
      return allServers;
    }

    // For sync/copy/remove operations, show servers from source client
    const sourceConfig = configurations[sourceClientId];
    if (!sourceConfig) return [];

    const sourceClient = clients.find(c => c.id === sourceClientId);
    if (!sourceClient) return [];

    return Object.entries(sourceConfig.servers).map(([name, server]) => ({
      serverName: name,
      sourceClient,
      server,
      scope: sourceConfig.sources[name] || ConfigScope.USER,
      selected: selectedServers.includes(name)
    }));
  };

  const getAvailableTargetClients = (): MCPClient[] => {
    if (operationType === 'test') return [];
    return clients.filter(client => client.id !== sourceClientId);
  };

  const handleServerSelection = (serverKey: string, checked: boolean) => {
    if (checked) {
      setSelectedServers([...selectedServers, serverKey]);
    } else {
      setSelectedServers(selectedServers.filter(key => key !== serverKey));
    }
  };

  const handleSelectAllServers = (checked: boolean) => {
    const availableServers = getAvailableServers();
    if (checked) {
      const serverKeys = availableServers.map(s => 
        operationType === 'test' ? `${s.sourceClient.id}:${s.serverName}` : s.serverName
      );
      setSelectedServers(serverKeys);
    } else {
      setSelectedServers([]);
    }
  };

  const handleExecute = async () => {
    if (selectedServers.length === 0) {
      message.warning('Please select at least one server');
      return;
    }

    if (operationType !== 'test' && targetClientIds.length === 0) {
      message.warning('Please select at least one target client');
      return;
    }

    const operation: BulkOperation = {
      type: operationType,
      sourceClientId,
      targetClientIds,
      servers: selectedServers,
      options
    };

    setProcessing(true);
    setProgress(0);
    setResults(null);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const result = await onBulkOperation(operation);
      
      clearInterval(progressInterval);
      setProgress(100);
      setResults(result);

      if (result.success) {
        message.success(`${operationType} operation completed successfully`);
      } else {
        message.error(`${operationType} operation completed with errors`);
      }
    } catch (error) {
      message.error(`Failed to execute ${operationType} operation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = () => {
    setSourceClientId(undefined);
    setTargetClientIds([]);
    setSelectedServers([]);
    setResults(null);
    setProgress(0);
  };

  const columns: ColumnsType<ServerSelection> = [
    {
      title: (
        <Checkbox
          checked={selectedServers.length === getAvailableServers().length && getAvailableServers().length > 0}
          indeterminate={selectedServers.length > 0 && selectedServers.length < getAvailableServers().length}
          onChange={(e) => handleSelectAllServers(e.target.checked)}
        />
      ),
      dataIndex: 'selected',
      width: 50,
      render: (_, record) => (
        <Checkbox
          checked={record.selected}
          onChange={(e) => {
            const key = operationType === 'test' 
              ? `${record.sourceClient.id}:${record.serverName}`
              : record.serverName;
            handleServerSelection(key, e.target.checked);
          }}
        />
      )
    },
    {
      title: 'Server',
      dataIndex: 'serverName',
      render: (name: string, record) => (
        <Space direction="vertical" size="small">
          <Text strong>{name}</Text>
          <Space size="small">
            <ClientIcon clientType={record.sourceClient.type} size={16} />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.sourceClient.name}
            </Text>
            <ScopeTag scope={record.scope} size="small" />
          </Space>
        </Space>
      )
    },
    {
      title: 'Command',
      dataIndex: 'server',
      render: (server: MCPServer) => (
        <Space direction="vertical" size="small">
          <Text code style={{ fontSize: 11 }}>{server.command}</Text>
          {server.args && server.args.length > 0 && (
            <div>
              {server.args.map((arg, index) => (
                <Tag key={index} style={{ fontSize: 10, margin: '1px' }}>
                  {arg}
                </Tag>
              ))}
            </div>
          )}
        </Space>
      )
    },
    {
      title: 'Status',
      render: (_, record) => (
        <Tag color={record.server.enabled !== false ? 'green' : 'default'}>
          {record.server.enabled !== false ? 'Enabled' : 'Disabled'}
        </Tag>
      )
    }
  ];

  const renderResults = () => {
    if (!results) return null;

    return (
      <Card size="small" title="Operation Results" style={{ marginTop: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Row gutter={[16, 16]}>
            <Col span={8}>
              <Tooltip title="Total operations attempted">
                <Card size="small" style={{ textAlign: 'center' }}>
                  <Text type="secondary">Total</Text>
                  <div style={{ fontSize: 24, fontWeight: 'bold' }}>
                    {results.summary.total}
                  </div>
                </Card>
              </Tooltip>
            </Col>
            <Col span={8}>
              <Tooltip title="Successful operations">
                <Card size="small" style={{ textAlign: 'center', borderColor: '#52c41a' }}>
                  <Text type="secondary">Success</Text>
                  <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>
                    {results.summary.successful}
                  </div>
                </Card>
              </Tooltip>
            </Col>
            <Col span={8}>
              <Tooltip title="Failed operations">
                <Card size="small" style={{ textAlign: 'center', borderColor: '#ff4d4f' }}>
                  <Text type="secondary">Failed</Text>
                  <div style={{ fontSize: 24, fontWeight: 'bold', color: '#ff4d4f' }}>
                    {results.summary.failed}
                  </div>
                </Card>
              </Tooltip>
            </Col>
          </Row>

          {results.results.some(r => !r.success) && (
            <Alert
              message="Some operations failed"
              description="Check the details below for specific error information."
              type="warning"
              showIcon
              style={{ marginTop: 8 }}
            />
          )}
        </Space>
      </Card>
    );
  };

  const availableServers = getAvailableServers();
  const availableTargetClients = getAvailableTargetClients();

  return (
    <Modal
      title={
        <Space>
          <SyncOutlined />
          <Title level={4} style={{ margin: 0 }}>
            Bulk Operations
          </Title>
        </Space>
      }
      open={visible}
      width={1000}
      onCancel={onCancel}
      footer={[
        <Button key="reset" onClick={handleReset} disabled={processing}>
          Reset
        </Button>,
        <Button key="cancel" onClick={onCancel} disabled={processing}>
          Cancel
        </Button>,
        <Button
          key="execute"
          type="primary"
          onClick={handleExecute}
          loading={processing}
          disabled={selectedServers.length === 0 || (operationType !== 'test' && targetClientIds.length === 0)}
        >
          Execute {operationType.charAt(0).toUpperCase() + operationType.slice(1)}
        </Button>
      ]}
      destroyOnClose
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {processing && (
          <Alert
            message={`${operationType.charAt(0).toUpperCase() + operationType.slice(1)} Operation in Progress`}
            description={
              <div>
                <Progress percent={progress} size="small" />
                <Text style={{ marginTop: 8, display: 'block' }}>
                  Processing {selectedServers.length} server{selectedServers.length !== 1 ? 's' : ''} 
                  {targetClientIds.length > 0 && ` across ${targetClientIds.length} client${targetClientIds.length !== 1 ? 's' : ''}`}...
                </Text>
              </div>
            }
            type="info"
            showIcon
          />
        )}

        {!processing && (
          <>
            <Alert
              message="Bulk Operations"
              description="Perform operations on multiple servers across different MCP clients simultaneously. Use with caution as these operations can affect multiple configurations."
              type="info"
              showIcon
            />

            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Text strong>Operation Type</Text>
                  <Select
                    value={operationType}
                    onChange={(value) => {
                      setOperationType(value);
                      handleReset();
                    }}
                    style={{ width: '100%' }}
                  >
                    <Option value="sync">
                      <Space>
                        <SyncOutlined />
                        <Text>Synchronize</Text>
                      </Space>
                    </Option>
                    <Option value="copy">
                      <Space>
                        <CopyOutlined />
                        <Text>Copy</Text>
                      </Space>
                    </Option>
                    <Option value="remove">
                      <Space>
                        <DeleteOutlined />
                        <Text>Remove</Text>
                      </Space>
                    </Option>
                    <Option value="test">
                      <Space>
                        <PlayCircleOutlined />
                        <Text>Test</Text>
                      </Space>
                    </Option>
                  </Select>
                </Space>
              </Col>

              {operationType !== 'test' && (
                <Col span={12}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Text strong>Source Client</Text>
                    <Select
                      value={sourceClientId}
                      onChange={setSourceClientId}
                      placeholder="Select source client"
                      style={{ width: '100%' }}
                    >
                      {clients.map(client => (
                        <Option key={client.id} value={client.id}>
                          <Space>
                            <ClientIcon clientType={client.type} size={16} />
                            <Text>{client.name}</Text>
                          </Space>
                        </Option>
                      ))}
                    </Select>
                  </Space>
                </Col>
              )}
            </Row>

            {operationType !== 'test' && (
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text strong>Target Clients</Text>
                <Select
                  mode="multiple"
                  value={targetClientIds}
                  onChange={setTargetClientIds}
                  placeholder="Select target clients"
                  style={{ width: '100%' }}
                >
                  {availableTargetClients.map(client => (
                    <Option key={client.id} value={client.id}>
                      <Space>
                        <ClientIcon clientType={client.type} size={16} />
                        <Text>{client.name}</Text>
                      </Space>
                    </Option>
                  ))}
                </Select>
              </Space>
            )}

            <Divider />

            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>Select Servers</Text>
              <Table
                columns={columns}
                dataSource={availableServers}
                rowKey={(record) => 
                  operationType === 'test' 
                    ? `${record.sourceClient.id}:${record.serverName}`
                    : record.serverName
                }
                pagination={{ pageSize: 10 }}
                size="small"
                scroll={{ y: 300 }}
              />
            </Space>

            <Card size="small" title="Options">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Row gutter={[16, 8]}>
                  <Col span={12}>
                    <Checkbox
                      checked={options.overwriteExisting}
                      onChange={(e) => setOptions({...options, overwriteExisting: e.target.checked})}
                    >
                      Overwrite existing servers
                    </Checkbox>
                  </Col>
                  <Col span={12}>
                    <Checkbox
                      checked={options.createBackup}
                      onChange={(e) => setOptions({...options, createBackup: e.target.checked})}
                    >
                      Create backup before operation
                    </Checkbox>
                  </Col>
                </Row>
                {operationType !== 'test' && (
                  <Row gutter={[16, 8]}>
                    <Col span={12}>
                      <Checkbox
                        checked={options.testAfterOperation}
                        onChange={(e) => setOptions({...options, testAfterOperation: e.target.checked})}
                      >
                        Test servers after operation
                      </Checkbox>
                    </Col>
                    <Col span={12}>
                      <Space>
                        <Text>Target scope:</Text>
                        <Select
                          value={options.scope}
                          onChange={(scope) => setOptions({...options, scope})}
                          size="small"
                          style={{ width: 120 }}
                        >
                          {Object.values(ConfigScope).map(scope => (
                            <Option key={scope} value={scope}>
                              <ScopeTag scope={scope} size="small" />
                            </Option>
                          ))}
                        </Select>
                      </Space>
                    </Col>
                  </Row>
                )}
              </Space>
            </Card>
          </>
        )}

        {renderResults()}
      </Space>
    </Modal>
  );
};

export default BulkOperationsDialog;