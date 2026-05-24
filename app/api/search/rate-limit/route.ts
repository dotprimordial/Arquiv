export const runtime = 'nodejs';
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
               request.ip || 
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
    console.error('[api/rate-limit] Ocorreu um erro:', error);
    return NextResponse.json(
      { 
        error: 'Erro ao verificar limite de buscas'
      },
      { status: 500 }
    );
  }
}
