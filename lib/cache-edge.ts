/**
 * Edge Runtime Compatible Cache
 * Uses global scope to persist cache across requests in the same worker
 * Compatible with Cloudflare Edge Runtime (no Node.js APIs)
 */

declare global {
  // eslint-disable-next-line no-var
  var __CACHE_SEARCH__: Map<string, { value: unknown; expiry: number }> | undefined;
  // eslint-disable-next-line no-var
  var __CACHE_STATIC__: Map<string, { value: unknown; expiry: number }> | undefined;
}

// Search cache: 5 minutes TTL (300 seconds)
const SEARCH_TTL = 300;
// Static cache: 10 minutes TTL (600 seconds)
const STATIC_TTL = 600;

function getSearchCache(): Map<string, { value: unknown; expiry: number }> {
  if (!globalThis.__CACHE_SEARCH__) {
    globalThis.__CACHE_SEARCH__ = new Map();
  }
  return globalThis.__CACHE_SEARCH__;
}

function getStaticCache(): Map<string, { value: unknown; expiry: number }> {
  if (!globalThis.__CACHE_STATIC__) {
    globalThis.__CACHE_STATIC__ = new Map();
  }
  return globalThis.__CACHE_STATIC__;
}

/**
 * Get cached search result (Edge Runtime compatible)
 */
export function getCachedSearch<T>(key: string): T | undefined {
  const cache = getSearchCache();
  const entry = cache.get(key);
  if (!entry) return undefined;
  
  // Check if expired
  if (Date.now() > entry.expiry) {
    cache.delete(key);
    return undefined;
  }
  
  return entry.value as T;
}

/**
 * Set search result in cache (Edge Runtime compatible)
 */
export function setCachedSearch<T>(key: string, value: T, ttlSeconds = SEARCH_TTL): void {
  getSearchCache().set(key, { value, expiry: Date.now() + ttlSeconds * 1000 });
}

/**
 * Get cached static data (Edge Runtime compatible)
 */
export function getCachedStatic<T>(key: string): T | undefined {
  const cache = getStaticCache();
  const entry = cache.get(key);
  if (!entry) return undefined;
  
  // Check if expired
  if (Date.now() > entry.expiry) {
    cache.delete(key);
    return undefined;
  }
  
  return entry.value as T;
}

/**
 * Set static data in cache (Edge Runtime compatible)
 */
export function setCachedStatic<T>(key: string, value: T, ttlSeconds = STATIC_TTL): void {
  getStaticCache().set(key, { value, expiry: Date.now() + ttlSeconds * 1000 });
}

/**
 * Invalidate cache by pattern or flush all
 */
export function invalidateCache(pattern?: string): void {
  if (pattern) {
    const searchCache = getSearchCache();
    const staticCache = getStaticCache();
    
    let count = 0;
    for (const key of searchCache.keys()) {
      if (key.includes(pattern)) {
        searchCache.delete(key);
        count++;
      }
    }
    for (const key of staticCache.keys()) {
      if (key.includes(pattern)) {
        staticCache.delete(key);
        count++;
      }
    }
    console.log(`[Cache] Invalidated ${count} keys matching "${pattern}"`);
  } else {
    getSearchCache().clear();
    getStaticCache().clear();
    console.log('[Cache] Flushed all caches');
  }
}

/**
 * Get cache statistics for monitoring
 */
export function getCacheStats() {
  return {
    searchKeys: getSearchCache().size,
    staticKeys: getStaticCache().size,
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
  return `${type}:${normalizedQuery}:${country || 'all'}:${category || 'all'}:${limit || 10}`;
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
