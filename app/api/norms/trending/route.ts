export const runtime = 'edge';
import { getAuthenticatedSupabaseClient } from '@/lib/supabase-server';
import { checkRateLimit, recordSearch } from '@/lib/rate-limit';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/norms/trending?limit=5&cursor=timestamp
 * Returns trending (most frequently searched/viewed) norms for recommendations
 * Uses cursor-based pagination for infinite scroll
 */
export async function GET(req: NextRequest) {
  try {
    const ip = req.headers.get('cf-connecting-ip') ||
               req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
               req.headers.get('x-real-ip') ||
               'unknown';

    const rateLimitResult = await checkRateLimit(ip, 'browse');
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: rateLimitResult.reason || 'Limite de requisições excedido.' },
        { status: 429 }
      );
    }

    try {
      await recordSearch(ip, 'browse');
    } catch {
      // Non-critical: don't block request if recording fails
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);
    const cursor = searchParams.get('cursor');

    const supabase = await getAuthenticatedSupabaseClient();

    // Build query with cursor-based pagination
    let query = supabase
      .from('norms')
      .select('id, code, title, category_id, categories(name), summaries!left(summary), created_at');

    // If cursor provided, filter for records created before the cursor
    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    // Fetch top norms ordered by creation date (recently added are good recommendations)
    // In a real app, you'd track view counts or search frequency
    const { data: norms, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit + 1); // Fetch one extra to determine if there's a next page

    if (error) {
      console.error('[GET /api/norms/trending] Ocorreu um erro');
      return NextResponse.json(
        { error: 'Erro ao buscar normas em alta' },
        { status: 500 }
      );
    }

    // Format response with cursor for pagination
    interface FormattedNorm {
      id: string;
      code: string;
      title: string;
      category?: string;
    }

    const hasMore = (norms || []).length > limit;
    const items = hasMore ? (norms || []).slice(0, limit) : (norms || []);
    
    const formatted: FormattedNorm[] = items.map((norm: Record<string, unknown>) => ({
      id: (norm.id as string) || '',
      code: (norm.code as string) || '',
      title: (norm.title as string) || '',
      category: ((norm.categories as Record<string, unknown>)?.name as string | undefined),
    }));

    // Get cursor from the last item if there are more results
    const nextCursor = hasMore && items.length > 0 
      ? (items[items.length - 1] as Record<string, unknown>).created_at as string
      : null;

    return NextResponse.json({
      norms: formatted,
      nextCursor,
      hasMore
    });
  } catch {
    console.error('[GET /api/norms/trending] Ocorreu um erro');
    return NextResponse.json(
      { error: 'Erro interno no servidor' },
      { status: 500 }
    );
  }
}
