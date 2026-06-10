import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Usage: run with ts-node in the repo root.
// npx ts-node scripts/query-altura.ts

function loadEnvFile(filePath: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!fs.existsSync(filePath)) return result;
  const lines = fs.readFileSync(filePath, 'utf-8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...rest] = trimmed.split('=');
    if (!key || rest.length === 0) continue;
    const value = rest.join('=').trim();
    result[key.trim()] = value.replace(/^"|"$/g, '').replace(/^'|'$/g, '');
  }
  return result;
}

const env = {
  ...process.env,
  ...loadEnvFile(path.resolve(process.cwd(), '.env.local')),
};

const SUPABASE_URL = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.SUPABASE_KEY || env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_KEY in environment or .env.local.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false }
});

function extractSnippet(text: string, term: string, radius = 150) {
  if (!text) return '';
  const idx = text.toLowerCase().indexOf(term.toLowerCase());
  if (idx === -1) return '';
  const start = Math.max(0, idx - radius);
  const end = Math.min(text.length, idx + term.length + radius);
  let snippet = text.substring(start, end).trim();
  if (start > 0) snippet = '...' + snippet;
  if (end < text.length) snippet = snippet + '...';
  return snippet.replace(/\s+/g, ' ');
}

async function run() {
  const term = process.argv.slice(2).join(' ') || 'altura';
  console.log(`Querying Supabase for norms matching: "${term}"...`);

  // Query norms where title, description or content contains the term (case-insensitive)
  const orFilter = `title.ilike.%${term}%,description.ilike.%${term}%,content.ilike.%${term}%`;

  const { data, error } = await supabase
    .from('norms')
    .select('id, code, title, description, content')
    .or(orFilter)
    .limit(20);

  if (error) {
    console.error('Supabase query error:', error.message || error);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.log(`Nenhuma norma encontrada com o termo "${term}".`);
    return;
  }

  console.log(`Found ${data.length} norms. Showing snippets:`);
  for (const n of data) {
    const code = (n as any).code || '';
    const title = (n as any).title || '';
    const description = (n as any).description || '';
    const content = (n as any).content || '';
    const snippet = extractSnippet(description || content || title, term, 200);

    console.log('---');
    console.log(`Code: ${code}`);
    console.log(`Title: ${title}`);
    console.log(`Snippet: ${snippet || '[no snippet]'}\n`);
  }
}

run().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
