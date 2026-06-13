import { NextResponse, type NextRequest } from 'next/server';
import { createEdgeSupabaseClient } from '@/lib/supabase-server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    try {
      const response = NextResponse.redirect(`${origin}/`);
      const supabase = createEdgeSupabaseClient(request, response);

      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error) {
        return response;
      }

      console.error('[Auth Callback] Exchange error:', error.message);
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
    } catch (err) {
      console.error('[Auth Callback] Exception:', err);
      return NextResponse.redirect(`${origin}/login?error=auth_exception`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=no_code`);
}
