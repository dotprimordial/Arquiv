import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateDescriptions() {
  try {
    console.log('Fetching all norms...');
    const { data: norms, error } = await supabase
      .from('norms')
      .select('id, code, title');

    if (error) {
      console.error('Error fetching norms:', error);
      process.exit(1);
    }

    console.log(`Found ${norms?.length || 0} norms`);

    if (!norms || norms.length === 0) {
      console.log('No norms found in database');
      return;
    }

    let updated = 0;
    let failed = 0;

    for (const norm of norms) {
      const exampleDescription = `Esta norma ${norm.code} - ${norm.title} estabelece os requisitos técnicos e procedimentos necessários para sua implementação. O documento contém disposições sobre os principais aspectos da norma, incluindo definições, requisitos de conformidade, e diretrizes para aplicação. Para informações detalhadas sobre cada artigo e capítulo, consulte o documento completo.`;

      const { error: updateError } = await supabase
        .from('norms')
        .update({ description: exampleDescription })
        .eq('id', norm.id);

      if (updateError) {
        console.error(`Failed to update norm ${norm.id}:`, updateError);
        failed++;
      } else {
        console.log(`✓ Updated norm ${norm.id} (${norm.code})`);
        updated++;
      }
    }

    console.log(`\nSummary: ${updated} updated, ${failed} failed`);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

updateDescriptions();
