import { NextResponse } from 'next/server';
import { getAuthenticatedSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  
  if (code) {
    try {
      const supabase = await getAuthenticatedSupabaseClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (!error) {
        return NextResponse.redirect(`${origin}/`);
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
