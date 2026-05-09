export const runtime = 'nodejs';

import { getAuthenticatedSupabaseClient, getAdminSupabaseClient } from '@/lib/supabase-server';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: Request) {
  try {
    const supabase = await getAuthenticatedSupabaseClient();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const supabaseAdmin = getAdminSupabaseClient();

    console.log('[debug-norms] Starting diagnostic...');

    // 1. Check countries
    const { data: countries, error: countriesError } = await supabase
      .from('countries')
      .select('id, name')
      .limit(20);

    console.log('[debug-norms] Countries:', { count: countries?.length, error: countriesError?.message });

    // 2. Check categories
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('id, name')
      .limit(20);

    console.log('[debug-norms] Categories:', { count: categories?.length, error: categoriesError?.message });

    // 3. Check total norms count
    const { data: normsAll, error: normsAllError } = await supabase
      .from('norms')
      .select('id', { count: 'exact' });

    const normsCount = normsAll?.length || 0;
    console.log('[debug-norms] Total norms:', { count: normsCount, error: normsAllError?.message });

    // 4. Check norms with country_id
    const { data: normsWithCountry, error: normsWithCountryError } = await supabase
      .from('norms')
      .select('id, code, title, country_id')
      .not('country_id', 'is', null)
      .limit(5);

    console.log('[debug-norms] Norms with country_id:', { 
      count: normsWithCountry?.length, 
      samples: normsWithCountry?.map(n => ({ code: n.code, country_id: n.country_id })),
      error: normsWithCountryError?.message 
    });

    // 5. Check norms WITHOUT country_id
    const { data: normsNoCountry, error: normsNoCountryError } = await supabase
      .from('norms')
      .select('id, code, title, country_id')
      .is('country_id', null)
      .limit(5);

    console.log('[debug-norms] Norms WITHOUT country_id:', { 
      count: normsNoCountry?.length,
      error: normsNoCountryError?.message 
    });

    // 6. Try to get active countries (like the app does)
    const { data: activeCountriesData, error: activeCountriesError } = await supabase
      .from('norms')
      .select('country_id, countries(name)')
      .not('country_id', 'is', null)
      .limit(50);

    const activeCountries = new Set<string>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (activeCountriesData || []).forEach((item: any) => {
      if (item.countries && item.countries[0]?.name) {
        activeCountries.add(item.countries[0].name);
      }
    });

    console.log('[debug-norms] Active countries:', { 
      count: activeCountries.size,
      list: Array.from(activeCountries),
      error: activeCountriesError?.message 
    });

    // 7. Try to get norms for first country
    const firstCountry = (countries || [])[0];
    let normsForCountryData: Array<{ id: string; code: string; title: string; country_id: string }> = [];
    let normsForCountryError: Error | null = null;

    if (firstCountry) {
      const { data, error } = await supabase
        .from('norms')
        .select('id, code, title, country_id')
        .eq('country_id', firstCountry.id)
        .limit(5);

      normsForCountryData = data || [];
      normsForCountryError = error;
    }

    console.log('[debug-norms] Norms for first country:', {
      country: firstCountry?.name,
      count: normsForCountryData.length,
      error: normsForCountryError?.message
    });

    return Response.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      diagnostics: {
        countries: {
          total: countries?.length || 0,
          list: countries?.map(c => ({ id: c.id, name: c.name })) || [],
          error: countriesError?.message
        },
        categories: {
          total: categories?.length || 0,
          list: categories?.map(c => ({ id: c.id, name: c.name })) || [],
          error: categoriesError?.message
        },
        norms: {
          total: normsCount,
          withCountryId: normsWithCountry?.length || 0,
          withoutCountryId: normsNoCountry?.length || 0,
          samplesWithCountry: normsWithCountry?.map(n => ({ code: n.code, country_id: n.country_id })) || [],
          error: normsWithCountryError?.message || normsNoCountryError?.message
        },
        activeCountries: {
          count: activeCountries.size,
          list: Array.from(activeCountries),
          error: activeCountriesError?.message
        },
        normsForFirstCountry: {
          country: firstCountry?.name,
          count: normsForCountryData.length,
          error: normsForCountryError?.message
        }
      }
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[debug-norms] Exception:', err?.message, err?.stack);
    return Response.json({
      status: 'error',
      error: err?.message
    }, { status: 500 });
  }
}
