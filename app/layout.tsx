import type { Metadata } from 'next';
import { Inter, Space_Grotesk, Playfair_Display } from 'next/font/google';
import localFont from 'next/font/local';
import Script from 'next/script';
import { Toaster } from 'sonner';
import './globals.css';
import AdScript from '@/components/AdScript';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';

// Use nodejs runtime for better compatibility with database operations
export const runtime = 'nodejs';

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

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://arquiv.org';

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: 'Arquiv - Normas Técnicas de Construção',
    template: '%s | Arquiv',
  },
  description: 'Pesquise normas técnicas, regulamentos e legislação de construção por país. Acesso rápido a decretos, leis e regulamentos de arquitetura e engenharia.',
  keywords: ['normas técnicas', 'regulamentos construção', 'legislação arquitetura', 'decretos', 'leis construção', 'normas país'],
  authors: [{ name: 'Arquiv' }],
  creator: 'Arquiv',
  publisher: 'Arquiv',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: appUrl,
    siteName: 'Arquiv',
    title: 'Arquiv - Normas Técnicas de Construção',
    description: 'Pesquise normas técnicas, regulamentos e legislação de construção por país.',
    images: [
      {
        url: '/icons/icon-nopadding.png',
        width: 512,
        height: 512,
        alt: 'Arquiv Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Arquiv - Normas Técnicas de Construção',
    description: 'Pesquise normas técnicas, regulamentos e legislação de construção por país.',
    images: ['/icons/icon-nopadding.png'],
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
  alternates: {
    canonical: appUrl,
  },
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
        <Toaster position="top-center" richColors />
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