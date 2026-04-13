import type { Metadata } from 'next';
import { Inter, Space_Grotesk, Playfair_Display } from 'next/font/google';
import localFont from 'next/font/local';
import Script from 'next/script';
import './globals.css';
import AdScript from '@/components/AdScript';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';

// Força o uso do Edge Runtime, essencial para o Cloudflare Pages com Next.js 15
export const runtime = 'edge';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-serif',
});

const equinox = localFont({
  src: [
    {
      path: '../fonts/Equinox Regular.otf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../fonts/Equinox Bold.otf',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-equinox',
});

export const metadata: Metadata = {
  title: 'Arquiv - Constuction Regulations Guide',
  description: 'Learn and search construction norms and regulations by country.',
  icons: {
    icon: [
      { url: '/icons/icon-nopadding.png', sizes: '512x512', type: 'image/png' },
      { url: '/icons/icon.png', sizes: '32x32', type: 'image/png' },
    ],
    shortcut: '/icons/icon-nopadding.png',
    apple: '/icons/icon-nopadding.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt" suppressHydrationWarning className={`${inter.variable} ${spaceGrotesk.variable} ${playfair.variable} ${equinox.variable}`}>
      <body suppressHydrationWarning className="font-sans antialiased">
        {children}
        <AdScript />
        <ServiceWorkerRegister />
        <Script 
          src="https://wistfulseverely.com/e5/7a/ba/e57abaff382f551b0e067ea3a9e1cc9d.js"
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}