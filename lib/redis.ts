import { Redis } from '@upstash/redis';

/**
 * Redis client configuration for semantic caching
 * Uses Upstash Redis for serverless-compatible caching
 */

let redisClient: Redis | null = null;

/**
 * Get or create Redis client instance
 * Returns null if Redis is not configured (graceful degradation)
 */
export function getRedisClient(): Redis | null {
  if (!redisClient) {
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!redisUrl || !redisToken) {
      console.warn('[Redis] UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not configured. Caching will be disabled.');
      return null;
    }

    try {
      redisClient = new Redis({
        url: redisUrl,
        token: redisToken,
      });

      console.log('[Redis] Client initialized');
    } catch (error) {
      console.error('[Redis] Failed to initialize Redis client:', error);
      return null;
    }
  }

  return redisClient;
}

/**
 * Check if Redis is properly configured
 */
export function isRedisConfigured(): boolean {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

/**
 * Generate semantic cache key for search queries
 */
export function generateSearchCacheKey(
  type: 'semantic' | 'textual',
  query: string,
  country?: string,
  category?: string,
  limit?: number
): string {
  const normalizedQuery = query.toLowerCase().trim();
  return `search:${type}:${normalizedQuery}:${country || 'all'}:${category || 'all'}:${limit || 10}`;
}

/**
 * Generate cache key for static data (countries, norms list, etc.)
 */
export function generateStaticCacheKey(
  type: 'countries' | 'norms' | 'home',
  params?: Record<string, string | number>
): string {
  if (params) {
    const paramString = Object.entries(params)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(':');
    return `static:${type}:${paramString}`;
  }
  return `static:${type}`;
}

/**
 * Get cached data from Redis
 */
export async function getCachedData<T>(key: string): Promise<T | null> {
  if (!isRedisConfigured()) {
    return null;
  }

  try {
    const redis = getRedisClient();
    if (!redis) return null;
    
    const data = await redis.get<string>(key);
    
    if (data) {
      console.log(`[Redis] Cache hit: ${key}`);
      return JSON.parse(data) as T;
    }
    
    console.log(`[Redis] Cache miss: ${key}`);
    return null;
  } catch (error) {
    console.error(`[Redis] Error getting cache for ${key}:`, error);
    return null;
  }
}

/**
 * Set cached data in Redis with TTL (in seconds)
 */
export async function setCachedData<T>(
  key: string,
  value: T,
  ttlSeconds: number = 300
): Promise<void> {
  if (!isRedisConfigured()) {
    return;
  }

  try {
    const redis = getRedisClient();
    if (!redis) return;
    
    await redis.set(key, JSON.stringify(value), { ex: ttlSeconds });
    console.log(`[Redis] Cached: ${key} (TTL: ${ttlSeconds}s)`);
  } catch (error) {
    console.error(`[Redis] Error setting cache for ${key}:`, error);
  }
}

/**
 * Invalidate cache by pattern
 * Deletes all keys matching the given pattern
 */
export async function invalidateCachePattern(pattern: string): Promise<void> {
  if (!isRedisConfigured()) {
    return;
  }

  try {
    const redis = getRedisClient();
    if (!redis) return;
    
    const keys = await redis.keys(pattern);
    
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`[Redis] Invalidated ${keys.length} keys matching pattern: ${pattern}`);
    } else {
      console.log(`[Redis] No keys found matching pattern: ${pattern}`);
    }
  } catch (error) {
    console.error(`[Redis] Error invalidating cache pattern ${pattern}:`, error);
  }
}

/**
 * Invalidate all search-related cache
 */
export async function invalidateSearchCache(): Promise<void> {
  await invalidateCachePattern('search:*');
}

/**
 * Invalidate all static data cache
 */
export async function invalidateStaticCache(): Promise<void> {
  await invalidateCachePattern('static:*');
}

/**
 * Invalidate all cache (both search and static)
 */
export async function invalidateAllCache(): Promise<void> {
  await invalidateSearchCache();
  await invalidateStaticCache();
}

/**
 * Cache invalidation for norm-related changes
 * Invalidates search cache and static cache that might be affected
 */
export async function invalidateNormCache(): Promise<void> {
  // Invalidate search cache as norms data changed
  await invalidateSearchCache();
  
  // Invalidate static cache for norms and home page
  await invalidateCachePattern('static:norms:*');
  await invalidateCachePattern('static:home:*');
  
  console.log('[Redis] Invalidated norm-related cache');
}
