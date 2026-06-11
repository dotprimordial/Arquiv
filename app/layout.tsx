"use client";

import { useState, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';
import { Demo as Footer } from '@/components/footer-demo';
import AIChatCard from '@/components/ui/ai-chat';
import { getSessionAction } from '@/app/actions/auth-actions';

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
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSessionLoading, setIsSessionLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await getSessionAction();
        if (res.success && res.isAdmin) {
          setIsAdmin(true);
        }
      } catch (err) {
        console.error('Session check error:', err);
      } finally {
        setIsSessionLoading(false);
      }
    };

    checkSession();
  }, []);

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
        {!isSessionLoading && isAdmin && isChatOpen && (
          <div className="fixed bottom-4 right-4 z-50">
            <AIChatCard />
          </div>
        )}
        {!isSessionLoading && isAdmin && (
          <button
            onClick={() => setIsChatOpen(!isChatOpen)}
            className="fixed bottom-20 right-4 z-50 p-3 rounded-full bg-emerald-500 text-white shadow-lg hover:bg-emerald-600 transition-colors"
            aria-label="Toggle AI Chat"
          >
            <MessageSquare size={24} />
          </button>
        )}
      </body>
    </html>
  );
}