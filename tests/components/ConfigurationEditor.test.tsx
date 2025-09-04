import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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
        onChange={(e) => onChange?.(e.target.value)}
      />
    )
  };
});

// Mock the sub-components
jest.mock('../../src/renderer/components/editor/FormEditor', () => {
  return {
    __esModule: true,
    default: ({ configuration, onChange }: any) => (
      <div data-testid="form-editor">
        Form Editor: {configuration ? 'loaded' : 'empty'}
      </div>
    )
  };
});

jest.mock('../../src/renderer/components/editor/JsonEditor', () => {
  return {
    __esModule: true,
    default: ({ value }: any) => (
      <div data-testid="json-editor">
        JSON Editor: {value ? 'has content' : 'empty'}
      </div>
    )
  };
});

jest.mock('../../src/renderer/components/editor/ConfigurationPreview', () => {
  return {
    __esModule: true,
    default: ({ configuration }: any) => (
      <div data-testid="config-preview">
        Preview: {configuration ? 'loaded' : 'empty'}
      </div>
    )
  };
});

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
    'test-server': {
      name: 'test-server',
      command: 'npx',
      args: ['-y', 'test-server'],
      env: {},
      enabled: true,
      scope: ConfigScope.USER
    }
  },
  conflicts: [],
  sources: {
    'test-server': ConfigScope.USER
  },
  metadata: {
    resolvedAt: new Date(),
    mergedScopes: [ConfigScope.USER],
    serverCount: 1,
    conflictCount: 0
  }
};

const renderConfigurationEditor = (
  client?: MCPClient,
  configuration?: ResolvedConfiguration,
  loading = false
) => {
  const mockOnSave = jest.fn();
  const mockOnCancel = jest.fn();
  const mockOnPreview = jest.fn();

  return {
    ...render(
      <ConfigProvider>
        <ConfigurationEditor
          client={client}
          configuration={configuration}
          loading={loading}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          onPreview={mockOnPreview}
        />
      </ConfigProvider>
    ),
    mockOnSave,
    mockOnCancel,
    mockOnPreview
  };
};

describe('ConfigurationEditor', () => {
  it('renders empty state when no client is selected', () => {
    renderConfigurationEditor();
    
    expect(screen.getByText('Select a client to edit its configuration')).toBeInTheDocument();
  });

  it('renders editor with client name when client is provided', () => {
    renderConfigurationEditor(mockClient);
    
    expect(screen.getByText('Configuration Editor - Test Client')).toBeInTheDocument();
  });

  it('renders editor tabs when configuration is loaded', () => {
    renderConfigurationEditor(mockClient, mockConfiguration);
    
    expect(screen.getByText('Form Editor')).toBeInTheDocument();
    expect(screen.getByText('JSON Editor')).toBeInTheDocument();
    expect(screen.getAllByText('Preview').length).toBeGreaterThan(0);
  });

  it('shows action buttons in header', () => {
    renderConfigurationEditor(mockClient, mockConfiguration);
    
    expect(screen.getByText('Reset')).toBeInTheDocument();
    expect(screen.getAllByText('Preview').length).toBeGreaterThan(0);
    expect(screen.getByText('Save Changes')).toBeInTheDocument();
  });

  it('can switch between tabs', () => {
    renderConfigurationEditor(mockClient, mockConfiguration);
    
    // Default is Form Editor
    expect(screen.getByTestId('form-editor')).toBeInTheDocument();
    
    // Switch to JSON Editor
    fireEvent.click(screen.getByText('JSON Editor'));
    expect(screen.getByTestId('json-editor')).toBeInTheDocument();
    
    // Switch to Preview tab - look for tab role element containing Preview
    const previewTab = screen.getByRole('tab', { name: /preview/i });
    fireEvent.click(previewTab);
    expect(screen.getByTestId('config-preview')).toBeInTheDocument();
  });

  it('handles loading state', () => {
    renderConfigurationEditor(mockClient, mockConfiguration, true);
    
    // Component still renders with loading spinner
    expect(screen.getByText('Configuration Editor - Test Client')).toBeInTheDocument();
  });

  it('disables save button when no changes', () => {
    renderConfigurationEditor(mockClient, mockConfiguration);
    
    const saveButton = screen.getByText('Save Changes').closest('button');
    expect(saveButton).toBeDisabled();
  });

  it('disables reset button when no changes', () => {
    renderConfigurationEditor(mockClient, mockConfiguration);
    
    const resetButton = screen.getByText('Reset').closest('button');
    expect(resetButton).toBeDisabled();
  });
});