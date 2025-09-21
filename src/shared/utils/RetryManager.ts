/**
 * RetryManager - Intelligent retry logic for failed operations
 * Implements exponential backoff with jitter
 */

export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  jitter?: boolean;
  retryCondition?: (error: any) => boolean;
  onRetry?: (attempt: number, error: any) => void;
}

export class RetryManager {
  private static readonly DEFAULT_OPTIONS: Required<RetryOptions> = {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    jitter: true,
    retryCondition: (error) => {
      // Retry on network errors or specific status codes
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        return true;
      }
      if (error.status && [502, 503, 504].includes(error.status)) {
        return true;
      }
      return false;
    },
    onRetry: () => {}
  };

  /**
   * Execute function with retry logic
   */
  static async execute<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const config = { ...RetryManager.DEFAULT_OPTIONS, ...options };
    let lastError: any;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        // Check if we should retry
        if (attempt === config.maxAttempts || !config.retryCondition(error)) {
          throw error;
        }

        // Calculate delay with exponential backoff
        const baseDelay = Math.min(
          config.initialDelay * Math.pow(config.backoffMultiplier, attempt - 1),
          config.maxDelay
        );

        // Add jitter if enabled
        const delay = config.jitter
          ? baseDelay * (0.5 + Math.random() * 0.5)
          : baseDelay;

        // Notify retry handler
        config.onRetry(attempt, error);

        // Wait before retrying
        await RetryManager.delay(delay);
      }
    }

    throw lastError;
  }

  /**
   * Execute with linear retry (no backoff)
   */
  static async executeLinear<T>(
    fn: () => Promise<T>,
    maxAttempts = 3,
    delay = 1000
  ): Promise<T> {
    return RetryManager.execute(fn, {
      maxAttempts,
      initialDelay: delay,
      backoffMultiplier: 1,
      jitter: false
    });
  }

  /**
   * Execute with immediate retry (no delay)
   */
  static async executeImmediate<T>(
    fn: () => Promise<T>,
    maxAttempts = 3
  ): Promise<T> {
    return RetryManager.execute(fn, {
      maxAttempts,
      initialDelay: 0,
      backoffMultiplier: 1,
      jitter: false
    });
  }

  /**
   * Helper delay function
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create a retryable wrapper for a function
   */
  static wrap<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    options: RetryOptions = {}
  ): T {
    return (async (...args: Parameters<T>) => {
      return RetryManager.execute(() => fn(...args), options);
    }) as T;
  }
}

/**
 * Decorator for retryable methods
 */
export function Retryable(options: RetryOptions = {}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      return RetryManager.execute(
        () => originalMethod.apply(this, args),
        options
      );
    };

    return descriptor;
  };
}

/**
 * Circuit breaker for preventing cascading failures
 */
export class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private readonly threshold = 5,
    private readonly resetTimeout = 60000 // 1 minute
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === 'open') {
      const timeSinceFailure = Date.now() - this.lastFailureTime;
      if (timeSinceFailure > this.resetTimeout) {
        this.state = 'half-open';
        this.failureCount = 0;
      } else {
        throw new Error('Circuit breaker is open - service unavailable');
      }
    }

    try {
      const result = await fn();

      // Success - reset if half-open
      if (this.state === 'half-open') {
        this.state = 'closed';
        this.failureCount = 0;
      }

      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();

      // Open circuit if threshold reached
      if (this.failureCount >= this.threshold) {
        this.state = 'open';
        console.warn(`Circuit breaker opened after ${this.failureCount} failures`);
      }

      throw error;
    }
  }

  reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.lastFailureTime = 0;
  }

  getState(): string {
    return this.state;
  }
}