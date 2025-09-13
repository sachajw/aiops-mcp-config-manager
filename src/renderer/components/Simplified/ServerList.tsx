import React, { useState } from 'react';
import { Table, Button, Space, Popconfirm, Tag, Typography } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined, CopyOutlined } from '@ant-design/icons';
import { useConfigStore } from '../../store/simplifiedStore';
import { MCPServer } from '@/main/services/UnifiedConfigService';
import { ServerFormModal } from './ServerFormModal';

const { Text } = Typography;

export const ServerList: React.FC = () => {
  const { servers, deleteServer, activeClient } = useConfigStore();
  const [editingServer, setEditingServer] = useState<{ name: string; server: MCPServer } | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const columns = [
    {
      title: 'Server Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <Text strong>{name}</Text>,
      width: 200,
      fixed: 'left' as const,
      ellipsis: true
    },
    {
      title: 'Command',
      dataIndex: 'command',
      key: 'command',
      render: (command: string) => <Text code>{command}</Text>,
      width: 300,
      ellipsis: true
    },
    {
      title: 'Arguments',
      dataIndex: 'args',
      key: 'args',
      render: (args: string[]) => (
        args && args.length > 0 ? (
          <Space size="small" wrap>
            {args.map((arg, index) => (
              <Tag key={index}>{arg}</Tag>
            ))}
          </Space>
        ) : '-'
      ),
      width: 250
    },
    {
      title: 'Environment',
      dataIndex: 'env',
      key: 'env',
      render: (env: Record<string, string>) => (
        env && Object.keys(env).length > 0 ? (
          <Space size="small" wrap>
            {Object.keys(env).map(key => (
              <Tag key={key} color="blue">{key}</Tag>
            ))}
          </Space>
        ) : '-'
      ),
      width: 200
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right' as const,
      width: 150,
      render: (_: any, record: any) => (
        <Space size="small">
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => setEditingServer({ name: record.name, server: record })}
          />
          <Button
            icon={<CopyOutlined />}
            size="small"
            onClick={() => {
              const newName = `${record.name}_copy`;
              const { addServer } = useConfigStore.getState();
              addServer(newName, { ...record, name: undefined });
            }}
          />
          <Popconfirm
            title="Delete this server?"
            description="This action cannot be undone."
            onConfirm={() => deleteServer(record.name)}
            okText="Delete"
            cancelText="Cancel"
          >
            <Button
              icon={<DeleteOutlined />}
              size="small"
              danger
            />
          </Popconfirm>
        </Space>
      )
    }
  ];

  const dataSource = Object.entries(servers).map(([name, server]) => ({
    key: name,
    name,
    ...server
  }));

  return (
    <div className="server-list" style={{ marginTop: 24 }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>MCP Servers</h3>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setIsAddModalOpen(true)}
          disabled={!activeClient}
        >
          Add Server
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={dataSource}
        pagination={false}
        size="small"
        scroll={{ x: 1100 }}
        sticky
        locale={{
          emptyText: activeClient ? 'No MCP servers configured' : 'Select a client to view servers'
        }}
      />

      {/* Add Server Modal */}
      <ServerFormModal
        open={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        mode="add"
      />

      {/* Edit Server Modal */}
      {editingServer && (
        <ServerFormModal
          open={true}
          onClose={() => setEditingServer(null)}
          mode="edit"
          initialName={editingServer.name}
          initialServer={editingServer.server}
        />
      )}
    </div>
  );
};