export const runtime = 'edge';
import { NextResponse } from 'next/server';
import { getAuthenticatedSupabaseClient } from '@/lib/supabase-server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(request: Request) {
  // Retrieve client IP from headers (compatible with various deployments)
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0].trim() || realIp?.trim();

  if (!ip) {
    return new NextResponse('IP address not found', { status: 400 });
  }

  // Determine authenticated user (if any)
  let userId: string | null = null;
  try {
    const supabaseAuth = await getAuthenticatedSupabaseClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (user?.id) userId = user.id;
  } catch (e) {
    console.error('Failed to get auth user for IP logging:', e);
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  // Check rate limit for this IP (visits count)
  const rateResult = await checkRateLimit(ip, 'visit');
  if (!rateResult.allowed) {
    console.warn('[log-ip] Rate limit exceeded for IP', ip);
    return new NextResponse(rateResult.reason || 'Rate limit exceeded', { status: 429 });
  }
  const { error } = await supabase
    .from('search_usage')
    .insert({
      ip_address: ip,
      user_id: userId,
      search_type: 'visit', // indicates a page visit
      searched_at: new Date().toISOString(),
    });

  if (error) {
    console.error('[log-ip] Supabase insert error:', error);
    return new NextResponse('Failed to log IP', { status: 500 });
  }

  return NextResponse.json({ success: true });
}
