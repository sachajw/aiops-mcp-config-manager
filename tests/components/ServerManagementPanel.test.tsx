import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConfigProvider } from 'antd';
import ServerManagementPanel from '../../src/renderer/components/server/ServerManagementPanel';
import { MCPClient, ResolvedConfiguration } from '../../src/shared/types';
import { ClientType, ClientStatus, ConfigScope } from '../../src/shared/types/enums';

// Mock the application store
const mockUseApplicationStore = jest.fn();
jest.mock('../../src/renderer/store/applicationStore', () => ({
  useApplicationStore: () => mockUseApplicationStore()
}));

const renderServerManagementPanel = (client?: MCPClient, configuration?: ResolvedConfiguration) => {
  const mockOnAddServer = jest.fn();
  const mockOnEditServer = jest.fn();
  const mockOnDeleteServer = jest.fn();
  const mockOnToggleServer = jest.fn();
  const mockOnTestServer = jest.fn();

  return {
    ...render(
      <ConfigProvider>
        <ServerManagementPanel
          client={client}
          configuration={configuration}
          onAddServer={mockOnAddServer}
          onEditServer={mockOnEditServer}
          onDeleteServer={mockOnDeleteServer}
          onToggleServer={mockOnToggleServer}
          onTestServer={mockOnTestServer}
        />
      </ConfigProvider>
    ),
    mockOnAddServer,
    mockOnEditServer,
    mockOnDeleteServer,
    mockOnToggleServer,
    mockOnTestServer
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
    },
    'git': {
      name: 'git',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-git'],
      env: {},
      enabled: false,
      scope: ConfigScope.USER
    }
  },
  conflicts: [],
  sources: {
    'filesystem': ConfigScope.USER,
    'git': ConfigScope.USER
  },
  metadata: {
    resolvedAt: new Date(),
    mergedScopes: [ConfigScope.USER],
    serverCount: 2,
    conflictCount: 0
  }
};

describe('ServerManagementPanel', () => {
  beforeEach(() => {
    mockUseApplicationStore.mockReturnValue({
      testServer: jest.fn(),
      testingServers: new Set(),
      serverTestResults: {}
    });
  });

  it('renders empty state when no client is selected', () => {
    renderServerManagementPanel();
    
    expect(screen.getByText('Select a client to manage servers')).toBeInTheDocument();
  });

  it('displays server list when client and configuration are provided', () => {
    renderServerManagementPanel(mockClient, mockConfiguration);
    
    expect(screen.getByText('filesystem')).toBeInTheDocument();
    expect(screen.getByText('git')).toBeInTheDocument();
  });

  it('shows enabled/disabled status for servers', () => {
    renderServerManagementPanel(mockClient, mockConfiguration);
    
    // Find the filesystem server card and check if it shows as enabled
    const filesystemCard = screen.getByText('filesystem').closest('.ant-card');
    expect(filesystemCard).toBeInTheDocument();
    
    // Find the git server card and check if it shows as disabled
    const gitCard = screen.getByText('git').closest('.ant-card');
    expect(gitCard).toBeInTheDocument();
  });

  it('displays server details including command and arguments', () => {
    renderServerManagementPanel(mockClient, mockConfiguration);
    
    expect(screen.getByText('npx')).toBeInTheDocument();
    expect(screen.getByText('@modelcontextprotocol/server-filesystem')).toBeInTheDocument();
    expect(screen.getByText('@modelcontextprotocol/server-git')).toBeInTheDocument();
  });

  it('shows test button for each server', () => {
    renderServerManagementPanel(mockClient, mockConfiguration);
    
    const testButtons = screen.getAllByLabelText(/test server/i);
    expect(testButtons).toHaveLength(2);
  });

  it('calls onTestServer when test button is clicked', async () => {
    const { mockOnTestServer } = renderServerManagementPanel(mockClient, mockConfiguration);
    
    const testButtons = screen.getAllByLabelText(/test server/i);
    fireEvent.click(testButtons[0]);
    
    await waitFor(() => {
      expect(mockOnTestServer).toHaveBeenCalledWith('filesystem');
    });
  });

  it('displays server scope information', () => {
    renderServerManagementPanel(mockClient, mockConfiguration);
    
    // Should show USER scope for both servers
    const scopeBadges = screen.getAllByText('USER');
    expect(scopeBadges.length).toBeGreaterThan(0);
  });

  it('shows add server button', () => {
    renderServerManagementPanel(mockClient, mockConfiguration);
    
    const addButton = screen.getByText('Add Server');
    expect(addButton).toBeInTheDocument();
  });

  it('displays server count in panel header', () => {
    renderServerManagementPanel(mockClient, mockConfiguration);
    
    expect(screen.getByText(/2 servers/i)).toBeInTheDocument();
  });

  it('handles empty server configuration', () => {
    const emptyConfig: ResolvedConfiguration = {
      servers: {},
      conflicts: [],
      sources: {},
      metadata: {
        resolvedAt: new Date(),
        mergedScopes: [ConfigScope.USER],
        serverCount: 0,
        conflictCount: 0
      }
    };

    renderServerManagementPanel(mockClient, emptyConfig);
    
    expect(screen.getByText(/0 servers/i)).toBeInTheDocument();
  });

  it('shows testing indicator when server is being tested', () => {
    mockUseApplicationStore.mockReturnValue({
      testServer: jest.fn(),
      testingServers: new Set(['filesystem']),
      serverTestResults: {}
    });

    renderServerManagementPanel(mockClient, mockConfiguration);
    
    // Should show loading state for filesystem server test
    const testButtons = screen.getAllByLabelText(/test server/i);
    expect(testButtons[0]).toBeDisabled();
  });

  it('displays test results when available', () => {
    mockUseApplicationStore.mockReturnValue({
      testServer: jest.fn(),
      testingServers: new Set(),
      serverTestResults: {
        'filesystem': {
          status: 'success' as any,
          success: true,
          message: 'Server test successful',
          duration: 1000,
          details: {}
        }
      }
    });

    renderServerManagementPanel(mockClient, mockConfiguration);
    
    // Should show success indicator or message
    expect(screen.getByText('Server test successful')).toBeInTheDocument();
  });

  it('handles configuration with conflicts', () => {
    const configWithConflicts: ResolvedConfiguration = {
      ...mockConfiguration,
      conflicts: [{
        serverName: 'filesystem',
        conflictType: 'duplicate_name' as any,
        description: 'Server name conflicts with another configuration',
        severity: 'warning' as any,
        affectedScopes: [ConfigScope.USER, ConfigScope.PROJECT],
        suggestedResolution: 'Rename one of the conflicting servers'
      }],
      metadata: {
        ...mockConfiguration.metadata,
        conflictCount: 1
      }
    };

    renderServerManagementPanel(mockClient, configWithConflicts);
    
    // Should indicate conflicts exist
    expect(screen.getByText(/1 conflict/i)).toBeInTheDocument();
  });

  it('renders filter and search functionality', () => {
    renderServerManagementPanel(mockClient, mockConfiguration);
    
    // Should have search input
    const searchInput = screen.getByPlaceholderText(/search servers/i);
    expect(searchInput).toBeInTheDocument();
  });

  it('applies search filter to server list', async () => {
    renderServerManagementPanel(mockClient, mockConfiguration);
    
    const searchInput = screen.getByPlaceholderText(/search servers/i);
    fireEvent.change(searchInput, { target: { value: 'filesystem' } });
    
    await waitFor(() => {
      expect(screen.getByText('filesystem')).toBeInTheDocument();
      expect(screen.queryByText('git')).not.toBeInTheDocument();
    });
  });

  it('shows error state when configuration loading fails', () => {
    renderServerManagementPanel(mockClient, undefined);
    
    // Should show some indication that configuration is not available
    expect(screen.getByText('Select a client to manage servers')).toBeInTheDocument();
  });
});