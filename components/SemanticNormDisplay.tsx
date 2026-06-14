'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronUp,
  BookOpen,
  FileText,
  AlertCircle,
  Loader2,
  Wand2,
} from 'lucide-react';
import { SearchResult, generateNormSummaryServer, reprocessNormSectionsAction } from '@/app/actions/norm-actions';
import { RippleButton } from '@/components/ui/multi-type-ripple-buttons';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { SearchLoading } from './ui/search-loading';

interface GroupedSearchResult {
  normId: string;
  normCode: string;
  normTitle: string;
  normCountry: string;
  sections: SearchResult[];
}

interface SemanticNormDisplayProps {
  results: SearchResult[] | null;
  isLoading: boolean;
  error: string | null;
  countryName: string;
  countryCode: string;
  hasSearchQuery: boolean;
  isAdmin?: boolean;
  currentStep?: number;
}

function SemanticNormDisplay({
  results,
  isLoading,
  error,
  countryName,
  countryCode,
  hasSearchQuery,
  isAdmin = false,
  currentStep = 0,
}: SemanticNormDisplayProps) {
  console.log('[SemanticNormDisplay] isAdmin:', isAdmin);
  const [expandedNorms, setExpandedNorms] = useState<Set<string>>(new Set());
  const [expandedContents, setExpandedContents] = useState<Set<string>>(new Set());
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

  const toggleContentExpanded = (sectionId: string) => {
    setExpandedContents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  // Helper function to truncate text to maxWords
  const truncateText = (text: string, maxWords: number = 30): { truncated: string; isTruncated: boolean } => {
    const words = text.trim().split(/\s+/);
    if (words.length <= maxWords) {
      return { truncated: text, isTruncated: false };
    }
    const truncated = words.slice(0, maxWords).join(' ') + '...';
    return { truncated, isTruncated: true };
  };

  const toggleNormExpanded = (normId: string) => {
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

  // Agrupar resultados por norma usando useMemo
  const groupedResults = useMemo((): GroupedSearchResult[] => {
    if (!results || results.length === 0) return [];

    const grouped: Record<string, GroupedSearchResult> = {};

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (!grouped[result.normId]) {
        grouped[result.normId] = {
          normId: result.normId,
          normCode: result.normCode,
          normTitle: result.normTitle,
          normCountry: result.normCountry,
          sections: [],
        };
      }
      grouped[result.normId].sections.push(result);
    }

    const values = Object.values(grouped);
    for (let i = 0; i < values.length; i++) {
      values[i].sections.sort((a, b) => b.similarity - a.similarity);
    }

    return values.sort((a, b) => b.sections.length - a.sections.length);
  }, [results]);

  if (isLoading) {
    return <SearchLoading currentStep={currentStep} />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-red-500">
        <AlertCircle className="w-12 h-12 mb-4 text-red-500" />
        <p className="text-sm font-medium">{error}</p>
      </div>
    );
  }

  if (!groupedResults || groupedResults.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
        <FileText className="w-12 h-12 mb-4" />
        <p className="text-sm font-medium">Nenhuma norma encontrada.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-zinc-500">
          {countryCode} Mostrando{' '}
          <span className="font-bold text-zinc-900">{groupedResults.length}</span>{' '}
          normas para{' '}
          <span className="font-bold text-zinc-900">{countryName}</span>
          {hasSearchQuery && (
            <span className="ml-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
              Busca semântica ativa
            </span>
          )}
        </p>
      </div>

      {/* Grouped Results by Norm */}
      {groupedResults.map((group) => (
        <motion.div
          key={group.normId}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.25,
            ease: 'easeOut'
          }}
          className="p-0 hover:shadow-lg transition-all"
        >
          <div className="w-full">
            {/* Norm Header */}
            <div className="bg-white border border-zinc-100 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-6 bg-gradient-to-r from-zinc-50 to-white">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-orange-700 tracking-wide uppercase">
                        {group.normCode}
                      </span>
                      <span className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-semibold rounded-full">
                        {group.sections.length} artigo{group.sections.length > 1 ? 's' : ''} relevante{group.sections.length > 1 ? 's' : ''}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-zinc-900 leading-tight">
                      {group.normTitle}
                    </h3>
                  </div>

                  {/* Admin Actions - Moved to bottom */}
                </div>
              </div>

              {/* Sections List - First section always visible, others collapsible */}
              <div className="border-t border-zinc-100">
                <div className="p-6 space-y-4">
                  {/* First section - ALWAYS VISIBLE */}
                  {group.sections[0] && (
                    <motion.div
                      initial={{ opacity: 0, transform: 'translateY(10px)' }}
                      animate={{ opacity: 1, transform: 'translateY(0px)' }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      className="bg-blue-50 border border-blue-100 rounded-xl p-4 will-change-transform gpu-accelerated"
                    >
                      {/* Hierarquia Completa */}
                      <div className="space-y-2 mb-3">
                        {group.sections[0].titulo && (
                          <div className="flex items-center gap-2 text-xs">
                            <BookOpen className="w-4 h-4 text-orange-500" />
                            <span className="font-semibold text-orange-600 uppercase tracking-wide">Título:</span>
                            <span className="font-medium text-zinc-700">{group.sections[0].titulo}</span>
                          </div>
                        )}
                        {group.sections[0].capitulo && (
                          <div className="flex items-center gap-2 text-xs pl-2">
                            <span className="w-1.5 h-1.5 bg-orange-300 rounded-full" />
                            <span className="font-semibold text-orange-600 uppercase">Capítulo:</span>
                            <span className="font-medium text-zinc-700">{group.sections[0].capitulo}</span>
                          </div>
                        )}
                        {group.sections[0].seccao && (
                          <div className="flex items-center gap-2 text-xs pl-4">
                            <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full" />
                            <span className="font-semibold text-zinc-600 uppercase">Secção:</span>
                            <span className="font-medium text-zinc-700">{group.sections[0].seccao}</span>
                          </div>
                        )}
                        {group.sections[0].subseccao && (
                          <div className="flex items-center gap-2 text-xs pl-6">
                            <span className="w-1.5 h-1.5 bg-zinc-300 rounded-full" />
                            <span className="font-semibold text-zinc-500 uppercase">Subsecção:</span>
                            <span className="font-medium text-zinc-600">{group.sections[0].subseccao}</span>
                          </div>
                        )}
                        {group.sections[0].artigo && (
                          <div className="flex items-center gap-2 text-xs pl-8">
                            <span className="w-2 h-2 bg-blue-400 rounded-full" />
                            <span className="font-bold text-blue-600 uppercase">{group.sections[0].artigo}</span>
                          </div>
                        )}
                        {group.sections[0].paragrafo && (
                          <div className="flex items-center gap-2 text-xs pl-12">
                            <span className="font-medium text-zinc-500">{group.sections[0].paragrafo}</span>
                          </div>
                        )}
                        {group.sections[0].inciso && (
                          <div className="flex items-center gap-2 text-xs pl-16">
                            <span className="text-zinc-400">↳</span>
                            <span className="font-medium text-zinc-600">{group.sections[0].inciso}</span>
                          </div>
                        )}
                        {group.sections[0].alinea && (
                          <div className="flex items-center gap-2 text-xs pl-20">
                            <span className="text-zinc-400">↳</span>
                            <span className="italic text-zinc-500">{group.sections[0].alinea}</span>
                          </div>
                        )}
                        {group.sections[0].item && (
                          <div className="flex items-center gap-2 text-xs pl-24">
                            <span className="text-zinc-300">•</span>
                            <span className="text-zinc-500">{group.sections[0].item}</span>
                          </div>
                        )}
                      </div>

                      {/* AI Extracted Answer Card */}
                      {group.sections[0].extractedAnswer && (
                        <div className="mb-4 bg-emerald-50/70 border border-emerald-100 rounded-xl p-5 shadow-sm">
                          <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2">
                            <span>Resposta Rápida</span>
                          </div>
                          <p className="text-base font-semibold text-zinc-950 leading-relaxed">
                            {group.sections[0].extractedAnswer}
                          </p>
                        </div>
                      )}

                      {/* Artigo Principal */}
                      <div className="bg-white border-l-4 border-blue-500 p-4 rounded-r-lg shadow-sm">
                        <p className="text-xs font-semibold text-blue-700 mb-2">
                          {group.sections[0].extractedAnswer ? "Artigo Completo:" : "Artigo relevante:"}
                        </p>
                        {(() => {
                          const sectionId = group.sections[0].sectionId;
                          const isExpanded = expandedContents.has(sectionId);
                          const contentToDisplay = group.sections[0].fullArticleContent || group.sections[0].content;
                          const { truncated, isTruncated } = truncateText(contentToDisplay, group.sections[0].extractedAnswer ? 40 : 30);

                          return (
                            <>
                              <p className="text-sm text-zinc-800 leading-relaxed whitespace-pre-wrap">
                                {isExpanded ? contentToDisplay : truncated}
                              </p>
                              {isTruncated && (
                                <button
                                  onClick={() => toggleContentExpanded(sectionId)}
                                  className="mt-2 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
                                >
                                  {isExpanded ? 'Mostrar menos' : 'Ler mais'}
                                </button>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </motion.div>
                  )}

                  {/* Additional sections - Collapsible with button */}
                  {group.sections.length > 1 && (
                    <>
                      {!expandedNorms.has(group.normId) ? (
                        <button
                          onClick={() => toggleNormExpanded(group.normId)}
                          className="w-full py-3 px-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                          <span>Ver mais {group.sections.length - 1} artigo{group.sections.length > 2 ? 's' : ''}</span>
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      ) : (
                        <AnimatePresence>
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25, ease: 'easeInOut' }}
                            className="space-y-3 will-change-transform"
                          >
                            {group.sections.slice(1).map((section, sectionIndex) => (
                              <motion.div
                                key={section.sectionId}
                                initial={{ opacity: 0, transform: 'translateX(-10px)' }}
                                animate={{ opacity: 1, transform: 'translateX(0px)' }}
                                transition={{
                                  delay: Math.min(sectionIndex * 0.03, 0.2),
                                  duration: 0.2,
                                  ease: 'easeOut'
                                }}
                                className="bg-zinc-50 rounded-xl p-4 hover:bg-zinc-100 transition-colors will-change-transform gpu-accelerated"
                              >
                                {/* Hierarquia */}
                                <div className="space-y-1 mb-3">
                                  {section.titulo && (
                                    <div className="flex items-center gap-2 text-xs">
                                      <BookOpen className="w-3 h-3 text-orange-500" />
                                      <span className="text-zinc-600 font-semibold">Título: {section.titulo}</span>
                                    </div>
                                  )}
                                  {section.capitulo && (
                                    <div className="flex items-center gap-2 text-xs pl-3">
                                      <span className="text-zinc-500">Capítulo: {section.capitulo}</span>
                                    </div>
                                  )}
                                  {section.seccao && (
                                    <div className="flex items-center gap-2 text-xs pl-6">
                                      <span className="text-zinc-500">Secção: {section.seccao}</span>
                                    </div>
                                  )}
                                  {section.artigo && (
                                    <div className="flex items-center gap-2 text-xs pl-9">
                                      <span className="font-bold text-blue-600">{section.artigo}</span>
                                    </div>
                                  )}
                                </div>

                                {/* AI Extracted Answer Card */}
                                {section.extractedAnswer && (
                                  <div className="mb-3 bg-emerald-50/70 border border-emerald-100 rounded-xl p-4 shadow-sm">
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">
                                      <span>Resposta Rápida</span>
                                    </div>
                                    <p className="text-sm font-semibold text-zinc-950 leading-relaxed">
                                      {section.extractedAnswer}
                                    </p>
                                  </div>
                                )}

                                {/* Artigo */}
                                <div className="bg-white border-l-3 border-zinc-300 p-3 rounded-r-lg">
                                  <p className="text-xs font-semibold text-zinc-500 mb-1.5">
                                    {section.extractedAnswer ? "Artigo Completo:" : ""}
                                  </p>
                                  {(() => {
                                    const isExpanded = expandedContents.has(section.sectionId);
                                    const contentToDisplay = section.fullArticleContent || section.content;
                                    const { truncated, isTruncated } = truncateText(contentToDisplay, section.extractedAnswer ? 40 : 30);

                                    return (
                                      <>
                                        <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap">
                                          {isExpanded ? contentToDisplay : truncated}
                                        </p>
                                        {isTruncated && (
                                          <button
                                            onClick={() => toggleContentExpanded(section.sectionId)}
                                            className="mt-2 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
                                          >
                                            {isExpanded ? 'Mostrar menos' : 'Ler mais'}
                                          </button>
                                        )}
                                      </>
                                    );
                                  })()}
                                </div>
                              </motion.div>
                            ))}

                            {/* Hide button */}
                            <button
                              onClick={() => toggleNormExpanded(group.normId)}
                              className="w-full py-2 text-zinc-500 hover:text-zinc-700 text-sm transition-colors flex items-center justify-center gap-1"
                            >
                              <span>Mostrar menos</span>
                              <ChevronUp className="w-4 h-4" />
                            </button>
                          </motion.div>
                        </AnimatePresence>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="p-4 bg-zinc-50 border-t border-zinc-100 flex items-center gap-4">
                <Link
                  href={`/norm_detail/${encodeURIComponent(group.normId)}`}
                  className="inline-flex items-center gap-2 text-sm font-bold text-zinc-900 hover:gap-3 transition-all"
                >
                  Ler mais <ArrowRight className="w-4 h-4" />
                </Link>

                {isAdmin && (
                  <RippleButton variant="ghost"
                    onClick={(e) => {
                      e.preventDefault();
                      handleGenerateSummary(group.normId);
                    }}
                    disabled={generatingSummaryId === group.normId}
                    className={`inline-flex items-center gap-2 text-sm font-bold transition-all disabled:opacity-50 ${
                      summarySuccessId === group.normId
                        ? 'text-emerald-600'
                        : summaryErrorId === group.normId
                        ? 'text-red-500'
                        : 'text-amber-600 hover:text-amber-700'
                    }`}
                    title="Gerar Resumo Manualmente"
                  >
                    {generatingSummaryId === group.normId ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : summarySuccessId === group.normId ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    ) : summaryErrorId === group.normId ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    ) : (
                      <Wand2 className="w-4 h-4" />
                    )}
                    {summarySuccessId === group.normId ? 'Pronto' : summaryErrorId === group.normId ? 'Erro' : 'Resumir'}
                  </RippleButton>
                )}
                {isAdmin && (
                  <RippleButton variant="ghost"
                    onClick={(e) => {
                      e.preventDefault();
                      handleRegenerate(group.normId);
                    }}
                    disabled={regeneratingId === group.normId}
                    className={`inline-flex items-center gap-2 text-sm font-bold transition-all disabled:opacity-50 ${
                      regenerateSuccessId === group.normId
                        ? 'text-emerald-600'
                        : regenerateErrorId === group.normId
                        ? 'text-red-500'
                        : 'text-blue-600 hover:text-blue-700'
                    }`}
                    title="Regenerar Sections e Embeddings"
                  >
                    {regeneratingId === group.normId ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : regenerateSuccessId === group.normId ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    ) : regenerateErrorId === group.normId ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    )}
                    {regenerateSuccessId === group.normId ? 'Feito' : regenerateErrorId === group.normId ? 'Erro' : 'Regenerar'}
                  </RippleButton>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// Memoizar para evitar re-renders desnecessários quando as props não mudam
export default React.memo(SemanticNormDisplay);
