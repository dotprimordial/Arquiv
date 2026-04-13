'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Exchange the code for a session
        const { data, error } = await supabase.auth.exchangeCodeForSession(window.location.search);
        
        if (error) {
          console.error('[AuthCallback] Error exchanging code:', error);
          setError(error.message);
          return;
        }

        if (data.session) {
          console.log('[AuthCallback] Session established successfully');
          // Redirect to home page
          router.push('/');
        } else {
          console.error('[AuthCallback] No session returned');
          setError('No session established');
        }
      } catch (err) {
        console.error('[AuthCallback] Unexpected error:', err);
        setError('An unexpected error occurred');
      }
    };

    handleAuthCallback();
  }, [router]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold text-red-600 mb-2">Erro de Autenticação</h1>
          <p className="text-zinc-600">{error}</p>
          <button 
            onClick={() => router.push('/')}
            className="mt-4 px-4 py-2 bg-zinc-900 text-white rounded-full"
          >
            Voltar para Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-zinc-200 border-t-zinc-900 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-zinc-600">Completando login...</p>
      </div>
    </div>
  );
}
