import './globals.css';
import { Inter } from 'next/font/google';
import localFont from 'next/font/local';
import LayoutClient from '@/components/LayoutClient';
import { metadata } from './layout.metadata';
import { structuredData } from './layout.metadata';

export { metadata };

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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body suppressHydrationWarning className="font-sans antialiased">
        <LayoutClient>{children}</LayoutClient>
      </body>
    </html>
  );
}
