/**
 * CacheManager - Intelligent caching for API responses
 * Reduces IPC calls and improves performance
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  key: string;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  forceRefresh?: boolean;
}

export class CacheManager {
  private static instance: CacheManager;
  private cache: Map<string, CacheEntry<any>> = new Map();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 100; // Maximum number of entries

  private constructor() {
    // Start cleanup interval
    setInterval(() => this.cleanup(), 60 * 1000); // Run cleanup every minute
  }

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  /**
   * Get cached data or fetch new data
   */
  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const { ttl = this.DEFAULT_TTL, forceRefresh = false } = options;

    // Check if we should use cache
    if (!forceRefresh) {
      const cached = this.getFromCache<T>(key);
      if (cached !== null) {
        return cached;
      }
    }

    // Fetch new data
    try {
      const data = await fetcher();
      this.setCache(key, data, ttl);
      return data;
    } catch (error) {
      // On error, try to return stale cache if available
      const stale = this.getFromCache<T>(key, true);
      if (stale !== null) {
        console.warn(`Using stale cache for ${key} due to fetch error:`, error);
        return stale;
      }
      throw error;
    }
  }

  /**
   * Get data from cache if valid
   */
  private getFromCache<T>(key: string, allowStale = false): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    const isExpired = now - entry.timestamp > entry.ttl;

    if (!isExpired || allowStale) {
      // Move to end (LRU)
      this.cache.delete(key);
      this.cache.set(key, entry);
      return entry.data as T;
    }

    // Remove expired entry
    this.cache.delete(key);
    return null;
  }

  /**
   * Set cache entry
   */
  private setCache<T>(key: string, data: T, ttl: number): void {
    // Enforce cache size limit (LRU eviction)
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      key
    });
  }

  /**
   * Invalidate cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Invalidate cache entries matching pattern
   */
  invalidatePattern(pattern: string | RegExp): void {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    entries: Array<{ key: string; age: number; ttl: number }>;
  } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      age: now - entry.timestamp,
      ttl: entry.ttl
    }));

    return {
      size: this.cache.size,
      entries
    };
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// Export singleton instance
export const cacheManager = CacheManager.getInstance();

/**
 * Cache key generators for consistent keys
 */
export const CacheKeys = {
  clients: () => 'clients:all',
  client: (id: string) => `client:${id}`,
  servers: (clientId?: string) => clientId ? `servers:${clientId}` : 'servers:all',
  server: (name: string) => `server:${name}`,
  serverMetrics: (name: string) => `metrics:${name}`,
  discovery: () => 'discovery:catalog',
  configuration: (clientId: string) => `config:${clientId}`,
  settings: () => 'settings:app',
  validation: (hash: string) => `validation:${hash}`
};

/**
 * Cache decorator for class methods
 */
export function Cacheable(ttl?: number) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const key = `${target.constructor.name}:${propertyKey}:${JSON.stringify(args)}`;
      return cacheManager.get(
        key,
        () => originalMethod.apply(this, args),
        { ttl }
      );
    };

    return descriptor;
  };
}

/**
 * React hook for cache invalidation
 */
export function useCacheInvalidation() {
  return {
    invalidate: (key: string) => cacheManager.invalidate(key),
    invalidatePattern: (pattern: string | RegExp) => cacheManager.invalidatePattern(pattern),
    clear: () => cacheManager.clear()
  };
}