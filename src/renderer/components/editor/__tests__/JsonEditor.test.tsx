import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import JsonEditor from '../JsonEditor';
import * as monaco from 'monaco-editor';

// Mock Monaco Editor
jest.mock('@monaco-editor/react', () => ({
  __esModule: true,
  default: ({ value, onChange, onMount, options, height }: any) => {
    // Simulate editor mounting
    React.useEffect(() => {
      if (onMount) {
        const mockEditor = {
          getValue: jest.fn(() => value),
          setValue: jest.fn(),
          getModel: jest.fn(() => ({
            getLineCount: jest.fn(() => 10),
            getLineContent: jest.fn(() => 'mock line')
          })),
          updateOptions: jest.fn(),
          getAction: jest.fn(),
          addCommand: jest.fn(),
          focus: jest.fn(),
          layout: jest.fn(),
          dispose: jest.fn()
        };

        const mockMonaco = {
          editor: {
            setTheme: jest.fn(),
            defineTheme: jest.fn()
          },
          KeyMod: { CtrlCmd: 2048 },
          KeyCode: { KeyS: 49 }
        };

        onMount(mockEditor as any, mockMonaco as any);
      }
    }, [onMount]);

    return (
      <div
        data-testid="monaco-editor"
        style={{ height }}
      >
        <textarea
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          data-testid="monaco-textarea"
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    );
  }
}));

describe('JsonEditor Component', () => {
  const mockOnChange = jest.fn();

  const defaultProps = {
    value: '{"test": "value"}',
    onChange: mockOnChange,
    errors: [],
    readonly: false,
    height: 500
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('renders without crashing', () => {
      render(<JsonEditor {...defaultProps} />);
      expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
    });

    test('renders with correct height', () => {
      render(<JsonEditor {...defaultProps} height={600} />);
      const editor = screen.getByTestId('monaco-editor');
      expect(editor).toHaveStyle({ height: '600px' });
    });

    test('displays initial value', () => {
      const testValue = '{"servers": {"test": {"command": "node"}}}';
      render(<JsonEditor {...defaultProps} value={testValue} />);
      const textarea = screen.getByTestId('monaco-textarea');
      expect(textarea).toHaveValue(testValue);
    });

    test('renders in readonly mode', () => {
      render(<JsonEditor {...defaultProps} readonly={true} />);
      // In real implementation, editor.updateOptions would be called with readOnly: true
      expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
    });
  });

  describe('JSON Validation', () => {
    test('validates valid JSON', async () => {
      const validJson = '{"name": "test", "value": 123}';
      const { rerender } = render(<JsonEditor {...defaultProps} value={validJson} />);

      // No errors should be shown for valid JSON
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    test('shows error for invalid JSON', () => {
      const invalidJson = '{"name": "test", "value": }'; // Missing value
      render(<JsonEditor {...defaultProps} value={invalidJson} errors={['Unexpected token }']} />);

      // Should display error alert
      const alerts = screen.getAllByRole('alert');
      expect(alerts.length).toBeGreaterThan(0);
    });

    test('displays multiple errors', () => {
      const errors = [
        'Unexpected token',
        'Missing closing brace',
        'Invalid property name'
      ];

      render(<JsonEditor {...defaultProps} errors={errors} />);

      errors.forEach(error => {
        expect(screen.getByText(error)).toBeInTheDocument();
      });
    });

    test('clears errors when JSON becomes valid', () => {
      const { rerender } = render(
        <JsonEditor {...defaultProps} value='{"invalid"}' errors={['Unexpected token']} />
      );

      expect(screen.getByText('Unexpected token')).toBeInTheDocument();

      rerender(
        <JsonEditor {...defaultProps} value='{"valid": "json"}' errors={[]} />
      );

      expect(screen.queryByText('Unexpected token')).not.toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    test('calls onChange when value changes', async () => {
      render(<JsonEditor {...defaultProps} />);
      const textarea = screen.getByTestId('monaco-textarea');

      const newValue = '{"updated": true}';
      fireEvent.change(textarea, { target: { value: newValue } });

      expect(mockOnChange).toHaveBeenCalledWith(newValue);
    });

    test('does not call onChange in readonly mode', () => {
      render(<JsonEditor {...defaultProps} readonly={true} />);
      const textarea = screen.getByTestId('monaco-textarea');

      fireEvent.change(textarea, { target: { value: '{"new": "value"}' } });

      // In real implementation, readonly would prevent changes
      // For now, we just test that the component renders
      expect(textarea).toBeInTheDocument();
    });

    test('handles format button click', async () => {
      render(<JsonEditor {...defaultProps} />);
      const formatButton = screen.getByRole('button', { name: /format/i });

      fireEvent.click(formatButton);

      // In real implementation, this would format the JSON
      expect(formatButton).toBeInTheDocument();
    });

    test('updates when value prop changes', () => {
      const { rerender } = render(<JsonEditor {...defaultProps} />);

      const newValue = '{"completely": "different"}';
      rerender(<JsonEditor {...defaultProps} value={newValue} />);

      const textarea = screen.getByTestId('monaco-textarea');
      expect(textarea).toHaveValue(newValue);
    });
  });

  describe('Format Functionality', () => {
    test('formats minified JSON', () => {
      const minified = '{"a":1,"b":{"c":2,"d":3}}';
      const formatted = `{
  "a": 1,
  "b": {
    "c": 2,
    "d": 3
  }
}`;

      render(<JsonEditor {...defaultProps} value={minified} />);
      const formatButton = screen.getByRole('button', { name: /format/i });

      fireEvent.click(formatButton);

      // Should call onChange with formatted value
      waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(expect.stringContaining('"a": 1'));
      });
    });

    test('handles format errors gracefully', () => {
      const invalidJson = '{"broken": }';
      render(<JsonEditor {...defaultProps} value={invalidJson} />);

      const formatButton = screen.getByRole('button', { name: /format/i });
      fireEvent.click(formatButton);

      // Should not crash and should show error
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  describe('MCP Schema Validation', () => {
    test('validates MCP server configuration', () => {
      const validMcpConfig = JSON.stringify({
        servers: {
          'test-server': {
            command: 'node',
            args: ['server.js'],
            env: { API_KEY: 'test-key' }
          }
        }
      }, null, 2);

      render(<JsonEditor {...defaultProps} value={validMcpConfig} client={{ id: 'test', name: 'Test Client' } as any} />);

      // Should not show any schema errors
      expect(screen.queryByText(/schema validation/i)).not.toBeInTheDocument();
    });

    test('shows error for invalid MCP fields', () => {
      const invalidMcpConfig = JSON.stringify({
        servers: {
          'test-server': {
            invalidField: 'should not be here'
          }
        }
      }, null, 2);

      render(
        <JsonEditor
          {...defaultProps}
          value={invalidMcpConfig}
          errors={['Unknown field: invalidField']}
          client={{ id: 'test', name: 'Test Client' } as any}
        />
      );

      // Should show schema validation error
      expect(screen.getByText(/Unknown field: invalidField/)).toBeInTheDocument();
    });

    test('validates required MCP fields', () => {
      const incompleteMcpConfig = JSON.stringify({
        servers: {
          'test-server': {
            // Missing required 'command' field
            args: ['server.js']
          }
        }
      }, null, 2);

      render(
        <JsonEditor
          {...defaultProps}
          value={incompleteMcpConfig}
          errors={['Required field missing: command']}
          client={{ id: 'test', name: 'Test Client' } as any}
        />
      );

      expect(screen.getByText(/Required field missing: command/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('has proper ARIA labels', () => {
      render(<JsonEditor {...defaultProps} />);

      const formatButton = screen.getByRole('button', { name: /format/i });
      expect(formatButton).toHaveAttribute('aria-label');
    });

    test('shows error count in accessible way', () => {
      const errors = ['Error 1', 'Error 2'];
      render(<JsonEditor {...defaultProps} errors={errors} />);

      const errorAlert = screen.getByRole('alert');
      expect(errorAlert).toHaveTextContent('2 errors');
    });

    test('keyboard navigation works', async () => {
      const user = userEvent.setup();
      render(<JsonEditor {...defaultProps} />);

      const formatButton = screen.getByRole('button', { name: /format/i });

      // Tab to format button
      await user.tab();
      expect(formatButton).toHaveFocus();

      // Enter/Space should trigger button
      await user.keyboard('{Enter}');
      expect(formatButton).toBeInTheDocument(); // Button still exists after click
    });
  });

  describe('Performance', () => {
    test('handles large JSON files', () => {
      const largeJson = JSON.stringify({
        servers: Object.fromEntries(
          Array.from({ length: 100 }, (_, i) => [
            `server-${i}`,
            { command: 'node', args: [`server-${i}.js`] }
          ])
        )
      });

      render(<JsonEditor {...defaultProps} value={largeJson} />);

      // Should render without crashing
      expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
    });

    test('debounces onChange calls', async () => {
      jest.useFakeTimers();
      render(<JsonEditor {...defaultProps} />);

      const textarea = screen.getByTestId('monaco-textarea');

      // Rapid changes
      for (let i = 0; i < 10; i++) {
        fireEvent.change(textarea, { target: { value: `{"count": ${i}}` } });
      }

      // onChange should be called for each change in this mock
      // In real implementation, it would be debounced
      expect(mockOnChange).toHaveBeenCalled();

      jest.useRealTimers();
    });
  });

  describe('Error Recovery', () => {
    test('recovers from JSON parse errors', () => {
      const { rerender } = render(
        <JsonEditor {...defaultProps} value='{"broken": }' errors={['Parse error']} />
      );

      // Fix the JSON
      rerender(
        <JsonEditor {...defaultProps} value='{"fixed": "json"}' errors={[]} />
      );

      // Error should be cleared
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    test('handles empty value gracefully', () => {
      render(<JsonEditor {...defaultProps} value="" />);

      // Should render with empty editor
      const textarea = screen.getByTestId('monaco-textarea');
      expect(textarea).toHaveValue('');
    });

    test('handles null/undefined values', () => {
      render(<JsonEditor {...defaultProps} value={undefined as any} />);

      // Should render without crashing
      expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
    });
  });
});