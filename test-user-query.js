const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// Simulação simplificada de search-utils.ts
function removeAccents(text) {
  if (!text) return '';
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

const PORTUGUESE_STOP_WORDS = new Set([
  'a', 'o', 'as', 'os', 'um', 'uma', 'uns', 'umas', 'de', 'do', 'da', 'dos', 'das', 'em', 'no', 'na', 'nos', 'nas',
  'para', 'por', 'com', 'sem', 'sobre', 'entre', 'até', 'que', 'quem', 'qual', 'quais', 'é', 'são', 'como', 'onde'
]);

function extractKeywords(query) {
  const normalized = removeAccents(query);
  const words = normalized.split(/\s+/);
  return [...new Set(words.filter(word => word.length >= 3 && !PORTUGUESE_STOP_WORDS.has(word)))];
}

async function testQuery(queryText, countryName = 'Portugal') {
  console.log(`\n🚀 Testando query: "${queryText}" para o país: ${countryName}`);
  
  const keywords = extractKeywords(queryText);
  console.log(`🔑 Palavras-chave extraídas: ${keywords.join(', ')}`);

  // Adiciona sinônimos comuns para área máxima/ocupação
  const searchTerms = [...keywords];
  if (keywords.includes('area') || keywords.includes('ocupar')) {
    searchTerms.push('ocupacao', 'coeficiente', 'indice', 'taxa', 'afastamento', 'recuo');
  }

  try {
    // 1. Resolver país
    const { data: countryData } = await supabase.from('countries').select('id').eq('name', countryName).single();
    if (!countryData) {
      console.error('❌ País não encontrado');
      return;
    }

    // 2. Buscar normas que contenham os termos no conteúdo ou título
    // Simulando a busca textual do sistema
    console.log('Searching norms...');
    
    // Vamos buscar normas que tenham qualquer uma das palavras chave no conteúdo
    let orFilter = searchTerms.map(term => `content.ilike.%${term}%`).join(',');
    
    const { data: norms, error } = await supabase
      .from('norms')
      .select('id, code, title, content, description')
      .eq('country_id', countryData.id)
      .or(orFilter)
      .limit(5);

    if (error) throw error;

    console.log(`✅ Encontradas ${norms?.length || 0} normas potenciais.\n`);

    if (norms && norms.length > 0) {
      norms.forEach((norm, idx) => {
        console.log(`--- [${idx + 1}] ${norm.code}: ${norm.title} ---`);
        
        // Encontrar o trecho mais relevante
        const content = norm.content || '';
        const lowerContent = content.toLowerCase();
        
        let bestSnippet = '';
        for (const term of searchTerms) {
          const pos = lowerContent.indexOf(term);
          if (pos !== -1) {
            const start = Math.max(0, pos - 100);
            const end = Math.min(content.length, pos + 200);
            bestSnippet = content.substring(start, end).replace(/\n/g, ' ');
            break;
          }
        }
        
        console.log(`📍 Trecho: "...${bestSnippet}..."`);
        console.log('\n');
      });
    } else {
      console.log('⚠️ Nenhuma norma encontrada com esses termos.');
    }

  } catch (err) {
    console.error('❌ Erro no teste:', err.message);
  }
}

const query = "qual é a area maxima que um edificio deve ocupar?";
testQuery(query);
