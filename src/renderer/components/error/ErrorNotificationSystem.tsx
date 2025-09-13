import React, { useState, useEffect } from 'react';
import { notification, Button, Space, Typography } from 'antd';
import type { NotificationInstance } from 'antd/es/notification/interface';
import {
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  BugOutlined,
  ReloadOutlined,
  SettingOutlined,
  FileTextOutlined
} from '@ant-design/icons';

const { Text } = Typography;

export interface ErrorNotification {
  id: string;
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  details?: string;
  timestamp: Date;
  source?: string;
  recoverable?: boolean;
  autoRecovery?: {
    action: () => Promise<void>;
    label: string;
    description: string;
  };
  userActions?: Array<{
    label: string;
    action: () => void;
    type?: 'primary' | 'default' | 'link';
    icon?: React.ReactNode;
  }>;
  persistent?: boolean;
  metadata?: Record<string, any>;
}

interface ErrorNotificationSystemProps {
  maxNotifications?: number;
  autoCloseDelay?: number;
  enableAutoRecovery?: boolean;
}

class ErrorNotificationManager {
  private static instance: ErrorNotificationManager;
  private notifications: ErrorNotification[] = [];
  private listeners: Array<(notifications: ErrorNotification[]) => void> = [];
  private notificationApi: NotificationInstance | null = null;

  static getInstance(): ErrorNotificationManager {
    if (!ErrorNotificationManager.instance) {
      ErrorNotificationManager.instance = new ErrorNotificationManager();
    }
    return ErrorNotificationManager.instance;
  }

  setNotificationApi(api: NotificationInstance) {
    this.notificationApi = api;
  }

  addNotification(notification: Omit<ErrorNotification, 'id' | 'timestamp'>): string {
    const errorNotification: ErrorNotification = {
      ...notification,
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };

    this.notifications.unshift(errorNotification);
    this.notifyListeners();
    this.showNotification(errorNotification);
    
    return errorNotification.id;
  }

  removeNotification(id: string) {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.notifyListeners();
    this.notificationApi?.destroy(id);
  }

  clearAll() {
    this.notifications = [];
    this.notifyListeners();
    this.notificationApi?.destroy();
  }

  getNotifications(): ErrorNotification[] {
    return [...this.notifications];
  }

  subscribe(listener: (notifications: ErrorNotification[]) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener([...this.notifications]));
  }

  private showNotification(notification: ErrorNotification) {
    if (!this.notificationApi) return;

    const iconMap = {
      error: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
      warning: <WarningOutlined style={{ color: '#faad14' }} />,
      info: <InfoCircleOutlined style={{ color: '#1890ff' }} />
    };

    const actions: React.ReactNode[] = [];

    // Add auto-recovery action
    if (notification.autoRecovery) {
      actions.push(
        <Button
          key="auto-recover"
          type="primary"
          size="small"
          icon={<ReloadOutlined />}
          onClick={async () => {
            try {
              await notification.autoRecovery!.action();
              this.removeNotification(notification.id);
            } catch (error) {
              console.error('Auto-recovery failed:', error);
            }
          }}
        >
          {notification.autoRecovery.label}
        </Button>
      );
    }

    // Add user actions
    if (notification.userActions) {
      notification.userActions.forEach((action, index) => {
        actions.push(
          <Button
            key={`action-${index}`}
            type={action.type || 'default'}
            size="small"
            icon={action.icon}
            onClick={() => {
              action.action();
              if (!notification.persistent) {
                this.removeNotification(notification.id);
              }
            }}
          >
            {action.label}
          </Button>
        );
      });
    }

    // Add close action
    actions.push(
      <Button
        key="close"
        type="text"
        size="small"
        onClick={() => this.removeNotification(notification.id)}
      >
        Dismiss
      </Button>
    );

    this.notificationApi.open({
      key: notification.id,
      message: notification.title,
      description: (
        <Space direction="vertical" size="small">
          <Text>{notification.message}</Text>
          {notification.details && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {notification.details}
            </Text>
          )}
          {notification.source && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              Source: {notification.source}
            </Text>
          )}
          {notification.autoRecovery && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              💡 {notification.autoRecovery.description}
            </Text>
          )}
        </Space>
      ),
      icon: iconMap[notification.type],
      duration: notification.persistent ? 0 : 10,
      btn: actions.length > 0 ? <Space>{actions}</Space> : undefined,
      placement: 'topRight'
    });
  }
}

const ErrorNotificationSystem: React.FC<ErrorNotificationSystemProps> = ({
  maxNotifications = 50,
  autoCloseDelay = 10000,
  enableAutoRecovery = true
}) => {
  const [api, contextHolder] = notification.useNotification();
  const [notifications, setNotifications] = useState<ErrorNotification[]>([]);

  useEffect(() => {
    const manager = ErrorNotificationManager.getInstance();
    manager.setNotificationApi(api);
    
    const unsubscribe = manager.subscribe(setNotifications);
    
    return unsubscribe;
  }, [api]);

  return contextHolder;
};

// Helper functions for common error types
export const showError = (title: string, message: string, options?: Partial<ErrorNotification>) => {
  const manager = ErrorNotificationManager.getInstance();
  return manager.addNotification({
    type: 'error',
    title,
    message,
    ...options
  });
};

export const showWarning = (title: string, message: string, options?: Partial<ErrorNotification>) => {
  const manager = ErrorNotificationManager.getInstance();
  return manager.addNotification({
    type: 'warning',
    title,
    message,
    ...options
  });
};

export const showInfo = (title: string, message: string, options?: Partial<ErrorNotification>) => {
  const manager = ErrorNotificationManager.getInstance();
  return manager.addNotification({
    type: 'info',
    title,
    message,
    ...options
  });
};

// Specific error handlers for MCP Configuration Manager
export const showConfigurationError = (
  clientName: string, 
  error: string, 
  filePath?: string,
  autoFix?: () => Promise<void>
) => {
  return showError(
    `Configuration Error - ${clientName}`,
    error,
    {
      source: filePath,
      details: filePath ? `File: ${filePath}` : undefined,
      autoRecovery: autoFix ? {
        action: autoFix,
        label: 'Auto-fix',
        description: 'Attempt to automatically resolve this configuration issue'
      } : undefined,
      userActions: [
        {
          label: 'Edit Config',
          action: () => {
            // Navigate to configuration editor
            console.log('Navigate to config editor for', clientName);
          },
          type: 'primary',
          icon: <SettingOutlined />
        },
        {
          label: 'View Logs',
          action: () => {
            // Open logs viewer
            console.log('Open logs for', clientName);
          },
          icon: <FileTextOutlined />
        }
      ]
    }
  );
};

export const showServerTestError = (
  serverName: string,
  clientName: string,
  error: string,
  retryTest?: () => Promise<void>
) => {
  return showError(
    `Server Test Failed - ${serverName}`,
    error,
    {
      source: `${clientName}`,
      autoRecovery: retryTest ? {
        action: retryTest,
        label: 'Retry Test',
        description: 'Run the server test again'
      } : undefined,
      userActions: [
        {
          label: 'Edit Server',
          action: () => {
            // Navigate to server editor
            console.log('Edit server', serverName);
          },
          type: 'primary',
          icon: <SettingOutlined />
        }
      ]
    }
  );
};

export const showSyncError = (
  operation: string,
  affectedClients: string[],
  error: string,
  retrySync?: () => Promise<void>
) => {
  return showError(
    `Synchronization Failed - ${operation}`,
    error,
    {
      source: `Affected clients: ${affectedClients.join(', ')}`,
      autoRecovery: retrySync ? {
        action: retrySync,
        label: 'Retry Sync',
        description: 'Attempt to synchronize the configurations again'
      } : undefined,
      userActions: [
        {
          label: 'View Sync Status',
          action: () => {
            // Navigate to sync panel
            console.log('View sync status');
          },
          type: 'primary',
          icon: <BugOutlined />
        }
      ]
    }
  );
};

export const showFileSystemError = (
  operation: string,
  filePath: string,
  error: string,
  retryOperation?: () => Promise<void>
) => {
  return showError(
    `File System Error - ${operation}`,
    error,
    {
      source: filePath,
      details: `Operation: ${operation}, File: ${filePath}`,
      autoRecovery: retryOperation ? {
        action: retryOperation,
        label: 'Retry',
        description: 'Retry the file system operation'
      } : undefined,
      userActions: [
        {
          label: 'Check Permissions',
          action: () => {
            // Show file permissions dialog
            console.log('Check file permissions for', filePath);
          },
          icon: <WarningOutlined />
        }
      ]
    }
  );
};

export { ErrorNotificationManager };
export default ErrorNotificationSystem;