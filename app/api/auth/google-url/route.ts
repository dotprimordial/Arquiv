import { NextResponse } from 'next/server';
import { getAuthenticatedSupabaseClient } from '@/lib/supabase-server';
import { getAuthRedirectUrl } from '@/lib/auth-utils';

export const runtime = 'edge';

export async function POST() {
  try {
    const supabase = await getAuthenticatedSupabaseClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: getAuthRedirectUrl(),
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      return NextResponse.json({ success: false, url: null, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, url: data.url });
  } catch (err) {
    console.error('[api/auth/google-url] Error:', err);
    return NextResponse.json(
      { success: false, url: null, error: 'Erro inesperado ao gerar URL do Google OAuth.' },
      { status: 500 }
    );
  }
}
