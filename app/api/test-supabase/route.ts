export const runtime = 'edge';
export const preferredRegion = 'auto';

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  try {
    console.log('[test-supabase] Testing countries table...');
    
    // Fetch countries using direct REST API (Edge compatible)
    const countriesResponse = await fetch(
      `${supabaseUrl}/rest/v1/countries?select=*`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    let countries = [];
    let countriesError = null;
    
    if (countriesResponse.ok) {
      countries = await countriesResponse.json();
    } else {
      countriesError = await countriesResponse.text();
    }

    console.log('[test-supabase] Countries result:', { count: countries?.length, error: countriesError });

    console.log('[test-supabase] Testing categories table...');
    
    // Fetch categories using direct REST API (Edge compatible)
    const categoriesResponse = await fetch(
      `${supabaseUrl}/rest/v1/categories?select=*`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    let categories = [];
    let categoriesError = null;
    
    if (categoriesResponse.ok) {
      categories = await categoriesResponse.json();
    } else {
      categoriesError = await categoriesResponse.text();
    }

    console.log('[test-supabase] Categories result:', { count: categories?.length, error: categoriesError });

    return Response.json({
      ok: true,
      countries: countries || [],
      categories: categories || [],
      countriesError: countriesError,
      categoriesError: categoriesError,
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
