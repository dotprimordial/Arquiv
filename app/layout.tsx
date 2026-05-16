import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import localFont from 'next/font/local';
import Script from 'next/script';
import { Toaster } from 'sonner';
import './globals.css';
import AdScript from '@/components/AdScript';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';
import { cn } from "@/lib/utils";

// Use nodejs runtime for better compatibility with database operations
export const runtime = 'nodejs';

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://arquiv.org';

// JSON-LD Structured Data for SEO
const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${appUrl}/#organization`,
      name: 'Arquiv',
      url: appUrl,
      logo: {
        '@type': 'ImageObject',
        url: `${appUrl}/icons/icon-nopadding.png`,
        width: 512,
        height: 512,
      },
      sameAs: [
        'https://twitter.com/arquiv',
      ],
      description: 'Plataforma de pesquisa de normas técnicas de construção e legislação.',
    },
    {
      '@type': 'WebSite',
      '@id': `${appUrl}/#website`,
      url: appUrl,
      name: 'Arquiv - Normas Técnicas de Construção',
      description: 'Pesquise normas técnicas, regulamentos e legislação de construção por país.',
      publisher: {
        '@id': `${appUrl}/#organization`,
      },
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${appUrl}/search?q={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@type': 'WebPage',
      '@id': `${appUrl}/#webpage`,
      url: appUrl,
      name: 'Arquiv - Normas Técnicas de Construção',
      isPartOf: {
        '@id': `${appUrl}/#website`,
      },
      about: {
        '@id': `${appUrl}/#organization`,
      },
      primaryImageOfPage: {
        '@type': 'ImageObject',
        url: `${appUrl}/icons/icon-nopadding.png`,
      },
      description: 'Pesquise normas técnicas de construção, regulamentos e legislação de arquitetura e engenharia.',
    },
  ],
};

const inter = Inter({subsets:['latin'],variable:'--font-sans',display:'swap'});

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
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: 'Arquiv - Normas Técnicas de Construção e Legislação',
    template: '%s | Arquiv',
  },
  description: 'Pesquise normas técnicas de construção, regulamentos, legislação de arquitetura e engenharia por país. Acesso rápido a decretos, leis, portarias e normas ABNT, ISO, Eurocódigo.',
  keywords: [
    'normas técnicas', 'regulamentos construção', 'legislação arquitetura', 
    'decretos', 'leis construção', 'normas país', 'engenharia civil',
    'normas ABNT', 'Eurocódigo', 'ISO', 'desenho técnico', 'segurança obra',
    'acessibilidade', 'incêndio', 'instalações elétricas', 'hidráulicas',
    'Portugal', 'Brasil', 'Angola', 'Moçambique', 'urbanismo', 'licenciamento'
  ],
  authors: [{ name: 'Arquiv' }],
  creator: 'Arquiv',
  publisher: 'Arquiv',
  category: 'Architecture & Engineering',
  applicationName: 'Arquiv',
  referrer: 'origin-when-cross-origin',
  robots: {
    index: true,
    follow: true,
    nocache: false,
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
    title: 'Arquiv - Normas Técnicas de Construção e Legislação',
    description: 'Pesquise normas técnicas, regulamentos e legislação de construção por país. Acesso rápido a decretos, leis e normas ABNT, ISO.',
    images: [
      {
        url: '/icons/icon-nopadding.png',
        width: 512,
        height: 512,
        alt: 'Arquiv - Normas Técnicas de Construção',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Arquiv - Normas Técnicas de Construção',
    description: 'Pesquise normas técnicas, regulamentos e legislação de construção por país.',
    images: ['/icons/icon-nopadding.png'],
    creator: '@arquiv',
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
  alternates: {
    canonical: appUrl,
    languages: {
      'pt': `${appUrl}/pt`,
      'pt-BR': `${appUrl}/br`,
      'pt-PT': `${appUrl}/pt`,
    },
  },
  icons: {
    icon: [
      { url: '/icons/icon-nopadding.png', sizes: '512x512', type: 'image/png' },
      { url: '/icons/icon.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.ico', sizes: '48x48' },
    ],
    shortcut: '/icons/icon-nopadding.png',
    apple: [
      { url: '/icons/icon-nopadding.png', sizes: '180x180', type: 'image/png' },
      { url: '/icons/icon-nopadding.png', sizes: '152x152', type: 'image/png' },
    ],
  },
  manifest: '/manifest.json',
  other: {
    'theme-color': '#1e40af',
    'msapplication-TileColor': '#1e40af',
    'msapplication-TileImage': '/icons/icon-nopadding.png',
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'apple-mobile-web-app-title': 'Arquiv',
    'format-detection': 'telephone=no',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt" suppressHydrationWarning className={cn(equinox.variable, "font-sans", inter.variable)}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body suppressHydrationWarning className="font-sans antialiased">
        {children}
        <Toaster position="top-center" richColors />
        <AdScript />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}