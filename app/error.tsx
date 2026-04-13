'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 px-6">
      <div className="text-center space-y-6 max-w-md">
        <h1 className="text-6xl font-bold font-serif text-zinc-900">Algo correu mal</h1>
        <p className="text-zinc-500">
          Ocorreu um erro ao carregar esta página.
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center px-8 py-4 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-zinc-800 transition-all"
          >
            Tentar Novamente
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="inline-flex items-center justify-center px-8 py-4 bg-white border border-zinc-200 text-zinc-900 rounded-2xl font-bold hover:bg-zinc-50 transition-all"
          >
            Voltar ao Início
          </button>
        </div>
      </div>
    </div>
  );
}
