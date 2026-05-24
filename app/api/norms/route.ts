export const runtime = 'edge';

import { getAuthenticatedSupabaseClient } from '@/lib/supabase-server';
import { checkRateLimit, recordSearch } from '@/lib/rate-limit';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const countryParam = url.searchParams.get('country') || 'Portugal';
    const categoryParam = url.searchParams.get('category') || 'Todas';

    console.log(`[api/norms] Query: country=${countryParam}, category=${categoryParam}`);
    // Validação básica de ambiente
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error('[api/norms] Erro crítico: NEXT_PUBLIC_SUPABASE_URL não configurada');
      return Response.json({ error: 'Configuração do servidor incompleta' }, { status: 500 });
    }

    const supabase = await getAuthenticatedSupabaseClient();

    // Obter IP do cliente a partir dos cabeçalhos
    const headersList = request.headers;
    const cfIp = headersList.get('cf-connecting-ip');
    const forwardedFor = headersList.get('x-forwarded-for');
    const realIp = headersList.get('x-real-ip');
    
    const ip = cfIp || 
               (forwardedFor ? forwardedFor.split(',')[0] : null) || 
               realIp || 
               'unknown';
    const clientIp = ip.trim();

    // Obter ID do usuário autenticado se disponível (rate limiting híbrido)
    let userId: string | undefined;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id;
    } catch {
      // Ignorar erros de verificação de autenticação
    }

    // Verificar rate limit para navegação geral ('browse')
    const rateLimitResult = await checkRateLimit(clientIp, 'browse', undefined, userId);

    if (!rateLimitResult.allowed) {
      return Response.json({
        error: rateLimitResult.reason || 'Limite de requisições excedido. Tente novamente amanhã.'
      }, { status: 429 });
    }

    // Registrar o acesso para controle do rate limiter
    try {
      await recordSearch(clientIp, 'browse', undefined, countryParam, userId);
    } catch (err) {
      console.warn('[api/norms] Erro ao registrar acesso no rate limiter:', err);
    }

    const selectFields = "id, code, title, category_id, country_id, keywords, total_sections, summaries!left(summary)";

    // Get country ID
    const { data: countryData, error: countryError } = await supabase
      .from("countries")
      .select("id")
      .eq("name", countryParam)
      .single();

    if (countryError || !countryData) {
      return Response.json({
        error: `País "${countryParam}" não encontrado`
      }, { status: 400 });
    }

    let query = supabase
      .from("norms")
      .select(selectFields)
      .eq("country_id", countryData.id);

    if (categoryParam !== "Todas") {
      const { data: catData } = await supabase
        .from("categories")
        .select("id")
        .eq("name", categoryParam)
        .single();

      if (catData) {
        query = query.eq("category_id", catData.id);
      }
    }

    const { data: norms, error: normsError } = await query.limit(50);

    if (normsError) {
      return Response.json({
        error: 'Erro ao buscar normas'
      }, { status: 500 });
    }

    return Response.json({
      success: true,
      count: norms?.length || 0,
      country: countryParam,
      category: categoryParam,
      norms: norms || []
    });
  } catch (error: unknown) {
    console.error('[api/norms] Ocorreu um erro na API:', error);
    return Response.json({
      error: 'Erro interno no servidor'
    }, { status: 500 });
  }
}
