import React from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Typography, 
  Button, 
  Space, 
  Statistic,
  Alert,
  Progress,
  Steps,
  Badge
} from 'antd';
import {
  RocketOutlined,
  ToolOutlined,
  UnorderedListOutlined,
  BookOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  PlusOutlined,
  HeartOutlined,
  GlobalOutlined,
  FileTextOutlined,
  CalendarOutlined,
  PlayCircleOutlined
} from '@ant-design/icons';
import { MCPClient, ResolvedConfiguration } from '../../../shared/types';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;

export interface LandingPageProps {
  clients: MCPClient[];
  configurations: Record<string, ResolvedConfiguration>;
  onStartWizard: (wizardType: 'add-capability' | 'fix-issues' | 'import-config' | 'learn') => void;
  onNavigateTo: (key: string) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({
  clients = [],
  configurations = {},
  onStartWizard,
  onNavigateTo
}) => {
  // Calculate stats
  const activeClients = clients.filter(c => c.isActive);
  const totalCapabilities = Object.values(configurations).reduce(
    (sum, config) => sum + (config?.metadata?.serverCount || 0), 0
  );
  const issuesCount = clients.filter(c => !c.isActive).length +
    Object.values(configurations).reduce((sum, config) => sum + (config?.conflicts?.length || 0), 0);

  // Determine overall health
  const getHealthStatus = () => {
    if (clients.length === 0) return { type: 'info' as const, message: 'No AI apps found yet - let\'s find them!', icon: '🔍' };
    if (issuesCount > 0) return { type: 'warning' as const, message: 'Some issues found - we can help fix them', icon: '⚠️' };
    if (totalCapabilities === 0) return { type: 'info' as const, message: 'Ready to add your first capabilities!', icon: '✨' };
    return { type: 'success' as const, message: 'Everything is working great!', icon: '✅' };
  };

  const healthStatus = getHealthStatus();

  // Popular capabilities to showcase
  const popularCapabilities = [
    { 
      name: 'File Access', 
      icon: <FileTextOutlined />, 
      description: 'Let Claude read your documents',
      popularity: 95 
    },
    { 
      name: 'Web Search', 
      icon: <GlobalOutlined />, 
      description: 'Get current information from the internet',
      popularity: 87 
    },
    { 
      name: 'Calendar', 
      icon: <CalendarOutlined />, 
      description: 'Schedule and time management',
      popularity: 73 
    }
  ];

  // Getting started steps
  const gettingStartedSteps = [
    {
      title: 'Find Your AI Apps',
      description: 'We automatically scan for Claude Desktop, VS Code, and other AI tools',
      status: (clients.length > 0 ? 'finish' : 'process') as 'wait' | 'process' | 'finish' | 'error',
      icon: <CheckCircleOutlined />
    },
    {
      title: 'Add Your First Capability',
      description: 'Choose from popular options like file access or web search',
      status: (totalCapabilities > 0 ? 'finish' : clients.length > 0 ? 'process' : 'wait') as 'wait' | 'process' | 'finish' | 'error',
      icon: <PlusOutlined />
    },
    {
      title: 'Test & Enjoy',
      description: 'Make sure everything works and start using your enhanced AI',
      status: (totalCapabilities > 0 ? 'process' : 'wait') as 'wait' | 'process' | 'finish' | 'error',
      icon: <HeartOutlined />
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      {/* Hero Section */}
      <Card style={{ marginBottom: '24px', textAlign: 'center' }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div style={{ fontSize: '48px' }}>🤖</div>
          <Title level={2} style={{ margin: 0, color: '#1890ff' }}>
            Welcome to AI Assistant Manager
          </Title>
          <Paragraph style={{ fontSize: '16px', color: '#666', maxWidth: '600px', margin: '0 auto' }}>
            Make your AI tools more powerful with new capabilities.
            No technical knowledge required - we'll guide you through everything step by step.
          </Paragraph>
          
          <Alert
            message={healthStatus.message}
            type={healthStatus.type}
            icon={<span style={{ fontSize: '16px' }}>{healthStatus.icon}</span>}
            showIcon
            style={{ maxWidth: '500px', margin: '0 auto' }}
          />
        </Space>
      </Card>

      {/* Quick Actions */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card 
            hoverable 
            onClick={() => onStartWizard('add-capability')}
            style={{ height: '100%', cursor: 'pointer', border: '2px solid transparent' }}
            className="quick-action-card"
            bodyStyle={{ textAlign: 'center' }}
          >
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <RocketOutlined style={{ fontSize: '32px', color: '#1890ff' }} />
              <Title level={4} style={{ margin: 0 }}>Add New Powers</Title>
              <Text type="secondary">
                Give Claude access to your files, search the web, and more
              </Text>
              <div>
                <Text strong style={{ color: '#1890ff' }}>Most popular:</Text>
                <br />
                <Text type="secondary">File Access • Web Search • Calendar</Text>
              </div>
            </Space>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card 
            hoverable 
            onClick={() => onStartWizard('fix-issues')}
            style={{ height: '100%', cursor: 'pointer' }}
            bodyStyle={{ textAlign: 'center' }}
          >
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <ToolOutlined style={{ fontSize: '32px', color: '#52c41a' }} />
              <Title level={4} style={{ margin: 0 }}>Fix Issues</Title>
              <Text type="secondary">
                Something not working? We'll help you troubleshoot
              </Text>
              <div>
                {issuesCount > 0 ? (
                  <Badge count={issuesCount} style={{ backgroundColor: '#faad14' }}>
                    <Button size="small">Fix {issuesCount} Issue{issuesCount > 1 ? 's' : ''}</Button>
                  </Badge>
                ) : (
                  <Text type="secondary">✅ No issues found</Text>
                )}
              </div>
            </Space>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card 
            hoverable 
            onClick={() => onNavigateTo('overview')}
            style={{ height: '100%', cursor: 'pointer' }}
            bodyStyle={{ textAlign: 'center' }}
          >
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <UnorderedListOutlined style={{ fontSize: '32px', color: '#faad14' }} />
              <Title level={4} style={{ margin: 0 }}>See What You Have</Title>
              <Text type="secondary">
                View all your AI apps and their current capabilities
              </Text>
              <div>
                <Text type="secondary">
                  {clients.length} App{clients.length !== 1 ? 's' : ''} • {totalCapabilities} Capabilit{totalCapabilities !== 1 ? 'ies' : 'y'}
                </Text>
              </div>
            </Space>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card 
            hoverable 
            onClick={() => onStartWizard('learn')}
            style={{ height: '100%', cursor: 'pointer' }}
            bodyStyle={{ textAlign: 'center' }}
          >
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <BookOutlined style={{ fontSize: '32px', color: '#722ed1' }} />
              <Title level={4} style={{ margin: 0 }}>Learn & Get Help</Title>
              <Text type="secondary">
                New to this? Start with our beginner's guide
              </Text>
              <div>
                <Space>
                  <PlayCircleOutlined />
                  <Text type="secondary">Videos • Guides • FAQs</Text>
                </Space>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        {/* System Overview */}
        <Col xs={24} lg={12}>
          <Card title="Your Current Setup" style={{ height: '100%' }}>
            <Row gutter={16}>
              <Col span={8}>
                <Statistic
                  title="AI Apps"
                  value={clients.length}
                  prefix={<RocketOutlined />}
                  valueStyle={{ color: clients.length > 0 ? '#3f8600' : '#cf1322' }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="Active Capabilities"
                  value={totalCapabilities}
                  prefix={<HeartOutlined />}
                  valueStyle={{ color: totalCapabilities > 0 ? '#3f8600' : '#999' }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="Health Status"
                  value={issuesCount === 0 ? 'Good' : `${issuesCount} Issue${issuesCount > 1 ? 's' : ''}`}
                  valueStyle={{ color: issuesCount === 0 ? '#3f8600' : '#faad14' }}
                />
              </Col>
            </Row>

            {clients.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <Text strong>Recent Activity:</Text>
                <div style={{ marginTop: '8px' }}>
                  <Text type="secondary">Last checked: 2 minutes ago ✅</Text>
                </div>
              </div>
            )}

            <div style={{ marginTop: '16px' }}>
              <Button 
                type="primary" 
                onClick={() => onNavigateTo('ai-apps')}
                style={{ marginRight: '8px' }}
              >
                View Details
              </Button>
              <Button onClick={() => onStartWizard('fix-issues')}>
                Run Health Check
              </Button>
            </div>
          </Card>
        </Col>

        {/* Getting Started */}
        <Col xs={24} lg={12}>
          <Card title="Getting Started Guide" style={{ height: '100%' }}>
            <Steps
              direction="vertical"
              size="small"
              current={gettingStartedSteps.findIndex(step => step.status === 'process')}
              items={gettingStartedSteps.map(step => ({
                title: step.title,
                description: step.description,
                status: step.status,
                icon: step.icon
              }))}
            />

            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <Button 
                type="primary" 
                icon={<PlayCircleOutlined />}
                onClick={() => onStartWizard('learn')}
              >
                Watch Tutorial Video
              </Button>
            </div>
          </Card>
        </Col>
      </Row>

      <style>
        {`
          .quick-action-card:hover {
            border-color: #1890ff !important;
            box-shadow: 0 4px 12px rgba(24, 144, 255, 0.15) !important;
          }
        `}
      </style>
    </div>
  );
};

export default LandingPage;