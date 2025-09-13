import React from 'react';
import { Radio, Tooltip } from 'antd';
import { GlobalOutlined, UserOutlined, FolderOutlined } from '@ant-design/icons';
import { useConfigStore } from '../../store/simplifiedStore';

export const ScopeSelector: React.FC = () => {
  const { activeScope, setScope, activeClient } = useConfigStore();

  const scopeOptions = [
    { 
      value: 'user', 
      label: 'User', 
      icon: <UserOutlined />,
      tooltip: 'Configuration for current user'
    },
    { 
      value: 'project', 
      label: 'Project', 
      icon: <FolderOutlined />,
      tooltip: 'Configuration for current project/workspace'
    },
    { 
      value: 'system', 
      label: 'System', 
      icon: <GlobalOutlined />,
      tooltip: 'System-wide configuration (requires permissions)'
    }
  ];

  return (
    <div className="scope-selector" style={{ marginTop: 16 }}>
      <label style={{ marginRight: 8, fontWeight: 500 }}>Configuration Scope:</label>
      <Radio.Group 
        value={activeScope} 
        onChange={(e) => setScope(e.target.value)}
        disabled={!activeClient}
        buttonStyle="solid"
      >
        {scopeOptions.map(option => (
          <Tooltip key={option.value} title={option.tooltip}>
            <Radio.Button value={option.value}>
              {option.icon} {option.label}
            </Radio.Button>
          </Tooltip>
        ))}
      </Radio.Group>
    </div>
  );
};