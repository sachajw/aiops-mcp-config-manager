import React from 'react';
import { Badge, Tooltip } from 'antd';
import { 
  CheckCircleOutlined, 
  ExclamationCircleOutlined, 
  CloseCircleOutlined, 
  QuestionCircleOutlined,
  LoadingOutlined 
} from '@ant-design/icons';
import { ClientStatus, TestStatus } from '../../../shared/types/enums';

export interface StatusIndicatorProps {
  status: ClientStatus | TestStatus | 'loading';
  text?: string;
  showText?: boolean;
  size?: 'small' | 'default';
  tooltip?: string;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  text,
  showText = false,
  size = 'default',
  tooltip
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case ClientStatus.ACTIVE:
      case TestStatus.SUCCESS:
        return {
          status: 'success' as const,
          icon: <CheckCircleOutlined />,
          text: text || 'Active'
        };
      
      case ClientStatus.INACTIVE:
        return {
          status: 'default' as const,
          icon: <ExclamationCircleOutlined />,
          text: text || 'Inactive'
        };
      
      case ClientStatus.ERROR:
      case TestStatus.FAILED:
        return {
          status: 'error' as const,
          icon: <CloseCircleOutlined />,
          text: text || 'Error'
        };
      
      case TestStatus.PENDING:
        return {
          status: 'processing' as const,
          icon: <QuestionCircleOutlined />,
          text: text || 'Pending'
        };
      
      case 'loading':
        return {
          status: 'processing' as const,
          icon: <LoadingOutlined spin />,
          text: text || 'Loading'
        };
      
      case ClientStatus.UNKNOWN:
      case TestStatus.TIMEOUT:
      default:
        return {
          status: 'warning' as const,
          icon: <QuestionCircleOutlined />,
          text: text || 'Unknown'
        };
    }
  };

  const config = getStatusConfig();

  const badge = (
    <Badge 
      status={config.status} 
      text={showText ? config.text : undefined}
      size={size}
    />
  );

  if (tooltip) {
    return (
      <Tooltip title={tooltip}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          {config.icon}
          {badge}
        </span>
      </Tooltip>
    );
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      {config.icon}
      {badge}
    </span>
  );
};

export default StatusIndicator;