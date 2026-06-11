'use client';

import { useState, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';
import { Demo as Footer } from '@/components/footer-demo';
import AIChatCard from '@/components/ui/ai-chat';
import { getSessionAction } from '@/app/actions/auth-actions';
import { Toaster } from 'sonner';
import AdScript from '@/components/AdScript';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';

export default function LayoutClient({ children }: { children: React.ReactNode }) {
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
    <>
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
    </>
  );
}
