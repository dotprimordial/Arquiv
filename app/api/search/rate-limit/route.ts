export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { checkRateLimit, getSearchStats } from '@/lib/rate-limit';
import { getAuthenticatedSupabaseClient } from '@/lib/supabase-server';
import { NextResponse, NextRequest } from 'next/server';

/**
 * GET /api/search/rate-limit
 * Check the current rate limit status for the client IP
 */
export async function GET(request: NextRequest) {
  try {
    // Get IP from request headers
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
               request.headers.get('x-real-ip') ||
               (request as { ip?: string }).ip ||
               'unknown';

    const clientIp = ip.trim();

    // Obter cliente Supabase autenticado para ler sessão do usuário logado
    const supabase = await getAuthenticatedSupabaseClient();
    let userId: string | undefined;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id;
    } catch {
      // Ignorar erros se não autenticado
    }

    // Check rate limit
    const rateLimitStatus = await checkRateLimit(clientIp, 'semantic', undefined, userId);

    // Get detailed stats
    const stats = await getSearchStats(clientIp);

    return NextResponse.json({
      clientIp,
      rateLimit: {
        allowed: rateLimitStatus.allowed,
        remaining: rateLimitStatus.remaining,
        limit: rateLimitStatus.limit,
        resetTime: rateLimitStatus.resetTime,
        reason: rateLimitStatus.reason,
      },
      stats: stats || {
        totalSearches: 0,
        searchesLastDay: 0,
        semanticSearches: 0,
      },
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('[api/rate-limit] Error:', errorMsg);
    // Return 200 with safe defaults instead of 500 to avoid blocking UI
    return NextResponse.json({
      clientIp: 'unknown',
      rateLimit: {
        allowed: true,
        remaining: 5,
        limit: 5,
        reason: undefined,
      },
      stats: {
        totalSearches: 0,
        searchesLastDay: 0,
        semanticSearches: 0,
      },
    });
  }
}
