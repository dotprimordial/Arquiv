const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testQuery(queryText, countryName = 'Moçambique') {
  console.log(`\n🚀 Simulação de busca para: "${queryText}" (${countryName})`);

  try {
    const { data: countryData } = await supabase.from('countries').select('id').eq('name', countryName).single();
    if (!countryData) return console.error('País não encontrado');

    console.log('--- 1. BUSCA TRADICIONAL (SQL) ---');
    const { data: traditional } = await supabase
      .from('norms')
      .select('code, title')
      .eq('country_id', countryData.id)
      .or('content.ilike.%edific%,title.ilike.%edific%,content.ilike.%area%,title.ilike.%area%')
      .limit(3);
    
    traditional?.forEach(n => console.log(`- [${n.code}] ${n.title}`));

    console.log('\n--- 2. BUSCA SEMÂNTICA (SIMULAÇÃO DE IA) ---');
    console.log('A IA analisaria a query e identificaria os conceitos: "Ocupação", "Área Máxima", "Índice de Edificabilidade".');
    console.log('Mesmo sem resultados exatos no banco, o sistema usaria o fallback para IA...');
    
    // Simular o que aconteceria se chamasse o backend real
    console.log('\n--- 3. RESULTADO ESPERADO NA INTERFACE ---');
    console.log('O usuário veria uma mensagem de "Busca Inteligente" com trechos como:');
    console.log('> "O índice de ocupação máximo permitido para zonas residenciais é de 60%..."');
    console.log('> "A área de implantação não deve exceder..."');

  } catch (err) {
    console.error(err);
  }
}

testQuery("qual é a area maxima que um edificio deve ocupar?", "Moçambique");
