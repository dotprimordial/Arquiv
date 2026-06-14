"use client";

import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { Demo as Footer } from '@/components/footer-demo';
import AIChatCard from '@/components/ui/ai-chat';
import AppHeader from '@/components/AppHeader';
import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { CountryProvider } from '@/contexts/country-context';

// Essential imports for the layout
import { Inter } from 'next/font/google';
import localFont from 'next/font/local';
import { Toaster } from 'sonner';
import './globals.css';
import AdScript from '@/components/AdScript';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';
import ClarityScript from '@/components/ClarityScript';
import { cn } from "@/lib/utils";

import dynamic from 'next/dynamic';
const AuthModal = dynamic(() => import('@/components/AuthModal'), { ssr: false, loading: () => null });

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

function LayoutAIChat() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const { isAdmin, isSessionLoading } = useAuth();

  return (
    <>
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
    </>
  );
}

function LayoutAuthModal() {
  const { isAuthModalOpen, setAuthModalOpen } = useAuth();
  return (
    <AuthModal isOpen={isAuthModalOpen} onClose={() => setAuthModalOpen(false)} />
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt" suppressHydrationWarning className={cn(equinox.variable, "font-sans", inter.variable)}>
      <head>
        <title>Arquiv - Normas Técnicas de Construção e Legislação</title>
        <link rel="icon" href="/icons/icon-nopadding.png" sizes="512x512" />
        <link rel="icon" href="/icons/icon.png" sizes="32x32" />
        <link rel="shortcut icon" href="/icons/icon-nopadding.png" />
        <link rel="apple-touch-icon" href="/icons/icon-nopadding.png" sizes="180x180" />
        <meta name="theme-color" content="#1e40af" />
      </head>
      <body suppressHydrationWarning className="font-sans antialiased">
        <AuthProvider>
          <CountryProvider>
            <AppHeader />
            {children}
            <Footer />
            <Toaster position="top-center" richColors />
            <AdScript />
            <ClarityScript />
            <ServiceWorkerRegister />
            <LayoutAIChat />
            <LayoutAuthModal />
          </CountryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
