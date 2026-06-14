export const runtime = 'edge';
import { searchNormsSemantic } from '@/app/actions/norm-actions';
import { isValidTextInput } from '@/lib/search-utils';
import { getAuthenticatedSupabaseClient } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await getAuthenticatedSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    const adminEmail = process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    if (authError || !user || user.email?.toLowerCase() !== adminEmail?.toLowerCase()) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 401 });
  }
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('query') || 'qual deve ser a area maxima do ocupaçãao dos lotes';
  const country = searchParams.get('country') || 'Moçambique';
  const limit = parseInt(searchParams.get('limit') || '10');

  if (!isValidTextInput(query)) {
    console.warn('[test-search] Query rejeitada: não é texto válido');
    return NextResponse.json({ success: false, error: 'Consulta inválida.' }, { status: 400 });
  }

  console.log('=== TESTE DE BUSCA SEMÂNTICA ===');
  console.log('Query:', query);
  console.log('País:', country);
  console.log('Limit:', limit);

  try {
    const results = await searchNormsSemantic(query, country, limit);
    
    console.log(`\n=== RESULTADOS: ${results.length} ===`);
    
    return NextResponse.json({
      success: true,
      query,
      country,
      count: results.length,
      results: results.map(r => ({
        normCode: r.normCode,
        normTitle: r.normTitle,
        normCountry: r.normCountry,
        similarity: r.similarity,
        sectionType: r.sectionType,
        sectionNumber: r.sectionNumber,
        sectionTitle: r.sectionTitle,
        content: r.content.substring(0, 500),
        hierarchy: {
          titulo: r.titulo,
          capitulo: r.capitulo,
          seccao: r.seccao,
          artigo: r.artigo,
        }
      }))
    });
  } catch {
    console.error('[test-search] Erro interno ao processar busca');
    return NextResponse.json({
      success: false,
      error: 'Erro interno no servidor',
      query,
      country
    }, { status: 500 });
  }
}
