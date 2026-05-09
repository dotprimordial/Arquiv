const { createClient } = require('@supabase/supabase-js');

// Supabase credentials
const supabaseUrl = 'https://cpyxixrjsgxccayqzkxc.supabase.co';
const supabaseKey = 'sb_publishable_Vdfaj3AupiGxeMD4j5ingA_dxyjy1Oh';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('🔍 Testando query exata que o website faz...\n');

  try {
    // Exactly what getArchitecturalNorms does
    const country = 'Portugal';
    const category = 'Todas';
    const selectFields = "id, code, title, description, category_id, country_id, keywords, total_sections";

    console.log(`Buscando normas para: País="${country}", Categoria="${category}"`);
    console.log(`SELECT: ${selectFields}\n`);

    // Get country ID
    console.log('Step 1: Resolver país "Portugal"...');
    const { data: countryData, error: countryError } = await supabase
      .from("countries")
      .select("id")
      .eq("name", country)
      .single();

    if (countryError || !countryData) {
      console.error('❌ Erro ao resolver país:', countryError?.message);
      return;
    }

    console.log(`✓ País ID: ${countryData.id}\n`);

    // Build the query
    console.log('Step 2: Buscar normas...');
    let query = supabase
      .from("norms")
      .select(selectFields)
      .eq("country_id", countryData.id)
      .limit(50);

    const result = await query;
    const data = result.data;
    const error = result.error;

    if (error) {
      console.error('❌ Erro na query:', error.message);
      return;
    }

    console.log(`✓ Obtidas ${data?.length || 0} normas\n`);

    if (data && data.length > 0) {
      console.log('📚 NORMAS RETORNADAS:');
      data.forEach((norm, idx) => {
        console.log(`\n  ${idx + 1}. ${norm.code} - ${norm.title}`);
        console.log(`     ID: ${norm.id}`);
        console.log(`     Country: ${norm.country_id}, Category: ${norm.category_id}`);
        if (norm.description) {
          console.log(`     Desc: ${norm.description.substring(0, 60)}`);
        }
        if (norm.keywords) {
          console.log(`     Keywords: ${norm.keywords}`);
        }
      });
    } else {
      console.log('⚠️  NENHUMA NORMA RETORNADA!');
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

main();
