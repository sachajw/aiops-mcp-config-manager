import React, { useState, useEffect } from 'react';
import { 
  Tree, 
  Card, 
  Space, 
  Typography, 
  Button, 
  Tooltip, 
  Badge,
  Empty,
  Spin,
  Dropdown,
  MenuProps
} from 'antd';
import { 
  ReloadOutlined,
  MoreOutlined,
  FolderOutlined,
  FileTextOutlined,
  SettingOutlined,
  SyncOutlined 
} from '@ant-design/icons';
import type { DataNode } from 'antd/es/tree';
import { MCPClient, ResolvedConfiguration } from '../../../shared/types';
import { ClientType, ClientStatus, ConfigScope } from '../../../shared/types/enums';
import StatusIndicator from '../common/StatusIndicator';
import ClientIcon from '../common/ClientIcon';
import ScopeTag from '../common/ScopeTag';

const { Title, Text } = Typography;

export interface ClientListPanelProps {
  clients: MCPClient[];
  loading?: boolean;
  selectedClient?: string;
  selectedScope?: ConfigScope;
  onClientSelect?: (clientId: string) => void;
  onScopeSelect?: (clientId: string, scope: ConfigScope) => void;
  onRefresh?: () => void;
  onClientAction?: (clientId: string, action: 'configure' | 'refresh' | 'test') => void;
  configurations?: Record<string, ResolvedConfiguration>;
}

interface TreeNodeData extends DataNode {
  type: 'client' | 'scope' | 'server';
  clientId?: string;
  scope?: ConfigScope;
  serverName?: string;
  status?: ClientStatus;
  serverCount?: number;
  conflictCount?: number;
}

const ClientListPanel: React.FC<ClientListPanelProps> = ({
  clients = [],
  loading = false,
  selectedClient,
  selectedScope,
  onClientSelect,
  onScopeSelect,
  onRefresh,
  onClientAction,
  configurations = {}
}) => {
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  // Update selected keys when props change
  useEffect(() => {
    if (selectedClient) {
      const keys = [selectedClient];
      if (selectedScope) {
        keys.push(`${selectedClient}-${selectedScope}`);
      }
      setSelectedKeys(keys);
    }
  }, [selectedClient, selectedScope]);

  const buildTreeData = (): TreeNodeData[] => {
    return clients.map(client => {
      const config = configurations[client.id];
      const scopeNodes: TreeNodeData[] = [];

      // Add scope nodes if configuration is resolved
      if (config) {
        for (const scope of Object.values(ConfigScope)) {
          const scopeServers = Object.entries(config.sources)
            .filter(([, serverScope]) => serverScope === scope);

          if (scopeServers.length > 0) {
            const serverNodes: TreeNodeData[] = scopeServers.map(([serverName]) => ({
              key: `${client.id}-${scope}-${serverName}`,
              title: (
                <Space size="small">
                  <FileTextOutlined />
                  <Text>{serverName}</Text>
                  {config.conflicts.some(c => c.serverName === serverName) && (
                    <Badge count="!" style={{ backgroundColor: '#faad14' }} />
                  )}
                </Space>
              ),
              type: 'server',
              clientId: client.id,
              scope,
              serverName,
              isLeaf: true
            }));

            scopeNodes.push({
              key: `${client.id}-${scope}`,
              title: (
                <Space size="small">
                  <FolderOutlined />
                  <ScopeTag scope={scope} size="small" />
                  <Text type="secondary">({serverNodes.length})</Text>
                </Space>
              ),
              type: 'scope',
              clientId: client.id,
              scope,
              children: serverNodes
            });
          }
        }
      }

      const conflictCount = config?.conflicts?.length ?? 0;
      const serverCount = config ? Object.keys(config.servers).length : 0;

      return {
        key: client.id,
        title: (
          <Space size="small" style={{ width: '100%', justifyContent: 'space-between' }}>
            <Space size="small">
              <ClientIcon clientType={client.type} size="small" />
              <Text strong>{client.name}</Text>
              <StatusIndicator 
                status={client.status} 
                size="small"
                tooltip={`Status: ${client.status}${client.version ? ` (v${client.version})` : ''}`}
              />
            </Space>
            <Space size="small">
              {serverCount > 0 && (
                <Tooltip title="Total servers">
                  <Badge count={serverCount} showZero={false} size="small" />
                </Tooltip>
              )}
              {conflictCount > 0 && (
                <Tooltip title="Configuration conflicts">
                  <Badge count={conflictCount} style={{ backgroundColor: '#faad14' }} size="small" />
                </Tooltip>
              )}
              <ClientActionsDropdown 
                client={client}
                onAction={(action) => onClientAction?.(client.id, action)}
              />
            </Space>
          </Space>
        ),
        type: 'client',
        clientId: client.id,
        status: client.status,
        serverCount,
        conflictCount,
        children: scopeNodes.length > 0 ? scopeNodes : undefined
      };
    });
  };

  const handleSelect = (selectedKeys: React.Key[], info: any) => {
    const key = selectedKeys[0] as string;
    if (!key) return;

    const node = info.node as TreeNodeData;
    
    if (node.type === 'client' && node.clientId) {
      onClientSelect?.(node.clientId);
    } else if (node.type === 'scope' && node.clientId && node.scope) {
      onScopeSelect?.(node.clientId, node.scope);
    }
  };

  const handleExpand = (expandedKeys: React.Key[]) => {
    setExpandedKeys(expandedKeys as string[]);
  };

  if (loading) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin size="large" />
          <div style={{ marginTop: '16px' }}>
            <Text type="secondary">Discovering MCP clients...</Text>
          </div>
        </div>
      </Card>
    );
  }

  if (clients.length === 0) {
    return (
      <Card>
        <Empty
          description="No MCP clients found"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Button type="primary" icon={<ReloadOutlined />} onClick={onRefresh}>
            Scan for Clients
          </Button>
        </Empty>
      </Card>
    );
  }

  return (
    <Card
      title={
        <Space>
          <Title level={5} style={{ margin: 0 }}>MCP Clients</Title>
          <Badge count={clients.length} showZero={false} />
        </Space>
      }
      extra={
        <Button 
          type="text" 
          icon={<ReloadOutlined />} 
          onClick={onRefresh}
          loading={loading}
        >
          Refresh
        </Button>
      }
    >
      <Tree
        treeData={buildTreeData()}
        selectedKeys={selectedKeys}
        expandedKeys={expandedKeys}
        onSelect={handleSelect}
        onExpand={handleExpand}
        showIcon={false}
        blockNode
      />
    </Card>
  );
};

interface ClientActionsDropdownProps {
  client: MCPClient;
  onAction: (action: 'configure' | 'refresh' | 'test') => void;
}

const ClientActionsDropdown: React.FC<ClientActionsDropdownProps> = ({ 
  client, 
  onAction 
}) => {
  const items: MenuProps['items'] = [
    {
      key: 'configure',
      label: 'Configure',
      icon: <SettingOutlined />,
    },
    {
      key: 'refresh',
      label: 'Refresh Status',
      icon: <SyncOutlined />,
    },
    {
      key: 'test',
      label: 'Test Servers',
      icon: <FileTextOutlined />,
    },
  ];

  const handleClick: MenuProps['onClick'] = ({ key }) => {
    onAction(key as 'configure' | 'refresh' | 'test');
  };

  return (
    <Dropdown 
      menu={{ items, onClick: handleClick }} 
      placement="bottomRight" 
      trigger={['click']}
    >
      <Button 
        type="text" 
        size="small" 
        icon={<MoreOutlined />}
        onClick={(e) => e.stopPropagation()}
      />
    </Dropdown>
  );
};

export default ClientListPanel;