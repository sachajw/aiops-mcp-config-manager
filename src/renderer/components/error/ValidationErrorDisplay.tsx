import React from 'react';
import { Alert, Collapse, Space, Typography, Tag, Button, Tooltip } from 'antd';
import {
  ExclamationCircleOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  BugOutlined,
  CheckCircleOutlined,
  EditOutlined,
  ToolOutlined
} from '@ant-design/icons';
import { ValidationResult, ValidationError } from '../../../shared/types/validation';

const { Panel } = Collapse;
const { Text, Paragraph } = Typography;

export interface ValidationErrorDisplayProps {
  validationResult: ValidationResult;
  onFixError?: (error: ValidationError) => void;
  onFixAll?: () => void;
  showSuggestions?: boolean;
  compact?: boolean;
}

const ValidationErrorDisplay: React.FC<ValidationErrorDisplayProps> = ({
  validationResult,
  onFixError,
  onFixAll,
  showSuggestions = true,
  compact = false
}) => {
  const { isValid, errors = [], warnings = [], suggestions = [] } = validationResult;

  const getSeverityIcon = (severity: 'error' | 'warning' | 'info') => {
    switch (severity) {
      case 'error':
        return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />;
      case 'warning':
        return <WarningOutlined style={{ color: '#faad14' }} />;
      case 'info':
      default:
        return <InfoCircleOutlined style={{ color: '#1890ff' }} />;
    }
  };

  const getSeverityColor = (severity: 'error' | 'warning' | 'info') => {
    switch (severity) {
      case 'error':
        return '#ff4d4f';
      case 'warning':
        return '#faad14';
      case 'info':
      default:
        return '#1890ff';
    }
  };

  const renderValidationIssue = (issue: ValidationError, index: number) => {
    const canAutoFix = issue.suggestion?.autoFixAvailable;
    
    return (
      <div key={`${issue.severity}-${index}`} style={{ marginBottom: 16 }}>
        <Space align="start">
          {getSeverityIcon(issue.severity)}
          <div style={{ flex: 1 }}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <div>
                <Text strong style={{ color: getSeverityColor(issue.severity) }}>
                  {issue.message}
                </Text>
                {issue.code && (
                  <Tag 
                    style={{ 
                      fontSize: 10, 
                      marginLeft: 8,
                      backgroundColor: 'rgba(0,0,0,0.02)',
                      border: `1px solid ${getSeverityColor(issue.severity)}`,
                      color: getSeverityColor(issue.severity)
                    }}
                  >
                    {issue.code}
                  </Tag>
                )}
              </div>

              {issue.path && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Path: <Text code>{issue.path}</Text>
                </Text>
              )}

              {issue.details && (
                <Paragraph style={{ fontSize: 12, margin: 0, color: '#666' }}>
                  {issue.details}
                </Paragraph>
              )}

              {issue.suggestion && (
                <div style={{ 
                  padding: 8, 
                  backgroundColor: '#f6ffed', 
                  border: '1px solid #b7eb8f',
                  borderRadius: 4,
                  fontSize: 12
                }}>
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <Text style={{ color: '#52c41a' }}>
                      <CheckCircleOutlined style={{ marginRight: 4 }} />
                      Suggestion: {issue.suggestion.description}
                    </Text>
                    
                    {issue.suggestion.fix && (
                      <Text code style={{ fontSize: 11, backgroundColor: '#f0f2f5' }}>
                        {issue.suggestion.fix}
                      </Text>
                    )}

                    {canAutoFix && onFixError && (
                      <Button
                        size="small"
                        type="primary"
                        icon={<ToolOutlined />}
                        onClick={() => onFixError(issue)}
                        style={{ fontSize: 11, height: 24 }}
                      >
                        Auto-fix
                      </Button>
                    )}
                  </Space>
                </div>
              )}

              {issue.relatedIssues && issue.relatedIssues.length > 0 && (
                <div style={{ fontSize: 11, color: '#666' }}>
                  <Text type="secondary">
                    Related: {issue.relatedIssues.join(', ')}
                  </Text>
                </div>
              )}
            </Space>
          </div>
        </Space>
      </div>
    );
  };

  const hasAutoFixableErrors = [...errors, ...warnings].some(
    issue => issue.suggestion?.autoFixAvailable
  );

  if (isValid && errors.length === 0 && warnings.length === 0) {
    return (
      <Alert
        message="Configuration is valid"
        description="No validation errors or warnings found."
        type="success"
        showIcon
        icon={<CheckCircleOutlined />}
        style={{ marginBottom: 16 }}
      />
    );
  }

  if (compact) {
    const totalIssues = errors.length + warnings.length;
    return (
      <Alert
        message={`${totalIssues} validation issue${totalIssues !== 1 ? 's' : ''} found`}
        description={`${errors.length} error${errors.length !== 1 ? 's' : ''}, ${warnings.length} warning${warnings.length !== 1 ? 's' : ''}`}
        type={errors.length > 0 ? 'error' : 'warning'}
        showIcon
        action={
          hasAutoFixableErrors && onFixAll ? (
            <Button size="small" icon={<ToolOutlined />} onClick={onFixAll}>
              Fix All
            </Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      {/* Summary Alert */}
      <Alert
        message="Validation Issues Found"
        description={
          <Space>
            <Text>{errors.length} error{errors.length !== 1 ? 's' : ''}</Text>
            <Text>{warnings.length} warning{warnings.length !== 1 ? 's' : ''}</Text>
            {hasAutoFixableErrors && (
              <Text type="secondary">• Some issues can be auto-fixed</Text>
            )}
          </Space>
        }
        type={errors.length > 0 ? 'error' : 'warning'}
        showIcon
        action={
          hasAutoFixableErrors && onFixAll ? (
            <Space>
              <Button 
                type="primary" 
                icon={<ToolOutlined />} 
                onClick={onFixAll}
                size="small"
              >
                Fix All Auto-fixable
              </Button>
            </Space>
          ) : undefined
        }
      />

      {/* Detailed Issues */}
      <Collapse ghost defaultActiveKey={errors.length > 0 ? ['errors'] : undefined}>
        {errors.length > 0 && (
          <Panel
            header={
              <Space>
                <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
                <Text strong style={{ color: '#ff4d4f' }}>
                  Errors ({errors.length})
                </Text>
              </Space>
            }
            key="errors"
          >
            <div style={{ paddingLeft: 24 }}>
              {errors.map(renderValidationIssue)}
            </div>
          </Panel>
        )}

        {warnings.length > 0 && (
          <Panel
            header={
              <Space>
                <WarningOutlined style={{ color: '#faad14' }} />
                <Text strong style={{ color: '#faad14' }}>
                  Warnings ({warnings.length})
                </Text>
              </Space>
            }
            key="warnings"
          >
            <div style={{ paddingLeft: 24 }}>
              {warnings.map(renderValidationIssue)}
            </div>
          </Panel>
        )}

        {showSuggestions && suggestions.length > 0 && (
          <Panel
            header={
              <Space>
                <InfoCircleOutlined style={{ color: '#1890ff' }} />
                <Text strong style={{ color: '#1890ff' }}>
                  Suggestions ({suggestions.length})
                </Text>
              </Space>
            }
            key="suggestions"
          >
            <div style={{ paddingLeft: 24 }}>
              {suggestions.map((suggestion, index) => (
                <div key={index} style={{ marginBottom: 12 }}>
                  <Space align="start">
                    <InfoCircleOutlined style={{ color: '#1890ff' }} />
                    <div>
                      <Text>{suggestion.description}</Text>
                      {suggestion.fix && (
                        <div style={{ marginTop: 4 }}>
                          <Text code style={{ fontSize: 11, backgroundColor: '#f0f2f5' }}>
                            {suggestion.fix}
                          </Text>
                        </div>
                      )}
                    </div>
                  </Space>
                </div>
              ))}
            </div>
          </Panel>
        )}
      </Collapse>
    </Space>
  );
};

export default ValidationErrorDisplay;