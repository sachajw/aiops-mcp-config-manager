import React, { useState } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  Button,
  Space,
  Typography,
  Alert,
  Card,
  Divider,
  Checkbox,
  Steps,
  Progress,
  message
} from 'antd';
import {
  BugOutlined,
  SendOutlined,
  CopyOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  SettingOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { Step } = Steps;

export interface ErrorReport {
  id: string;
  type: 'bug' | 'crash' | 'performance' | 'feature' | 'other';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  stepsToReproduce?: string;
  expectedBehavior?: string;
  actualBehavior?: string;
  environment: {
    os: string;
    version: string;
    userAgent: string;
  };
  technicalDetails: {
    error?: Error;
    componentStack?: string;
    logs?: string[];
    timestamp: Date;
  };
  userInfo?: {
    email?: string;
    name?: string;
  };
  attachments?: File[];
  includeSystemInfo: boolean;
  includeLogs: boolean;
  includeConfiguration: boolean;
}

export interface ErrorReportDialogProps {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (report: ErrorReport) => Promise<void>;
  initialError?: Error;
  initialErrorInfo?: React.ErrorInfo;
  autoCollectSystemInfo?: boolean;
}

const ErrorReportDialog: React.FC<ErrorReportDialogProps> = ({
  visible,
  onCancel,
  onSubmit,
  initialError,
  initialErrorInfo,
  autoCollectSystemInfo = true
}) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [reportData, setReportData] = useState<Partial<ErrorReport>>({
    includeSystemInfo: autoCollectSystemInfo,
    includeLogs: true,
    includeConfiguration: false
  });

  const collectSystemInfo = () => {
    return {
      os: navigator.platform,
      version: '1.0.0', // Would come from app version
      userAgent: navigator.userAgent
    };
  };

  const collectTechnicalDetails = () => {
    return {
      error: initialError,
      componentStack: initialErrorInfo?.componentStack,
      logs: [], // Would collect actual logs
      timestamp: new Date()
    };
  };

  const generateReportId = () => {
    return `bug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const handleNext = async () => {
    try {
      await form.validateFields();
      setCurrentStep(prev => prev + 1);
    } catch (error) {
      // Form validation failed
    }
  };

  const handlePrev = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      const report: ErrorReport = {
        id: generateReportId(),
        ...values,
        environment: collectSystemInfo(),
        technicalDetails: collectTechnicalDetails(),
        ...reportData
      };

      setSubmitting(true);
      await onSubmit(report);
      
      message.success('Error report submitted successfully');
      form.resetFields();
      setCurrentStep(0);
      setReportData({
        includeSystemInfo: autoCollectSystemInfo,
        includeLogs: true,
        includeConfiguration: false
      });
    } catch (error) {
      message.error(`Failed to submit report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyReport = async () => {
    try {
      const values = form.getFieldsValue();
      const report = {
        ...values,
        environment: collectSystemInfo(),
        technicalDetails: collectTechnicalDetails(),
        ...reportData
      };

      await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
      message.success('Report copied to clipboard');
    } catch (error) {
      message.error('Failed to copy report');
    }
  };

  const steps = [
    {
      title: 'Basic Information',
      icon: <InfoCircleOutlined />,
      content: (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Form.Item
            label="Issue Type"
            name="type"
            rules={[{ required: true, message: 'Please select an issue type' }]}
          >
            <Select placeholder="Select issue type">
              <Option value="bug">🐛 Bug Report</Option>
              <Option value="crash">💥 Application Crash</Option>
              <Option value="performance">⚡ Performance Issue</Option>
              <Option value="feature">💡 Feature Request</Option>
              <Option value="other">❓ Other</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Severity"
            name="severity"
            rules={[{ required: true, message: 'Please select severity level' }]}
          >
            <Select placeholder="Select severity">
              <Option value="critical">🔴 Critical - App unusable</Option>
              <Option value="high">🟠 High - Major functionality broken</Option>
              <Option value="medium">🟡 Medium - Some features affected</Option>
              <Option value="low">🟢 Low - Minor inconvenience</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Title"
            name="title"
            rules={[
              { required: true, message: 'Please enter a title' },
              { min: 10, message: 'Title must be at least 10 characters' }
            ]}
          >
            <Input placeholder="Brief description of the issue" />
          </Form.Item>

          <Form.Item
            label="Description"
            name="description"
            rules={[
              { required: true, message: 'Please provide a description' },
              { min: 20, message: 'Description must be at least 20 characters' }
            ]}
          >
            <TextArea 
              rows={4} 
              placeholder="Detailed description of what happened"
            />
          </Form.Item>
        </Space>
      )
    },
    {
      title: 'Details',
      icon: <FileTextOutlined />,
      content: (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Form.Item
            label="Steps to Reproduce"
            name="stepsToReproduce"
          >
            <TextArea 
              rows={4} 
              placeholder="1. Go to...&#10;2. Click on...&#10;3. See error"
            />
          </Form.Item>

          <Form.Item
            label="Expected Behavior"
            name="expectedBehavior"
          >
            <TextArea 
              rows={3} 
              placeholder="What did you expect to happen?"
            />
          </Form.Item>

          <Form.Item
            label="Actual Behavior"
            name="actualBehavior"
          >
            <TextArea 
              rows={3} 
              placeholder="What actually happened?"
            />
          </Form.Item>

          {initialError && (
            <Alert
              message="Technical Error Detected"
              description={
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Text code>{initialError.message}</Text>
                  {initialError.stack && (
                    <details>
                      <summary>Stack trace</summary>
                      <pre style={{ fontSize: 11, maxHeight: 200, overflow: 'auto' }}>
                        {initialError.stack}
                      </pre>
                    </details>
                  )}
                </Space>
              }
              type="warning"
              showIcon
            />
          )}
        </Space>
      )
    },
    {
      title: 'Privacy & Data',
      icon: <SettingOutlined />,
      content: (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Alert
            message="Data Collection Preferences"
            description="Choose what information to include with your report to help us diagnose the issue."
            type="info"
            showIcon
          />

          <Card size="small" title="System Information">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Checkbox
                checked={reportData.includeSystemInfo}
                onChange={(e) => setReportData(prev => ({ 
                  ...prev, 
                  includeSystemInfo: e.target.checked 
                }))}
              >
                Include system information (OS, browser, app version)
              </Checkbox>
              <Text type="secondary" style={{ fontSize: 12, paddingLeft: 24 }}>
                Helps identify environment-specific issues
              </Text>
            </Space>
          </Card>

          <Card size="small" title="Application Logs">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Checkbox
                checked={reportData.includeLogs}
                onChange={(e) => setReportData(prev => ({ 
                  ...prev, 
                  includeLogs: e.target.checked 
                }))}
              >
                Include application logs and error traces
              </Checkbox>
              <Text type="secondary" style={{ fontSize: 12, paddingLeft: 24 }}>
                Contains technical details about what went wrong
              </Text>
            </Space>
          </Card>

          <Card size="small" title="Configuration Data">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Checkbox
                checked={reportData.includeConfiguration}
                onChange={(e) => setReportData(prev => ({ 
                  ...prev, 
                  includeConfiguration: e.target.checked 
                }))}
              >
                Include MCP client configurations (sanitized)
              </Checkbox>
              <Text type="secondary" style={{ fontSize: 12, paddingLeft: 24 }}>
                ⚠️ Sensitive data will be removed, but paths and settings will be included
              </Text>
            </Space>
          </Card>

          <Divider />

          <Form.Item label="Contact Email (optional)" name={['userInfo', 'email']}>
            <Input 
              type="email" 
              placeholder="your.email@example.com"
            />
          </Form.Item>

          <Alert
            message="Privacy Notice"
            description="Your report will be used solely for debugging purposes. Contact information is optional and only used for follow-up questions."
            type="info"
            showIcon
            style={{ fontSize: 12 }}
          />
        </Space>
      )
    }
  ];

  return (
    <Modal
      title={
        <Space>
          <BugOutlined />
          <Title level={4} style={{ margin: 0 }}>
            Report an Issue
          </Title>
        </Space>
      }
      open={visible}
      width={800}
      onCancel={onCancel}
      footer={[
        <Button key="copy" icon={<CopyOutlined />} onClick={handleCopyReport}>
          Copy Report
        </Button>,
        <Button key="cancel" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>,
        ...(currentStep > 0 ? [
          <Button key="prev" onClick={handlePrev} disabled={submitting}>
            Previous
          </Button>
        ] : []),
        ...(currentStep < steps.length - 1 ? [
          <Button key="next" type="primary" onClick={handleNext} disabled={submitting}>
            Next
          </Button>
        ] : [
          <Button 
            key="submit" 
            type="primary" 
            icon={<SendOutlined />}
            onClick={handleSubmit}
            loading={submitting}
          >
            Submit Report
          </Button>
        ])
      ]}
      destroyOnClose
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {submitting && (
          <Alert
            message="Submitting Report"
            description={
              <div>
                <Progress percent={75} size="small" />
                <Text style={{ marginTop: 8, display: 'block' }}>
                  Sending error report...
                </Text>
              </div>
            }
            type="info"
            showIcon
          />
        )}

        <Steps current={currentStep}>
          {steps.map((step, index) => (
            <Step key={index} title={step.title} icon={step.icon} />
          ))}
        </Steps>

        <Form
          form={form}
          layout="vertical"
          initialValues={{
            type: initialError ? 'bug' : undefined,
            severity: initialError ? 'high' : undefined,
            title: initialError ? `Error: ${initialError.message}` : undefined,
            description: initialError ? `An unexpected error occurred: ${initialError.message}` : undefined
          }}
        >
          {steps[currentStep].content}
        </Form>
      </Space>
    </Modal>
  );
};

export default ErrorReportDialog;