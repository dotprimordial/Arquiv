const { createClient } = require('@supabase/supabase-js');

// Use environment variables for credentials to avoid leaking secrets
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials not available. Set SUPABASE_URL and SUPABASE_KEY in your environment.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('🔍 Diagnosticando banco de dados...\n');

  try {
    // 1. Countries
    const { data: countries, error: countriesError } = await supabase
      .from('countries')
      .select('id, name');
    
    console.log('📍 PAÍSES:');
    if (countriesError) {
      console.log('  ❌ Erro:', countriesError.message);
    } else {
      console.log(`  ✓ Total: ${countries.length}`);
      countries.forEach(c => console.log(`    - ${c.name} (id: ${c.id})`));
    }
    console.log();

    // 2. Categories
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('id, name');
    
    console.log('🏷️  CATEGORIAS:');
    if (categoriesError) {
      console.log('  ❌ Erro:', categoriesError.message);
    } else {
      console.log(`  ✓ Total: ${categories.length}`);
      categories.forEach(c => console.log(`    - ${c.name} (id: ${c.id})`));
    }
    console.log();

    // 3. Total norms
    const { data: normsAll, count: normsCount, error: normsAllError } = await supabase
      .from('norms')
      .select('id', { count: 'exact' });
    
    console.log('📚 NORMAS:');
    if (normsAllError) {
      console.log('  ❌ Erro:', normsAllError.message);
    } else {
      console.log(`  ✓ Total de normas: ${normsCount}`);
    }
    console.log();

    // 4. Norms with country_id
    const { data: normsWithCountry, error: normsWithCountryError } = await supabase
      .from('norms')
      .select('id, code, title, country_id, category_id, description')
      .not('country_id', 'is', null);
    
    console.log('🌍 NORMAS COM PAÍS:');
    if (normsWithCountryError) {
      console.log('  ❌ Erro:', normsWithCountryError.message);
    } else {
      console.log(`  ✓ Total: ${normsWithCountry.length}`);
      if (normsWithCountry.length > 0) {
        console.log('  Exemplos:');
        normsWithCountry.slice(0, 10).forEach(n => {
          console.log(`    - Código: "${n.code}", Título: "${n.title.substring(0, 40)}", Country: ${n.country_id}, Category: ${n.category_id}`);
          if (n.description) console.log(`      Desc: ${n.description.substring(0, 60)}`);
        });
      }
    }
    console.log();

    // 5. Norms without country_id
    const { data: normsNoCountry, error: normsNoCountryError } = await supabase
      .from('norms')
      .select('id, code, title, country_id')
      .is('country_id', null);
    
    console.log('⚠️  NORMAS SEM PAÍS:');
    if (normsNoCountryError) {
      console.log('  ❌ Erro:', normsNoCountryError.message);
    } else {
      console.log(`  ✓ Total: ${normsNoCountry.length}`);
      if (normsNoCountry.length > 0) {
        console.log('  Exemplos:');
        normsNoCountry.slice(0, 5).forEach(n => {
          console.log(`    - ${n.code}: ${n.title.substring(0, 40)}`);
        });
      }
    }
    console.log();

    // 6. Active countries (from norms with valid country_id)
    const { data: activeCountriesData, error: activeCountriesError } = await supabase
      .from('norms')
      .select('country_id, countries(name)')
      .not('country_id', 'is', null);
    
    const activeCountries = new Set();
    (activeCountriesData || []).forEach((item) => {
      if (item.countries && item.countries.name) {
        activeCountries.add(item.countries.name);
      }
    });

    console.log('🗺️  PAÍSES ATIVOS (com normas):');
    if (activeCountriesError) {
      console.log('  ❌ Erro:', activeCountriesError.message);
    } else {
      console.log(`  ✓ Total: ${activeCountries.size}`);
      Array.from(activeCountries).forEach(c => console.log(`    - ${c}`));
    }
    console.log();

    // Summary
    console.log('📊 RESUMO:');
    console.log(`  Total de países: ${countries?.length || 0}`);
    console.log(`  Total de categorias: ${categories?.length || 0}`);
    console.log(`  Total de normas: ${normsCount || 0}`);
    console.log(`  Normas com país: ${normsWithCountry?.length || 0}`);
    console.log(`  Normas SEM país: ${normsNoCountry?.length || 0}`);
    console.log(`  Países com normas: ${activeCountries.size}`);
    console.log();

    if ((normsWithCountry?.length || 0) === 0 && (normsCount || 0) > 0) {
      console.log('⚠️  PROBLEMA DETECTADO:');
      console.log('   Existem normas no banco, mas nenhuma tem country_id preenchido!');
      console.log('   As normas não apareceräo no website até serem vinculadas a países.');
    }

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
    process.exit(1);
  }
}

main();
