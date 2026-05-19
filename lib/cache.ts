import NodeCache from 'node-cache';

/**
 * Cache system for API responses
 * Two tiers:
 * - searchCache: 5 min TTL for search queries (semantic, textual)
 * - staticCache: 1 hour TTL for static data (countries, categories, norms)
 */

// Cache for search queries (5 minutes)
export const searchCache = new NodeCache({
  stdTTL: 300,      // 5 minutes
  checkperiod: 60,  // check for expired keys every 60s
  useClones: false, // don't clone objects (better performance, but be careful with mutations)
});

// Cache for static data (1 hour)
export const staticCache = new NodeCache({
  stdTTL: 3600,     // 1 hour
  checkperiod: 300,
  useClones: false,
});

/**
 * Get cached search result
 */
export function getCachedSearch<T>(key: string): T | undefined {
  return searchCache.get<T>(key);
}

/**
 * Set search result in cache
 */
export function setCachedSearch<T>(key: string, value: T, ttl?: number): void {
  if (ttl !== undefined) {
    searchCache.set(key, value, ttl);
  } else {
    searchCache.set(key, value);
  }
}

/**
 * Get cached static data
 */
export function getCachedStatic<T>(key: string): T | undefined {
  return staticCache.get<T>(key);
}

/**
 * Set static data in cache
 */
export function setCachedStatic<T>(key: string, value: T): void {
  staticCache.set(key, value);
}

/**
 * Invalidate cache by pattern or flush all
 */
export function invalidateCache(pattern?: string): void {
  if (pattern) {
    const searchKeys = searchCache.keys().filter((k: string) => k.includes(pattern));
    const staticKeys = staticCache.keys().filter((k: string) => k.includes(pattern));
    searchCache.del(searchKeys);
    staticCache.del(staticKeys);
    console.log(`[Cache] Invalidated ${searchKeys.length + staticKeys.length} keys matching "${pattern}"`);
  } else {
    searchCache.flushAll();
    staticCache.flushAll();
    console.log('[Cache] Flushed all caches');
  }
}

/**
 * Get cache statistics for monitoring
 */
export function getCacheStats() {
  return {
    search: searchCache.getStats(),
    static: staticCache.getStats(),
    searchKeys: searchCache.keys().length,
    staticKeys: staticCache.keys().length,
  };
}

/**
 * Generate cache key for search queries
 */
export function generateSearchCacheKey(
  type: 'semantic' | 'textual',
  query: string,
  country?: string,
  category?: string,
  limit?: number
): string {
  const normalizedQuery = query.toLowerCase().trim();
  return `v7:${type}:${normalizedQuery}:${country || 'all'}:${category || 'all'}:${limit || 10}`;
}

/**
 * Generate cache key for static data
 */
export function generateStaticCacheKey(
  type: 'countries' | 'categories' | 'norm' | 'sitemap' | 'robots',
  id?: string
): string {
  return id ? `${type}:${id}` : type;
}
