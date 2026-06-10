const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function getActualExcerpts() {
  console.log('🔍 Extraindo trechos reais do banco de dados...\n');

  try {
    // Buscar as normas de Moçambique que apareceram no teste anterior
    const { data: norms, error } = await supabase
      .from('norms')
      .select('code, title, content, description')
      .in('code', ['REGEU', 'PEU'])
      .eq('country_id', 3); // ID 3 é Moçambique

    if (error) throw error;

    if (!norms || norms.length === 0) {
      console.log('⚠️ Nenhuma norma encontrada para extrair trechos.');
      return;
    }

    norms.forEach(norm => {
      console.log(`=== NORMA: ${norm.code} - ${norm.title} ===`);
      
      const content = norm.content || norm.description || '';
      const searchTerms = ['área', 'edifício', 'ocupação', 'máxima', 'implantação'];
      
      // Encontrar ocorrências e pegar contextos
      const lowerContent = content.toLowerCase();
      let foundAny = false;

      searchTerms.forEach(term => {
        let pos = lowerContent.indexOf(term.normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
        if (pos === -1) pos = lowerContent.indexOf(term); // Tentar com acento também

        if (pos !== -1) {
          foundAny = true;
          const start = Math.max(0, pos - 80);
          const end = Math.min(content.length, pos + 120);
          const snippet = content.substring(start, end).replace(/\n/g, ' ').trim();
          console.log(`📍 [Termo: ${term}]: "...${snippet}..."`);
        }
      });

      if (!foundAny) {
        console.log('ℹ️ Nenhum trecho específico com as palavras-chave foi encontrado no resumo disponível.');
      }
      console.log('\n');
    });

  } catch (err) {
    console.error('❌ Erro:', err.message);
  }
}

getActualExcerpts();
