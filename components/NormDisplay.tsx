'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, Loader2, AlertCircle, BookOpen, ArrowRight, Compass, ChevronUp, Wand2 } from 'lucide-react';
import Link from 'next/link';

import { Trash2, Edit2 } from 'lucide-react';
import { Norm } from '@/lib/gemini';
import { generateNormSummaryServer, reprocessNormSectionsAction } from '@/app/actions/norm-actions';
import { RippleButton } from '@/components/ui/multi-type-ripple-buttons';
import { toast } from 'sonner';
import { SearchLoading } from './ui/search-loading';

interface NormDisplayProps {
  norms: (Norm & { reasoning?: string; excerpt?: string })[] | null;
  isLoading: boolean;
  error: string | null;
  countryName: string;
  countryCode: string;
  onDelete?: (id: string) => void;
  onUpdate?: (id: string, updates: Partial<Norm>) => void;
  hasSearchQuery?: boolean; // Nova prop para indicar se houve pesquisa
  isAdmin?: boolean; // Admin pode editar/deletar qualquer norma
  currentStep?: number;
}

function NormDisplay({
  norms,
  isLoading,
  error,
  countryName,
  countryCode,
  onDelete,
  onUpdate,
  hasSearchQuery = false, // Default: sem pesquisa
  isAdmin = false, // Default: não é admin
  currentStep = 0,
}: NormDisplayProps) {
  console.log('[NormDisplay] isAdmin:', isAdmin);
  const [expandedNorms, setExpandedNorms] = useState<Set<string>>(new Set());
  const [generatingSummaryId, setGeneratingSummaryId] = useState<string | null>(null);
  const [summarySuccessId, setSummarySuccessId] = useState<string | null>(null);
  const [summaryErrorId, setSummaryErrorId] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [regenerateSuccessId, setRegenerateSuccessId] = useState<string | null>(null);
  const [regenerateErrorId, setRegenerateErrorId] = useState<string | null>(null);

  const handleGenerateSummary = async (normId: string) => {
    setGeneratingSummaryId(normId);
    setSummarySuccessId(null);
    setSummaryErrorId(null);
    try {
      await generateNormSummaryServer(normId);
      setGeneratingSummaryId(null);
      setSummarySuccessId(normId);
      toast.success('Resumo gerado com sucesso!');
      setTimeout(() => setSummarySuccessId((id) => id === normId ? null : id), 2000);
    } catch (error) {
      const err = error as Error;
      setGeneratingSummaryId(null);
      setSummaryErrorId(normId);
      toast.error(err.message || 'Erro ao gerar resumo');
      setTimeout(() => setSummaryErrorId((id) => id === normId ? null : id), 3000);
    }
  };

  const handleRegenerate = async (normId: string) => {
    setRegeneratingId(normId);
    setRegenerateSuccessId(null);
    setRegenerateErrorId(null);
    try {
      const res = await reprocessNormSectionsAction(normId);
      if (res.success) {
        setRegeneratingId(null);
        setRegenerateSuccessId(normId);
        toast.success(`Sections regeneradas: ${res.sectionsCreated}`);
        setTimeout(() => setRegenerateSuccessId((id) => id === normId ? null : id), 2000);
      } else {
        throw new Error(res.error || 'Erro ao regenerar');
      }
    } catch (error) {
      const err = error as Error;
      setRegeneratingId(null);
      setRegenerateErrorId(normId);
      toast.error(err.message || 'Erro ao regenerar sections');
      setTimeout(() => setRegenerateErrorId((id) => id === normId ? null : id), 3000);
    }
  };

  const toggleExpanded = (normId: string) => {
    setExpandedNorms(prev => {
      const newSet = new Set(prev);
      if (newSet.has(normId)) {
        newSet.delete(normId);
      } else {
        newSet.add(normId);
      }
      return newSet;
    });
  };
  if (isLoading) {
    return <SearchLoading currentStep={currentStep} />;
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-6">
        <div className="p-6 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-4 text-red-600">
          <AlertCircle className="w-6 h-6 shrink-0" />
          <div>
            <h3 className="font-semibold mb-1">Erro na consulta</h3>
            <p className="text-sm opacity-90">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!norms || norms.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-6">
        <div className="flex flex-col items-center justify-center py-20 text-zinc-400 border-2 border-dashed border-zinc-100 rounded-3xl">
          <BookOpen className="w-12 h-12 mb-4 opacity-20" />
          <p className="text-sm">Nenhuma norma encontrada para {countryName}.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 space-y-4 pb-20">
      <p className="text-sm text-zinc-500 mb-6">
        {countryCode} Mostrando <span className="font-bold text-zinc-900">{norms.length}</span> normas para <span className="font-bold text-zinc-900">{countryName}</span>
      </p>

      {norms.map((norm) => (
        <motion.div
          key={norm.id}
          layout
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.2,
            ease: 'easeOut'
          }}
          className="p-0 hover:shadow-md transition-all group will-change-transform gpu-accelerated"
        >
          <div className="w-full">
            <div className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-orange-700 tracking-wide uppercase">
                      {norm.code}
                    </span>
                    <span className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-semibold rounded-full">
                      {norm.category}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-zinc-900 leading-tight">
                    {norm.title}
                  </h3>
                  <p className="text-zinc-500 text-sm leading-relaxed">
                    {norm.summary || norm.description}
                  </p>

                  {/* Mostrar reasoning apenas quando houver pesquisa */}
                  {hasSearchQuery && norm.reasoning && (
                    <div className="mt-4 p-3 bg-zinc-50 border border-zinc-100 rounded-xl flex gap-3 items-start">
                      <div className="w-5 h-5 bg-zinc-900 rounded flex items-center justify-center shrink-0 mt-0.5">
                        <Compass className="w-3 h-3 text-white" />
                      </div>
                      <p className="text-xs text-zinc-600 italic leading-relaxed">
                        <span className="font-bold text-zinc-900 not-italic">Porquê este resultado:</span> {norm.reasoning}
                      </p>
                    </div>
                  )}

                  {/* Mostrar artigos apenas quando houver pesquisa */}
                  {hasSearchQuery && norm.excerpt && (
                    <div className="mt-3 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                      <div className="flex items-start gap-3">
                        <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center shrink-0 mt-0.5">
                          <BookOpen className="w-3 h-3 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-bold text-blue-900 mb-1">Artigo Relevante:</p>
                          <p className="text-sm text-blue-800 leading-relaxed italic">
                            &quot;{expandedNorms.has(norm.id) ? norm.excerpt : norm.excerpt.substring(0, 200) + (norm.excerpt.length > 200 ? '...' : '')}&quot;
                          </p>
                          {norm.excerpt.length > 200 && (
                            <button
                              onClick={() => toggleExpanded(norm.id)}
                              className="mt-2 text-xs text-blue-600 font-medium hover:text-blue-800 transition-colors flex items-center gap-1"
                            >
                              {expandedNorms.has(norm.id) ? (
                                <>
                                  <ChevronUp className="w-3 h-3" />
                                  Ver menos
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="w-3 h-3" />
                                  Ver mais artigos
                                </>
                              )}
                            </button>
                          )}
                          <p className="text-xs text-blue-600 mt-2 font-medium">
                            💡 Busca exaustiva: TODOS os artigos relevantes foram transcritos para consulta completa
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="pt-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Link
                        href={`/norm_detail/${encodeURIComponent(norm.id)}`}
                        className="inline-flex items-center gap-2 text-sm font-bold text-zinc-900 hover:gap-3 transition-all"
                      >
                        Ler mais <ArrowRight className="w-4 h-4" />
                      </Link>

                      {isAdmin && (
                        <RippleButton variant="ghost"
                          onClick={(e) => {
                            e.preventDefault();
                            handleGenerateSummary(norm.id);
                          }}
                          disabled={generatingSummaryId === norm.id}
                          className={`inline-flex items-center gap-2 text-sm font-bold transition-all disabled:opacity-50 ${
                            summarySuccessId === norm.id
                              ? 'text-emerald-600'
                              : summaryErrorId === norm.id
                              ? 'text-red-500'
                              : 'text-amber-600 hover:text-amber-700'
                          }`}
                          title="Gerar Resumo Manualmente"
                        >
                          {generatingSummaryId === norm.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : summarySuccessId === norm.id ? (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          ) : summaryErrorId === norm.id ? (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          ) : (
                            <Wand2 className="w-4 h-4" />
                          )}
                          {summarySuccessId === norm.id ? 'Pronto' : summaryErrorId === norm.id ? 'Erro' : 'Resumir'}
                        </RippleButton>
                      )}
                      {isAdmin && (
                        <RippleButton variant="ghost"
                          onClick={(e) => {
                            e.preventDefault();
                            handleRegenerate(norm.id);
                          }}
                          disabled={regeneratingId === norm.id}
                          className={`inline-flex items-center gap-2 text-sm font-bold transition-all disabled:opacity-50 ${
                            regenerateSuccessId === norm.id
                              ? 'text-emerald-600'
                              : regenerateErrorId === norm.id
                              ? 'text-red-500'
                              : 'text-blue-600 hover:text-blue-700'
                          }`}
                          title="Regenerar Sections e Embeddings"
                        >
                          {regeneratingId === norm.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : regenerateSuccessId === norm.id ? (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          ) : regenerateErrorId === norm.id ? (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                          )}
                          {regenerateSuccessId === norm.id ? 'Feito' : regenerateErrorId === norm.id ? 'Erro' : 'Regenerar'}
                        </RippleButton>
                      )}
                    </div>

                    {isAdmin && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            const newTitle = prompt('Novo título:', norm.title);
                            if (newTitle && onUpdate) onUpdate(norm.id, { title: newTitle });
                          }}
                          className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-all"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDelete && onDelete(norm.id)}
                          className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="hidden sm:block">
                  <ChevronDown className="w-5 h-5 text-zinc-300 group-hover:text-zinc-900 transition-colors mt-1" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// Memoizar para evitar re-renders desnecessários quando as props não mudam
export default React.memo(NormDisplay);
