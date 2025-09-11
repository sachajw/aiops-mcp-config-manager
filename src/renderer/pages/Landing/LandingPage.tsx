import React from 'react';
import { Button, Progress, Space, Typography, Card, Row, Col } from 'antd';
import { RocketOutlined, SettingOutlined, BookOutlined, ApiOutlined } from '@ant-design/icons';
import './LandingPage.css';

const { Title, Text, Paragraph } = Typography;

export interface LoadingState {
  stage: 'initial' | 'detecting_clients' | 'loading_configs' | 'ready' | 'error';
  progress: number;
  message: string;
}

interface LandingPageProps {
  loadingState: LoadingState;
  onGetStarted: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ loadingState, onGetStarted }) => {
  const isLoading = loadingState.stage !== 'ready' && loadingState.stage !== 'error';

  return (
    <div className="landing-page">
      <div className="landing-hero">
        <Space direction="vertical" size="large" align="center">
          <div className="app-logo">
            <SettingOutlined style={{ fontSize: 64, color: '#1890ff' }} />
          </div>
          
          <Title level={1}>My MCP Manager</Title>
          <Paragraph className="subtitle">
            Manage Model Context Protocol servers across all your AI tools
          </Paragraph>

          {isLoading ? (
            <div className="loading-section">
              <Space direction="vertical" size="middle" align="center" style={{ width: 400 }}>
                <Progress 
                  percent={loadingState.progress} 
                  status={loadingState.stage === 'error' ? 'exception' : 'active'}
                  strokeColor={{
                    '0%': '#108ee9',
                    '100%': '#87d068',
                  }}
                />
                <Text type="secondary">{loadingState.message}</Text>
              </Space>
            </div>
          ) : (
            <Button 
              type="primary" 
              size="large" 
              icon={<RocketOutlined />}
              onClick={onGetStarted}
              className="get-started-button"
            >
              Get Started
            </Button>
          )}
        </Space>
      </div>

      {!isLoading && (
        <div className="landing-features">
          <Title level={3} style={{ textAlign: 'center', marginBottom: 32 }}>
            Quick Start
          </Title>
          
          <Row gutter={[24, 24]} justify="center">
            <Col xs={24} sm={12} md={8}>
              <Card 
                hoverable
                className="feature-card"
              >
                <Space direction="vertical" align="center" style={{ width: '100%' }}>
                  <ApiOutlined style={{ fontSize: 32, color: '#1890ff' }} />
                  <Title level={4}>Manage Servers</Title>
                  <Text type="secondary">
                    Add, edit, and configure MCP servers across all your AI clients
                  </Text>
                </Space>
              </Card>
            </Col>

            <Col xs={24} sm={12} md={8}>
              <Card 
                hoverable
                className="feature-card"
              >
                <Space direction="vertical" align="center" style={{ width: '100%' }}>
                  <SettingOutlined style={{ fontSize: 32, color: '#52c41a' }} />
                  <Title level={4}>Sync Configurations</Title>
                  <Text type="secondary">
                    Keep your MCP settings synchronized across Claude, VS Code, and more
                  </Text>
                </Space>
              </Card>
            </Col>

            <Col xs={24} sm={12} md={8}>
              <Card 
                hoverable
                className="feature-card"
              >
                <Space direction="vertical" align="center" style={{ width: '100%' }}>
                  <BookOutlined style={{ fontSize: 32, color: '#722ed1' }} />
                  <Title level={4}>Easy Setup</Title>
                  <Text type="secondary">
                    Simple interface for managing complex MCP configurations
                  </Text>
                </Space>
              </Card>
            </Col>
          </Row>
        </div>
      )}
    </div>
  );
};