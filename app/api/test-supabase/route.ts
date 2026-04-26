import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    console.log('[test-supabase] Testing countries table...');
    const { data: countries, error: countriesError } = await supabase
      .from('countries')
      .select('*');

    console.log('[test-supabase] Countries result:', { count: countries?.length, error: countriesError });

    console.log('[test-supabase] Testing categories table...');
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('*');

    console.log('[test-supabase] Categories result:', { count: categories?.length, error: categoriesError });

    return Response.json({
      ok: true,
      countries: countries || [],
      categories: categories || [],
      countriesError: countriesError?.message,
      categoriesError: categoriesError?.message,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[test-supabase] Exception:', err?.message);
    return Response.json({
      ok: false,
      error: err?.message,
    }, { status: 500 });
  }
}
