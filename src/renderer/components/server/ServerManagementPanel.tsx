import React, { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Typography,
  Dropdown,
  Modal,
  message,
  Tag,
  Tooltip,
  Badge,
  Empty,
  Input,
  Switch
} from 'antd';
import type { ColumnsType, TableProps } from 'antd/es/table';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  MoreOutlined,
  SearchOutlined,
  ExclamationCircleOutlined,
  CopyOutlined
} from '@ant-design/icons';
import { MCPServer, MCPClient, ResolvedConfiguration, ServerTestResult } from '../../../shared/types';
import { ConfigScope, TestStatus } from '../../../shared/types/enums';
import StatusIndicator from '../common/StatusIndicator';
import ScopeTag from '../common/ScopeTag';
import { ServerConfigDialog } from '../dialogs';

const { Title, Text } = Typography;
const { Search } = Input;

export interface ServerManagementPanelProps {
  client?: MCPClient;
  configuration?: ResolvedConfiguration;
  loading?: boolean;
  onAddServer?: (server: MCPServer) => Promise<void>;
  onEditServer?: (serverName: string, server: MCPServer) => Promise<void>;
  onDeleteServer?: (serverName: string, scope: ConfigScope) => void;
  onTestServer?: (server: MCPServer) => Promise<ServerTestResult>;
  onDuplicateServer?: (serverName: string) => void;
  onToggleServer?: (serverName: string, enabled: boolean) => void;
  serverTestResults?: Record<string, { status: TestStatus; message: string }>;
}

interface ServerTableRow {
  key: string;
  name: string;
  command: string;
  scope: ConfigScope;
  enabled: boolean;
  args: string[];
  env: Record<string, string>;
  cwd?: string;
  hasConflicts: boolean;
  server: MCPServer;
}

const ServerManagementPanel: React.FC<ServerManagementPanelProps> = ({
  client,
  configuration,
  loading = false,
  onAddServer,
  onEditServer,
  onDeleteServer,
  onTestServer,
  onDuplicateServer,
  onToggleServer,
  serverTestResults = {}
}) => {
  const [searchText, setSearchText] = useState('');
  const [showDisabled, setShowDisabled] = useState(true);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
  const [editingServer, setEditingServer] = useState<MCPServer | undefined>(undefined);

  const buildTableData = (): ServerTableRow[] => {
    if (!configuration) return [];

    return Object.entries(configuration.servers).map(([name, server]) => {
      const scope = configuration.sources[name] || ConfigScope.USER;
      const hasConflicts = configuration.conflicts.some(c => c.serverName === name);

      return {
        key: name,
        name,
        command: server.command,
        scope,
        enabled: server.enabled !== false,
        args: server.args || [],
        env: server.env || {},
        cwd: server.cwd,
        hasConflicts,
        server
      };
    });
  };

  const filteredData = buildTableData().filter(row => {
    const matchesSearch = !searchText || 
      row.name.toLowerCase().includes(searchText.toLowerCase()) ||
      row.command.toLowerCase().includes(searchText.toLowerCase());
    
    const matchesEnabled = showDisabled || row.enabled;
    
    return matchesSearch && matchesEnabled;
  });

  const handleDeleteServer = (serverName: string, scope: ConfigScope) => {
    Modal.confirm({
      title: 'Delete Server Configuration',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>Are you sure you want to delete the server configuration for <strong>{serverName}</strong>?</p>
          <p>This will remove it from the <ScopeTag scope={scope} /> scope.</p>
        </div>
      ),
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk() {
        onDeleteServer?.(serverName, scope);
        message.success(`Server "${serverName}" deleted successfully`);
      },
    });
  };

  const handleToggleServer = (serverName: string, enabled: boolean) => {
    onToggleServer?.(serverName, enabled);
    message.success(`Server "${serverName}" ${enabled ? 'enabled' : 'disabled'}`);
  };

  const handleAddServerClick = () => {
    setDialogMode('add');
    setEditingServer(undefined);
    setDialogVisible(true);
  };

  const handleEditServerClick = (serverName: string) => {
    const serverRow = buildTableData().find(row => row.name === serverName);
    if (serverRow) {
      setDialogMode('edit');
      setEditingServer(serverRow.server);
      setDialogVisible(true);
    }
  };

  const handleDialogSave = async (server: MCPServer) => {
    try {
      if (dialogMode === 'add') {
        await onAddServer?.(server);
        message.success(`Server "${server.name}" added successfully`);
      } else {
        await onEditServer?.(editingServer?.name || server.name, server);
        message.success(`Server "${server.name}" updated successfully`);
      }
      setDialogVisible(false);
      setEditingServer(undefined);
    } catch (error) {
      message.error(`Failed to ${dialogMode} server: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDialogCancel = () => {
    setDialogVisible(false);
    setEditingServer(undefined);
  };

  const columns: ColumnsType<ServerTableRow> = [
    {
      title: 'Server Name',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (name: string, record) => (
        <Space direction="vertical" size="small">
          <Space size="small">
            <Text strong style={{ color: record.enabled ? undefined : '#999' }}>
              {name}
            </Text>
            {record.hasConflicts && (
              <Tooltip title="This server has scope conflicts">
                <Badge count="!" style={{ backgroundColor: '#faad14' }} />
              </Tooltip>
            )}
          </Space>
          <ScopeTag scope={record.scope} size="small" />
        </Space>
      ),
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Command',
      dataIndex: 'command',
      key: 'command',
      render: (command: string, record) => (
        <Space direction="vertical" size="small">
          <Text code style={{ color: record.enabled ? undefined : '#999' }}>
            {command}
          </Text>
          {record.args.length > 0 && (
            <div>
              {record.args.map((arg, index) => (
                <Tag 
                  key={index} 
                  style={{ 
                    fontSize: '11px', 
                    padding: '0 4px',
                    height: '18px',
                    lineHeight: '16px'
                  }}
                >
                  {arg}
                </Tag>
              ))}
            </div>
          )}
          {record.cwd && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Working dir: {record.cwd}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Environment',
      dataIndex: 'env',
      key: 'env',
      width: 120,
      render: (env: Record<string, string>) => {
        const envCount = Object.keys(env).length;
        if (envCount === 0) return <Text type="secondary">None</Text>;
        
        return (
          <Tooltip title={
            <div>
              {Object.entries(env).map(([key, value]) => (
                <div key={key}>
                  <strong>{key}</strong>: {value.length > 20 ? `${value.substring(0, 20)}...` : value}
                </div>
              ))}
            </div>
          }>
            <Badge count={envCount} showZero={false} />
          </Tooltip>
        );
      },
    },
    {
      title: 'Status',
      key: 'status',
      width: 100,
      render: (_, record) => {
        const testResult = serverTestResults[record.name];
        if (testResult) {
          return (
            <StatusIndicator 
              status={testResult.status}
              tooltip={testResult.message}
            />
          );
        }
        
        return (
          <Switch
            size="small"
            checked={record.enabled}
            onChange={(checked) => handleToggleServer(record.name, checked)}
          />
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Test server">
            <Button
              type="text"
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={() => onTestServer?.(record.server)}
            />
          </Tooltip>
          <Tooltip title="Edit server">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEditServerClick(record.name)}
            />
          </Tooltip>
          <Dropdown
            menu={{
              items: [
                {
                  key: 'duplicate',
                  label: 'Duplicate',
                  icon: <CopyOutlined />,
                  onClick: () => onDuplicateServer?.(record.name),
                },
                {
                  type: 'divider',
                },
                {
                  key: 'delete',
                  label: 'Delete',
                  icon: <DeleteOutlined />,
                  danger: true,
                  onClick: () => handleDeleteServer(record.name, record.scope),
                },
              ],
            }}
            trigger={['click']}
          >
            <Button
              type="text"
              size="small"
              icon={<MoreOutlined />}
            />
          </Dropdown>
        </Space>
      ),
    },
  ];

  const tableProps: TableProps<ServerTableRow> = {
    dataSource: filteredData,
    columns,
    loading,
    size: 'small',
    pagination: {
      total: filteredData.length,
      pageSize: 10,
      showSizeChanger: true,
      showQuickJumper: true,
      showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} servers`,
    },
    scroll: { x: 800 },
    rowClassName: (record) => record.enabled ? '' : 'disabled-row',
  };

  if (!client) {
    return (
      <Card>
        <Empty
          description="Select a client to manage servers"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    );
  }

  return (
    <Card
      title={
        <Space>
          <Title level={5} style={{ margin: 0 }}>
            MCP Servers
          </Title>
          {client && (
            <Text type="secondary">({client.name})</Text>
          )}
        </Space>
      }
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAddServerClick}
        >
          Add Server
        </Button>
      }
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space wrap>
          <Search
            placeholder="Search servers..."
            allowClear
            style={{ width: 300 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            prefix={<SearchOutlined />}
          />
          <Space>
            <Text>Show disabled:</Text>
            <Switch
              size="small"
              checked={showDisabled}
              onChange={setShowDisabled}
            />
          </Space>
        </Space>
        
        <Table {...tableProps} />
      </Space>

      <style>{`
        .disabled-row {
          opacity: 0.6;
        }
        .disabled-row:hover {
          opacity: 0.8;
        }
      `}</style>

      <ServerConfigDialog
        visible={dialogVisible}
        server={editingServer}
        client={client}
        mode={dialogMode}
        onSave={handleDialogSave}
        onCancel={handleDialogCancel}
        onTest={onTestServer}
      />
    </Card>
  );
};

export default ServerManagementPanel;