const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectDatabase() {
  console.log('🧐 Inspecionando banco de dados...\n');

  try {
    // 1. Ver países disponíveis
    const { data: countries } = await supabase.from('countries').select('id, name');
    console.log('🌍 Países disponíveis:', countries?.map(c => `${c.name} (ID: ${c.id})`).join(', '));

    if (!countries || countries.length === 0) {
      console.log('❌ Nenhum país no banco.');
      return;
    }

    // 2. Ver as primeiras 5 normas
    const { data: norms } = await supabase.from('norms').select('id, code, title, country_id').limit(5);
    console.log('\n📚 Primeiras 5 normas encontradas:');
    norms?.forEach(n => console.log(`- [${n.code}] ${n.title} (País ID: ${n.country_id})`));

    // 3. Tentar buscar algo sobre "edificio" ou "area" de forma genérica sem filtro de país
    const { data: searchTest } = await supabase
      .from('norms')
      .select('id, code, title')
      .or('content.ilike.%edific%,title.ilike.%edific%,content.ilike.%area%,title.ilike.%area%')
      .limit(3);
    
    console.log('\n🔍 Busca genérica (edificio/area):');
    searchTest?.forEach(n => console.log(`- [${n.code}] ${n.title}`));

  } catch (err) {
    console.error('❌ Erro:', err.message);
  }
}

inspectDatabase();
