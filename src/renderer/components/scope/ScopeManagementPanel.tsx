import React, { useState } from 'react';
import {
  Card,
  Button,
  Space,
  Typography,
  Alert,
  Badge,
  Row,
  Col,
  Statistic,
  Tooltip,
  Divider,
  List
} from 'antd';
import {
  WarningOutlined,
  SwapOutlined,
  MergeOutlined,
  InfoCircleOutlined,
  BranchesOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { ConfigScope } from '../../../shared/types/enums';
import { MCPClient, ResolvedConfiguration, ScopeConflict } from '../../../shared/types';
import ScopeTag from '../common/ScopeTag';
import ScopeConflictDialog, { ConflictResolution } from './ScopeConflictDialog';
import ScopeMigrationDialog, { ServerMigration } from './ScopeMigrationDialog';

const { Title, Text } = Typography;

export interface ScopeManagementPanelProps {
  client?: MCPClient;
  configuration?: ResolvedConfiguration;
  loading?: boolean;
  onResolveConflicts?: (resolutions: ConflictResolution[]) => Promise<void>;
  onMigrateServers?: (migrations: ServerMigration[]) => Promise<void>;
  onRefresh?: () => void;
}

const ScopeManagementPanel: React.FC<ScopeManagementPanelProps> = ({
  client,
  configuration,
  loading = false,
  onResolveConflicts,
  onMigrateServers,
  onRefresh
}) => {
  const [conflictDialogVisible, setConflictDialogVisible] = useState(false);
  const [migrationDialogVisible, setMigrationDialogVisible] = useState(false);

  const conflicts = configuration?.conflicts ?? [];
  const servers = configuration ? Object.entries(configuration.servers) : [];
  const sources = configuration?.sources || {};

  const getScopeStatistics = () => {
    const scopeCounts = {
      [ConfigScope.PROJECT]: 0,
      [ConfigScope.LOCAL]: 0,
      [ConfigScope.USER]: 0,
      [ConfigScope.GLOBAL]: 0
    };

    Object.entries(sources).forEach(([, scope]) => {
      scopeCounts[scope] = (scopeCounts[scope] ?? 0) + 1;
    });

    return scopeCounts;
  };

  const getServersForMigration = () => {
    return servers.map(([name, server]) => ({
      name,
      server,
      currentScope: sources[name] || ConfigScope.USER
    }));
  };

  const handleConflictResolve = async (resolutions: ConflictResolution[]) => {
    await onResolveConflicts?.(resolutions);
    setConflictDialogVisible(false);
    onRefresh?.();
  };

  const handleServerMigration = async (migrations: ServerMigration[]) => {
    await onMigrateServers?.(migrations);
    setMigrationDialogVisible(false);
    onRefresh?.();
  };

  const scopeStats = getScopeStatistics();
  const hasConflicts = conflicts.length > 0;
  const totalServers = servers.length;

  if (!client) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
          Select a client to manage scopes
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card
        title={
          <Space>
            <BranchesOutlined />
            <Title level={5} style={{ margin: 0 }}>
              Scope Management
            </Title>
          </Space>
        }
        loading={loading}
        size="small"
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {/* Conflict Alert */}
          {hasConflicts && (
            <Alert
              message="Scope Conflicts Detected"
              description={`${conflicts.length} server${conflicts.length !== 1 ? 's have' : ' has'} conflicting definitions across scopes.`}
              type="warning"
              showIcon
              action={
                <Button
                  size="small"
                  type="primary"
                  icon={<MergeOutlined />}
                  onClick={() => setConflictDialogVisible(true)}
                >
                  Resolve
                </Button>
              }
            />
          )}

          {/* Scope Statistics */}
          <Card size="small" title="Configuration Distribution">
            <Row gutter={[16, 16]}>
              {Object.entries(scopeStats).map(([scope, count]) => (
                <Col span={6} key={scope}>
                  <Statistic
                    title={<ScopeTag scope={scope as ConfigScope} size="small" />}
                    value={count}
                    suffix={count === 1 ? 'server' : 'servers'}
                    valueStyle={{ 
                      fontSize: '16px',
                      color: count > 0 ? '#1890ff' : '#d9d9d9'
                    }}
                  />
                </Col>
              ))}
            </Row>
          </Card>

          {/* Action Buttons */}
          <Row gutter={[8, 8]}>
            <Col span={12}>
              <Button
                type="default"
                icon={<SwapOutlined />}
                onClick={() => setMigrationDialogVisible(true)}
                disabled={totalServers === 0}
                style={{ width: '100%' }}
              >
                Migrate Servers
              </Button>
            </Col>
            <Col span={12}>
              <Button
                type={hasConflicts ? 'primary' : 'default'}
                icon={<MergeOutlined />}
                onClick={() => setConflictDialogVisible(true)}
                disabled={!hasConflicts}
                style={{ width: '100%' }}
                danger={hasConflicts}
              >
                Resolve Conflicts
                {hasConflicts && (
                  <Badge count={conflicts.length} size="small" style={{ marginLeft: 4 }} />
                )}
              </Button>
            </Col>
          </Row>

          <Divider style={{ margin: '8px 0' }} />

          {/* Scope Priority Info */}
          <Card size="small" title="Scope Priority Hierarchy">
            <List
              size="small"
              dataSource={[
                { scope: ConfigScope.PROJECT, description: 'Highest - Project specific' },
                { scope: ConfigScope.LOCAL, description: 'High - Working directory' },
                { scope: ConfigScope.USER, description: 'Medium - User specific' },
                { scope: ConfigScope.GLOBAL, description: 'Lowest - System wide' }
              ]}
              renderItem={(item, index) => (
                <List.Item>
                  <Space>
                    <Text style={{ minWidth: '12px', textAlign: 'center' }}>
                      {index + 1}.
                    </Text>
                    <ScopeTag scope={item.scope} size="small" />
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {item.description}
                    </Text>
                    {scopeStats[item.scope] > 0 && (
                      <Badge count={scopeStats[item.scope]} size="small" />
                    )}
                  </Space>
                </List.Item>
              )}
            />
          </Card>

          {/* Status Summary */}
          <Alert
            message={
              <Space>
                <CheckCircleOutlined />
                <Text>
                  {hasConflicts 
                    ? `${totalServers - conflicts.length} of ${totalServers} servers configured correctly`
                    : `All ${totalServers} servers configured correctly`
                  }
                </Text>
              </Space>
            }
            type={hasConflicts ? 'warning' : 'success'}
            showIcon={false}
            style={{
              fontSize: '12px',
              padding: '8px 12px'
            }}
            className="scope-tip-alert"
          />
        </Space>
      </Card>

      {/* Dialogs */}
      <ScopeConflictDialog
        visible={conflictDialogVisible}
        conflicts={conflicts}
        onResolve={handleConflictResolve}
        onCancel={() => setConflictDialogVisible(false)}
      />

      <ScopeMigrationDialog
        visible={migrationDialogVisible}
        client={client}
        servers={getServersForMigration()}
        onMigrate={handleServerMigration}
        onCancel={() => setMigrationDialogVisible(false)}
      />
    </>
  );
};

export default ScopeManagementPanel;