'use client';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 px-6">
          <div className="text-center space-y-6 max-w-md">
            <h1 className="text-6xl font-bold font-serif text-zinc-900">Erro Crítico</h1>
            <p className="text-zinc-500">
              Ocorreu um erro crítico na aplicação. Por favor, recarregue a página.
            </p>
            <button
              onClick={() => reset()}
              className="inline-flex items-center justify-center px-8 py-4 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-zinc-800 transition-all"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
