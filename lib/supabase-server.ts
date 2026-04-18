import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function getAuthenticatedSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — safe to ignore.
          }
        },
      },
    }
  );
}

// Admin client that bypasses RLS using the service role key.
// Falls back to the anon key with a warning if the env var is missing.
export function getAdminSupabaseClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    console.warn(
      '[Supabase] SUPABASE_SERVICE_ROLE_KEY not set — ' +
      'falling back to anon key. RLS policies WILL apply.'
    );
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    serviceRoleKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}
