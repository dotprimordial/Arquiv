import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Service role key - server-side only, bypasses RLS
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[Supabase] Configuration missing:');
  console.error('  NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'set' : 'MISSING');
  console.error('  NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'set' : 'MISSING');
}

// Create basic Supabase client without options to avoid Symbol serialization errors
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Service role client for admin operations (server-side only)
// This client bypasses Row Level Security (RLS)
export const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;
