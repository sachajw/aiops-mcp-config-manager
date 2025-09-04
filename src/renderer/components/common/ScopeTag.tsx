import React from 'react';
import { Tag, Tooltip } from 'antd';
import { 
  GlobalOutlined,
  UserOutlined,
  FolderOutlined,
  ProjectOutlined 
} from '@ant-design/icons';
import { ConfigScope } from '../../../shared/types/enums';

export interface ScopeTagProps {
  scope: ConfigScope;
  showIcon?: boolean;
  showTooltip?: boolean;
  size?: 'small' | 'default';
}

const ScopeTag: React.FC<ScopeTagProps> = ({
  scope,
  showIcon = true,
  showTooltip = true,
  size = 'default'
}) => {
  const getScopeConfig = () => {
    switch (scope) {
      case ConfigScope.GLOBAL:
        return {
          color: 'purple',
          icon: <GlobalOutlined />,
          label: 'Global',
          description: 'System-wide configuration',
          priority: 1
        };
      
      case ConfigScope.USER:
        return {
          color: 'blue',
          icon: <UserOutlined />,
          label: 'User',
          description: 'User-specific configuration',
          priority: 2
        };
      
      case ConfigScope.LOCAL:
        return {
          color: 'orange',
          icon: <FolderOutlined />,
          label: 'Local',
          description: 'Directory-specific configuration',
          priority: 3
        };
      
      case ConfigScope.PROJECT:
        return {
          color: 'green',
          icon: <ProjectOutlined />,
          label: 'Project',
          description: 'Project-specific configuration (highest priority)',
          priority: 4
        };
      
      default:
        return {
          color: 'default',
          icon: <GlobalOutlined />,
          label: 'Unknown',
          description: 'Unknown scope',
          priority: 0
        };
    }
  };

  const config = getScopeConfig();

  const tag = (
    <Tag 
      color={config.color} 
      style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: '4px',
        cursor: showTooltip ? 'help' : 'default',
        fontSize: size === 'small' ? '12px' : '14px',
        padding: size === 'small' ? '0 4px' : '2px 8px',
        height: size === 'small' ? '20px' : '22px',
        lineHeight: size === 'small' ? '18px' : '20px'
      }}
    >
      {showIcon && config.icon}
      {config.label}
    </Tag>
  );

  if (showTooltip) {
    return (
      <Tooltip 
        title={
          <div>
            <div><strong>{config.label} Scope</strong></div>
            <div>{config.description}</div>
            <div style={{ marginTop: '4px', fontSize: '11px', opacity: 0.8 }}>
              Priority: {config.priority} (higher = more priority)
            </div>
          </div>
        }
      >
        {tag}
      </Tooltip>
    );
  }

  return tag;
};

export default ScopeTag;