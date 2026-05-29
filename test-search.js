// Test script for semantic search
const { searchNormsSemantic } = require('./app/actions/norm-actions.ts');

async function testSearch() {
  const query = "qual é a profundidade maxima dos edificios";
  const country = "Portugal"; // Vou testar Portugal como exemplo, depois posso mudar se necessário
  
  console.log('=== TESTE DE BUSCA SEMÂNTICA ===');
  console.log('Query:', query);
  console.log('País:', country);
  console.log('\nIniciando busca...\n');
  
  try {
    const results = await searchNormsSemantic(query, country, 10);
    
    console.log('\n=== RESULTADOS ===');
    console.log(`Encontrados: ${results.length} resultados\n`);
    
    results.forEach((result, index) => {
      console.log(`\n--- Resultado ${index + 1} ---`);
      console.log(`Norma: ${result.normCode} - ${result.normTitle}`);
      console.log(`País: ${result.normCountry}`);
      console.log(`Similaridade: ${result.similarity.toFixed(4)}`);
      console.log(`Seção: ${result.sectionType} ${result.sectionNumber || ''}`);
      console.log(`Título da Seção: ${result.sectionTitle || 'N/A'}`);
      console.log(`Conteúdo: ${result.content.substring(0, 200)}...`);
      
      if (result.titulo) console.log(`Título: ${result.titulo}`);
      if (result.capitulo) console.log(`Capítulo: ${result.capitulo}`);
      if (result.artigo) console.log(`Artigo: ${result.artigo}`);
    });
    
  } catch (error) {
    console.error('\n=== ERRO ===');
    console.error(error.message);
    console.error(error.stack);
  }
}

testSearch();
