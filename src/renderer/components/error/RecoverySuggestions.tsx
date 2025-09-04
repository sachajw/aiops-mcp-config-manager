import React, { useState } from 'react';
import { Card, Space, Typography, Button, Steps, Alert, Collapse, Progress, message } from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  SettingOutlined,
  ReloadOutlined,
  FileSearchOutlined,
  ToolOutlined,
  BugOutlined,
  QuestionCircleOutlined,
  PlayCircleOutlined,
  RobotOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;
const { Panel } = Collapse;

export interface RecoveryStep {
  id: string;
  title: string;
  description: string;
  action?: () => Promise<void>;
  automated?: boolean;
  critical?: boolean;
  estimatedTime?: string;
  requirements?: string[];
  icon?: React.ReactNode;
}

export interface RecoverySuggestion {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'configuration' | 'permissions' | 'dependencies' | 'network' | 'system';
  steps: RecoveryStep[];
  automaticRecovery?: {
    available: boolean;
    description: string;
    action: () => Promise<void>;
  };
}

export interface RecoverySuggestionsProps {
  suggestions: RecoverySuggestion[];
  onExecuteStep?: (suggestionId: string, stepId: string) => Promise<void>;
  onExecuteAutoRecovery?: (suggestionId: string) => Promise<void>;
  title?: string;
  showAutomatedOnly?: boolean;
}

const RecoverySuggestions: React.FC<RecoverySuggestionsProps> = ({
  suggestions,
  onExecuteStep,
  onExecuteAutoRecovery,
  title = "Recovery Suggestions",
  showAutomatedOnly = false
}) => {
  const [executingSteps, setExecutingSteps] = useState<Set<string>>(new Set());
  const [executingRecovery, setExecutingRecovery] = useState<Set<string>>(new Set());
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  const getSeverityColor = (severity: RecoverySuggestion['severity']) => {
    switch (severity) {
      case 'critical':
        return '#ff4d4f';
      case 'high':
        return '#fa8c16';
      case 'medium':
        return '#faad14';
      case 'low':
        return '#52c41a';
      default:
        return '#1890ff';
    }
  };

  const getCategoryIcon = (category: RecoverySuggestion['category']) => {
    switch (category) {
      case 'configuration':
        return <SettingOutlined />;
      case 'permissions':
        return <ExclamationCircleOutlined />;
      case 'dependencies':
        return <ToolOutlined />;
      case 'network':
        return <BugOutlined />;
      case 'system':
        return <FileSearchOutlined />;
      default:
        return <QuestionCircleOutlined />;
    }
  };

  const handleExecuteStep = async (suggestionId: string, stepId: string) => {
    const stepKey = `${suggestionId}:${stepId}`;
    setExecutingSteps(prev => new Set([...prev, stepKey]));

    try {
      if (onExecuteStep) {
        await onExecuteStep(suggestionId, stepId);
      }
      
      setCompletedSteps(prev => new Set([...prev, stepKey]));
      message.success('Step completed successfully');
    } catch (error) {
      message.error(`Step failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setExecutingSteps(prev => {
        const newSet = new Set(prev);
        newSet.delete(stepKey);
        return newSet;
      });
    }
  };

  const handleExecuteAutoRecovery = async (suggestion: RecoverySuggestion) => {
    if (!suggestion.automaticRecovery) return;

    setExecutingRecovery(prev => new Set([...prev, suggestion.id]));

    try {
      if (onExecuteAutoRecovery) {
        await onExecuteAutoRecovery(suggestion.id);
      } else {
        await suggestion.automaticRecovery.action();
      }
      
      message.success(`Automatic recovery completed for: ${suggestion.title}`);
    } catch (error) {
      message.error(`Automatic recovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setExecutingRecovery(prev => {
        const newSet = new Set(prev);
        newSet.delete(suggestion.id);
        return newSet;
      });
    }
  };

  const renderRecoveryStep = (suggestion: RecoverySuggestion, step: RecoveryStep, index: number) => {
    const stepKey = `${suggestion.id}:${step.id}`;
    const isExecuting = executingSteps.has(stepKey);
    const isCompleted = completedSteps.has(stepKey);

    const stepStatus = isCompleted ? 'finish' : isExecuting ? 'process' : 'wait';
    const stepIcon = isCompleted ? <CheckCircleOutlined /> : 
                     isExecuting ? <ClockCircleOutlined /> : 
                     step.icon || undefined;

    return (
      <Step
        key={step.id}
        status={stepStatus}
        title={step.title}
        description={
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Text>{step.description}</Text>
            
            {step.requirements && step.requirements.length > 0 && (
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Requirements: {step.requirements.join(', ')}
                </Text>
              </div>
            )}

            {step.estimatedTime && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                Estimated time: {step.estimatedTime}
              </Text>
            )}

            {step.action && (
              <Button
                size="small"
                type={step.critical ? 'primary' : 'default'}
                icon={step.automated ? <RobotOutlined /> : <PlayCircleOutlined />}
                loading={isExecuting}
                disabled={isCompleted}
                onClick={() => handleExecuteStep(suggestion.id, step.id)}
                danger={step.critical}
              >
                {isCompleted ? 'Completed' : isExecuting ? 'Executing...' : 
                 step.automated ? 'Auto-execute' : 'Execute Step'}
              </Button>
            )}
          </Space>
        }
        icon={stepIcon}
      />
    );
  };

  const renderRecoverySuggestion = (suggestion: RecoverySuggestion) => {
    const isAutoRecovering = executingRecovery.has(suggestion.id);
    const hasAutomaticRecovery = suggestion.automaticRecovery?.available;
    
    if (showAutomatedOnly && !hasAutomaticRecovery) {
      return null;
    }

    return (
      <Panel
        key={suggestion.id}
        header={
          <Space>
            {getCategoryIcon(suggestion.category)}
            <Text strong style={{ color: getSeverityColor(suggestion.severity) }}>
              {suggestion.title}
            </Text>
            <Text type="secondary">({suggestion.severity} severity)</Text>
            {hasAutomaticRecovery && (
              <RobotOutlined style={{ color: '#52c41a' }} title="Automatic recovery available" />
            )}
          </Space>
        }
        extra={
          hasAutomaticRecovery ? (
            <Button
              type="primary"
              size="small"
              icon={<RobotOutlined />}
              loading={isAutoRecovering}
              onClick={(e) => {
                e.stopPropagation();
                handleExecuteAutoRecovery(suggestion);
              }}
              style={{ marginLeft: 8 }}
            >
              {isAutoRecovering ? 'Auto-recovering...' : 'Auto-recover'}
            </Button>
          ) : undefined
        }
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Paragraph>{suggestion.description}</Paragraph>

          {hasAutomaticRecovery && (
            <Alert
              message="Automatic Recovery Available"
              description={suggestion.automaticRecovery!.description}
              type="success"
              showIcon
              icon={<RobotOutlined />}
              action={
                <Button
                  type="primary"
                  size="small"
                  icon={<RobotOutlined />}
                  loading={isAutoRecovering}
                  onClick={() => handleExecuteAutoRecovery(suggestion)}
                >
                  Execute Now
                </Button>
              }
            />
          )}

          <div>
            <Title level={5}>Recovery Steps:</Title>
            <Steps
              direction="vertical"
              size="small"
              current={-1} // Don't highlight any step by default
            >
              {suggestion.steps.map((step, index) => 
                renderRecoveryStep(suggestion, step, index)
              )}
            </Steps>
          </div>
        </Space>
      </Panel>
    );
  };

  if (suggestions.length === 0) {
    return (
      <Alert
        message="No recovery suggestions available"
        description="The system couldn't generate specific recovery suggestions for this issue. Please check the error details and try manual troubleshooting."
        type="info"
        showIcon
      />
    );
  }

  const criticalSuggestions = suggestions.filter(s => s.severity === 'critical');
  const automatedSuggestions = suggestions.filter(s => s.automaticRecovery?.available);

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* Summary */}
      <Card size="small">
        <Space direction="vertical" style={{ width: '100%' }}>
          <Title level={4}>{title}</Title>
          <Text type="secondary">
            Found {suggestions.length} recovery suggestion{suggestions.length !== 1 ? 's' : ''}
            {criticalSuggestions.length > 0 && ` (${criticalSuggestions.length} critical)`}
            {automatedSuggestions.length > 0 && ` • ${automatedSuggestions.length} can be auto-recovered`}
          </Text>

          {automatedSuggestions.length > 0 && (
            <Alert
              message={`${automatedSuggestions.length} suggestion${automatedSuggestions.length !== 1 ? 's' : ''} can be automatically resolved`}
              description="These issues have automated recovery procedures available."
              type="success"
              showIcon
              icon={<RobotOutlined />}
              action={
                <Button
                  type="primary"
                  icon={<RobotOutlined />}
                  onClick={async () => {
                    for (const suggestion of automatedSuggestions) {
                      await handleExecuteAutoRecovery(suggestion);
                    }
                  }}
                >
                  Auto-recover All
                </Button>
              }
            />
          )}
        </Space>
      </Card>

      {/* Recovery Suggestions */}
      <Collapse defaultActiveKey={criticalSuggestions.map(s => s.id)}>
        {suggestions
          .sort((a, b) => {
            // Sort by severity (critical first) and then by automation availability
            const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
            const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
            if (severityDiff !== 0) return severityDiff;
            
            if (a.automaticRecovery?.available && !b.automaticRecovery?.available) return -1;
            if (!a.automaticRecovery?.available && b.automaticRecovery?.available) return 1;
            
            return 0;
          })
          .map(renderRecoverySuggestion)
          .filter(Boolean)}
      </Collapse>
    </Space>
  );
};

export default RecoverySuggestions;