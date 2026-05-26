/**
 * Rate limiting utilities for search requests
 * Tracks and enforces per-user search quotas
 */

import { getAuthenticatedSupabaseClient, getAdminSupabaseClient } from './supabase-server';

export interface RateLimitConfig {
  // Limit for anonymous users per day (per IP)
  anonymousSearchesPerDay: number;
  // Limit for authenticated users per day (per user)
  authenticatedSearchesPerDay: number;
}

// Default configuration
export const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  anonymousSearchesPerDay: 5,
  authenticatedSearchesPerDay: 5,
};

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetTime?: Date;
  reason?: string;
}

/**
 * Generate a hash of the search query for deduplication
 */
async function generateQueryHash(query: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(query);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Check if IP has exceeded rate limits
 * Supports hybrid rate limiting: different limits for authenticated vs anonymous users
 */
export async function checkRateLimit(
  ipAddress: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  searchType: 'semantic' | 'keyword' | 'browse' | 'visit' = 'keyword',
  config: RateLimitConfig = DEFAULT_RATE_LIMIT,
  userId?: string
): Promise<RateLimitResult> {
  try {
    const supabase = getAdminSupabaseClient();
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Determine limit based on authentication status
    const isAuth = !!userId;
    const dailyLimit = isAuth ? config.authenticatedSearchesPerDay : config.anonymousSearchesPerDay;

    // Build query based on authentication status
    let countQuery = supabase
      .from('search_usage')
      .select('id', { count: 'exact', head: true })
      .gte('searched_at', oneDayAgo.toISOString());

    if (isAuth && userId) {
      // Authenticated user – filter by user_id
      countQuery = countQuery.eq('user_id', userId);
    } else {
      // Anonymous user – filter by IP
      countQuery = countQuery.eq('ip_address', ipAddress);
    }

    // Separate limits for visits/browsing vs actual searches
    if (searchType === 'visit' || searchType === 'browse') {
      countQuery = countQuery.eq('search_type', searchType);
      dailyLimit = 5000; // Generous limit for non-search actions
    } else {
      countQuery = countQuery.in('search_type', ['semantic', 'keyword']);
    }

    const { count: dayCount, error: dayError } = await countQuery;

    if (dayError && dayError.code !== 'PGRST200') {
      console.error('[checkRateLimit] Error fetching daily searches:', dayError);
      // Allow request if database is down (fail open)
      return { allowed: true, remaining: dailyLimit, limit: dailyLimit };
    }



    console.log('[checkRateLimit] dayCount:', dayCount, 'dailyLimit:', dailyLimit, 'dayError:', dayError);

    // Check daily limit
    // Fallback dayCount to 0 if null
    const safeDayCount = dayCount || 0;
    
    if (safeDayCount >= dailyLimit) {
      const resetTime = new Date(oneDayAgo.getTime() + 24 * 60 * 60 * 1000);
      return {
        allowed: false,
        remaining: 0,
        limit: dailyLimit,
        resetTime,
        reason: isAuth
          ? `Limite de ${dailyLimit} buscas por dia excedido. Tente novamente amanhã.`
          : `Limite de ${dailyLimit} buscas gratuitas por dia excedido. Crie uma conta gratuita para continuar pesquisando.`,
      };
    }

    return {
      allowed: true,
      remaining: dailyLimit - safeDayCount,
      limit: dailyLimit,
    };
  } catch (error) {
    console.error('[checkRateLimit] Unexpected error:', error);
    // Fail open to avoid blocking legitimate requests
    return { allowed: true, remaining: DEFAULT_RATE_LIMIT.anonymousSearchesPerDay, limit: DEFAULT_RATE_LIMIT.anonymousSearchesPerDay };
  }
}

/**
 * Record a search for rate limiting purposes
 */
export async function recordSearch(
  ipAddress: string,
  searchType: 'semantic' | 'keyword' | 'browse' | 'visit' = 'keyword',
  query?: string,
  country?: string,
  userId?: string
): Promise<void> {
  const supabase = getAdminSupabaseClient();
  const queryHash = query ? await generateQueryHash(query) : null;

  const { error } = await supabase
    .from('search_usage')
    .insert({
      user_id: userId || null,
      search_type: searchType,
      query_hash: queryHash,
      country,
      ip_address: ipAddress,
      searched_at: new Date().toISOString(),
    });

  if (error) {
    console.log('[recordSearch] Called with', { ipAddress, searchType, query, country, userId });
    throw new Error(`[recordSearch] Error recording search: ${error.message}`);
  }
}

/**
 * Get current usage statistics for an IP address
 */
export async function getSearchStats(ipAddress: string) {
  try {
    const supabase = await getAuthenticatedSupabaseClient();
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const { data: stats, error } = await supabase
      .from('search_usage')
      .select('search_type, searched_at')
      .in('search_type', ['semantic', 'keyword'])
      .eq('ip_address', ipAddress);

    if (error) {
      console.error('[getSearchStats] Error fetching stats:', error);
      return null;
    }

    const allSearches = stats || [];
    const lastDaySearches = allSearches.filter(
      (s) => new Date(s.searched_at as string) > oneDayAgo
    );

    return {
      totalSearches: allSearches.length,
      searchesLastDay: lastDaySearches.length,
      semanticSearches: allSearches.filter((s) => s.search_type === 'semantic').length,
      lastSearch: allSearches.length > 0 ? new Date(allSearches[0].searched_at as string) : null,
    };
  } catch (error) {
    console.error('[getSearchStats] Unexpected error:', error);
    return null;
  }
}

/**
 * Admin function to reset rate limit for an IP
 */
export async function resetRateLimit(ipAddress: string): Promise<void> {
  try {
    const supabase = getAdminSupabaseClient();

    const { error } = await supabase
      .from('search_usage')
      .delete()
      .eq('ip_address', ipAddress);

    if (error) {
      throw new Error(`Failed to reset rate limit: ${error.message}`);
    }

    console.log(`[resetRateLimit] Rate limit reset for IP ${ipAddress}`);
  } catch (error) {
    console.error('[resetRateLimit] Error:', error);
    throw error;
  }
}
