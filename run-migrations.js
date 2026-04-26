const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runMigrations() {
  const migrationsDir = path.join(__dirname, 'supabase', 'migrations');
  const files = fs.readdirSync(migrationsDir).sort();

  console.log(`Found ${files.length} migration files`);

  for (const file of files) {
    if (!file.endsWith('.sql')) continue;

    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf-8');

    console.log(`\n📄 Executing: ${file}`);
    try {
      const { error } = await supabase.rpc('exec_sql', { sql });
      if (error) {
        console.error(`❌ Error in ${file}:`, error.message);
      } else {
        console.log(`✅ ${file} executed successfully`);
      }
    } catch (err) {
      console.error(`❌ Failed to execute ${file}:`, err.message);
    }
  }

  console.log('\n✅ All migrations completed!');
}

runMigrations().catch(console.error);
