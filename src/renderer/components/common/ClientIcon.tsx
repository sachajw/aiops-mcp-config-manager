import React from 'react';
import { Avatar, Tooltip } from 'antd';
import { 
  DesktopOutlined,
  CodeOutlined,
  BugOutlined,
  BlockOutlined,
  ThunderboltOutlined,
  ConsoleSqlOutlined 
} from '@ant-design/icons';
import { ClientType } from '../../../shared/types/enums';

export interface ClientIconProps {
  clientType: ClientType;
  size?: number | 'small' | 'default' | 'large';
  showTooltip?: boolean;
  tooltipTitle?: string;
}

const ClientIcon: React.FC<ClientIconProps> = ({
  clientType,
  size = 'default',
  showTooltip = true,
  tooltipTitle
}) => {
  const getClientConfig = () => {
    switch (clientType) {
      case ClientType.CLAUDE_DESKTOP:
        return {
          icon: <DesktopOutlined />,
          color: '#1890ff',
          name: 'Claude Desktop',
          description: 'Anthropic Claude Desktop Application'
        };
      
      case ClientType.CLAUDE_CODE:
        return {
          icon: <CodeOutlined />,
          color: '#722ed1',
          name: 'Claude Code',
          description: 'Anthropic Claude Code CLI'
        };
      
      case ClientType.CODEX:
        return {
          icon: <BugOutlined />,
          color: '#fa541c',
          name: 'Codex',
          description: 'OpenAI Codex Client'
        };
      
      case ClientType.VS_CODE:
        return {
          icon: <BlockOutlined />,
          color: '#0078d4',
          name: 'Visual Studio Code',
          description: 'Microsoft Visual Studio Code'
        };
      
      case ClientType.GEMINI_DESKTOP:
        return {
          icon: <ThunderboltOutlined />,
          color: '#4285f4',
          name: 'Gemini Desktop',
          description: 'Google Gemini Desktop Application'
        };
      
      case ClientType.GEMINI_CLI:
        return {
          icon: <ConsoleSqlOutlined />,
          color: '#34a853',
          name: 'Gemini CLI',
          description: 'Google Gemini Command Line Interface'
        };
      
      default:
        return {
          icon: <DesktopOutlined />,
          color: '#d9d9d9',
          name: 'Unknown Client',
          description: 'Unknown MCP Client'
        };
    }
  };

  const config = getClientConfig();

  const avatar = (
    <Avatar 
      size={size}
      style={{ 
        backgroundColor: config.color,
        cursor: showTooltip ? 'help' : 'default'
      }}
      icon={config.icon}
    />
  );

  if (showTooltip) {
    const title = tooltipTitle || (
      <div>
        <div><strong>{config.name}</strong></div>
        <div style={{ fontSize: '12px', opacity: 0.8 }}>
          {config.description}
        </div>
      </div>
    );

    return (
      <Tooltip title={title}>
        {avatar}
      </Tooltip>
    );
  }

  return avatar;
};

export default ClientIcon;