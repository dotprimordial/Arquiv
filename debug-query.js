const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Use environment variables for credentials to avoid leaking secrets
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials not available. Set SUPABASE_URL and SUPABASE_KEY in your environment.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('🔍 Testando query exata que o website faz...\n');

  try {
    // Exactly what getArchitecturalNorms does
    const country = 'Portugal';
    const category = 'Todas';
    const selectFields = "id, code, title, category_id, country_id, keywords, total_sections, summaries!left(summary)";

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
      .select("id, code, title, category_id, country_id, content")
      .ilike("content", "%profundidade%")
      .limit(10);

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
        if (norm.content) {
          const contentStr = String(norm.content);
          const matchIdx = contentStr.toLowerCase().indexOf('profundidade');
          if (matchIdx !== -1) {
            const start = Math.max(0, matchIdx - 100);
            const end = Math.min(contentStr.length, matchIdx + 200);
            console.log(`     Trecho: "...${contentStr.substring(start, end).replace(/\n/g, ' ')}..."`);
          }
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
