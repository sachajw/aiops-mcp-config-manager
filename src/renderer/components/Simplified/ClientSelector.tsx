import React from 'react';
import { Select, Tag } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useConfigStore } from '../../store/simplifiedStore';

const { Option } = Select;

export const ClientSelector: React.FC = () => {
  const { clients, activeClient, selectClient, isLoading } = useConfigStore();

  return (
    <div className="client-selector">
      <label style={{ marginRight: 8, fontWeight: 500 }}>MCP Client:</label>
      <Select
        value={activeClient}
        onChange={selectClient}
        loading={isLoading}
        disabled={isLoading}
        style={{ width: 250 }}
        placeholder="Select an MCP client"
      >
        {clients.map(client => (
          <Option key={client.name} value={client.name}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>{client.displayName}</span>
              {client.installed ? (
                <Tag icon={<CheckCircleOutlined />} color="success">Installed</Tag>
              ) : (
                <Tag icon={<CloseCircleOutlined />} color="default">Not Found</Tag>
              )}
            </div>
          </Option>
        ))}
      </Select>
    </div>
  );
};