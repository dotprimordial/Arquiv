'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';

export default function RunMigrationPage() {
  const { isAdmin, isSessionLoading } = useAuth();
  const router = useRouter();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<string>('');

  useEffect(() => {
    if (!isSessionLoading && !isAdmin) {
      router.push('/');
    }
  }, [isAdmin, isSessionLoading, router]);

  if (isSessionLoading || !isAdmin) {
    return <div className="min-h-screen bg-gray-50 p-8"><div className="max-w-4xl mx-auto"><p className="text-gray-600">A carregar...</p></div></div>;
  }

  const handleRunMigration = async () => {
    setStatus('loading');
    setResult('Para criar a tabela Summaries, execute o SQL abaixo no painel do Supabase:\n\n' +
      '1. Acesse https://supabase.com/dashboard\n' +
      '2. Selecione seu projeto\n' +
      '3. Vá em SQL Editor\n' +
      '4. Cole e execute o SQL abaixo:\n\n' +
      `-- Create summaries table
CREATE TABLE IF NOT EXISTS public.summaries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  norm_id UUID NOT NULL REFERENCES public.norms(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one summary per norm
  UNIQUE (norm_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_summaries_norm_id ON public.summaries(norm_id);

-- Enable RLS
ALTER TABLE public.summaries ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view summaries"
  ON public.summaries FOR SELECT
  USING (true);

CREATE POLICY "Service role can insert summaries"
  ON public.summaries FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update summaries"
  ON public.summaries FOR UPDATE
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can delete summaries"
  ON public.summaries FOR DELETE
  TO service_role
  WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_summaries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER set_summaries_updated_at
  BEFORE UPDATE ON public.summaries
  FOR EACH ROW
  EXECUTE FUNCTION update_summaries_updated_at();`);
    
    setStatus('success');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Criar Tabela Summaries</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <p className="text-gray-600 mb-4">
            Esta página fornece o SQL necessário para criar a tabela <code>summaries</code> no Supabase.
            A tabela será usada para armazenar os resumos das normas separadamente da tabela principal.
          </p>
          
          <button
            onClick={handleRunMigration}
            disabled={status === 'loading'}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {status === 'loading' ? 'Carregando...' : 'Mostrar SQL para Migration'}
          </button>
        </div>

        {result && (
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
            <h2 className="text-xl font-semibold mb-4">SQL para Migration</h2>
            <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm whitespace-pre-wrap">
              {result}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
