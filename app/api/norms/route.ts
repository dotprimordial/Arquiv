export const runtime = 'nodejs';

import { getAuthenticatedSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const countryParam = url.searchParams.get('country') || 'Portugal';
    const categoryParam = url.searchParams.get('category') || 'Todas';

    console.log(`[api/norms] Query: country=${countryParam}, category=${categoryParam}`);

    const supabase = await getAuthenticatedSupabaseClient();
    const selectFields = "id, code, title, description, category_id, country_id, keywords, total_sections";

    // Get country ID
    const { data: countryData, error: countryError } = await supabase
      .from("countries")
      .select("id")
      .eq("name", countryParam)
      .single();

    if (countryError || !countryData) {
      return Response.json({
        error: `País "${countryParam}" não encontrado`,
        details: countryError?.message
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
        error: 'Erro ao buscar normas',
        details: normsError.message
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
    const err = error as Error;
    return Response.json({
      error: 'Erro interno',
      details: err?.message
    }, { status: 500 });
  }
}
