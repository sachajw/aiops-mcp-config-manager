import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'mb' | 'count' | 'percentage';
  timestamp: Date;
  category: 'startup' | 'ui' | 'file-io' | 'network' | 'memory';
  details?: Record<string, any>;
}

export interface OperationTiming {
  id: string;
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  success?: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

export interface SystemInfo {
  platform: string;
  nodeVersion: string;
  electronVersion: string;
  appVersion: string;
  memory: {
    total: number;
    used: number;
    available: number;
  };
  cpu: {
    model: string;
    cores: number;
    usage: number;
  };
  updatedAt: Date;
}

export interface PerformanceState {
  metrics: PerformanceMetric[];
  operations: Record<string, OperationTiming>;
  systemInfo: SystemInfo | null;
  isMonitoring: boolean;
  maxMetrics: number;
  
  // Actions
  addMetric: (metric: Omit<PerformanceMetric, 'timestamp'>) => void;
  startOperation: (id: string, operation: string, metadata?: Record<string, any>) => void;
  endOperation: (id: string, success?: boolean, error?: string) => void;
  clearMetrics: () => void;
  clearOperations: () => void;
  updateSystemInfo: (info: Partial<SystemInfo>) => void;
  startMonitoring: () => void;
  stopMonitoring: () => void;
  
  // Getters
  getMetricsByCategory: (category: PerformanceMetric['category']) => PerformanceMetric[];
  getAverageMetric: (name: string, timeRange?: number) => number | null;
  getOperationStats: (operation: string) => {
    count: number;
    averageDuration: number;
    successRate: number;
    failures: number;
  };
  getMemoryUsage: () => { used: number; total: number; percentage: number } | null;
}

export const usePerformanceStore = create<PerformanceState>()(
  devtools(
    (set, get) => ({
      metrics: [],
      operations: {},
      systemInfo: null,
      isMonitoring: false,
      maxMetrics: 1000,
      
      addMetric: (metric) => {
        const newMetric: PerformanceMetric = {
          ...metric,
          timestamp: new Date()
        };
        
        set((state) => {
          const updatedMetrics = [newMetric, ...state.metrics];
          
          // Keep only the last maxMetrics entries
          if (updatedMetrics.length > state.maxMetrics) {
            updatedMetrics.splice(state.maxMetrics);
          }
          
          return { metrics: updatedMetrics };
        });
      },
      
      startOperation: (id, operation, metadata) => {
        const timing: OperationTiming = {
          id,
          operation,
          startTime: performance.now(),
          metadata
        };
        
        set((state) => ({
          operations: { ...state.operations, [id]: timing }
        }));
      },
      
      endOperation: (id, success = true, error) => {
        const endTime = performance.now();
        
        set((state) => {
          const operation = state.operations[id];
          if (!operation) return state;
          
          const duration = endTime - operation.startTime;
          const updatedOperation: OperationTiming = {
            ...operation,
            endTime,
            duration,
            success,
            error
          };
          
          // Add a performance metric for completed operations
          const metric: PerformanceMetric = {
            name: `operation_${operation.operation}`,
            value: duration,
            unit: 'ms',
            timestamp: new Date(),
            category: 'ui',
            details: {
              success,
              error,
              metadata: operation.metadata
            }
          };
          
          const updatedMetrics = [metric, ...state.metrics];
          if (updatedMetrics.length > state.maxMetrics) {
            updatedMetrics.splice(state.maxMetrics);
          }
          
          return {
            operations: { ...state.operations, [id]: updatedOperation },
            metrics: updatedMetrics
          };
        });
      },
      
      clearMetrics: () => set({ metrics: [] }),
      
      clearOperations: () => set({ operations: {} }),
      
      updateSystemInfo: (info) =>
        set((state) => ({
          systemInfo: state.systemInfo 
            ? { ...state.systemInfo, ...info, updatedAt: new Date() }
            : { 
                platform: navigator.platform,
                nodeVersion: 'unknown',
                electronVersion: 'unknown',
                appVersion: '1.0.0',
                memory: { total: 0, used: 0, available: 0 },
                cpu: { model: 'unknown', cores: 1, usage: 0 },
                updatedAt: new Date(),
                ...info
              }
        })),
      
      startMonitoring: () => {
        set({ isMonitoring: true });
        
        // Start periodic system monitoring
        const monitoringInterval = setInterval(() => {
          const { isMonitoring, updateSystemInfo, addMetric } = get();
          
          if (!isMonitoring) {
            clearInterval(monitoringInterval);
            return;
          }
          
          // Collect memory usage
          if ((performance as any).memory) {
            const memory = (performance as any).memory;
            addMetric({
              name: 'memory_usage',
              value: memory.usedJSHeapSize / 1024 / 1024,
              unit: 'mb',
              category: 'memory',
              details: {
                total: memory.totalJSHeapSize / 1024 / 1024,
                limit: memory.jsHeapSizeLimit / 1024 / 1024
              }
            });
          }
          
          // Collect render performance
          const navigationEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
          if (navigationEntries.length > 0) {
            const navigation = navigationEntries[0];
            const renderTime = navigation.loadEventEnd - navigation.responseStart;
            
            if (renderTime > 0) {
              addMetric({
                name: 'page_render_time',
                value: renderTime,
                unit: 'ms',
                category: 'ui'
              });
            }
          }
          
        }, 10000); // Monitor every 10 seconds
      },
      
      stopMonitoring: () => set({ isMonitoring: false }),
      
      // Getters
      getMetricsByCategory: (category) => {
        const { metrics } = get();
        return metrics.filter(metric => metric.category === category);
      },
      
      getAverageMetric: (name, timeRange) => {
        const { metrics } = get();
        const now = new Date();
        const cutoff = timeRange ? new Date(now.getTime() - timeRange) : null;
        
        const relevantMetrics = metrics.filter(metric => 
          metric.name === name && 
          (!cutoff || metric.timestamp >= cutoff)
        );
        
        if (relevantMetrics.length === 0) return null;
        
        const sum = relevantMetrics.reduce((acc, metric) => acc + metric.value, 0);
        return sum / relevantMetrics.length;
      },
      
      getOperationStats: (operation) => {
        const { operations } = get();
        const relevantOps = Object.values(operations).filter(op => 
          op.operation === operation && op.duration !== undefined
        );
        
        if (relevantOps.length === 0) {
          return { count: 0, averageDuration: 0, successRate: 0, failures: 0 };
        }
        
        const totalDuration = relevantOps.reduce((sum, op) => sum + (op.duration || 0), 0);
        const successfulOps = relevantOps.filter(op => op.success !== false);
        const failedOps = relevantOps.filter(op => op.success === false);
        
        return {
          count: relevantOps.length,
          averageDuration: totalDuration / relevantOps.length,
          successRate: successfulOps.length / relevantOps.length,
          failures: failedOps.length
        };
      },
      
      getMemoryUsage: () => {
        const { systemInfo } = get();
        if (!systemInfo) return null;
        
        const { total, used } = systemInfo.memory;
        const percentage = total > 0 ? (used / total) * 100 : 0;
        
        return { used, total, percentage };
      }
    }),
    {
      name: 'mcp-performance-store'
    }
  )
);