'use client';

import { useState } from 'react';
import { updateAllNormDescriptions } from '@/app/actions/norm-actions';

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
          
          <button
            onClick={handleUpdate}
            disabled={status === 'loading'}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {status === 'loading' ? 'Atualizando...' : 'Atualizar Todas as Descrições'}
          </button>
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
