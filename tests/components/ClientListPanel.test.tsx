import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConfigProvider } from 'antd';
import ClientListPanel from '../../src/renderer/components/client/ClientListPanel';
import { MCPClient, ResolvedConfiguration } from '../../src/shared/types';
import { ClientType, ClientStatus, ConfigScope } from '../../src/shared/types/enums';

const renderClientListPanel = (
  clients: MCPClient[] = [],
  loading = false,
  selectedClient?: string,
  configurations: Record<string, ResolvedConfiguration> = {}
) => {
  const mockOnClientSelect = jest.fn();
  const mockOnRefresh = jest.fn();

  return {
    ...render(
      <ConfigProvider>
        <ClientListPanel
          clients={clients}
          loading={loading}
          selectedClient={selectedClient}
          onClientSelect={mockOnClientSelect}
          onRefresh={mockOnRefresh}
          configurations={configurations}
        />
      </ConfigProvider>
    ),
    mockOnClientSelect,
    mockOnRefresh
  };
};

const mockClients: MCPClient[] = [
  {
    id: 'claude-desktop',
    name: 'Claude Desktop',
    type: ClientType.CLAUDE_DESKTOP,
    configPaths: {
      primary: '/Users/test/Library/Application Support/Claude/claude_desktop_config.json',
      alternatives: [],
      scopePaths: {}
    },
    status: ClientStatus.ACTIVE,
    isActive: true,
    version: '1.2.0'
  },
  {
    id: 'claude-code',
    name: 'Claude Code',
    type: ClientType.CLAUDE_CODE,
    configPaths: {
      primary: '/Users/test/.claude/claude_code_config.json',
      alternatives: [],
      scopePaths: {}
    },
    status: ClientStatus.INACTIVE,
    isActive: false,
    version: '0.9.1'
  }
];

const mockConfigurations: Record<string, ResolvedConfiguration> = {
  'claude-desktop': {
    servers: {
      'filesystem': {
        name: 'filesystem',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-filesystem'],
        env: {},
        enabled: true,
        scope: ConfigScope.USER
      },
      'git': {
        name: 'git',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-git'],
        env: {},
        enabled: true,
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
  },
  'claude-code': {
    servers: {
      'memory': {
        name: 'memory',
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-memory'],
        env: {},
        enabled: true,
        scope: ConfigScope.PROJECT
      }
    },
    conflicts: [],
    sources: {
      'memory': ConfigScope.PROJECT
    },
    metadata: {
      resolvedAt: new Date(),
      mergedScopes: [ConfigScope.PROJECT],
      serverCount: 1,
      conflictCount: 0
    }
  }
};

describe('ClientListPanel', () => {
  it('renders loading state', () => {
    renderClientListPanel([], true);
    
    // Should show loading indicator
    const loadingElement = screen.getByText(/loading/i) || screen.getByRole('progressbar');
    expect(loadingElement).toBeInTheDocument();
  });

  it('renders empty state when no clients are available', () => {
    renderClientListPanel([]);
    
    expect(screen.getByText(/no clients found/i)).toBeInTheDocument();
  });

  it('displays list of clients', () => {
    renderClientListPanel(mockClients);
    
    expect(screen.getByText('Claude Desktop')).toBeInTheDocument();
    expect(screen.getByText('Claude Code')).toBeInTheDocument();
  });

  it('shows client status indicators', () => {
    renderClientListPanel(mockClients);
    
    // Should show different status indicators for active/inactive clients
    const activeIndicators = screen.getAllByText(/active/i);
    const inactiveIndicators = screen.getAllByText(/inactive/i);
    
    expect(activeIndicators.length).toBeGreaterThan(0);
    expect(inactiveIndicators.length).toBeGreaterThan(0);
  });

  it('displays client versions', () => {
    renderClientListPanel(mockClients);
    
    expect(screen.getByText('v1.2.0')).toBeInTheDocument();
    expect(screen.getByText('v0.9.1')).toBeInTheDocument();
  });

  it('highlights selected client', () => {
    renderClientListPanel(mockClients, false, 'claude-desktop');
    
    const selectedItem = screen.getByText('Claude Desktop').closest('.ant-list-item');
    expect(selectedItem).toHaveClass('ant-list-item-selected');
  });

  it('calls onClientSelect when client is clicked', async () => {
    const { mockOnClientSelect } = renderClientListPanel(mockClients);
    
    fireEvent.click(screen.getByText('Claude Desktop'));
    
    await waitFor(() => {
      expect(mockOnClientSelect).toHaveBeenCalledWith('claude-desktop');
    });
  });

  it('displays server count for each client', () => {
    renderClientListPanel(mockClients, false, undefined, mockConfigurations);
    
    expect(screen.getByText('2 servers')).toBeInTheDocument();
    expect(screen.getByText('1 server')).toBeInTheDocument();
  });

  it('shows refresh button and calls onRefresh when clicked', async () => {
    const { mockOnRefresh } = renderClientListPanel(mockClients);
    
    const refreshButton = screen.getByLabelText(/refresh/i) || screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);
    
    await waitFor(() => {
      expect(mockOnRefresh).toHaveBeenCalled();
    });
  });

  it('displays client configuration paths', () => {
    renderClientListPanel(mockClients);
    
    expect(screen.getByText(/claude_desktop_config.json/)).toBeInTheDocument();
    expect(screen.getByText(/claude_code_config.json/)).toBeInTheDocument();
  });

  it('shows client type badges', () => {
    renderClientListPanel(mockClients);
    
    // Should show client type indicators
    expect(screen.getByText(/desktop/i)).toBeInTheDocument();
    expect(screen.getByText(/code/i)).toBeInTheDocument();
  });

  it('handles client selection change', async () => {
    const { mockOnClientSelect } = renderClientListPanel(mockClients);
    
    // Click on Claude Code
    fireEvent.click(screen.getByText('Claude Code'));
    
    await waitFor(() => {
      expect(mockOnClientSelect).toHaveBeenCalledWith('claude-code');
    });
  });

  it('displays conflict indicators when configurations have conflicts', () => {
    const configsWithConflicts = {
      ...mockConfigurations,
      'claude-desktop': {
        ...mockConfigurations['claude-desktop'],
        conflicts: [{
          serverName: 'filesystem',
          conflictType: 'duplicate_name' as any,
          description: 'Server name conflicts',
          severity: 'warning' as any,
          affectedScopes: [ConfigScope.USER],
          suggestedResolution: 'Rename server'
        }],
        metadata: {
          ...mockConfigurations['claude-desktop'].metadata,
          conflictCount: 1
        }
      }
    };

    renderClientListPanel(mockClients, false, undefined, configsWithConflicts);
    
    // Should show conflict indicator
    expect(screen.getByText(/1 conflict/i)).toBeInTheDocument();
  });

  it('shows last modified information', () => {
    renderClientListPanel(mockClients, false, undefined, mockConfigurations);
    
    // Should show some form of timestamp or "last modified" info
    const timestampElements = screen.getAllByText(/\d+/); // Numbers indicating time
    expect(timestampElements.length).toBeGreaterThan(0);
  });

  it('handles keyboard navigation', async () => {
    const { mockOnClientSelect } = renderClientListPanel(mockClients);
    
    const firstClient = screen.getByText('Claude Desktop');
    
    // Focus and press Enter
    firstClient.focus();
    fireEvent.keyDown(firstClient, { key: 'Enter' });
    
    await waitFor(() => {
      expect(mockOnClientSelect).toHaveBeenCalledWith('claude-desktop');
    });
  });

  it('displays search functionality', () => {
    renderClientListPanel(mockClients);
    
    const searchInput = screen.getByPlaceholderText(/search clients/i);
    expect(searchInput).toBeInTheDocument();
  });

  it('filters clients based on search query', async () => {
    renderClientListPanel(mockClients);
    
    const searchInput = screen.getByPlaceholderText(/search clients/i);
    fireEvent.change(searchInput, { target: { value: 'Desktop' } });
    
    await waitFor(() => {
      expect(screen.getByText('Claude Desktop')).toBeInTheDocument();
      expect(screen.queryByText('Claude Code')).not.toBeInTheDocument();
    });
  });

  it('shows panel header with client count', () => {
    renderClientListPanel(mockClients);
    
    expect(screen.getByText(/2 clients/i)).toBeInTheDocument();
  });

  it('handles empty client list gracefully', () => {
    renderClientListPanel([]);
    
    expect(screen.getByText(/no clients found/i)).toBeInTheDocument();
    expect(screen.getByText(/0 clients/i)).toBeInTheDocument();
  });
});