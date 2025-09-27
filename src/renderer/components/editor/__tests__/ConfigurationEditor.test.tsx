import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import ConfigurationEditor from '../ConfigurationEditor';
import type { MCPClient, Configuration } from '../../../../shared/types';

// Mock the JsonEditor component
jest.mock('../JsonEditor', () => ({
  __esModule: true,
  default: ({ value, onChange, readonly, client }: any) => (
    <div data-testid="json-editor">
      <textarea
        data-testid="json-editor-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readonly}
        aria-label="JSON editor"
      />
      <div data-testid="client-info">{client?.name}</div>
    </div>
  )
}));

// Mock the FormEditor component
jest.mock('../FormEditor', () => ({
  __esModule: true,
  default: ({ configuration, onChange, readonly }: any) => (
    <div data-testid="form-editor">
      <input
        data-testid="form-editor-input"
        value={configuration?.servers?.test?.command || ''}
        onChange={(e) => onChange({
          ...configuration,
          servers: { test: { command: e.target.value } }
        })}
        readOnly={readonly}
        aria-label="Form editor"
      />
    </div>
  )
}));

// Mock Electron API
const mockElectronAPI = {
  loadConfiguration: jest.fn(),
  saveConfiguration: jest.fn(),
  validateConfiguration: jest.fn(),
  createBackup: jest.fn(),
  exportConfiguration: jest.fn(),
  importConfiguration: jest.fn()
};

(global as any).window = {
  electronAPI: mockElectronAPI
};

describe('ConfigurationEditor Component', () => {
  const mockClient: MCPClient = {
    id: 'test-client',
    name: 'Test Client',
    configPaths: {
      primary: '/test/path/config.json',
      alternatives: []
    },
    detected: {
      installed: true,
      configPath: '/test/path/config.json'
    }
  };

  const mockConfiguration: Configuration = {
    servers: {
      'test-server': {
        command: 'node',
        args: ['server.js'],
        env: { API_KEY: 'test-key' }
      }
    },
    metadata: {
      lastModified: new Date().toISOString(),
      version: '1.0.0',
      scope: 'user'
    }
  };

  const defaultProps = {
    client: mockClient,
    initialConfiguration: mockConfiguration,
    onSave: jest.fn(),
    onCancel: jest.fn(),
    readonly: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockElectronAPI.loadConfiguration.mockResolvedValue(mockConfiguration);
    mockElectronAPI.saveConfiguration.mockResolvedValue({ success: true });
    mockElectronAPI.validateConfiguration.mockResolvedValue({ valid: true, errors: [] });
  });

  describe('Rendering', () => {
    test('renders without crashing', () => {
      render(<ConfigurationEditor {...defaultProps} />);
      expect(screen.getByText('Configuration Editor')).toBeInTheDocument();
    });

    test('renders both tabs', () => {
      render(<ConfigurationEditor {...defaultProps} />);
      expect(screen.getByRole('tab', { name: /form/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /json/i })).toBeInTheDocument();
    });

    test('displays client information', () => {
      render(<ConfigurationEditor {...defaultProps} />);
      expect(screen.getByText('Test Client')).toBeInTheDocument();
    });

    test('shows form editor by default', () => {
      render(<ConfigurationEditor {...defaultProps} />);
      expect(screen.getByTestId('form-editor')).toBeInTheDocument();
      expect(screen.queryByTestId('json-editor')).not.toBeInTheDocument();
    });

    test('renders in readonly mode', () => {
      render(<ConfigurationEditor {...defaultProps} readonly={true} />);

      const saveButton = screen.queryByRole('button', { name: /save/i });
      expect(saveButton).toBeDisabled();
    });
  });

  describe('Tab Switching', () => {
    test('switches to JSON tab', async () => {
      render(<ConfigurationEditor {...defaultProps} />);

      const jsonTab = screen.getByRole('tab', { name: /json/i });
      fireEvent.click(jsonTab);

      await waitFor(() => {
        expect(screen.getByTestId('json-editor')).toBeInTheDocument();
        expect(screen.queryByTestId('form-editor')).not.toBeInTheDocument();
      });
    });

    test('switches back to form tab', async () => {
      render(<ConfigurationEditor {...defaultProps} />);

      // First switch to JSON
      fireEvent.click(screen.getByRole('tab', { name: /json/i }));

      // Then back to Form
      fireEvent.click(screen.getByRole('tab', { name: /form/i }));

      await waitFor(() => {
        expect(screen.getByTestId('form-editor')).toBeInTheDocument();
        expect(screen.queryByTestId('json-editor')).not.toBeInTheDocument();
      });
    });

    test('preserves changes when switching tabs', async () => {
      render(<ConfigurationEditor {...defaultProps} />);

      // Make a change in form editor
      const formInput = screen.getByTestId('form-editor-input');
      fireEvent.change(formInput, { target: { value: 'updated-command' } });

      // Switch to JSON tab
      fireEvent.click(screen.getByRole('tab', { name: /json/i }));

      await waitFor(() => {
        const jsonTextarea = screen.getByTestId('json-editor-textarea');
        expect(jsonTextarea.value).toContain('updated-command');
      });
    });
  });

  describe('Configuration Loading', () => {
    test('loads initial configuration', () => {
      render(<ConfigurationEditor {...defaultProps} />);

      const formInput = screen.getByTestId('form-editor-input');
      expect(formInput).toHaveValue('node');
    });

    test('loads configuration from file', async () => {
      const newConfig: Configuration = {
        servers: {
          'new-server': {
            command: 'python',
            args: ['app.py']
          }
        }
      };

      mockElectronAPI.loadConfiguration.mockResolvedValue(newConfig);

      render(<ConfigurationEditor {...defaultProps} initialConfiguration={undefined} />);

      await waitFor(() => {
        expect(mockElectronAPI.loadConfiguration).toHaveBeenCalledWith(
          mockClient.id,
          'user'
        );
      });
    });

    test('handles load errors gracefully', async () => {
      mockElectronAPI.loadConfiguration.mockRejectedValue(new Error('Load failed'));

      render(<ConfigurationEditor {...defaultProps} initialConfiguration={undefined} />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
      });
    });
  });

  describe('Configuration Saving', () => {
    test('saves configuration on button click', async () => {
      render(<ConfigurationEditor {...defaultProps} />);

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockElectronAPI.saveConfiguration).toHaveBeenCalledWith(
          mockClient.id,
          expect.objectContaining({
            servers: expect.any(Object)
          }),
          'user'
        );
      });
    });

    test('validates before saving', async () => {
      render(<ConfigurationEditor {...defaultProps} />);

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockElectronAPI.validateConfiguration).toHaveBeenCalled();
      });
    });

    test('shows validation errors', async () => {
      mockElectronAPI.validateConfiguration.mockResolvedValue({
        valid: false,
        errors: ['Missing required field: command']
      });

      render(<ConfigurationEditor {...defaultProps} />);

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/Missing required field: command/)).toBeInTheDocument();
      });
    });

    test('creates backup before saving', async () => {
      render(<ConfigurationEditor {...defaultProps} />);

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockElectronAPI.createBackup).toHaveBeenCalledWith(mockClient.id);
      });
    });

    test('calls onSave callback after successful save', async () => {
      render(<ConfigurationEditor {...defaultProps} />);

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(defaultProps.onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            servers: expect.any(Object)
          })
        );
      });
    });

    test('handles save errors', async () => {
      mockElectronAPI.saveConfiguration.mockRejectedValue(new Error('Save failed'));

      render(<ConfigurationEditor {...defaultProps} />);

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to save/i)).toBeInTheDocument();
      });
    });
  });

  describe('Import/Export', () => {
    test('exports configuration', async () => {
      mockElectronAPI.exportConfiguration.mockResolvedValue({ success: true, path: '/export/path' });

      render(<ConfigurationEditor {...defaultProps} />);

      const exportButton = screen.getByRole('button', { name: /export/i });
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(mockElectronAPI.exportConfiguration).toHaveBeenCalledWith(
          expect.objectContaining({
            servers: expect.any(Object)
          })
        );
      });
    });

    test('imports configuration', async () => {
      const importedConfig: Configuration = {
        servers: {
          'imported-server': {
            command: 'ruby',
            args: ['server.rb']
          }
        }
      };

      mockElectronAPI.importConfiguration.mockResolvedValue(importedConfig);

      render(<ConfigurationEditor {...defaultProps} />);

      const importButton = screen.getByRole('button', { name: /import/i });
      fireEvent.click(importButton);

      await waitFor(() => {
        expect(mockElectronAPI.importConfiguration).toHaveBeenCalled();
      });
    });

    test('validates imported configuration', async () => {
      const invalidConfig = { invalid: 'structure' };
      mockElectronAPI.importConfiguration.mockResolvedValue(invalidConfig);
      mockElectronAPI.validateConfiguration.mockResolvedValue({
        valid: false,
        errors: ['Invalid configuration structure']
      });

      render(<ConfigurationEditor {...defaultProps} />);

      const importButton = screen.getByRole('button', { name: /import/i });
      fireEvent.click(importButton);

      await waitFor(() => {
        expect(screen.getByText(/Invalid configuration structure/)).toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Shortcuts', () => {
    test('saves with Ctrl+S', async () => {
      const user = userEvent.setup();
      render(<ConfigurationEditor {...defaultProps} />);

      await user.keyboard('{Control>}s{/Control}');

      await waitFor(() => {
        expect(mockElectronAPI.saveConfiguration).toHaveBeenCalled();
      });
    });

    test('cancels with Escape', async () => {
      const user = userEvent.setup();
      render(<ConfigurationEditor {...defaultProps} />);

      await user.keyboard('{Escape}');

      expect(defaultProps.onCancel).toHaveBeenCalled();
    });

    test('switches tabs with keyboard', async () => {
      const user = userEvent.setup();
      render(<ConfigurationEditor {...defaultProps} />);

      // Tab to the JSON tab
      await user.tab();
      await user.tab();
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByTestId('json-editor')).toBeInTheDocument();
      });
    });
  });

  describe('Dirty State Management', () => {
    test('detects changes', async () => {
      render(<ConfigurationEditor {...defaultProps} />);

      const formInput = screen.getByTestId('form-editor-input');
      fireEvent.change(formInput, { target: { value: 'modified' } });

      // Should show unsaved changes indicator
      expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument();
    });

    test('warns before discarding changes', async () => {
      window.confirm = jest.fn(() => false);

      render(<ConfigurationEditor {...defaultProps} />);

      // Make a change
      const formInput = screen.getByTestId('form-editor-input');
      fireEvent.change(formInput, { target: { value: 'modified' } });

      // Try to cancel
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      expect(window.confirm).toHaveBeenCalledWith(
        expect.stringContaining('unsaved changes')
      );
    });

    test('clears dirty state after save', async () => {
      render(<ConfigurationEditor {...defaultProps} />);

      // Make a change
      const formInput = screen.getByTestId('form-editor-input');
      fireEvent.change(formInput, { target: { value: 'modified' } });

      // Save
      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.queryByText(/unsaved changes/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA labels', () => {
      render(<ConfigurationEditor {...defaultProps} />);

      expect(screen.getByRole('tablist')).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /form/i })).toHaveAttribute('aria-selected');
      expect(screen.getByRole('tab', { name: /json/i })).toHaveAttribute('aria-selected');
    });

    test('keyboard navigation works', async () => {
      const user = userEvent.setup();
      render(<ConfigurationEditor {...defaultProps} />);

      // Tab through interactive elements
      await user.tab(); // Should focus first tab
      expect(screen.getByRole('tab', { name: /form/i })).toHaveFocus();

      await user.keyboard('{ArrowRight}'); // Should move to JSON tab
      expect(screen.getByRole('tab', { name: /json/i })).toHaveFocus();
    });

    test('announces errors to screen readers', async () => {
      mockElectronAPI.validateConfiguration.mockResolvedValue({
        valid: false,
        errors: ['Error message']
      });

      render(<ConfigurationEditor {...defaultProps} />);

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        const errorAlert = screen.getByRole('alert');
        expect(errorAlert).toHaveTextContent('Error message');
      });
    });
  });
});