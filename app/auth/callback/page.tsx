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
        // Debug: Log the current URL and localStorage state
        console.log('[AuthCallback] Current URL:', window.location.href);
        console.log('[AuthCallback] Search params:', window.location.search);
        
        // Check for code verifier in localStorage (PKCE requirement)
        // Note: Supabase stores code verifier as {storageKey}-code-verifier
        const codeVerifier = localStorage.getItem('sb-arquiv-auth-token-code-verifier') || 
                            localStorage.getItem('supabase.auth.codeVerifier');
        console.log('[AuthCallback] Code verifier present:', !!codeVerifier);
        
        // Parse the URL hash and query parameters
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const queryParams = new URLSearchParams(window.location.search);
        
        // Check for access_token in hash (implicit flow) or code in query (PKCE flow)
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const authCode = queryParams.get('code');
        
        console.log('[AuthCallback] Access token present:', !!accessToken);
        console.log('[AuthCallback] Auth code present:', !!authCode);
        
        // If we have an access_token in the hash, set the session directly
        if (accessToken) {
          console.log('[AuthCallback] Setting session from access_token');
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          });
          
          if (error) {
            console.error('[AuthCallback] Error setting session:', error);
            setError(error.message);
            return;
          }
          
          if (data.session) {
            console.log('[AuthCallback] Session established via access_token');
            router.push('/');
            return;
          }
        }
        
        // If we have a code, exchange it for a session (PKCE flow)
        if (authCode) {
          console.log('[AuthCallback] Exchanging code for session');
          console.log('[AuthCallback] Code:', authCode.substring(0, 10) + '...');
          
          // Check all localStorage keys related to Supabase auth
          const authKeys = Object.keys(localStorage).filter(k => k.includes('supabase') || k.includes('auth'));
          console.log('[AuthCallback] Auth-related localStorage keys:', authKeys);
          
          const { data, error } = await supabase.auth.exchangeCodeForSession(authCode);
          
          if (error) {
            console.error('[AuthCallback] Error exchanging code:', error);
            console.error('[AuthCallback] Error details:', {
              message: error.message,
              status: (error as any).status,
              code: (error as any).code
            });
            setError(`Erro na autenticação: ${error.message}`);
            return;
          }

          console.log('[AuthCallback] Exchange successful, data:', {
            hasSession: !!data.session,
            hasUser: !!data.user,
            provider: data.user?.app_metadata?.provider
          });

          if (data.session) {
            console.log('[AuthCallback] Session established via code exchange');
            router.push('/');
            return;
          } else {
            console.error('[AuthCallback] No session returned after code exchange');
            console.error('[AuthCallback] Full data object:', data);
            setError('Sessão não estabelecida. Verifique as configurações do OAuth no Supabase.');
          }
        } else {
          console.error('[AuthCallback] No auth code found in URL');
          setError('Código de autenticação não encontrado na URL');
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
