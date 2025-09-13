import React from 'react';
import { Layout, Menu, Input, Space, Typography, Badge, Tooltip } from 'antd';
import {
  HomeOutlined,
  RobotOutlined,
  StarOutlined,
  ToolOutlined,
  SearchOutlined,
  QuestionCircleOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  GlobalOutlined,
  CalendarOutlined,
  CodeOutlined,
  SettingOutlined,
  HeartOutlined,
  SaveOutlined,
  ImportOutlined
} from '@ant-design/icons';
import type { MenuProps } from 'antd';

const { Sider } = Layout;
const { Text } = Typography;
const { Search } = Input;

export interface SidebarProps {
  collapsed: boolean;
  selectedKey: string;
  onSelect: (key: string) => void;
  onCollapse: (collapsed: boolean) => void;
  aiApps?: Array<{
    id: string;
    name: string;
    status: 'active' | 'warning' | 'inactive';
    capabilityCount: number;
  }>;
  availableCapabilities?: Array<{
    id: string;
    name: string;
    category: string;
    isPopular?: boolean;
  }>;
}

type MenuItem = Required<MenuProps>['items'][number];

const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  selectedKey,
  onSelect,
  onCollapse,
  aiApps = [],
  availableCapabilities = []
}) => {
  
  const getStatusIcon = (status: 'active' | 'warning' | 'inactive') => {
    switch (status) {
      case 'active':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'warning':
        return <ExclamationCircleOutlined style={{ color: '#faad14' }} />;
      case 'inactive':
        return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />;
    }
  };

  // Build AI Apps submenu
  const aiAppsItems: MenuItem[] = [
    ...aiApps.map(app => ({
      key: `app-${app.id}`,
      label: (
        <Space>
          {getStatusIcon(app.status)}
          <span>{app.name}</span>
          <Badge count={app.capabilityCount} size="small" />
        </Space>
      )
    })),
    {
      key: 'find-more-apps',
      label: (
        <Space>
          <PlusOutlined />
          <span>Find More Apps</span>
        </Space>
      ),
      style: { marginTop: 8, borderTop: '1px solid #f0f0f0', paddingTop: 8 }
    }
  ];

  // Build Available Capabilities submenu  
  const capabilityItems: MenuItem[] = [
    {
      key: 'capability-file-access',
      label: (
        <Space>
          <FileTextOutlined />
          <span>File & Folder Access</span>
          <Badge dot={true} />
        </Space>
      )
    },
    {
      key: 'capability-web-search',
      label: (
        <Space>
          <GlobalOutlined />
          <span>Web Search Tools</span>
          <Badge dot={true} />
        </Space>
      )
    },
    {
      key: 'capability-calendar',
      label: (
        <Space>
          <CalendarOutlined />
          <span>Calendar & Email</span>
        </Space>
      )
    },
    {
      key: 'capability-developer',
      label: (
        <Space>
          <CodeOutlined />
          <span>Developer Tools</span>
          <Text type="secondary" style={{ fontSize: '10px' }}>(Advanced)</Text>
        </Space>
      )
    },
    {
      type: 'divider'
    },
    {
      key: 'browse-all-capabilities',
      label: (
        <Space>
          <SearchOutlined />
          <span>Browse All Capabilities</span>
        </Space>
      )
    }
  ];

  const menuItems: MenuItem[] = [
    {
      key: 'home',
      icon: <HomeOutlined />,
      label: 'Home',
      children: [
        {
          key: 'overview',
          label: 'Your AI Setup Overview'
        }
      ]
    },
    {
      key: 'ai-apps',
      icon: <RobotOutlined />,
      label: (
        <Space>
          <span>Your AI Apps</span>
          <Badge count={aiApps.length} size="small" />
        </Space>
      ),
      children: aiAppsItems
    },
    {
      key: 'capabilities',
      icon: <StarOutlined />,
      label: 'Available Capabilities',
      children: capabilityItems
    },
    {
      key: 'maintenance',
      icon: <ToolOutlined />,
      label: 'Maintenance',
      children: [
        {
          key: 'health-check',
          icon: <HeartOutlined />,
          label: 'Check Health Status'
        },
        {
          key: 'backup-restore',
          icon: <SaveOutlined />,
          label: 'Backup & Restore'
        },
        {
          key: 'import-export',
          icon: <ImportOutlined />,
          label: 'Import/Export Settings'
        },
        {
          type: 'divider'
        },
        {
          key: 'get-help',
          icon: <QuestionCircleOutlined />,
          label: 'Get Help & Learn'
        }
      ]
    }
  ];

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={onCollapse}
      width={280}
      style={{
        background: '#fff',
        borderRight: '1px solid #f0f0f0'
      }}
    >
      {/* Search bar */}
      {!collapsed && (
        <div style={{ padding: '16px' }}>
          <Search
            placeholder="Search apps or capabilities..."
            size="small"
            style={{ width: '100%' }}
          />
        </div>
      )}

      {/* Main navigation menu */}
      <Menu
        mode="inline"
        selectedKeys={[selectedKey]}
        defaultOpenKeys={['home', 'ai-apps']}
        items={menuItems}
        onClick={({ key }) => onSelect(key)}
        style={{ borderRight: 0 }}
      />

      {/* Help section at bottom */}
      {!collapsed && (
        <div style={{ 
          position: 'absolute', 
          bottom: 16, 
          left: 16, 
          right: 16,
          padding: '12px',
          background: '#f9f9f9',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <QuestionCircleOutlined style={{ fontSize: '20px', color: '#1890ff' }} />
            <Text style={{ fontSize: '12px', color: '#666' }}>
              Need help getting started?
            </Text>
            <div
              onClick={() => onSelect('get-help')}
              style={{ 
                color: '#1890ff', 
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 500
              }}
            >
              View Beginner's Guide
            </div>
          </Space>
        </div>
      )}
    </Sider>
  );
};

export default Sidebar;