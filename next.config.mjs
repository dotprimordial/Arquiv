/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  distDir: '.next',
  // FIX: Configure Server Actions to allow multiple origins
  experimental: {
    serverActions: {
      allowedOrigins: [
        'localhost:3000',
        '127.0.0.1:3000',
        '127.0.0.1:54427',
        'localhost',
        '127.0.0.1',
        '*.localhost',
        'localhost:*',
        '127.0.0.1:*',
      ],
    },
  },
  // SEO: Rewrite rules for sitemap and robots
  async rewrites() {
    return [
      {
        source: '/sitemap.xml',
        destination: '/api/sitemap.xml',
      },
      {
        source: '/robots.txt',
        destination: '/api/robots.txt',
      },
    ];
  },
  // Allow access to remote image placeholder.
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**', // This allows any path under the hostname
      },
      // Note: removed permissive googleusercontent pattern to reduce remote image surface
    ],
  },
  webpack: (config, {dev}) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    };
    // HMR is disabled in AI Studio via DISABLE_HMR env var.
    // Do not modifyâ€”file watching is disabled to prevent flickering during agent edits.
    if (dev && process.env.DISABLE_HMR === 'true') {
      config.watchOptions = {
        ignored: /.*/,
      };
    }
    return config;
  },
};

export default nextConfig;
