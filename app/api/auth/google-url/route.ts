import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get('Origin') || process.env.NEXT_PUBLIC_APP_URL || 'https://arquiv.org';

    const pendingCookies: { name: string; value: string; options: Record<string, unknown> }[] = [];

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              pendingCookies.push({ name, value, options });
            });
          },
        },
      }
    );

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${origin}/auth/callback`,
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

    const response = NextResponse.json({ success: true, url: data.url });
    for (const { name, value, options } of pendingCookies) {
      response.cookies.set(name, value, options);
    }
    return response;
  } catch (err) {
    console.error('[api/auth/google-url] Error:', err);
    return NextResponse.json(
      { success: false, url: null, error: 'Erro inesperado ao gerar URL do Google OAuth.' },
      { status: 500 }
    );
  }
}
