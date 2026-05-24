export const runtime = 'edge';
import { searchNormsSemantic } from '@/app/actions/norm-actions';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('query') || 'qual deve ser a area maxima do ocupaçãao dos lotes';
  const country = searchParams.get('country') || 'Moçambique';
  const limit = parseInt(searchParams.get('limit') || '10');

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
  } catch (error: unknown) {
    console.error('Erro no teste:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      query,
      country
    }, { status: 500 });
  }
}
