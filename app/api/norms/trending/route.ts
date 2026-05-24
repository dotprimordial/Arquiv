export const runtime = 'edge';
import { getAdminSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/norms/trending?limit=5
 * Returns trending (most frequently searched/viewed) norms for recommendations
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '5'), 50);

    const supabase = getAdminSupabaseClient();

    // Fetch top norms ordered by creation date (recently added are good recommendations)
    // In a real app, you'd track view counts or search frequency
    const { data: norms, error } = await supabase
      .from('norms')
      .select('id, code, title, category_id, categories(name), summaries!left(summary)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[GET /api/norms/trending] Ocorreu um erro');
      return NextResponse.json(
        { error: 'Erro ao buscar normas em alta' },
        { status: 500 }
      );
    }

    // Format response
    interface FormattedNorm {
      id: string;
      code: string;
      title: string;
      category?: string;
    }

    const formatted: FormattedNorm[] = (norms || []).map((norm: Record<string, unknown>) => ({
      id: (norm.id as string) || '',
      code: (norm.code as string) || '',
      title: (norm.title as string) || '',
      category: ((norm.categories as Record<string, unknown>)?.name as string | undefined),
    }));

    return NextResponse.json(formatted);
  } catch {
    console.error('[GET /api/norms/trending] Ocorreu um erro');
    return NextResponse.json(
      { error: 'Erro interno no servidor' },
      { status: 500 }
    );
  }
}
