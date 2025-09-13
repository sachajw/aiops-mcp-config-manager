import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, Space, Tag, message } from 'antd';
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { useConfigStore } from '../../store/simplifiedStore';
import { MCPServer } from '@/main/services/UnifiedConfigService';

interface ServerFormModalProps {
  open: boolean;
  onClose: () => void;
  mode: 'add' | 'edit';
  initialName?: string;
  initialServer?: MCPServer;
}

export const ServerFormModal: React.FC<ServerFormModalProps> = ({
  open,
  onClose,
  mode,
  initialName,
  initialServer
}) => {
  const [form] = Form.useForm();
  const { addServer, updateServer } = useConfigStore();

  useEffect(() => {
    if (open) {
      if (mode === 'edit' && initialServer) {
        form.setFieldsValue({
          name: initialName,
          command: initialServer.command,
          args: initialServer.args || [],
          env: Object.entries(initialServer.env || {}).map(([key, value]) => ({ key, value }))
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, mode, initialName, initialServer, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      const server: MCPServer = {
        command: values.command,
        args: values.args?.filter((arg: string) => arg) || [],
        env: values.env?.reduce((acc: Record<string, string>, item: any) => {
          if (item?.key && item?.value) {
            acc[item.key] = item.value;
          }
          return acc;
        }, {}) || {}
      };

      if (mode === 'add') {
        addServer(values.name, server);
        message.success(`Server "${values.name}" added successfully`);
      } else if (initialName) {
        updateServer(initialName, server);
        message.success(`Server "${initialName}" updated successfully`);
      }

      onClose();
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  return (
    <Modal
      title={mode === 'add' ? 'Add MCP Server' : 'Edit MCP Server'}
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button key="submit" type="primary" onClick={handleSubmit}>
          {mode === 'add' ? 'Add' : 'Update'}
        </Button>
      ]}
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        autoComplete="off"
      >
        {mode === 'add' && (
          <Form.Item
            name="name"
            label="Server Name"
            rules={[
              { required: true, message: 'Please enter a server name' },
              { pattern: /^[a-zA-Z0-9_-]+$/, message: 'Only alphanumeric characters, hyphens, and underscores allowed' }
            ]}
          >
            <Input placeholder="e.g., filesystem, github, database" />
          </Form.Item>
        )}

        <Form.Item
          name="command"
          label="Command"
          rules={[{ required: true, message: 'Please enter a command' }]}
        >
          <Input placeholder="e.g., npx, python, node" />
        </Form.Item>

        <Form.Item label="Arguments">
          <Form.List name="args">
            {(fields, { add, remove }) => (
              <>
                {fields.map((field, index) => (
                  <Space key={field.key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                    <Form.Item
                      {...field}
                      noStyle
                    >
                      <Input placeholder="Argument" style={{ width: 400 }} />
                    </Form.Item>
                    <MinusCircleOutlined onClick={() => remove(field.name)} />
                  </Space>
                ))}
                <Form.Item>
                  <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                    Add Argument
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>
        </Form.Item>

        <Form.Item label="Environment Variables">
          <Form.List name="env">
            {(fields, { add, remove }) => (
              <>
                {fields.map((field, index) => (
                  <Space key={field.key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                    <Form.Item
                      {...field}
                      name={[field.name, 'key']}
                      noStyle
                    >
                      <Input placeholder="Variable name" style={{ width: 180 }} />
                    </Form.Item>
                    <Form.Item
                      {...field}
                      name={[field.name, 'value']}
                      noStyle
                    >
                      <Input placeholder="Value or ${ENV_VAR}" style={{ width: 220 }} />
                    </Form.Item>
                    <MinusCircleOutlined onClick={() => remove(field.name)} />
                  </Space>
                ))}
                <Form.Item>
                  <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                    Add Environment Variable
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>
        </Form.Item>

        <div style={{ marginTop: 16, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            <strong>Tips:</strong>
            <ul style={{ margin: '4px 0', paddingLeft: 20 }}>
              <li>Use <Tag>npx</Tag> with <Tag>-y</Tag> flag for npm packages</li>
              <li>Environment variables can reference system vars with <Tag>${`{VAR_NAME}`}</Tag></li>
              <li>Common servers: filesystem, github, websearch, sqlite</li>
            </ul>
          </Text>
        </div>
      </Form>
    </Modal>
  );
};

const { Text } = Typography;
import { Typography } from 'antd';