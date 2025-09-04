import React, { useState, useEffect } from 'react';
import {
  Modal,
  Tabs,
  Form,
  Input,
  Select,
  Switch,
  Button,
  Space,
  Typography,
  Alert,
  Divider,
  Card,
  Row,
  Col,
  Slider,
  InputNumber,
  message,
  Popconfirm
} from 'antd';
import {
  SettingOutlined,
  SaveOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
  BugOutlined,
  PaletteOutlined,
  DatabaseOutlined,
  SyncOutlined,
  BellOutlined,
  EditOutlined,
  WindowsOutlined
} from '@ant-design/icons';
import { useSettingsStore, ApplicationSettings } from '../../store/settingsStore';
import { ConfigScope } from '../../../shared/types/enums';

const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

export interface SettingsDialogProps {
  visible: boolean;
  onCancel: () => void;
  defaultTab?: string;
}

const SettingsDialog: React.FC<SettingsDialogProps> = ({
  visible,
  onCancel,
  defaultTab = 'general'
}) => {
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const {
    settings,
    isLoading,
    isDirty,
    updateSettings,
    saveSettings,
    resetSettings,
    loadSettings
  } = useSettingsStore();

  useEffect(() => {
    if (visible) {
      form.setFieldsValue(settings);
      setHasUnsavedChanges(isDirty);
      setActiveTab(defaultTab);
    }
  }, [visible, settings, isDirty, form, defaultTab]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      
      // Update each settings category
      Object.keys(values).forEach(category => {
        if (values[category]) {
          updateSettings(category as keyof ApplicationSettings, values[category]);
        }
      });
      
      await saveSettings();
      message.success('Settings saved successfully');
      setHasUnsavedChanges(false);
    } catch (error) {
      message.error(`Failed to save settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleReset = async (category?: keyof ApplicationSettings) => {
    try {
      resetSettings(category);
      form.setFieldsValue(useSettingsStore.getState().settings);
      message.success(category ? `${category} settings reset` : 'All settings reset');
      setHasUnsavedChanges(true);
    } catch (error) {
      message.error(`Failed to reset settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleFormChange = () => {
    setHasUnsavedChanges(true);
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      Modal.confirm({
        title: 'Unsaved Changes',
        content: 'You have unsaved changes. Are you sure you want to close without saving?',
        icon: <ExclamationCircleOutlined />,
        onOk: () => {
          form.setFieldsValue(settings);
          setHasUnsavedChanges(false);
          onCancel();
        }
      });
    } else {
      onCancel();
    }
  };

  return (
    <Modal
      title={
        <Space>
          <SettingOutlined />
          <Title level={4} style={{ margin: 0 }}>
            Application Settings
          </Title>
        </Space>
      }
      open={visible}
      width={900}
      height={700}
      onCancel={handleCancel}
      footer={[
        <Button key="reload" icon={<ReloadOutlined />} onClick={() => loadSettings()} loading={isLoading}>
          Reload
        </Button>,
        <Popconfirm
          key="reset"
          title="Reset all settings to defaults?"
          description="This action cannot be undone."
          onConfirm={() => handleReset()}
          icon={<ExclamationCircleOutlined style={{ color: 'red' }} />}
        >
          <Button danger>Reset All</Button>
        </Popconfirm>,
        <Button key="cancel" onClick={handleCancel}>
          Cancel
        </Button>,
        <Button 
          key="save" 
          type="primary" 
          icon={<SaveOutlined />}
          onClick={handleSave}
          loading={isLoading}
          disabled={!hasUnsavedChanges}
        >
          Save Changes
        </Button>
      ]}
      destroyOnClose
      style={{ top: 20 }}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={settings}
        onValuesChange={handleFormChange}
      >
        <Tabs activeKey={activeTab} onChange={setActiveTab} tabPosition="left" style={{ minHeight: 600 }}>
          {/* General Settings */}
          <TabPane 
            tab={<Space><SettingOutlined />General</Space>} 
            key="general"
          >
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <Card size="small" title="Default Configuration">
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Form.Item label="Default Scope" name={['defaultScope']}>
                      <Select>
                        <Option value={ConfigScope.PROJECT}>Project</Option>
                        <Option value={ConfigScope.LOCAL}>Local</Option>
                        <Option value={ConfigScope.USER}>User</Option>
                        <Option value={ConfigScope.GLOBAL}>Global</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="Auto-save Interval (minutes)" name={['autoSaveInterval']}>
                      <InputNumber min={1} max={60} />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>

              <Card size="small" title="Application Behavior">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Form.Item name={['showWelcomeDialog']} valuePropName="checked">
                    <Switch checkedChildren="Show welcome dialog on startup" unCheckedChildren="Skip welcome dialog" />
                  </Form.Item>
                  
                  <Form.Item name={['checkForUpdates']} valuePropName="checked">
                    <Switch checkedChildren="Check for updates automatically" unCheckedChildren="Manual update checks only" />
                  </Form.Item>
                  
                  <Form.Item name={['telemetryEnabled']} valuePropName="checked">
                    <Switch checkedChildren="Enable telemetry and analytics" unCheckedChildren="Disable telemetry" />
                  </Form.Item>
                </Space>
              </Card>
            </Space>
          </TabPane>

          {/* Theme Settings */}
          <TabPane 
            tab={<Space><PaletteOutlined />Appearance</Space>} 
            key="theme"
          >
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <Card size="small" title="Theme">
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Form.Item label="Color Mode" name={['theme', 'mode']}>
                      <Select>
                        <Option value="light">Light</Option>
                        <Option value="dark">Dark</Option>
                        <Option value="auto">Auto (system)</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="Primary Color" name={['theme', 'primaryColor']}>
                      <Input type="color" style={{ width: 100 }} />
                    </Form.Item>
                  </Col>
                </Row>
                
                <Form.Item name={['theme', 'compact']} valuePropName="checked">
                  <Switch checkedChildren="Compact UI" unCheckedChildren="Standard UI" />
                </Form.Item>
              </Card>

              <Card size="small" title="Window Settings">
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Form.Item label="Sidebar Width" name={['window', 'sidebarWidth']}>
                      <Slider min={200} max={400} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name={['window', 'remembrLastTab']} valuePropName="checked">
                      <Switch checkedChildren="Remember last active tab" unCheckedChildren="Always start with servers tab" />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>
            </Space>
          </TabPane>

          {/* Editor Settings */}
          <TabPane 
            tab={<Space><EditOutlined />Editor</Space>} 
            key="editor"
          >
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <Card size="small" title="Code Editor">
                <Row gutter={[16, 16]}>
                  <Col span={8}>
                    <Form.Item label="Font Size" name={['editor', 'fontSize']}>
                      <InputNumber min={10} max={24} />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label="Tab Size" name={['editor', 'tabSize']}>
                      <InputNumber min={2} max={8} />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label="Default View" name={['editor', 'defaultViewMode']}>
                      <Select>
                        <Option value="form">Form</Option>
                        <Option value="json">JSON</Option>
                        <Option value="preview">Preview</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Form.Item name={['editor', 'wordWrap']} valuePropName="checked">
                      <Switch checkedChildren="Word wrap enabled" unCheckedChildren="Word wrap disabled" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name={['editor', 'showLineNumbers']} valuePropName="checked">
                      <Switch checkedChildren="Show line numbers" unCheckedChildren="Hide line numbers" />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Form.Item name={['editor', 'highlightActiveLine']} valuePropName="checked">
                      <Switch checkedChildren="Highlight active line" unCheckedChildren="No line highlighting" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name={['editor', 'autoCloseBrackets']} valuePropName="checked">
                      <Switch checkedChildren="Auto-close brackets" unCheckedChildren="Manual bracket closing" />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>

              <Card size="small" title="JSON Formatting">
                <Form.Item label="JSON Formatter Style" name={['editor', 'jsonFormatterStyle']}>
                  <Select>
                    <Option value="compact">Compact</Option>
                    <Option value="standard">Standard</Option>
                    <Option value="expanded">Expanded</Option>
                  </Select>
                </Form.Item>
              </Card>
            </Space>
          </TabPane>

          {/* Backup Settings */}
          <TabPane 
            tab={<Space><DatabaseOutlined />Backup</Space>} 
            key="backup"
          >
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <Card size="small" title="Backup Configuration">
                <Form.Item name={['backup', 'enabled']} valuePropName="checked">
                  <Switch checkedChildren="Backup enabled" unCheckedChildren="Backup disabled" />
                </Form.Item>

                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Form.Item label="Max Backups" name={['backup', 'maxBackups']}>
                      <InputNumber min={1} max={100} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="Retention (days)" name={['backup', 'retentionDays']}>
                      <InputNumber min={1} max={365} />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item label="Backup Location" name={['backup', 'location']}>
                  <Input placeholder="~/backups/mcp-config" />
                </Form.Item>

                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Form.Item name={['backup', 'compressionEnabled']} valuePropName="checked">
                      <Switch checkedChildren="Compression enabled" unCheckedChildren="No compression" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name={['backup', 'autoCleanup']} valuePropName="checked">
                      <Switch checkedChildren="Auto cleanup old backups" unCheckedChildren="Manual cleanup" />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>
            </Space>
          </TabPane>

          {/* Sync Settings */}
          <TabPane 
            tab={<Space><SyncOutlined />Synchronization</Space>} 
            key="sync"
          >
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <Card size="small" title="Auto-Synchronization">
                <Form.Item name={['sync', 'autoSync']} valuePropName="checked">
                  <Switch checkedChildren="Auto-sync enabled" unCheckedChildren="Manual sync only" />
                </Form.Item>

                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Form.Item label="Sync Interval (minutes)" name={['sync', 'syncInterval']}>
                      <InputNumber min={1} max={60} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="Conflict Resolution" name={['sync', 'conflictResolution']}>
                      <Select>
                        <Option value="ask">Always ask</Option>
                        <Option value="prefer-higher-scope">Prefer higher scope</Option>
                        <Option value="prefer-newer">Prefer newer configuration</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Form.Item name={['sync', 'backgroundSync']} valuePropName="checked">
                      <Switch checkedChildren="Background sync" unCheckedChildren="Foreground sync only" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name={['sync', 'syncOnStartup']} valuePropName="checked">
                      <Switch checkedChildren="Sync on startup" unCheckedChildren="No startup sync" />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>
            </Space>
          </TabPane>

          {/* Validation Settings */}
          <TabPane 
            tab={<Space><ExclamationCircleOutlined />Validation</Space>} 
            key="validation"
          >
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <Card size="small" title="Configuration Validation">
                <Form.Item name={['validation', 'realTimeValidation']} valuePropName="checked">
                  <Switch checkedChildren="Real-time validation" unCheckedChildren="Manual validation" />
                </Form.Item>

                <Form.Item label="Validation Level" name={['validation', 'validationLevel']}>
                  <Select>
                    <Option value="basic">Basic - Essential checks only</Option>
                    <Option value="strict">Strict - Recommended settings</Option>
                    <Option value="paranoid">Paranoid - All possible validations</Option>
                  </Select>
                </Form.Item>

                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Form.Item name={['validation', 'strictMode']} valuePropName="checked">
                      <Switch checkedChildren="Strict mode" unCheckedChildren="Permissive mode" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name={['validation', 'showWarnings']} valuePropName="checked">
                      <Switch checkedChildren="Show warnings" unCheckedChildren="Errors only" />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item name={['validation', 'autoFixEnabled']} valuePropName="checked">
                  <Switch checkedChildren="Enable auto-fix suggestions" unCheckedChildren="Manual fixes only" />
                </Form.Item>
              </Card>
            </Space>
          </TabPane>

          {/* Notification Settings */}
          <TabPane 
            tab={<Space><BellOutlined />Notifications</Space>} 
            key="notifications"
          >
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <Card size="small" title="Notification Preferences">
                <Form.Item name={['notifications', 'enabled']} valuePropName="checked">
                  <Switch checkedChildren="Notifications enabled" unCheckedChildren="Notifications disabled" />
                </Form.Item>

                <Row gutter={[16, 16]}>
                  <Col span={8}>
                    <Form.Item name={['notifications', 'showSuccess']} valuePropName="checked">
                      <Switch checkedChildren="Success notifications" unCheckedChildren="No success notifications" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name={['notifications', 'showWarnings']} valuePropName="checked">
                      <Switch checkedChildren="Warning notifications" unCheckedChildren="No warning notifications" />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item name={['notifications', 'showErrors']} valuePropName="checked">
                      <Switch checkedChildren="Error notifications" unCheckedChildren="No error notifications" />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Form.Item label="Auto-close Delay (seconds)" name={['notifications', 'autoCloseDelay']}>
                      <InputNumber min={1} max={30} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="Position" name={['notifications', 'position']}>
                      <Select>
                        <Option value="topRight">Top Right</Option>
                        <Option value="topLeft">Top Left</Option>
                        <Option value="bottomRight">Bottom Right</Option>
                        <Option value="bottomLeft">Bottom Left</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item name={['notifications', 'autoClose']} valuePropName="checked">
                  <Switch checkedChildren="Auto-close notifications" unCheckedChildren="Manual dismissal only" />
                </Form.Item>
              </Card>
            </Space>
          </TabPane>

          {/* Debug Settings */}
          <TabPane 
            tab={<Space><BugOutlined />Debug</Space>} 
            key="debug"
          >
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <Alert
                message="Debug Settings"
                description="These settings are intended for development and troubleshooting. Enable with caution as they may affect performance."
                type="warning"
                showIcon
              />

              <Card size="small" title="Development Options">
                <Form.Item name={['debug', 'enabled']} valuePropName="checked">
                  <Switch checkedChildren="Debug mode enabled" unCheckedChildren="Debug mode disabled" />
                </Form.Item>

                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Form.Item label="Log Level" name={['debug', 'logLevel']}>
                      <Select>
                        <Option value="error">Error</Option>
                        <Option value="warn">Warning</Option>
                        <Option value="info">Info</Option>
                        <Option value="debug">Debug</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name={['debug', 'showPerformanceMetrics']} valuePropName="checked">
                      <Switch checkedChildren="Show performance metrics" unCheckedChildren="Hide performance metrics" />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>
            </Space>
          </TabPane>
        </Tabs>
      </Form>
    </Modal>
  );
};

export default SettingsDialog;