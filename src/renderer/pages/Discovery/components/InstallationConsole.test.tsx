import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { InstallationConsole } from './InstallationConsole';

describe('InstallationConsole', () => {
  describe('rendering', () => {
    it('should not render when no logs and not installing', () => {
      const { container } = render(
        <InstallationConsole logs={[]} isInstalling={false} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('should render when installing even with no logs', () => {
      render(
        <InstallationConsole logs={[]} isInstalling={true} />
      );
      expect(screen.getByText('Installation Output')).toBeInTheDocument();
      expect(screen.getByText('Starting installation...')).toBeInTheDocument();
    });

    it('should render when logs present but not installing', () => {
      render(
        <InstallationConsole logs={['Test log']} isInstalling={false} />
      );
      expect(screen.getByText('Installation Output')).toBeInTheDocument();
      expect(screen.getByText('Test log')).toBeInTheDocument();
    });

    it('should show loading spinner when installing', () => {
      const { container } = render(
        <InstallationConsole logs={[]} isInstalling={true} />
      );
      const spinner = container.querySelector('.loading-spinner');
      expect(spinner).toBeInTheDocument();
    });

    it('should not show loading spinner when not installing', () => {
      const { container } = render(
        <InstallationConsole logs={['Test log']} isInstalling={false} />
      );
      const spinner = container.querySelector('.loading-spinner');
      expect(spinner).not.toBeInTheDocument();
    });
  });

  describe('log display', () => {
    it('should display all logs with proper formatting', () => {
      const logs = [
        'Installing dependencies...',
        'npm install completed',
        'Server ready'
      ];

      render(
        <InstallationConsole logs={logs} isInstalling={false} />
      );

      logs.forEach(log => {
        expect(screen.getByText(log)).toBeInTheDocument();
      });
    });

    it('should display logs with command prompt indicator', () => {
      const { container } = render(
        <InstallationConsole logs={['Test log']} isInstalling={false} />
      );

      const promptIndicators = container.querySelectorAll('.text-gray-500');
      expect(promptIndicators.length).toBeGreaterThan(0);
      expect(promptIndicators[0].textContent).toBe('>');
    });

    it('should apply correct styling to console', () => {
      const { container } = render(
        <InstallationConsole logs={['Test log']} isInstalling={false} />
      );

      const consoleDiv = container.querySelector('.bg-black.text-green-400');
      expect(consoleDiv).toBeInTheDocument();
      expect(consoleDiv).toHaveClass('font-mono');
      expect(consoleDiv).toHaveClass('text-sm');
    });

    it('should handle multi-line logs with proper wrapping', () => {
      const longLog = 'This is a very long log message that should wrap properly in the console display area';

      const { container } = render(
        <InstallationConsole logs={[longLog]} isInstalling={false} />
      );

      const logEntry = container.querySelector('.whitespace-pre-wrap.break-all');
      expect(logEntry).toBeInTheDocument();
      expect(logEntry).toHaveTextContent(longLog);
    });
  });

  describe('auto-scrolling', () => {
    beforeEach(() => {
      // Mock scrollHeight and scrollTop
      Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
        configurable: true,
        get: jest.fn(() => 500),
      });

      let scrollTopValue = 0;
      Object.defineProperty(HTMLElement.prototype, 'scrollTop', {
        configurable: true,
        get: jest.fn(() => scrollTopValue),
        set: jest.fn((value) => { scrollTopValue = value; }),
      });
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should auto-scroll to bottom when new logs are added', () => {
      const { rerender, container } = render(
        <InstallationConsole logs={['Log 1']} isInstalling={true} />
      );

      const consoleDiv = container.querySelector('.bg-black') as HTMLElement;

      // Trigger re-render with new logs
      rerender(
        <InstallationConsole logs={['Log 1', 'Log 2']} isInstalling={true} />
      );

      // Check that scrollTop was set to scrollHeight
      expect(consoleDiv.scrollTop).toBe(500);
    });

    it('should scroll when logs array changes', () => {
      const { rerender, container } = render(
        <InstallationConsole logs={['Log 1']} isInstalling={true} />
      );

      const consoleDiv = container.querySelector('.bg-black') as HTMLElement;
      const initialScrollTop = consoleDiv.scrollTop;

      // Re-render with more logs
      rerender(
        <InstallationConsole logs={['Log 1', 'Log 2', 'Log 3']} isInstalling={true} />
      );

      // Should have scrolled
      expect(consoleDiv.scrollTop).toBe(500);
    });
  });

  describe('console styling', () => {
    it('should apply terminal-like styling', () => {
      const { container } = render(
        <InstallationConsole logs={['Test']} isInstalling={false} />
      );

      const consoleContainer = container.querySelector('.border.border-base-300.rounded-lg.bg-base-300\\/20');
      expect(consoleContainer).toBeInTheDocument();

      const header = container.querySelector('.border-b.border-base-300');
      expect(header).toBeInTheDocument();

      const consoleOutput = container.querySelector('.bg-black.text-green-400');
      expect(consoleOutput).toBeInTheDocument();
    });

    it('should enforce height constraints', () => {
      const { container } = render(
        <InstallationConsole logs={['Test']} isInstalling={false} />
      );

      const consoleOutput = container.querySelector('.bg-black') as HTMLElement;
      expect(consoleOutput).toBeInTheDocument();
      // Check inline styles
      const style = consoleOutput.getAttribute('style');
      expect(style).toContain('min-height');
      expect(style).toContain('96px');
      expect(style).toContain('max-height');
      expect(style).toContain('120px');
    });

    it('should enable vertical scrolling for overflow', () => {
      const { container } = render(
        <InstallationConsole logs={['Test']} isInstalling={false} />
      );

      const consoleOutput = container.querySelector('.overflow-y-auto');
      expect(consoleOutput).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('should handle empty string logs', () => {
      render(
        <InstallationConsole logs={['', 'Valid log', '']} isInstalling={false} />
      );

      expect(screen.getByText('Valid log')).toBeInTheDocument();
    });

    it('should handle special characters in logs', () => {
      const specialLog = '>>> npm install @modelcontextprotocol/server-filesystem';

      render(
        <InstallationConsole logs={[specialLog]} isInstalling={false} />
      );

      expect(screen.getByText(specialLog)).toBeInTheDocument();
    });

    it('should handle very long log arrays efficiently', () => {
      const manyLogs = Array.from({ length: 100 }, (_, i) => `Log ${i}`);

      const { container } = render(
        <InstallationConsole logs={manyLogs} isInstalling={false} />
      );

      const logEntries = container.querySelectorAll('.whitespace-pre-wrap');
      expect(logEntries.length).toBe(100);
    });
  });
});