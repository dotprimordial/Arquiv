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

    console.log('[test-supabase] Testing norms table...');
    
    // Count total norms
    const normsCountResponse = await fetch(
      `${supabaseUrl}/rest/v1/norms?select=count=exact`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    let normsCount = 0;
    if (normsCountResponse.ok) {
      const countHeader = normsCountResponse.headers.get('content-range');
      if (countHeader) {
        const parts = countHeader.split('/');
        normsCount = parseInt(parts[1] || '0', 10);
      }
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _normsCountError = await normsCountResponse.text();
    }

    // Get sample norms with countries
    const normsResponse = await fetch(
      `${supabaseUrl}/rest/v1/norms?select=id,code,title,country_id,countries(id,name)&limit=10`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    let norms = [];
    let normsError = null;
    if (normsResponse.ok) {
      norms = await normsResponse.json();
    } else {
      normsError = await normsResponse.text();
    }

    console.log('[test-supabase] Norms result:', { count: normsCount, sampleCount: norms?.length, error: normsError });

    // Get active countries (from norms)
    const activeCountriesResponse = await fetch(
      `${supabaseUrl}/rest/v1/norms?select=country_id,countries(name)&limit=1000`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    let activeCountriesData: string[] = [];
    let activeCountriesError = null;
    if (activeCountriesResponse.ok) {
      const data = await activeCountriesResponse.json();
      const countrySet = new Set<string>();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (data || []).forEach((item: any) => {
        if (item.countries && item.countries.name) {
          countrySet.add(item.countries.name);
        }
      });
      activeCountriesData = Array.from(countrySet);
    } else {
      activeCountriesError = await activeCountriesResponse.text();
    }

    console.log('[test-supabase] Active countries from norms:', { count: activeCountriesData.length, countries: activeCountriesData, error: activeCountriesError });

    return Response.json({
      ok: true,
      countries: countries || [],
      categories: categories || [],
      norms: {
        totalCount: normsCount,
        sampleCount: norms?.length,
        samples: norms || [],
        error: normsError,
      },
      activeCountries: {
        list: activeCountriesData,
        error: activeCountriesError,
      },
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
