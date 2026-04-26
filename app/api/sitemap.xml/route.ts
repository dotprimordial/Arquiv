import { NextResponse } from 'next/server';
import { getCachedStatic, setCachedStatic } from '@/lib/cache-edge';

export const runtime = 'edge';
export const preferredRegion = 'auto';

const CACHE_KEY = 'sitemap:xml';

interface Norm {
  id: string;
  code: string;
  title: string;
  updated_at: string;
  created_at: string;
}

/**
 * Generate dynamic sitemap.xml with all published norms
 * Updates automatically when new norms are added
 * Cached for 10 minutes for better performance
 * Edge Runtime compatible
 */
export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://arquiv.org';

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

    // Fetch norms using Supabase REST API directly (Edge compatible)
    const response = await fetch(
      `${supabaseUrl}/rest/v1/norms?select=id,code,title,updated_at,created_at&order=updated_at.desc`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Sitemap] Error fetching norms:', errorText);
      return new NextResponse('Error generating sitemap', { status: 500 });
    }

    const norms = (await response.json()) as Norm[];

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
