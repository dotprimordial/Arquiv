const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function findPrecisionInPEU() {
  console.log('🔍 Buscando o valor de 70% no documento PEU...\n');

  try {
    const { data: norm, error } = await supabase
      .from('norms')
      .select('content')
      .eq('code', 'PEU')
      .eq('country_id', 3)
      .single();

    if (error) throw error;
    if (!norm) {
      console.log('⚠️ Norma PEU não encontrada.');
      return;
    }

    const content = norm.content || '';
    const lowerContent = content.toLowerCase();
    
    // Procurar por "70" e termos próximos
    const searchTerms = ['70%', '70 por cento', 'setenta por cento', '0,7', '0.7'];
    let found = false;

    searchTerms.forEach(term => {
      let pos = lowerContent.indexOf(term);
      if (pos !== -1) {
        found = true;
        const start = Math.max(0, pos - 150);
        const end = Math.min(content.length, pos + 150);
        console.log(`✅ ACHADO [${term}]:\n"...${content.substring(start, end).replace(/\n/g, ' ')}..."\n`);
      }
    });

    if (!found) {
      console.log('❌ O valor de "70%" não foi encontrado no conteúdo textual da norma no banco.');
      console.log('Isso explica por que a busca não o apresentou.');
      
      // Mostrar uma amostra do conteúdo para entender o que tem lá
      console.log('\n--- Amostra do conteúdo disponível: ---');
      console.log(content.substring(0, 1000));
    }

  } catch (err) {
    console.error('❌ Erro:', err.message);
  }
}

findPrecisionInPEU();
