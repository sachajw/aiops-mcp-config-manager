/**
 * PerformanceMonitor - Track and analyze application performance
 * Provides insights into API calls, rendering, and resource usage
 */

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  type: 'api' | 'render' | 'compute' | 'io';
  metadata?: Record<string, any>;
}

interface PerformanceStats {
  totalCalls: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  p50: number;
  p90: number;
  p99: number;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetric[] = [];
  private readonly MAX_METRICS = 1000;
  private enabled = true;

  private constructor() {
    // Set up periodic cleanup
    setInterval(() => this.cleanup(), 5 * 60 * 1000); // Every 5 minutes
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Start measuring a performance metric
   */
  start(name: string, type: PerformanceMetric['type'] = 'api', metadata?: Record<string, any>): string {
    if (!this.enabled) return '';

    const metric: PerformanceMetric = {
      name,
      type,
      startTime: performance.now(),
      metadata
    };

    this.metrics.push(metric);

    // Enforce size limit
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics.shift(); // Remove oldest
    }

    return `${name}-${metric.startTime}`;
  }

  /**
   * End measuring a performance metric
   */
  end(id: string): number {
    if (!this.enabled) return 0;

    const [name, startTimeStr] = id.split('-');
    const startTime = parseFloat(startTimeStr);

    const metric = this.metrics.find(m =>
      m.name === name && m.startTime === startTime && !m.endTime
    );

    if (metric) {
      metric.endTime = performance.now();
      metric.duration = metric.endTime - metric.startTime;

      // Log slow operations
      if (metric.duration > 1000) {
        console.warn(`Slow operation detected: ${metric.name} took ${metric.duration.toFixed(2)}ms`);
      }

      return metric.duration;
    }

    return 0;
  }

  /**
   * Measure async function execution time
   */
  async measure<T>(
    name: string,
    fn: () => Promise<T>,
    type: PerformanceMetric['type'] = 'api'
  ): Promise<T> {
    const id = this.start(name, type);
    try {
      const result = await fn();
      return result;
    } finally {
      this.end(id);
    }
  }

  /**
   * Measure sync function execution time
   */
  measureSync<T>(
    name: string,
    fn: () => T,
    type: PerformanceMetric['type'] = 'compute'
  ): T {
    const id = this.start(name, type);
    try {
      return fn();
    } finally {
      this.end(id);
    }
  }

  /**
   * Get statistics for a specific metric
   */
  getStats(name?: string, type?: PerformanceMetric['type']): PerformanceStats | null {
    let filtered = this.metrics.filter(m => m.duration !== undefined);

    if (name) {
      filtered = filtered.filter(m => m.name === name);
    }

    if (type) {
      filtered = filtered.filter(m => m.type === type);
    }

    if (filtered.length === 0) return null;

    const durations = filtered
      .map(m => m.duration!)
      .sort((a, b) => a - b);

    return {
      totalCalls: durations.length,
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: durations[0],
      maxDuration: durations[durations.length - 1],
      p50: this.percentile(durations, 50),
      p90: this.percentile(durations, 90),
      p99: this.percentile(durations, 99)
    };
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Get recent metrics
   */
  getRecentMetrics(count = 100): PerformanceMetric[] {
    return this.metrics.slice(-count);
  }

  /**
   * Get slow operations
   */
  getSlowOperations(threshold = 1000): PerformanceMetric[] {
    return this.metrics.filter(m => m.duration && m.duration > threshold);
  }

  /**
   * Generate performance report
   */
  generateReport(): {
    summary: Record<string, PerformanceStats>;
    slowOperations: PerformanceMetric[];
    byType: Record<string, PerformanceStats>;
  } {
    const uniqueNames = [...new Set(this.metrics.map(m => m.name))];
    const summary: Record<string, PerformanceStats> = {};

    for (const name of uniqueNames) {
      const stats = this.getStats(name);
      if (stats) {
        summary[name] = stats;
      }
    }

    const types: PerformanceMetric['type'][] = ['api', 'render', 'compute', 'io'];
    const byType: Record<string, PerformanceStats> = {};

    for (const type of types) {
      const stats = this.getStats(undefined, type);
      if (stats) {
        byType[type] = stats;
      }
    }

    return {
      summary,
      slowOperations: this.getSlowOperations(),
      byType
    };
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics = [];
  }

  /**
   * Enable/disable monitoring
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Calculate percentile
   */
  private percentile(sorted: number[], p: number): number {
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Clean up old metrics
   */
  private cleanup(): void {
    const oneHourAgo = performance.now() - 60 * 60 * 1000;
    this.metrics = this.metrics.filter(m => m.startTime > oneHourAgo);
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(): string {
    return JSON.stringify(this.metrics, null, 2);
  }

  /**
   * Import metrics for analysis
   */
  importMetrics(json: string): void {
    try {
      const imported = JSON.parse(json);
      if (Array.isArray(imported)) {
        this.metrics = imported;
      }
    } catch (error) {
      console.error('Failed to import metrics:', error);
    }
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

/**
 * React hook for performance monitoring
 */
export function usePerformance() {
  return {
    measure: <T>(name: string, fn: () => Promise<T>) =>
      performanceMonitor.measure(name, fn),
    start: (name: string) => performanceMonitor.start(name),
    end: (id: string) => performanceMonitor.end(id),
    getStats: (name?: string) => performanceMonitor.getStats(name),
    getReport: () => performanceMonitor.generateReport()
  };
}

/**
 * Decorator for performance monitoring
 */
export function Monitored(type: PerformanceMetric['type'] = 'api') {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const name = `${target.constructor.name}.${propertyKey}`;
      return performanceMonitor.measure(
        name,
        () => originalMethod.apply(this, args),
        type
      );
    };

    return descriptor;
  };
}

/**
 * Component render performance tracker
 */
export function trackRender(componentName: string) {
  const id = performanceMonitor.start(componentName, 'render');
  return () => performanceMonitor.end(id);
}