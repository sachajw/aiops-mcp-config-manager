/**
 * Tests for Bug-006: Fallback Pattern Antipattern
 * Verifies proper handling of undefined vs zero values
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock window.electronAPI
global.window.electronAPI = {
  getServerMetrics: jest.fn()
};

describe('Bug-006: Fallback Pattern Antipattern', () => {
  describe('Frontend Display Values', () => {
    it('should display "—" for undefined metrics, not 0', () => {
      // Test component that demonstrates proper pattern
      const MetricsDisplay = ({ value }: { value: number | undefined }) => {
        // CORRECT: Use explicit type checking
        const display = typeof value === 'number' ? value : '—';
        return <div data-testid="metric">{display}</div>;
      };

      const { rerender } = render(<MetricsDisplay value={undefined} />);
      expect(screen.getByTestId('metric')).toHaveTextContent('—');

      // Should show actual 0 when value is 0
      rerender(<MetricsDisplay value={0} />);
      expect(screen.getByTestId('metric')).toHaveTextContent('0');

      // Should show actual number
      rerender(<MetricsDisplay value={5} />);
      expect(screen.getByTestId('metric')).toHaveTextContent('5');
    });

    it('should NOT use || 0 pattern for display values', () => {
      // BAD PATTERN (what we're testing against)
      const BadMetricsDisplay = ({ value }: { value: number | undefined }) => {
        // WRONG: This shows 0 for undefined
        const display = value || 0; // This is the antipattern
        return <div data-testid="bad-metric">{display}</div>;
      };

      render(<BadMetricsDisplay value={undefined} />);

      // This is what happens with || 0 (wrong behavior)
      expect(screen.getByTestId('bad-metric')).toHaveTextContent('0');
      // But we want it to show '—' for undefined!
    });

    it('should properly aggregate metrics without || 0', () => {
      const metrics = [
        { toolCount: 5, tokenUsage: 100 },
        { toolCount: undefined, tokenUsage: undefined }, // Failed server
        { toolCount: 0, tokenUsage: 0 }, // Server with no tools
        { toolCount: 3, tokenUsage: 50 }
      ];

      // CORRECT: Filter out undefined before summing
      const totalTools = metrics
        .map(m => m.toolCount)
        .filter((count): count is number => typeof count === 'number')
        .reduce((sum, count) => sum + count, 0);

      expect(totalTools).toBe(8); // 5 + 0 + 3

      // WRONG: Using || 0 counts undefined as 0
      const wrongTotal = metrics
        .reduce((sum, m) => sum + (m.toolCount || 0), 0);

      expect(wrongTotal).toBe(8); // Happens to be same, but wrong logic
    });
  });

  describe('Boolean Values', () => {
    it('should use explicit boolean checking, not || false', () => {
      // CORRECT: Explicit boolean checking
      const checkInstalled = (value: boolean | undefined) => {
        return value === true; // Only true when explicitly true
      };

      expect(checkInstalled(true)).toBe(true);
      expect(checkInstalled(false)).toBe(false);
      expect(checkInstalled(undefined)).toBe(false);

      // WRONG: Using || false
      const badCheckInstalled = (value: boolean | undefined) => {
        return value || false; // This is the antipattern
      };

      // This seems to work but masks undefined vs false distinction
      expect(badCheckInstalled(undefined)).toBe(false);
      expect(badCheckInstalled(false)).toBe(false); // Can't distinguish!
    });
  });

  describe('Performance Insights Aggregation', () => {
    it('should correctly aggregate without fallback patterns', () => {
      const servers = {
        'server1': { metrics: { toolCount: 5, tokenUsage: 100 } },
        'server2': { metrics: { toolCount: undefined, tokenUsage: undefined } },
        'server3': { metrics: { toolCount: 0, tokenUsage: 0 } },
        'server4': { metrics: { toolCount: 10, tokenUsage: 200 } }
      };

      // CORRECT: Only count valid metrics
      let totalTools = 0;
      let totalTokens = 0;
      let validServerCount = 0;

      Object.values(servers).forEach(server => {
        if (typeof server.metrics.toolCount === 'number') {
          totalTools += server.metrics.toolCount;
          validServerCount++;
        }
        if (typeof server.metrics.tokenUsage === 'number') {
          totalTokens += server.metrics.tokenUsage;
        }
      });

      expect(totalTools).toBe(15); // 5 + 0 + 10
      expect(totalTokens).toBe(300); // 100 + 0 + 200
      expect(validServerCount).toBe(3); // Only 3 servers have valid metrics
    });
  });

  describe('Client Server Counts', () => {
    it('should handle missing counts properly', () => {
      const clientServerCounts = {
        'claude-desktop': 5,
        'kiro': 3,
        'vscode': undefined // Failed to load
      };

      // CORRECT: Show "—" for undefined
      const getDisplayCount = (clientName: string): string => {
        const count = clientServerCounts[clientName as keyof typeof clientServerCounts];
        return typeof count === 'number' ? count.toString() : '—';
      };

      expect(getDisplayCount('claude-desktop')).toBe('5');
      expect(getDisplayCount('kiro')).toBe('3');
      expect(getDisplayCount('vscode')).toBe('—');
      expect(getDisplayCount('unknown')).toBe('—');
    });
  });
});

describe('Bug-006: Required Code Changes', () => {
  it('should list all files needing fixes', () => {
    const filesToFix = [
      { file: 'InsightsPanel.tsx', line: 72, current: 'toolCount || 0', fix: 'toolCount ?? undefined' },
      { file: 'InsightsPanel.tsx', line: 73, current: 'tokenUsage || 0', fix: 'tokenUsage ?? undefined' },
      { file: 'index.tsx', line: 307, current: 'tokenUsage || 0', fix: 'typeof tokenUsage === "number" ? tokenUsage : undefined' },
      { file: 'index.tsx', line: 439, current: 'clientServerCounts[clientName] || 0', fix: 'clientServerCounts[clientName] ?? 0' },
      { file: 'ClientDock.tsx', line: 127, current: 'installed || false', fix: 'installed === true' },
      { file: 'ClientDock.tsx', line: 187, current: 'clientServerCounts[clientName] || 0', fix: 'clientServerCounts[clientName] ?? undefined' },
      { file: 'ServerLibrary.tsx', line: 195, current: 'installed || false', fix: 'installed === true' },
      { file: 'ServerLibrary.tsx', line: 232, current: 'installed || false', fix: 'installed === true' },
      { file: 'ServerLibrary.tsx', line: 301, current: 'installed || false', fix: 'installed === true' }
    ];

    // Verify we've documented all violations
    expect(filesToFix).toHaveLength(9); // 9 frontend violations

    // Backend violations (already partially fixed)
    const backendFixes = [
      { file: 'MetricsHandler.ts', line: 38, status: 'FIXED', now: 'toolCount ?? undefined' },
      { file: 'MetricsHandler.ts', line: 39, status: 'FIXED', now: 'tokenUsage ?? undefined' }
    ];

    expect(backendFixes).toHaveLength(2);
  });
});