'use client';

import { useState } from 'react';
import { updateAllNormDescriptions } from '@/app/actions/norm-actions';
import { RippleButton } from '@/components/ui/multi-type-ripple-buttons';

export default function UpdateDescriptionsPage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  const handleUpdate = async () => {
    setStatus('loading');
    setResult(null);

    try {
      const response = await updateAllNormDescriptions();
      setResult(response);
      setStatus(response.success ? 'success' : 'error');
    } catch (error) {
      setResult({ error: String(error) });
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Atualizar Descrições das Normas</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <p className="text-gray-600 mb-4">
            Esta ação irá adicionar um texto de exemplo no campo <code>description</code> de todas as normas existentes na base de dados.
          </p>
          
          <RippleButton variant="ghost"
            onClick={handleUpdate}
            disabled={status === 'loading'}
            className={`px-6 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 ${
              status === 'success'
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : status === 'error'
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {status === 'loading' ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Atualizando...</>
            ) : status === 'success' ? (
              <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Atualizado!</>
            ) : status === 'error' ? (
              <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg> Erro</>
            ) : (
              'Atualizar Todas as Descrições'
            )}
          </RippleButton>
        </div>

        {result && (
          <div className={`bg-white rounded-lg shadow p-6 ${status === 'success' ? 'border-l-4 border-green-500' : 'border-l-4 border-red-500'}`}>
            <h2 className="text-xl font-semibold mb-4">
              {status === 'success' ? '✓ Sucesso' : '✗ Erro'}
            </h2>
            <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
