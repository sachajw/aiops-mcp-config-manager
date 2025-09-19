import React, { useState, useEffect } from 'react';
import { Modal, Input, Button, Space, Form, Alert, Tooltip } from 'antd';
import { FolderOpenOutlined, SaveOutlined, ReloadOutlined } from '@ant-design/icons';

interface ClientConfigDialogProps {
  open: boolean;
  clientName: string;
  onClose: () => void;
}

interface ClientPaths {
  configPath: string;
  backupPath?: string;
  logsPath?: string;
}

const DEFAULT_PATHS: Record<string, ClientPaths> = {
  'claude-desktop': {
    configPath: '~/Library/Application Support/Claude/claude_desktop_config.json',
    backupPath: '~/Library/Application Support/Claude/backups',
    logsPath: '~/Library/Logs/Claude'
  },
  'claude-code': {
    configPath: '~/.claude/claude_code_config.json',
    backupPath: '~/.claude/backups',
    logsPath: '~/.claude/logs'
  },
  'vscode': {
    configPath: '~/.vscode/mcp.json',
    backupPath: '~/.vscode/mcp-backups'
  },
  'cursor': {
    configPath: '~/Library/Application Support/Cursor/User/settings.json',
    backupPath: '~/Library/Application Support/Cursor/backups'
  },
  'windsurf': {
    configPath: '~/Library/Application Support/Windsurf/User/settings.json',
    backupPath: '~/Library/Application Support/Windsurf/backups'
  },
  'kiro': {
    configPath: '~/.kiro/settings/mcp.json',
    backupPath: '~/.kiro/backups'
  },
  'codex': {
    configPath: '~/.codex/config.toml',
    backupPath: '~/.codex/backups'
  },
  'gemini-cli': {
    configPath: '~/.gemini/settings.json',
    backupPath: '~/.gemini/backups'
  }
};

export const ClientConfigDialog: React.FC<ClientConfigDialogProps> = ({
  open,
  clientName,
  onClose
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [paths, setPaths] = useState<ClientPaths | null>(null);
  const [modified, setModified] = useState(false);

  useEffect(() => {
    if (open && clientName) {
      loadClientPaths();
    }
  }, [open, clientName]);

  const loadClientPaths = async () => {
    setLoading(true);
    try {
      // Try to load saved custom paths from app settings
      const savedSettings = localStorage.getItem('mcp-client-paths');
      if (savedSettings) {
        const customPaths = JSON.parse(savedSettings);
        if (customPaths[clientName]) {
          setPaths(customPaths[clientName]);
          form.setFieldsValue(customPaths[clientName]);
          setLoading(false);
          return;
        }
      }

      // Use default paths
      const defaultPaths = DEFAULT_PATHS[clientName.toLowerCase()] || {
        configPath: `~/.${clientName}/config.json`
      };
      setPaths(defaultPaths);
      form.setFieldsValue(defaultPaths);
    } catch (err) {
      console.error('Failed to load client paths:', err);
      // Fallback to defaults
      const defaultPaths = DEFAULT_PATHS[clientName.toLowerCase()] || {
        configPath: `~/.${clientName}/config.json`
      };
      setPaths(defaultPaths);
      form.setFieldsValue(defaultPaths);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      // Save custom paths to localStorage
      const savedSettings = localStorage.getItem('mcp-client-paths');
      const customPaths = savedSettings ? JSON.parse(savedSettings) : {};
      customPaths[clientName] = values;
      localStorage.setItem('mcp-client-paths', JSON.stringify(customPaths));

      // Update app settings if needed
      if ((window as any).electronAPI?.updateClientPaths) {
        await (window as any).electronAPI.updateClientPaths(clientName, values);
      }

      setModified(false);
      onClose();
    } catch (err) {
      console.error('Failed to save paths:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBrowse = async (field: string) => {
    try {
      const result = await (window as any).electronAPI?.selectDirectory?.();
      if (result && !result.canceled && result.filePaths?.length > 0) {
        const selectedPath = result.filePaths[0];
        form.setFieldValue(field, selectedPath);
        setModified(true);
      }
    } catch (err) {
      console.error('Failed to browse:', err);
    }
  };

  const handleReset = () => {
    const defaultPaths = DEFAULT_PATHS[clientName.toLowerCase()] || {
      configPath: `~/.${clientName}/config.json`
    };
    form.setFieldsValue(defaultPaths);
    setModified(true);
  };

  const handleOpenInFinder = async (path: string) => {
    if ((window as any).electronAPI?.showItemInFolder) {
      // Expand tilde to home directory
      const expandedPath = path.replace(/^~/, process.env.HOME || '/Users/' + process.env.USER);
      await (window as any).electronAPI.showItemInFolder(expandedPath);
    }
  };

  return (
    <Modal
      title={`Configuration Paths - ${clientName}`}
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="reset" onClick={handleReset} disabled={loading}>
          <ReloadOutlined /> Reset to Defaults
        </Button>,
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button
          key="save"
          type="primary"
          loading={loading}
          disabled={!modified}
          onClick={handleSave}
        >
          <SaveOutlined /> Save Changes
        </Button>
      ]}
      width={600}
    >
      <Alert
        message="Configure file paths for this client"
        description="These paths determine where configuration files are stored and backed up."
        type="info"
        showIcon
        className="mb-4"
      />

      <Form
        form={form}
        layout="vertical"
        onValuesChange={() => setModified(true)}
      >
        <Form.Item
          name="configPath"
          label="Configuration File Path"
          rules={[{ required: true, message: 'Configuration path is required' }]}
        >
          <Input
            placeholder="/path/to/config.json"
            addonAfter={
              <Space>
                <Tooltip title="Browse for folder">
                  <Button
                    size="small"
                    type="text"
                    icon={<FolderOpenOutlined />}
                    onClick={() => handleBrowse('configPath')}
                  />
                </Tooltip>
                <Tooltip title="Open in Finder">
                  <Button
                    size="small"
                    type="text"
                    onClick={() => {
                      const path = form.getFieldValue('configPath');
                      if (path) handleOpenInFinder(path);
                    }}
                  >
                    Show
                  </Button>
                </Tooltip>
              </Space>
            }
          />
        </Form.Item>

        <Form.Item
          name="backupPath"
          label="Backup Directory (Optional)"
        >
          <Input
            placeholder="/path/to/backups"
            addonAfter={
              <Space>
                <Tooltip title="Browse for folder">
                  <Button
                    size="small"
                    type="text"
                    icon={<FolderOpenOutlined />}
                    onClick={() => handleBrowse('backupPath')}
                  />
                </Tooltip>
                <Tooltip title="Open in Finder">
                  <Button
                    size="small"
                    type="text"
                    onClick={() => {
                      const path = form.getFieldValue('backupPath');
                      if (path) handleOpenInFinder(path);
                    }}
                  >
                    Show
                  </Button>
                </Tooltip>
              </Space>
            }
          />
        </Form.Item>

        <Form.Item
          name="logsPath"
          label="Logs Directory (Optional)"
        >
          <Input
            placeholder="/path/to/logs"
            addonAfter={
              <Space>
                <Tooltip title="Browse for folder">
                  <Button
                    size="small"
                    type="text"
                    icon={<FolderOpenOutlined />}
                    onClick={() => handleBrowse('logsPath')}
                  />
                </Tooltip>
                <Tooltip title="Open in Finder">
                  <Button
                    size="small"
                    type="text"
                    onClick={() => {
                      const path = form.getFieldValue('logsPath');
                      if (path) handleOpenInFinder(path);
                    }}
                  >
                    Show
                  </Button>
                </Tooltip>
              </Space>
            }
          />
        </Form.Item>
      </Form>

      <div className="mt-4 p-2 bg-gray-50 dark:bg-gray-800 rounded">
        <div className="text-xs text-gray-600 dark:text-gray-400">
          <div className="font-semibold mb-1">Path Variables:</div>
          <div>• ~ = Home directory</div>
          <div>• Use absolute paths for best compatibility</div>
          <div>• Paths are validated when saving</div>
        </div>
      </div>
    </Modal>
  );
};

export default ClientConfigDialog;