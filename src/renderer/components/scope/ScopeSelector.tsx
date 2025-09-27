import React from 'react';
import { Select, Space, Typography, Tooltip, Tag } from 'antd';
import {
  GlobalOutlined,
  UserOutlined,
  FolderOutlined,
  ProjectOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { ConfigScope } from '../../../shared/types/enums';
import ScopeTag from '../common/ScopeTag';

const { Option } = Select;
const { Text } = Typography;

export interface ScopeSelectorProps {
  value?: ConfigScope;
  onChange?: (scope: ConfigScope) => void;
  disabled?: boolean;
  placeholder?: string;
  showDescription?: boolean;
  style?: React.CSSProperties;
  size?: 'small' | 'middle' | 'large';
  allowedScopes?: ConfigScope[];
}

interface ScopeOption {
  value: ConfigScope;
  label: string;
  icon: React.ReactNode;
  description: string;
  priority: number;
  color: string;
}

const scopeOptions: ScopeOption[] = [
  {
    value: ConfigScope.GLOBAL,
    label: 'System',  // Changed from 'Global' to 'System' for clarity
    icon: <GlobalOutlined />,
    description: 'System-wide - lowest priority, applies to all users',
    priority: 4,
    color: '#fa8c16'
  },
  {
    value: ConfigScope.USER,
    label: 'User',
    icon: <UserOutlined />,
    description: 'User-specific - applies to current user only',
    priority: 3,
    color: '#52c41a'
  },
  {
    value: ConfigScope.LOCAL,
    label: 'Local',
    icon: <FolderOutlined />,
    description: 'Directory-specific - applies to current working directory',
    priority: 2,
    color: '#13c2c2'
  },
  {
    value: ConfigScope.PROJECT,
    label: 'Project',
    icon: <ProjectOutlined />,
    description: 'Project-specific - highest priority, applies only to current project',
    priority: 1,
    color: '#722ed1'
  }
];

const ScopeSelector: React.FC<ScopeSelectorProps> = ({
  value,
  onChange,
  disabled = false,
  placeholder = 'Select scope',
  showDescription = false,
  style,
  size = 'middle',
  allowedScopes
}) => {
  const filteredOptions = allowedScopes 
    ? scopeOptions.filter(option => allowedScopes.includes(option.value))
    : scopeOptions;

  const sortedOptions = [...filteredOptions].sort((a, b) => a.priority - b.priority);

  const renderOption = (option: ScopeOption) => (
    <Option key={option.value} value={option.value}>
      <Space>
        <span style={{ color: option.color }}>{option.icon}</span>
        <Text strong>{option.label}</Text>
        <Tag 
          color={option.color}
          style={{ 
            fontSize: '10px',
            padding: '0 4px',
            height: '16px',
            lineHeight: '14px',
            marginLeft: 'auto'
          }}
        >
          Priority {option.priority}
        </Tag>
      </Space>
    </Option>
  );

  const renderValue = (scope: ConfigScope) => {
    const option = scopeOptions.find(opt => opt.value === scope);
    if (!option) return scope;

    return (
      <Space>
        <span style={{ color: option.color }}>{option.icon}</span>
        <Text>{option.label}</Text>
      </Space>
    );
  };

  const getTooltipContent = () => {
    if (!showDescription) return null;

    return (
      <div style={{ maxWidth: 300 }}>
        <Text strong style={{ color: '#fff' }}>Scope Priority Hierarchy:</Text>
        <div style={{ marginTop: 8 }}>
          {sortedOptions.map((option, index) => (
            <div key={option.value} style={{ marginBottom: 4 }}>
              <Space>
                <span style={{ color: option.color }}>{option.icon}</span>
                <Text style={{ color: '#fff' }}>{option.label}</Text>
                <Text type="secondary" style={{ fontSize: 12, color: '#d9d9d9' }}>
                  - {option.description}
                </Text>
              </Space>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #424242' }}>
          <Text style={{ fontSize: 12, color: '#d9d9d9' }}>
            Higher priority scopes override lower priority ones for the same server.
          </Text>
        </div>
      </div>
    );
  };

  return (
    <Space direction="vertical" size="small" style={{ width: '100%' }}>
      <Space>
        <Select
          value={value}
          onChange={onChange}
          disabled={disabled}
          placeholder={placeholder}
          style={{ minWidth: 150, ...style }}
          size={size}
          optionLabelProp="label"
        >
          {sortedOptions.map(renderOption)}
        </Select>
        
        {showDescription && (
          <Tooltip title={getTooltipContent()} placement="right">
            <InfoCircleOutlined style={{ color: '#1890ff', cursor: 'help' }} />
          </Tooltip>
        )}
      </Space>

      {showDescription && value && (
        <div style={{ fontSize: 12 }}>
          <Text type="secondary">
            {scopeOptions.find(opt => opt.value === value)?.description}
          </Text>
        </div>
      )}
    </Space>
  );
};

export default ScopeSelector;