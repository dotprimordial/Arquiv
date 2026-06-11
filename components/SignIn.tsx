'use client';

import React, { useState, useEffect } from 'react';
import { Mail, Lock, LogIn } from 'lucide-react';
import { GoogleIcon } from './ui/google-icon';
import { loginAction, getGoogleOAuthUrlAction } from '@/app/actions/auth-actions';
import { useSearchParams } from 'next/navigation';

export default function SignIn({ onToggle, onClose }: { onToggle: () => void; onClose?: () => void }) {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const emailParam = searchParams.get('email');
    const signupParam = searchParams.get('signup');
    
    if (emailParam) {
      setEmail(emailParam);
    }
    
    if (signupParam === 'success') {
      setSuccessMessage('A sua conta foi criada. Por favor, verifique o seu email antes de entrar.');
    }
  }, [searchParams]);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await getGoogleOAuthUrlAction();
      if (!res.success || !res.url) {
        throw new Error(res.error || 'Não foi possível obter URL do Google OAuth.');
      }
      window.location.href = res.url;
    } catch (err: unknown) {
      console.error('[SignIn Google] Error:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);

      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        setError('Não foi possível contactar o serviço de autenticação. Verifique a sua ligação.');
      } else {
        setError('Não foi possível entrar com o Google. Por favor, tente novamente.');
      }
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const res = await loginAction(email, password);
      
      if (!res.success) {
        throw new Error(res.error || 'Credenciais inválidas.');
      }
      
      if (res.session) {
        // Fechar modal antes de redirecionar
        if (onClose) onClose();
        window.location.reload();
      } else {
        setError('Sessão não iniciada. Verifique o seu email.');
      }
    } catch (err: unknown) {
      console.error('[SignIn] Error:', err);
      
      // Get error name and message
      const errorName = err instanceof Error ? err.name : '';
      const errorMessage = err instanceof Error ? err.message : String(err);
      
      // Handle specific error types
      if (errorName === 'AuthRetryableFetchError' || errorMessage.includes('Failed to fetch')) {
        setError('Não foi possível ligar ao serviço. Verifique a sua ligação à internet.');
      } else if (err instanceof Error) {
        // Check for common Supabase auth errors
        const message = errorMessage.toLowerCase();
        if (message.includes('invalid login credentials') || message.includes('credentials') || message.includes('password')) {
          setError('Email ou palavra-passe incorretos.');
        } else if (message.includes('email not confirmed')) {
          setError('A sua conta ainda não foi confirmada. Verifique o seu email.');
        } else if (message.includes('rate limit')) {
          setError('Muitas tentativas. Aguarde alguns minutos.');
        } else {
          setError(errorMessage);
        }
      } else {
        setError('Ocorreu um erro inesperado. Tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 md:p-10">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold font-serif tracking-tight text-zinc-900 mb-2">
          Bem-vindo de volta
        </h2>
        <p className="text-zinc-500">
          Entre para consultar e gerir normas
        </p>
      </div>

      {successMessage && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 text-sm font-medium">
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-bold uppercase tracking-widest text-zinc-400 ml-1">Email</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
            <input
              type="email"
              required
              className="w-full pl-12 pr-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl focus:ring-4 focus:ring-zinc-100 focus:border-zinc-300 outline-none transition-all"
              placeholder="exemplo@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold uppercase tracking-widest text-zinc-400 ml-1">Palavra-passe</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
            <input
              type="password"
              required
              className="w-full pl-12 pr-4 py-3 bg-zinc-50 border border-zinc-100 rounded-xl focus:ring-4 focus:ring-zinc-100 focus:border-zinc-300 outline-none transition-all"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-medium">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-4 bg-zinc-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-800 transition-all disabled:opacity-50"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <LogIn className="w-5 h-5" />
              Entrar
            </>
          )}
        </button>
      </form>

      <div className="relative my-8">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-zinc-100"></div>
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-4 text-zinc-400 font-medium tracking-widest">Ou continuar com</span>
        </div>
      </div>

      <button
        onClick={handleGoogleSignIn}
        disabled={isLoading}
        className="w-full py-4 bg-white border border-zinc-200 text-zinc-900 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-50 transition-all"
      >
        <GoogleIcon className="w-5 h-5" />
        Google
      </button>

      <p className="text-center mt-8 text-sm text-zinc-500">
        Não tem uma conta?
        <button
          onClick={onToggle}
          className="ml-2 font-bold text-zinc-900 hover:underline"
        >
          Registe-se
        </button>
      </p>
    </div>
  );
}
