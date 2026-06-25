'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen, Loader2, AlertCircle } from 'lucide-react';
import Markdown from 'react-markdown';
import { useRouter } from 'next/navigation';
import DOMPurify from 'dompurify';

interface NormDetailViewProps {
  code: string;
  country: string;
  title: string;
  content: string | null;
  isLoading: boolean;
  error: string | null;
  isAIGenerated: boolean;
  isPdf: boolean;
  pdfUrl: string | null;
}

export default function NormDetailView({
  code,
  country,
  title,
  content,
  isLoading,
  error,
  isAIGenerated,
  isPdf,
  pdfUrl,
}: NormDetailViewProps) {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-[#F9F9F8] text-zinc-900">
      <header className="border-b border-zinc-200 bg-white sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Voltar</span>
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <Loader2 className="w-8 h-8 text-zinc-900 animate-spin" />
            <p className="text-zinc-500 animate-pulse">A carregar norma...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-100 p-8 rounded-2xl text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
            <h2 className="text-xl font-bold text-red-900">Erro ao carregar norma</h2>
            <p className="text-red-700">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-red-600 text-white rounded-full text-sm font-medium hover:bg-red-700 transition-colors"
            >
              Tentar Novamente
            </button>
          </div>
        ) : (
          <motion.article
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-zinc-200 rounded-3xl overflow-hidden shadow-sm"
          >
            <div className="p-8 md:p-12 border-b border-zinc-100 bg-zinc-50/50">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">{country}</span>
                  <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold font-serif tracking-tight">{code}</h1>
                    {isAIGenerated ? (
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-600 text-[10px] font-bold uppercase tracking-wider rounded-md border border-amber-100">IA Gerado</span>
                    ) : (
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase tracking-wider rounded-md border border-emerald-100">Documento Oficial</span>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-zinc-500 text-lg leading-relaxed">
                {title || 'Detalhes técnicos e requisitos regulamentares completos.'}
              </p>
            </div>

            <div className="p-8 md:p-12 prose prose-zinc max-w-none prose-headings:font-serif prose-headings:tracking-tight prose-a:text-zinc-900">
              <div className="norm-content">
                {isPdf && pdfUrl ? (
                  <div className="w-full">
                    <div className="mb-4 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                      <p className="text-sm text-blue-800 font-medium">📄 Visualizando documento PDF</p>
                    </div>
                    <iframe src={pdfUrl} className="w-full h-[800px] border border-zinc-200 rounded-xl" title={`PDF da norma ${code}`} />
                    <div className="mt-4 text-center">
                      <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                        Abrir PDF em nova aba
                      </a>
                    </div>
                  </div>
                ) : content?.trim().startsWith('<') ? (
                  <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }} />
                ) : (
                  <Markdown>{content}</Markdown>
                )}
              </div>
            </div>
          </motion.article>
        )}
      </div>

    </main>
  );
}
