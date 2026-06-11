import './globals.css';
import { Inter } from 'next/font/google';
import localFont from 'next/font/local';
import type { Metadata } from 'next';
import LayoutClient from '@/components/LayoutClient';

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://arquiv.org';

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
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: appUrl,
    siteName: 'Arquiv',
    title: 'Arquiv - Normas Técnicas de Construção e Legislação',
    description: 'Pesquise normas técnicas, regulamentos e legislação de construção por país.',
    images: [{ url: '/icons/icon-nopadding.png', width: 512, height: 512, alt: 'Arquiv' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Arquiv - Normas Técnicas de Construção',
    description: 'Pesquise normas técnicas, regulamentos e legislação de construção por país.',
    images: ['/icons/icon-nopadding.png'],
  },
  icons: {
    icon: [
      { url: '/icons/icon-nopadding.png', sizes: '512x512', type: 'image/png' },
      { url: '/icons/icon.png', sizes: '32x32', type: 'image/png' },
    ],
    shortcut: '/icons/icon-nopadding.png',
    apple: [
      { url: '/icons/icon-nopadding.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/manifest.json',
};

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt" suppressHydrationWarning className={`${equinox.variable} font-sans ${inter.variable}`}>
      <head>
      </head>
      <body suppressHydrationWarning className="font-sans antialiased">
        <LayoutClient>{children}</LayoutClient>
      </body>
    </html>
  );
}
