import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const preferredRegion = 'auto';

/**
 * Generate robots.txt with sitemap reference
 * Allows all crawlers and points to dynamic sitemap
 * Edge Runtime compatible
 */
export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://arquiv.org';

  const robots = `# robots.txt for Arquiv
# Allow all crawlers
User-agent: *
Allow: /

# Disallow admin paths
Disallow: /admin/
Disallow: /api/admin/

# Sitemap location
Sitemap: ${baseUrl}/sitemap.xml

# Crawl-delay for rate limiting
Crawl-delay: 1
`;

  return new NextResponse(robots, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
