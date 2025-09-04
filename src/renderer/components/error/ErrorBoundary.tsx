import React, { Component, ReactNode } from 'react';
import { Result, Button, Card, Space, Typography, Collapse, Alert } from 'antd';
import {
  ExclamationCircleOutlined,
  ReloadOutlined,
  BugOutlined,
  CopyOutlined,
  HomeOutlined
} from '@ant-design/icons';

const { Text, Paragraph } = Typography;
const { Panel } = Collapse;

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorId: string;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, errorId: string, retry: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo, errorId: string) => void;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return {
      hasError: true,
      error,
      errorId
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      errorInfo
    });

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error Boundary caught an error:', error);
      console.error('Error Info:', errorInfo);
    }

    // Call onError callback if provided
    this.props.onError?.(error, errorInfo, this.state.errorId);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    });
  };

  handleCopyError = () => {
    const { error, errorInfo, errorId } = this.state;
    const errorReport = {
      errorId,
      timestamp: new Date().toISOString(),
      error: {
        message: error?.message,
        stack: error?.stack,
        name: error?.name
      },
      errorInfo: {
        componentStack: errorInfo?.componentStack
      },
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    navigator.clipboard.writeText(JSON.stringify(errorReport, null, 2))
      .then(() => {
        // Could show a toast here
        console.log('Error report copied to clipboard');
      })
      .catch(err => {
        console.error('Failed to copy error report:', err);
      });
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, errorId } = this.state;

      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(error!, errorId, this.handleRetry);
      }

      // Default error UI
      return (
        <div style={{ padding: '20px', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Card style={{ maxWidth: 800, width: '100%' }}>
            <Result
              status="error"
              title="Something went wrong"
              subTitle={`An unexpected error occurred while rendering this component. Error ID: ${errorId}`}
              extra={[
                <Button key="retry" type="primary" icon={<ReloadOutlined />} onClick={this.handleRetry}>
                  Try Again
                </Button>,
                <Button key="home" icon={<HomeOutlined />} onClick={() => window.location.reload()}>
                  Reload App
                </Button>
              ]}
            >
              <Space direction="vertical" style={{ width: '100%' }} size="large">
                <Alert
                  message="Error Details"
                  description={error?.message || 'Unknown error occurred'}
                  type="error"
                  showIcon
                  icon={<ExclamationCircleOutlined />}
                />

                <Collapse ghost>
                  <Panel
                    header={
                      <Space>
                        <BugOutlined />
                        <Text>Technical Details (for developers)</Text>
                      </Space>
                    }
                    key="technical"
                  >
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <div>
                        <Text strong>Error Name:</Text>
                        <Paragraph code copyable style={{ marginTop: 4 }}>
                          {error?.name || 'Unknown'}
                        </Paragraph>
                      </div>

                      <div>
                        <Text strong>Error Message:</Text>
                        <Paragraph code copyable style={{ marginTop: 4 }}>
                          {error?.message || 'No message available'}
                        </Paragraph>
                      </div>

                      {error?.stack && (
                        <div>
                          <Text strong>Stack Trace:</Text>
                          <Paragraph 
                            code 
                            copyable 
                            style={{ 
                              marginTop: 4, 
                              maxHeight: 200, 
                              overflow: 'auto', 
                              fontSize: 11,
                              backgroundColor: '#f5f5f5',
                              padding: 8,
                              border: '1px solid #d9d9d9'
                            }}
                          >
                            {error.stack}
                          </Paragraph>
                        </div>
                      )}

                      {errorInfo?.componentStack && (
                        <div>
                          <Text strong>Component Stack:</Text>
                          <Paragraph 
                            code 
                            copyable 
                            style={{ 
                              marginTop: 4, 
                              maxHeight: 200, 
                              overflow: 'auto', 
                              fontSize: 11,
                              backgroundColor: '#f5f5f5',
                              padding: 8,
                              border: '1px solid #d9d9d9'
                            }}
                          >
                            {errorInfo.componentStack}
                          </Paragraph>
                        </div>
                      )}

                      <Button
                        icon={<CopyOutlined />}
                        onClick={this.handleCopyError}
                        type="dashed"
                        size="small"
                      >
                        Copy Full Error Report
                      </Button>
                    </Space>
                  </Panel>
                </Collapse>

                <Alert
                  message="What you can do:"
                  description={
                    <ul style={{ paddingLeft: 20, margin: 0 }}>
                      <li>Try clicking "Try Again" to retry the operation</li>
                      <li>Refresh the entire application if the error persists</li>
                      <li>If this keeps happening, copy the error details and report it</li>
                      <li>Check that all MCP clients are properly installed and configured</li>
                    </ul>
                  }
                  type="info"
                  showIcon
                />
              </Space>
            </Result>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;