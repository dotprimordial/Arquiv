'use client';

import React from 'react';
import { Mail, Lock, UserPlus, Check, AlertCircle } from 'lucide-react';
import { GoogleIcon } from './ui/google-icon';
import { signUpAction, getGoogleOAuthUrlAction } from '@/app/actions/auth-actions';
import { useRouter } from 'next/navigation';
import { useAsyncAction } from '@/hooks/use-async-action';
import { RippleButton } from '@/components/ui/multi-type-ripple-buttons';

export default function SignUp({ onToggle, onClose }: { onToggle: () => void; onClose?: () => void }) {
  const router = useRouter();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');

  const signupActionHook = useAsyncAction(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const res = await signUpAction(email, password);
      if (!res.success) throw new Error(res.error || 'Erro ao efetuar registo.');
      if (!res.session) {
        router.push(`/login?email=${encodeURIComponent(email)}&signup=success`);
        onToggle();
      } else {
        if (onClose) onClose();
        window.location.reload();
      }
      return res;
    },
    { errorDuration: 4000 }
  );

  const googleAction = useAsyncAction(
    async () => {
      const res = await getGoogleOAuthUrlAction();
      if (!res.success || !res.url) throw new Error(res.error || 'Não foi possível obter URL do Google OAuth.');
      window.location.href = res.url;
    },
    { errorDuration: 4000 }
  );

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

      <form onSubmit={signupActionHook.execute as unknown as React.FormEventHandler} className="space-y-4">
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

        {signupActionHook.isError && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {signupActionHook.error}
          </div>
        )}

        <RippleButton variant="ghost"
          type="submit"
          disabled={signupActionHook.isLoading}
          className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${
            signupActionHook.isSuccess
              ? 'bg-emerald-600 text-white'
              : signupActionHook.isError
              ? 'bg-red-500 text-white'
              : 'bg-zinc-900 text-white hover:bg-zinc-800'
          }`}
        >
          {signupActionHook.isLoading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : signupActionHook.isSuccess ? (
            <><Check className="w-5 h-5" /> Registado</>
          ) : (
            <><UserPlus className="w-5 h-5" /> Registar</>
          )}
        </RippleButton>
      </form>

      <div className="relative my-8">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-zinc-100"></div>
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-4 text-zinc-400 font-medium tracking-widest">Ou continuar com</span>
        </div>
      </div>

      {googleAction.isError && (
        <div className="mb-3 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {googleAction.error}
        </div>
      )}

      <button
        onClick={() => googleAction.execute()}
        disabled={googleAction.isLoading}
        className={`w-full py-4 border rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${
          googleAction.isSuccess
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : googleAction.isError
            ? 'bg-red-50 border-red-200 text-red-600'
            : 'bg-white border-zinc-200 text-zinc-900 hover:bg-zinc-50'
        }`}
      >
        {googleAction.isLoading ? (
          <div className="w-5 h-5 border-2 border-zinc-400/30 border-t-zinc-400 rounded-full animate-spin" />
        ) : googleAction.isSuccess ? (
          <><Check className="w-5 h-5" /> Google</>
        ) : (
          <><GoogleIcon className="w-5 h-5" /> Google</>
        )}
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
