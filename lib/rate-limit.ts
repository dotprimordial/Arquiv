/**
 * Rate limiting utilities for search requests
 * Tracks and enforces per-user search quotas with multiple time windows
 */

import { getAdminSupabaseClient } from './supabase-server';
import { createClient } from '@supabase/supabase-js';

export interface RateLimitConfig {
  anonymousSearchesPerMinute: number;
  anonymousSearchesPerHour: number;
  anonymousSearchesPerDay: number;
  authenticatedSearchesPerMinute: number;
  authenticatedSearchesPerHour: number;
  authenticatedSearchesPerDay: number;
}

export const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  anonymousSearchesPerMinute: 1,
  anonymousSearchesPerHour: 2,
  anonymousSearchesPerDay: 5,
  authenticatedSearchesPerMinute: 2,
  authenticatedSearchesPerHour: 4,
  authenticatedSearchesPerDay: 5,
};

const BROWSE_LIMITS = {
  perMinute: 60,
  perHour: 1000,
  perDay: 5000,
};

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetTime?: Date;
  reason?: string;
}

async function generateQueryHash(query: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(query);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function checkRateLimit(
  ipAddress: string,
  searchType: 'semantic' | 'keyword' | 'browse' | 'visit' = 'keyword',
  config: RateLimitConfig = DEFAULT_RATE_LIMIT,
  userId?: string
): Promise<RateLimitResult> {
  try {
    const supabase = getAdminSupabaseClient();
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const isAuth = !!userId;

    const isBrowse = searchType === 'visit' || searchType === 'browse';
    let minuteLimit: number, hourLimit: number, dayLimit: number;

    if (isBrowse) {
      minuteLimit = BROWSE_LIMITS.perMinute;
      hourLimit = BROWSE_LIMITS.perHour;
      dayLimit = BROWSE_LIMITS.perDay;
    } else if (isAuth) {
      minuteLimit = config.authenticatedSearchesPerMinute;
      hourLimit = config.authenticatedSearchesPerHour;
      dayLimit = config.authenticatedSearchesPerDay;
    } else {
      minuteLimit = config.anonymousSearchesPerMinute;
      hourLimit = config.anonymousSearchesPerHour;
      dayLimit = config.anonymousSearchesPerDay;
    }

    const typeFilter = isBrowse
      ? { 'eq': searchType }
      : { 'in': ['semantic', 'keyword'] };

    const idFilter = isAuth && userId ? { 'eq': 'user_id' } : { 'eq': 'ip_address' };
    const idValue = isAuth && userId ? userId : ipAddress;

    async function countSince(since: Date): Promise<number> {
      let q = supabase
        .from('search_usage')
        .select('id', { count: 'exact', head: true })
        .gte('searched_at', since.toISOString());

      if (typeFilter.eq) {
        q = q.eq('search_type', typeFilter.eq);
      } else {
        q = q.in('search_type', typeFilter.in);
      }

      if (idFilter.eq === 'user_id') {
        q = q.eq('user_id', idValue);
      } else {
        q = q.eq('ip_address', idValue);
      }

      const { count, error } = await q;
      if (error && error.code !== 'PGRST200') {
        console.error('[checkRateLimit] Query error:', error);
        return -1;
      }
      return count || 0;
    }

    const [minuteCount, hourCount, dayCount] = await Promise.all([
      countSince(oneMinuteAgo),
      countSince(oneHourAgo),
      countSince(oneDayAgo),
    ]);

    if (minuteCount < 0 || hourCount < 0 || dayCount < 0) {
      return { allowed: false, remaining: 0, limit: Math.max(minuteLimit, hourLimit, dayLimit), reason: 'Erro interno do servidor. Tente novamente mais tarde.' };
    }

    if (minuteCount >= minuteLimit) {
      const resetTime = new Date(oneMinuteAgo.getTime() + 60 * 1000);
      return {
        allowed: false,
        remaining: 0,
        limit: minuteLimit,
        resetTime,
        reason: `Limite de ${minuteLimit} ${isBrowse ? 'requisições' : 'buscas'} por minuto excedido. Aguarde um momento.`,
      };
    }

    if (hourCount >= hourLimit) {
      const resetTime = new Date(oneHourAgo.getTime() + 60 * 60 * 1000);
      return {
        allowed: false,
        remaining: 0,
        limit: hourLimit,
        resetTime,
        reason: `Limite de ${hourLimit} ${isBrowse ? 'requisições' : 'buscas'} por hora excedido. Tente novamente mais tarde.`,
      };
    }

    if (dayCount >= dayLimit) {
      const resetTime = new Date(oneDayAgo.getTime() + 24 * 60 * 60 * 1000);
      return {
        allowed: false,
        remaining: 0,
        limit: dayLimit,
        resetTime,
        reason: isAuth
          ? `Limite de ${dayLimit} ${isBrowse ? 'requisições' : 'buscas'} por dia excedido. Tente novamente amanhã.`
          : `Limite de ${dayLimit} ${isBrowse ? 'requisições' : 'buscas'} gratuitas por dia excedido. Crie uma conta gratuita para continuar pesquisando.`,
      };
    }

    const remaining = Math.min(
      minuteLimit - minuteCount,
      hourLimit - hourCount,
      dayLimit - dayCount,
    );

    return {
      allowed: true,
      remaining,
      limit: dayLimit,
    };
  } catch (error) {
    console.error('[checkRateLimit] Unexpected error:', error);
    return { allowed: false, remaining: 0, limit: DEFAULT_RATE_LIMIT.anonymousSearchesPerDay, reason: 'Erro interno do servidor. Tente novamente mais tarde.' };
  }
}

export async function recordSearch(
  ipAddress: string,
  searchType: 'semantic' | 'keyword' | 'browse' | 'visit' = 'keyword',
  query?: string,
  country?: string,
  userId?: string
): Promise<void> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
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
    if (process.env.NODE_ENV === 'development') {
      console.log('[recordSearch] Called with', { ipAddress, searchType, query, country, userId });
    }
    throw new Error(`[recordSearch] Error recording search: ${error.message}`);
  }
}

export async function getSearchStats(ipAddress: string) {
  try {
    const supabase = getAdminSupabaseClient();
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
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
    const lastMinuteSearches = allSearches.filter(
      (s) => new Date(s.searched_at as string) > oneMinuteAgo
    );
    const lastHourSearches = allSearches.filter(
      (s) => new Date(s.searched_at as string) > oneHourAgo
    );
    const lastDaySearches = allSearches.filter(
      (s) => new Date(s.searched_at as string) > oneDayAgo
    );

    return {
      totalSearches: allSearches.length,
      searchesLastMinute: lastMinuteSearches.length,
      searchesLastHour: lastHourSearches.length,
      searchesLastDay: lastDaySearches.length,
      semanticSearches: allSearches.filter((s) => s.search_type === 'semantic').length,
      lastSearch: allSearches.length > 0 ? new Date(allSearches[0].searched_at as string) : null,
    };
  } catch (error) {
    console.error('[getSearchStats] Unexpected error:', error);
    return null;
  }
}

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

    if (process.env.NODE_ENV === 'development') {
      console.log(`[resetRateLimit] Rate limit reset for IP ${ipAddress}`);
    } else {
      console.log('[resetRateLimit] Rate limit reset successfully');
    }
  } catch (error) {
    console.error('[resetRateLimit] Error:', error);
    throw error;
  }
}
