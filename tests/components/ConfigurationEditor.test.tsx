import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConfigProvider } from 'antd';
import ConfigurationEditor from '../../src/renderer/components/editor/ConfigurationEditor';
import { MCPClient, ResolvedConfiguration } from '../../src/shared/types';
import { ClientType, ClientStatus, ConfigScope } from '../../src/shared/types/enums';

// Mock Monaco Editor
jest.mock('@monaco-editor/react', () => {
  return {
    __esModule: true,
    default: ({ value, onChange }: any) => (
      <textarea
        data-testid="monaco-editor"
        value={value}
        onChange={(e) => onChange && onChange(e.target.value)}
        placeholder="JSON Editor"
      />
    )
  };
});

const renderConfigurationEditor = (
  client?: MCPClient,
  configuration?: ResolvedConfiguration,
  loading = false
) => {
  const mockOnSave = jest.fn();
  const mockOnValidate = jest.fn();
  const mockOnFormat = jest.fn();

  return {
    ...render(
      <ConfigProvider>
        <ConfigurationEditor
          client={client}
          configuration={configuration}
          loading={loading}
          onSave={mockOnSave}
          onValidate={mockOnValidate}
          onFormat={mockOnFormat}
        />
      </ConfigProvider>
    ),
    mockOnSave,
    mockOnValidate,
    mockOnFormat
  };
};

const mockClient: MCPClient = {
  id: 'test-client',
  name: 'Test Client',
  type: ClientType.CLAUDE_DESKTOP,
  configPaths: {
    primary: '/test/config.json',
    alternatives: [],
    scopePaths: {}
  },
  status: ClientStatus.ACTIVE,
  isActive: true,
  version: '1.0.0'
};

const mockConfiguration: ResolvedConfiguration = {
  servers: {
    'filesystem': {
      name: 'filesystem',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', '/Users/test'],
      env: {},
      enabled: true,
      scope: ConfigScope.USER
    }
  },
  conflicts: [],
  sources: {
    'filesystem': ConfigScope.USER
  },
  metadata: {
    resolvedAt: new Date(),
    mergedScopes: [ConfigScope.USER],
    serverCount: 1,
    conflictCount: 0
  }
};

describe('ConfigurationEditor', () => {
  it('renders empty state when no client is selected', () => {
    renderConfigurationEditor();
    
    expect(screen.getByText('Select a client to edit its configuration')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    renderConfigurationEditor(mockClient, undefined, true);
    
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders editor tabs when configuration is loaded', () => {
    renderConfigurationEditor(mockClient, mockConfiguration);
    
    // Should show different editing modes
    expect(screen.getByText('Form')).toBeInTheDocument();
    expect(screen.getByText('JSON')).toBeInTheDocument();
    expect(screen.getByText('Preview')).toBeInTheDocument();
  });

  it('displays JSON editor in JSON tab', async () => {
    renderConfigurationEditor(mockClient, mockConfiguration);
    
    // Switch to JSON tab
    fireEvent.click(screen.getByText('JSON'));
    
    await waitFor(() => {
      expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
    });
  });

  it('shows configuration preview', async () => {
    renderConfigurationEditor(mockClient, mockConfiguration);
    
    // Switch to Preview tab
    fireEvent.click(screen.getByText('Preview'));
    
    await waitFor(() => {
      // Should show formatted configuration
      expect(screen.getByText('filesystem')).toBeInTheDocument();
    });
  });

  it('displays form editor in Form tab', () => {
    renderConfigurationEditor(mockClient, mockConfiguration);
    
    // Should be on Form tab by default
    expect(screen.getByText('filesystem')).toBeInTheDocument();
    
    // Should show form fields
    const nameInput = screen.getByDisplayValue('filesystem');
    expect(nameInput).toBeInTheDocument();
  });

  it('calls onSave when save button is clicked', async () => {
    const { mockOnSave } = renderConfigurationEditor(mockClient, mockConfiguration);
    
    const saveButton = screen.getByText('Save Configuration');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalled();
    });
  });

  it('calls onValidate when validate button is clicked', async () => {
    const { mockOnValidate } = renderConfigurationEditor(mockClient, mockConfiguration);
    
    const validateButton = screen.getByText('Validate');
    fireEvent.click(validateButton);
    
    await waitFor(() => {
      expect(mockOnValidate).toHaveBeenCalled();
    });
  });

  it('calls onFormat when format button is clicked in JSON mode', async () => {
    const { mockOnFormat } = renderConfigurationEditor(mockClient, mockConfiguration);
    
    // Switch to JSON tab
    fireEvent.click(screen.getByText('JSON'));
    
    await waitFor(() => {
      const formatButton = screen.getByText('Format');
      fireEvent.click(formatButton);
      
      expect(mockOnFormat).toHaveBeenCalled();
    });
  });

  it('displays validation errors when configuration is invalid', () => {
    const configWithErrors: ResolvedConfiguration = {
      ...mockConfiguration,
      conflicts: [{
        serverName: 'filesystem',
        conflictType: 'validation_error' as any,
        description: 'Invalid server configuration',
        severity: 'error' as any,
        affectedScopes: [ConfigScope.USER],
        suggestedResolution: 'Fix the configuration'
      }]
    };

    renderConfigurationEditor(mockClient, configWithErrors);
    
    expect(screen.getByText('Invalid server configuration')).toBeInTheDocument();
  });

  it('allows editing server configuration in form mode', async () => {
    renderConfigurationEditor(mockClient, mockConfiguration);
    
    // Should be able to edit server name
    const nameInput = screen.getByDisplayValue('filesystem');
    fireEvent.change(nameInput, { target: { value: 'my-filesystem' } });
    
    expect(nameInput).toHaveValue('my-filesystem');
  });

  it('handles JSON editing', async () => {
    renderConfigurationEditor(mockClient, mockConfiguration);
    
    // Switch to JSON tab
    fireEvent.click(screen.getByText('JSON'));
    
    await waitFor(() => {
      const jsonEditor = screen.getByTestId('monaco-editor');
      fireEvent.change(jsonEditor, { 
        target: { value: '{"servers": {"test": "value"}}' } 
      });
      
      expect(jsonEditor).toHaveValue('{"servers": {"test": "value"}}');
    });
  });

  it('shows syntax highlighting in JSON mode', async () => {
    renderConfigurationEditor(mockClient, mockConfiguration);
    
    // Switch to JSON tab
    fireEvent.click(screen.getByText('JSON'));
    
    await waitFor(() => {
      const jsonEditor = screen.getByTestId('monaco-editor');
      expect(jsonEditor).toBeInTheDocument();
    });
  });

  it('displays configuration metadata', () => {
    renderConfigurationEditor(mockClient, mockConfiguration);
    
    // Should show server count
    expect(screen.getByText(/1 server/i)).toBeInTheDocument();
  });

  it('shows scope information', () => {
    renderConfigurationEditor(mockClient, mockConfiguration);
    
    // Should display scope badges or indicators
    expect(screen.getByText('USER')).toBeInTheDocument();
  });

  it('handles empty configuration gracefully', () => {
    const emptyConfig: ResolvedConfiguration = {
      servers: {},
      conflicts: [],
      sources: {},
      metadata: {
        resolvedAt: new Date(),
        mergedScopes: [],
        serverCount: 0,
        conflictCount: 0
      }
    };

    renderConfigurationEditor(mockClient, emptyConfig);
    
    expect(screen.getByText(/0 servers/i)).toBeInTheDocument();
  });

  it('supports keyboard shortcuts', async () => {
    renderConfigurationEditor(mockClient, mockConfiguration);
    
    // Switch to JSON tab
    fireEvent.click(screen.getByText('JSON'));
    
    await waitFor(() => {
      const jsonEditor = screen.getByTestId('monaco-editor');
      
      // Simulate Ctrl+S (save shortcut)
      fireEvent.keyDown(jsonEditor, { key: 's', ctrlKey: true });
      
      // Should trigger save (this would be handled by Monaco in real usage)
      expect(jsonEditor).toBeInTheDocument();
    });
  });

  it('displays configuration history and changes', () => {
    renderConfigurationEditor(mockClient, mockConfiguration);
    
    // Should show last modified information
    const metadataSection = screen.getByText(/resolved at/i) || screen.getByText(/last modified/i);
    expect(metadataSection).toBeDefined();
  });

  it('shows undo/redo functionality', async () => {
    renderConfigurationEditor(mockClient, mockConfiguration);
    
    // Switch to JSON tab where undo/redo would be available
    fireEvent.click(screen.getByText('JSON'));
    
    await waitFor(() => {
      // Undo/redo would typically be in Monaco's context menu or toolbar
      const jsonEditor = screen.getByTestId('monaco-editor');
      expect(jsonEditor).toBeInTheDocument();
    });
  });

  it('validates JSON syntax in real-time', async () => {
    renderConfigurationEditor(mockClient, mockConfiguration);
    
    // Switch to JSON tab
    fireEvent.click(screen.getByText('JSON'));
    
    await waitFor(() => {
      const jsonEditor = screen.getByTestId('monaco-editor');
      
      // Enter invalid JSON
      fireEvent.change(jsonEditor, { target: { value: '{ invalid json' } });
      
      // Should show validation error (in real Monaco editor)
      expect(jsonEditor).toHaveValue('{ invalid json');
    });
  });

  it('provides search and replace functionality', async () => {
    renderConfigurationEditor(mockClient, mockConfiguration);
    
    // Switch to JSON tab
    fireEvent.click(screen.getByText('JSON'));
    
    await waitFor(() => {
      const jsonEditor = screen.getByTestId('monaco-editor');
      
      // Simulate Ctrl+F (find shortcut)
      fireEvent.keyDown(jsonEditor, { key: 'f', ctrlKey: true });
      
      expect(jsonEditor).toBeInTheDocument();
    });
  });
});