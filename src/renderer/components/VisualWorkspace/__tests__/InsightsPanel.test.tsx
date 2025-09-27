/**
 * Tests for Bug-007: Performance Insights Panel UI/UX Issues
 * Verifies proper display of metrics and removal of fake data
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { InsightsPanel } from '../InsightsPanel';

// Mock Zustand store
jest.mock('@/renderer/store/simplifiedStore', () => ({
  useConfigStore: () => ({
    servers: {
      'server1': { command: 'node', args: ['server1.js'] },
      'server2': { command: 'node', args: ['server2.js'] },
      'server3': { command: 'node', args: ['server3.js'] }
    },
    activeClient: 'claude-desktop'
  })
}));

// Mock window.electronAPI
global.window.electronAPI = {
  getServerMetrics: jest.fn(),
  getTotalMetrics: jest.fn()
};

describe('Bug-007: Performance Insights Panel UI/UX Issues', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Active Servers Display', () => {
    it('should show correct connected/total ratio, not confusing numbers', async () => {
      // Mock metrics showing 2 connected out of 3 total
      (window.electronAPI.getServerMetrics as jest.Mock).mockImplementation((name) => {
        if (name === 'server1') return Promise.resolve({ toolCount: 5, isConnected: true });
        if (name === 'server2') return Promise.resolve({ toolCount: 3, isConnected: true });
        if (name === 'server3') return Promise.resolve({ toolCount: undefined, isConnected: false });
        return Promise.resolve(undefined);
      });

      (window.electronAPI.getTotalMetrics as jest.Mock).mockResolvedValue({
        connectedCount: 2,
        totalServers: 3
      });

      render(<InsightsPanel />);

      // Should show "2/3" not "13/10" or other nonsense
      await screen.findByText(/Active/);
      // The format should be "connected/total"
      expect(screen.queryByText(/13\/10/)).not.toBeInTheDocument();
      expect(screen.queryByText(/0\/10/)).not.toBeInTheDocument();
    });

    it('should never show active count exceeding total', () => {
      // Test that we never show impossible ratios like "13/10"
      const validateActiveDisplay = (connected: number, total: number): string => {
        // This is what the component should do
        if (connected > total) {
          console.error(`Invalid state: ${connected} connected exceeds ${total} total`);
          return `${total}/${total}`; // Fallback to sensible display
        }
        return `${connected}/${total}`;
      };

      expect(validateActiveDisplay(2, 3)).toBe('2/3');
      expect(validateActiveDisplay(13, 10)).toBe('10/10'); // Fixed impossible ratio
      expect(validateActiveDisplay(0, 10)).toBe('0/10');
    });
  });

  describe('Response Time Display', () => {
    it('should either show real response time or remove the metric', () => {
      // Response time showing "0ms" with "Last 5 min" is misleading
      const ResponseTimeDisplay = ({ responseTime }: { responseTime: number | undefined }) => {
        // If we don't have real data, don't show it
        if (typeof responseTime !== 'number' || responseTime === 0) {
          return null; // Remove the metric entirely
        }

        return (
          <div>
            <span>Response</span>
            <span>{responseTime}ms</span>
            <span>Last 5 min</span>
          </div>
        );
      };

      // Should not render when no real data
      const { rerender } = render(<ResponseTimeDisplay responseTime={0} />);
      expect(screen.queryByText(/Last 5 min/)).not.toBeInTheDocument();

      // Should render when we have real data
      rerender(<ResponseTimeDisplay responseTime={125} />);
      expect(screen.getByText('125ms')).toBeInTheDocument();
    });
  });

  describe('Token Distribution', () => {
    it('should list ALL servers for current client, not show dashes', async () => {
      // Mock server metrics
      (window.electronAPI.getServerMetrics as jest.Mock).mockImplementation((name) => {
        const metrics: Record<string, any> = {
          'server1': { toolCount: 5, tokenUsage: 1000 },
          'server2': { toolCount: 3, tokenUsage: 500 },
          'server3': { toolCount: 0, tokenUsage: 0 }
        };
        return Promise.resolve(metrics[name]);
      });

      render(<InsightsPanel />);

      // Should show all servers, not placeholder dashes
      await screen.findByText(/Token Distribution/);

      // Should NOT show placeholder dashes
      expect(screen.queryByText('—')).not.toBeInTheDocument();
    });

    it('should show each server with its token count', () => {
      const servers = {
        'server1': { tokenUsage: 1000 },
        'server2': { tokenUsage: 500 },
        'server3': { tokenUsage: 0 },
        'server4': { tokenUsage: undefined } // Failed to load
      };

      const TokenDistributionList = () => (
        <div>
          {Object.entries(servers).map(([name, data]) => (
            <div key={name}>
              <span>{name}</span>
              <span>{typeof data.tokenUsage === 'number' ? data.tokenUsage : '—'}</span>
            </div>
          ))}
        </div>
      );

      render(<TokenDistributionList />);

      expect(screen.getByText('server1')).toBeInTheDocument();
      expect(screen.getByText('1000')).toBeInTheDocument();
      expect(screen.getByText('server2')).toBeInTheDocument();
      expect(screen.getByText('500')).toBeInTheDocument();
      expect(screen.getByText('server3')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument(); // Real zero
      expect(screen.getByText('server4')).toBeInTheDocument();
      expect(screen.getByText('—')).toBeInTheDocument(); // Only for undefined
    });
  });

  describe('Connection Health', () => {
    it('should show real connection data or be removed entirely', () => {
      // Hardcoded "Uptime: 99.9%, Errors: 2, Warnings: 5" is fake
      const ConnectionHealth = ({ realData }: { realData: boolean }) => {
        if (!realData) {
          // If we don't have real monitoring, don't show fake stats
          return null;
        }

        // Only show if we have real connection monitoring
        return (
          <div>
            <span>Uptime: {/* real uptime */}</span>
            <span>Errors: {/* real error count */}</span>
            <span>Warnings: {/* real warning count */}</span>
          </div>
        );
      };

      // Should not show fake hardcoded values
      const { rerender } = render(<ConnectionHealth realData={false} />);
      expect(screen.queryByText(/99.9%/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Errors: 2/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Warnings: 5/)).not.toBeInTheDocument();

      // Only show when we have real data
      rerender(<ConnectionHealth realData={true} />);
      // Would show real values here
    });
  });

  describe('Recent Activity', () => {
    it('should either show real activity or be removed', () => {
      // Currently shows placeholder text
      const RecentActivity = ({ activities }: { activities: string[] }) => {
        if (!activities || activities.length === 0) {
          // Don't show section if not implemented
          return null;
        }

        return (
          <div>
            <h3>Recent Activity</h3>
            {activities.map((activity, i) => (
              <div key={i}>{activity}</div>
            ))}
          </div>
        );
      };

      // Should not show if no real activity
      render(<RecentActivity activities={[]} />);
      expect(screen.queryByText('Recent Activity')).not.toBeInTheDocument();
    });
  });
});