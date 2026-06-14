import { getAdminSupabaseClient } from './supabase-server';
import { createClient } from '@supabase/supabase-js';

export interface RateLimitConfig {
  anonymousSearchesPerDay: number;
  authenticatedSearchesPerDay: number;
}

export const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  anonymousSearchesPerDay: 5,
  authenticatedSearchesPerDay: 5,
};

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
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
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const isAuth = !!userId;
    const dayLimit = isAuth ? config.authenticatedSearchesPerDay : config.anonymousSearchesPerDay;

    const searchTypes = searchType === 'visit' || searchType === 'browse'
      ? [searchType]
      : ['semantic', 'keyword'];

    const idField = isAuth && userId ? 'user_id' : 'ip_address';
    const idValue = isAuth && userId ? userId : ipAddress;

    const { count: dayCount, error } = await supabase
      .from('search_usage')
      .select('id', { count: 'exact', head: true })
      .in('search_type', searchTypes)
      .eq(idField, idValue)
      .gte('searched_at', oneDayAgo.toISOString());

    if (error && error.code !== 'PGRST200') {
      console.error('[checkRateLimit] Query error:', error);
      return { allowed: false, remaining: 0, limit: dayLimit, reason: 'Erro interno do servidor. Tente novamente mais tarde.' };
    }

    const currentCount = dayCount || 0;

    if (currentCount >= dayLimit) {
      return {
        allowed: false,
        remaining: 0,
        limit: dayLimit,
        reason: isAuth
          ? `Limite de ${dayLimit} buscas por dia excedido. Tente novamente amanhã.`
          : `Limite de ${dayLimit} buscas gratuitas por dia excedido. Crie uma conta gratuita para continuar pesquisando.`,
      };
    }

    return {
      allowed: true,
      remaining: Math.max(0, dayLimit - currentCount),
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
