import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getCachedStatic, setCachedStatic } from '@/lib/cache';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const CACHE_KEY = 'sitemap:xml';

/**
 * Generate dynamic sitemap.xml with all published norms
 * Updates automatically when new norms are added
 * Cached for 10 minutes for better performance
 */
export async function GET() {
  try {
    // Check cache first
    const cached = getCachedStatic<string>(CACHE_KEY);
    if (cached) {
      console.log('[Cache] Hit for sitemap');
      return new NextResponse(cached, {
        headers: {
          'Content-Type': 'application/xml',
          'Cache-Control': 'public, max-age=3600, s-maxage=3600',
          'X-Cache': 'HIT',
        },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://arquiv.org';

    // Fetch all norms with their updated dates
    const { data: norms, error } = await supabase
      .from('norms')
      .select('id, code, title, updated_at, created_at')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('[Sitemap] Error fetching norms:', error);
      return new NextResponse('Error generating sitemap', { status: 500 });
    }

    const now = new Date().toISOString();

    // Build sitemap XML
    const xmlEntries = [
      // Home page
      `<url>
    <loc>${baseUrl}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`,
      // Search page
      `<url>
    <loc>${baseUrl}/search</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`,
    ];

    // Add norm detail pages
    if (norms && norms.length > 0) {
      norms.forEach((norm) => {
        const lastMod = norm.updated_at || norm.created_at || now;
        xmlEntries.push(`  <url>
    <loc>${baseUrl}/norm_detail/${encodeURIComponent(norm.id)}</loc>
    <lastmod>${new Date(lastMod).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`);
      });
    }

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xmlEntries.join('\n')}
</urlset>`;

    // Cache the sitemap
    setCachedStatic(CACHE_KEY, sitemap);
    console.log('[Cache] Set sitemap');

    return new NextResponse(sitemap, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        'X-Cache': 'MISS',
      },
    });
  } catch (error) {
    console.error('[Sitemap] Error generating sitemap:', error);
    return new NextResponse('Error generating sitemap', { status: 500 });
  }
}
