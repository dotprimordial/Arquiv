export const runtime = 'nodejs';

import { checkRateLimit, getSearchStats } from '@/lib/rate-limit';
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

    // Check rate limit
    const rateLimitStatus = await checkRateLimit(clientIp, 'semantic');
    
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
    console.error('[api/rate-limit] Ocorreu um erro');
    return NextResponse.json(
      { 
        error: 'Erro ao verificar limite de buscas'
      },
      { status: 500 }
    );
  }
}
