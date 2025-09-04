import React from 'react';
import { 
  Layout, 
  Typography, 
  Space, 
  Button, 
  Tooltip,
  Badge,
  Dropdown,
  MenuProps
} from 'antd';
import { 
  MenuOutlined,
  ReloadOutlined,
  QuestionCircleOutlined,
  SettingOutlined,
  HeartOutlined,
  BugOutlined,
  BookOutlined
} from '@ant-design/icons';
import useResponsive from '../hooks/useResponsive';

const { Header: AntHeader } = Layout;
const { Title, Text } = Typography;

export interface HeaderProps {
  sidebarCollapsed: boolean;
  onMenuToggle: () => void;
  systemStatus?: 'healthy' | 'warning' | 'error';
  onRefresh?: () => void;
  onOpenSettings?: () => void;
  onOpenHelp?: () => void;
}

const Header: React.FC<HeaderProps> = ({
  sidebarCollapsed,
  onMenuToggle,
  systemStatus = 'healthy',
  onRefresh,
  onOpenSettings,
  onOpenHelp
}) => {
  const { isMobile, isTablet } = useResponsive();

  const getStatusText = () => {
    switch (systemStatus) {
      case 'healthy':
        return { text: 'Everything is working great', icon: '✅', color: '#52c41a' };
      case 'warning':
        return { text: 'Some issues found', icon: '⚠️', color: '#faad14' };
      case 'error':
        return { text: 'Needs attention', icon: '❌', color: '#ff4d4f' };
      default:
        return { text: 'Checking status...', icon: '🔄', color: '#1890ff' };
    }
  };

  const status = getStatusText();

  const helpMenuItems: MenuProps['items'] = [
    {
      key: 'getting-started',
      label: 'Getting Started Guide',
      icon: <BookOutlined />
    },
    {
      key: 'video-tutorials',
      label: 'Video Tutorials',
      icon: <BookOutlined />
    },
    {
      key: 'community',
      label: 'Community Forum',
      icon: <QuestionCircleOutlined />
    },
    {
      type: 'divider'
    },
    {
      key: 'report-issue',
      label: 'Report an Issue',
      icon: <BugOutlined />
    },
    {
      key: 'feedback',
      label: 'Send Feedback',
      icon: <HeartOutlined />
    }
  ];

  const handleHelpClick: MenuProps['onClick'] = ({ key }) => {
    switch (key) {
      case 'getting-started':
      case 'video-tutorials':
      case 'community':
      case 'report-issue':
      case 'feedback':
        onOpenHelp?.();
        break;
    }
  };

  return (
    <AntHeader 
      style={{ 
        padding: '0 16px', 
        background: '#fff',
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 64
      }}
    >
      {/* Left side: Menu toggle and branding */}
      <Space size="middle" align="center">
        {(isMobile || isTablet) && (
          <Button
            type="text"
            icon={<MenuOutlined />}
            onClick={onMenuToggle}
            size="large"
            style={{ fontSize: '18px' }}
          />
        )}
        
        <Space align="center" size="small">
          <div style={{ fontSize: '24px' }}>🤖</div>
          <div>
            <Title level={4} style={{ margin: 0, color: '#1890ff' }}>
              AI Assistant Manager
            </Title>
            {!isMobile && (
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Make your AI tools more powerful
              </Text>
            )}
          </div>
        </Space>
      </Space>

      {/* Right side: Status and actions */}
      <Space size="middle" align="center">
        {/* System Status */}
        {!isMobile && (
          <Tooltip title={`System Status: ${status.text}`}>
            <Space size="small" align="center">
              <span style={{ fontSize: '14px' }}>{status.icon}</span>
              <Text style={{ color: status.color, fontWeight: 500, fontSize: '13px' }}>
                {status.text}
              </Text>
            </Space>
          </Tooltip>
        )}

        {/* Action buttons */}
        <Space size="small">
          <Tooltip title="Refresh all data">
            <Button
              type="text"
              icon={<ReloadOutlined />}
              onClick={onRefresh}
              size={isMobile ? 'small' : 'middle'}
            />
          </Tooltip>

          <Tooltip title="Settings">
            <Button
              type="text"
              icon={<SettingOutlined />}
              onClick={onOpenSettings}
              size={isMobile ? 'small' : 'middle'}
            />
          </Tooltip>

          <Dropdown
            menu={{ items: helpMenuItems, onClick: handleHelpClick }}
            placement="bottomRight"
            trigger={['click']}
          >
            <Button
              type="text"
              icon={<QuestionCircleOutlined />}
              size={isMobile ? 'small' : 'middle'}
            />
          </Dropdown>
        </Space>
      </Space>
    </AntHeader>
  );
};

export default Header;