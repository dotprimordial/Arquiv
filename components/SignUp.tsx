'use client';

import React, { useState } from 'react';
import { Mail, Lock, UserPlus, Globe } from 'lucide-react';
import { signUpAction, getGoogleOAuthUrlAction } from '@/app/actions/auth-actions';
import { useRouter } from 'next/navigation';

export default function SignUp({ onToggle, onClose }: { onToggle: () => void; onClose?: () => void }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getGoogleOAuthUrlAction();
      if (!res.success || !res.url) {
        throw new Error(res.error || 'Não foi possível obter URL do Google OAuth.');
      }
      window.location.href = res.url;
    } catch (err: unknown) {
      console.error('[SignUp Google] Error:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (errorMessage.includes('Failed to fetch')) {
        setError('Erro de ligação ao serviço. Tente novamente mais tarde.');
      } else {
        setError('Não foi possível registar com o Google neste momento.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const res = await signUpAction(email, password);
      
      if (!res.success) {
        throw new Error(res.error || 'Erro ao efetuar registo.');
      }
      
      // If res.session is null, email confirmation might be required
      if (!res.session) {
        // Redirect to sign in page with pre-fill and success message
        router.push(`/login?email=${encodeURIComponent(email)}&signup=success`);
        onToggle(); // Switch to sign in view
      } else {
        if (onClose) onClose();
        window.location.reload();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 md:p-10">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold font-serif tracking-tight text-zinc-900 mb-2">
          Criar conta
        </h2>
        <p className="text-zinc-500">
          Registe-se para aceder a todas as funcionalidades
        </p>
      </div>

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
              <UserPlus className="w-5 h-5" />
              Registar
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
        <Globe className="w-5 h-5" />
        Google
      </button>

      <p className="text-center mt-8 text-sm text-zinc-500">
        Já tem uma conta?
        <button
          onClick={onToggle}
          className="ml-2 font-bold text-zinc-900 hover:underline"
        >
          Entre aqui
        </button>
      </p>
    </div>
  );
}
