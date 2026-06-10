const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function findHeightInDB() {
  console.log('🔍 Buscando termos de altura (altura, cercea, pavimentos, andares) no REGEU e PEU...\n');

  try {
    const { data: norms, error } = await supabase
      .from('norms')
      .select('id, code, title, content')
      .in('code', ['REGEU', 'PEU'])
      .eq('country_id', 3);

    if (error) throw error;

    norms.forEach(norm => {
      console.log(`=== ANALISANDO: ${norm.code} ===`);
      const content = norm.content || '';
      const lowerContent = content.toLowerCase();
      const terms = ['altura', 'cércea', 'pavimentos', 'andares', 'máxima', 'piso'];
      
      let found = false;
      terms.forEach(term => {
        const regex = new RegExp(`.{0,100}${term}.{0,100}`, 'gi');
        let match;
        while ((match = regex.exec(content)) !== null) {
          found = true;
          console.log(`📍 ACHADO [${term}]: "...${match[0].replace(/\n/g, ' ')}..."\n`);
        }
      });
      if (!found) console.log('❌ Nenhum termo de altura encontrado nesta norma.');
      console.log('\n');
    });

  } catch (err) {
    console.error('❌ Erro:', err.message);
  }
}

findHeightInDB();
