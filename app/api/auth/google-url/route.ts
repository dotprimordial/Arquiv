import { NextResponse, type NextRequest } from 'next/server';
import { createEdgeSupabaseClient } from '@/lib/supabase-server';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const supabase = createEdgeSupabaseClient(request);
    const origin = request.headers.get('Origin') || process.env.NEXT_PUBLIC_APP_URL || 'https://arquiv.org';

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

    return NextResponse.json({ success: true, url: data.url });
  } catch (err) {
    console.error('[api/auth/google-url] Error:', err);
    return NextResponse.json(
      { success: false, url: null, error: 'Erro inesperado ao gerar URL do Google OAuth.' },
      { status: 500 }
    );
  }
}
