/**
 * Rate limiting utilities for search requests
 * Tracks and enforces per-user search quotas
 */

import { getAuthenticatedSupabaseClient, getAdminSupabaseClient } from '@/lib/supabase-server';
import crypto from 'crypto';

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
function generateQueryHash(query: string): string {
  return crypto.createHash('md5').update(query).digest('hex');
}

/**
 * Check if IP has exceeded rate limits
 * Supports hybrid rate limiting: different limits for authenticated vs anonymous users
 */
export async function checkRateLimit(
  ipAddress: string,
  searchType: 'semantic' | 'keyword' | 'browse' = 'keyword',
  config: RateLimitConfig = DEFAULT_RATE_LIMIT,
  userId?: string
): Promise<RateLimitResult> {
  try {
    const supabase = await getAuthenticatedSupabaseClient();
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Determine limit based on authentication status
    const isAuth = !!userId;
    const dailyLimit = isAuth ? config.authenticatedSearchesPerDay : config.anonymousSearchesPerDay;

    // Build query based on authentication status
    let query = supabase
      .from('search_usage')
      .select('id', { count: 'exact' })
      .gte('searched_at', oneDayAgo.toISOString());

    if (isAuth && userId) {
      // For authenticated users, check by user_id
      query = query.eq('user_id', userId);
    } else {
      // For anonymous users, check by IP
      query = query.eq('ip_address', ipAddress);
    }

    const { data: daySearches, error: dayError } = await query.limit(dailyLimit + 1);

    if (dayError && dayError.code !== 'PGRST200') {
      console.error('[checkRateLimit] Error fetching daily searches:', dayError);
      // Allow request if database is down (fail open)
      return { allowed: true, remaining: dailyLimit, limit: dailyLimit };
    }

    const dayCount = daySearches?.length || 0;

    // Check daily limit
    if (dayCount >= dailyLimit) {
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
      remaining: dailyLimit - dayCount,
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
  searchType: 'semantic' | 'keyword' | 'browse' = 'keyword',
  query?: string,
  country?: string,
  userId?: string
): Promise<void> {
  try {
    const supabase = getAdminSupabaseClient();
    const queryHash = query ? generateQueryHash(query) : null;

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
      console.error('[recordSearch] Error recording search:', error);
      // Non-fatal error - don't interrupt the search
    }
  } catch (error) {
    console.error('[recordSearch] Unexpected error:', error);
    // Non-fatal error
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
      .select('search_type, searched_at', { count: 'exact' })
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
