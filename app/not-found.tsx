import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 px-6">
      <div className="text-center space-y-6 max-w-md">
        <h1 className="text-9xl font-bold font-serif text-zinc-200">404</h1>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-zinc-900">Página não encontrada</h2>
          <p className="text-zinc-500">
            Desculpe, a página que procura não existe ou foi movida.
          </p>
        </div>
        <Link 
          href="/" 
          className="inline-flex items-center justify-center px-8 py-4 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-zinc-800 transition-all"
        >
          Voltar ao Início
        </Link>
      </div>
    </div>
  );
}
