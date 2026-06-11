import { NextResponse } from 'next/server';
import { getAuthenticatedSupabaseClient } from '@/lib/supabase-server';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const supabase = await getAuthenticatedSupabaseClient();

    // Use the Host header from the request to build the correct redirect URL,
    // avoiding localhost fallback when NEXT_PUBLIC_APP_URL is unset on Cloudflare.
    const origin = request.headers.get('Origin') || request.headers.get('Host') || '';
    const baseUrl = origin
      ? `${origin.startsWith('http') ? '' : 'https://'}${origin.replace(/\/+$/, '')}`
      : process.env.NEXT_PUBLIC_APP_URL || 'https://arquiv.org';
    const redirectTo = `${baseUrl.replace(/\/+$/, '')}/auth/callback`;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
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
