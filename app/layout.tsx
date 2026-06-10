"use client";

import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { Demo as Footer } from '@/components/footer-demo';
import AIChatCard from '@/components/ui/ai-chat';

// Essential imports for the layout
import { Inter } from 'next/font/google';
import localFont from 'next/font/local';
import { Toaster } from 'sonner';
import './globals.css';
import AdScript from '@/components/AdScript';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';
import { cn } from "@/lib/utils";

// Import structuredData from the separate file
// import { structuredData } from './layout.metadata'; // No longer needed here

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <html lang="pt" suppressHydrationWarning className={cn(equinox.variable, "font-sans", inter.variable)}>
      <head>
      </head>
      <body suppressHydrationWarning className="font-sans antialiased">
        {children}
        <Footer />
        <Toaster position="top-center" richColors />
        <AdScript />
        <ServiceWorkerRegister />
        {isChatOpen && (
          <div className="fixed bottom-4 right-4 z-50">
            <AIChatCard />
          </div>
        )}
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="fixed bottom-20 right-4 z-50 p-3 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-colors"
          aria-label="Toggle AI Chat"
        >
          <MessageSquare size={24} />
        </button>
      </body>
    </html>
  );
}