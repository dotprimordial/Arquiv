'use client';

import React, { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import CountrySelector, { countries } from '@/components/CountrySelector';
import { useCountry } from '@/contexts/country-context';
import { useAuth } from '@/contexts/auth-context';
import { ActionSearchBar } from '@/components/ui/action-search-bar';
import NormDisplay from '@/components/NormDisplay';
import { RateLimitModal } from '@/components/RateLimitModal';
import { getArchitecturalNorms, Norm, updateNorm, getActiveCountries } from '@/lib/gemini';
import { searchNormsSemantic, SearchResult, deleteNormServer } from '@/app/actions/norm-actions';
import { toast } from 'sonner';

import dynamic from 'next/dynamic';
import ErrorBoundary from '@/components/ErrorBoundary';
const SemanticNormDisplay = dynamic(() => import('@/components/SemanticNormDisplay'), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center py-12">
      <div className="w-8 h-8 border-4 border-zinc-200 border-t-zinc-900 rounded-full animate-spin" />
    </div>
  ),
});

const CATEGORIES = [
  "Todas", "Urbanismo", "Estruturas", "Segurança contra Incêndio",
  "Acessibilidade", "Instalações Elétricas", "Instalações Hidráulicas",
  "Térmica e Acústica", "Materiais", "Sustentabilidade", "Apresentação/Desenho"
] as const;

export default function HomePage() {
  const { country: selectedCountry, setCountry: setSelectedCountry } = useCountry();
  const { user, isAdmin, isSessionLoading, setAuthModalOpen } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAiSearchEnabled, setIsAiSearchEnabled] = useState(true);
  const [hasExceededLimit, setHasExceededLimit] = useState(false);
  const [norms, setNorms] = useState<Norm[] | null>(null);
  const [semanticResults, setSemanticResults] = useState<SearchResult[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [activeCountryNames, setActiveCountryNames] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalNormsCount, setTotalNormsCount] = useState(0);
  const pageSize = 10;
  const [isRateLimitModalOpen, setIsRateLimitModalOpen] = useState(false);
  const [isCountriesLoading, setIsCountriesLoading] = useState(true);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastRequestKeyRef = useRef<string>('');
  const isFetchingRef = useRef(false);

  const fetchActiveCountries = useCallback(async () => {
    setIsCountriesLoading(true);
    const activeNames = await getActiveCountries();
    console.log('[Home] fetchActiveCountries retornou:', activeNames);
    setActiveCountryNames(activeNames);
    setIsCountriesLoading(false);
  }, []);

  useEffect(() => {
    document.title = 'Arquiv - Normas Técnicas de Construção e Legislação';
    fetch('/api/log-ip', { method: 'POST' }).catch(() => {});
    fetchActiveCountries();
  }, [fetchActiveCountries]);

  useEffect(() => {
    console.log('[Home] activeCountryNames mudou:', activeCountryNames);
    if (activeCountryNames.length === 0) {
      console.log('[Home] Nenhum país ativo encontrado, não selecionando país.');
      return;
    }

    if (!selectedCountry || !activeCountryNames.includes(selectedCountry.name)) {
      const defaultCountryName = activeCountryNames[0];
      const defaultCountry = countries.find((c) => c.name === defaultCountryName);
      console.log(`[Home] Selecionando país padrão: ${defaultCountryName}`);
      if (defaultCountry) {
        setSelectedCountry(defaultCountry);
      }
    }
  }, [activeCountryNames, selectedCountry, setSelectedCountry]);

  const fetchNorms = useCallback(async (country: string, category: string, query: string, useAi: boolean = false, page: number = 1) => {
    if (!country || country.trim() === '') {
      console.warn('[fetchNorms] País inválido ou não selecionado, cancelando busca.');
      setNorms(null);
      setSemanticResults(null);
      return;
    }

    const requestKey = `${country}-${category}-${query}-${useAi}-${page}`;
    if (lastRequestKeyRef.current === requestKey && isFetchingRef.current) {
      console.log('[fetchNorms] Requisição duplicada ignorada:', requestKey);
      return;
    }

    lastRequestKeyRef.current = requestKey;
    isFetchingRef.current = true;
    setIsLoading(true);
    setLoadingStep(0);
    setError(null);

    const stepTimer = setInterval(() => {
      setLoadingStep(prev => Math.min(prev + 1, 5));
    }, 700);

    try {
      if (query && query.trim() !== '') {
        if (useAi) {
          console.log('Usando busca semântica com IA para:', query);
          try {
            const results = await searchNormsSemantic(query, country, 20);
            if (results && results.length > 0) {
              setSemanticResults(results);
              setNorms(null);
            } else {
              console.warn('Busca semântica retornou vazio, usando busca tradicional como fallback');
              setIsAiSearchEnabled(false);
              const data = await getArchitecturalNorms(country, category, query, false, page, pageSize);
              setNorms(data.norms);
              setTotalNormsCount(data.totalCount);
              setSemanticResults(null);
            }
          } catch (semanticErr) {
            console.error('Busca semântica falhou, usando busca tradicional:', semanticErr);

            const errMsg = semanticErr instanceof Error ? semanticErr.message : String(semanticErr);
            if (errMsg.includes('Limite')) {
              setHasExceededLimit(true);
            }

            setIsAiSearchEnabled(false);
            const data = await getArchitecturalNorms(country, category, query, false, page, pageSize);
            setNorms(data.norms);
            setTotalNormsCount(data.totalCount);
            setSemanticResults(null);
          }
        } else {
          console.log('Usando busca textual normal (sem IA) para:', query);
          const data = await getArchitecturalNorms(country, category, query, false, page, pageSize);
          setNorms(data.norms);
          setTotalNormsCount(data.totalCount);
          setSemanticResults(null);
        }
      } else {
        console.log('Usando busca tradicional (listagem)');
        const data = await getArchitecturalNorms(country, category, query, false, page, pageSize);
        setNorms(data.norms);
        setTotalNormsCount(data.totalCount);
        setSemanticResults(null);
      }
    } catch (err: unknown) {
      console.error('Erro na busca:', err);
      const msg = err instanceof Error ? err.message : String(err);

      if (msg.includes('Limite')) {
        setHasExceededLimit(true);
        setIsAiSearchEnabled(false);
        if (!user) {
          setError(null);
          setIsRateLimitModalOpen(true);
        } else {
          setError(msg);
        }
      } else {
        setError(msg.includes('API') ? 'Erro de conexão com o serviço de busca. Tente novamente.' : msg);
      }

      setNorms(null);
      setSemanticResults(null);
    } finally {
      clearInterval(stepTimer);
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [user, pageSize]);

  useEffect(() => {
    console.log('[Home] useEffect triggered - country:', selectedCountry?.name, 'category:', selectedCategory, 'aiSearch:', isAiSearchEnabled);
    if (!selectedCountry?.name) {
      console.log('[Home] selectedCountry ainda não definido, pulando busca.');
      return;
    }
    console.log('[Home] Disparando fetchNorms com país:', selectedCountry.name);
    setCurrentPage(1);
    fetchNorms(selectedCountry.name, selectedCategory, searchQuery, isAiSearchEnabled, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCountry, selectedCategory, isAiSearchEnabled, searchQuery]);

  const handleSearch = useCallback((query: string) => {
    if (!selectedCountry?.name) {
      console.warn('[handleSearch] Nenhum país selecionado, busca não será executada.');
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setSearchQuery(query);
    setCurrentPage(1);

    debounceTimerRef.current = setTimeout(() => {
      if (!selectedCountry?.name) return;
      fetchNorms(selectedCountry.name, selectedCategory, query, isAiSearchEnabled, 1);
    }, 500);
  }, [selectedCountry?.name, selectedCategory, fetchNorms, isAiSearchEnabled]);

  const handleDeleteNorm = async (id: string) => {
    toast('Tem certeza que deseja excluir esta norma?', {
      action: {
        label: 'Confirmar',
        onClick: async () => {
          try {
            await deleteNormServer(id);
            setNorms(prev => prev ? prev.filter(n => n.id !== id) : null);
            fetchActiveCountries();
            toast.success('Norma excluída com sucesso!');
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            toast.error('Erro ao excluir norma: ' + msg);
          }
        },
      },
    });
  };

  const handleUpdateNorm = async (id: string, updates: Partial<Norm>) => {
    try {
      const updated = await updateNorm(id, updates);
      setNorms(prev => prev ? prev.map(n => n.id === id ? { ...n, ...updated } : n) : null);
      toast.success('Norma atualizada com sucesso!');
    } catch (err: unknown) {
      toast.error('Erro ao atualizar norma: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const SkeletonLoader = () => (
    <div className="space-y-8 animate-pulse">
      <div className="py-16 text-center space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl font-bold font-serif tracking-tight text-zinc-900"
        >
          <div className="h-12 bg-zinc-200 rounded mx-auto w-96"></div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-zinc-500 max-w-2xl mx-auto px-6"
        >
          <div className="h-4 bg-zinc-200 rounded mx-auto w-full max-w-2xl"></div>
        </motion.div>
      </div>
      
      <div className="mb-12">
        <div className="flex flex-wrap justify-center gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 w-32 bg-zinc-200 rounded-full border border-zinc-100"></div>
          ))}
        </div>
      </div>
      
      <div className="mb-4 max-w-5xl mx-auto px-6">
        <div className="h-14 bg-zinc-200 rounded-full border border-zinc-100 shadow-sm"></div>
      </div>
      
      <div className="max-w-5xl mx-auto mb-8 px-6">
        <div className="flex items-center justify-center gap-3 bg-white rounded-full px-4 py-2 border border-zinc-200 shadow-sm w-80 mx-auto">
          <div className="h-4 w-24 bg-zinc-200 rounded"></div>
          <div className="w-12 h-6 bg-zinc-200 rounded-full"></div>
          <div className="h-4 w-28 bg-zinc-200 rounded"></div>
        </div>
      </div>
      
      <div className="max-w-5xl mx-auto px-6 mb-12">
        <div className="flex flex-wrap justify-center gap-2 px-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-10 w-24 bg-zinc-200 rounded-full border border-zinc-100"></div>
          ))}
        </div>
      </div>
      
      <div className="max-w-5xl mx-auto px-6 space-y-6 pb-20">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white border border-zinc-100 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-6 bg-gradient-to-r from-zinc-50 to-white">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-24 bg-zinc-200 rounded" />
                    <div className="h-5 w-32 bg-zinc-200 rounded-full" />
                  </div>
                  <div className="h-7 w-3/4 bg-zinc-200 rounded" />
                </div>
              </div>
            </div>
            <div className="border-t border-zinc-100">
              <div className="p-6 space-y-4">
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <div className="space-y-2 mb-3">
                    <div className="h-3 w-1/2 bg-zinc-200 rounded" />
                    <div className="h-3 w-2/3 bg-zinc-200 rounded" />
                  </div>
                  <div className="bg-white border-l-4 border-blue-500 p-4 rounded-r-lg">
                    <div className="h-4 w-full bg-zinc-200 rounded mb-2" />
                    <div className="h-4 w-5/6 bg-zinc-200 rounded" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#F9F9F8] text-zinc-900 selection:bg-zinc-900 selection:text-white">

      {isSessionLoading && isCountriesLoading ? (
        <SkeletonLoader />
      ) : (
        <>
          <div className="py-16 text-center space-y-6">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-5xl font-bold font-serif tracking-tight text-zinc-900"
            >
              Normas de Construção por País
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-zinc-500 max-w-2xl mx-auto px-6"
            >
              Selecione um país para explorar as normas e regulamentos aplicáveis a projetos arquitetónicos. Pesquise por código, título ou categoria.
            </motion.p>
          </div>

          <div className="mb-12">
            {isCountriesLoading ? (
              <div className="flex flex-wrap justify-center gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-12 w-32 bg-zinc-200 rounded-full animate-pulse"></div>
                ))}
              </div>
            ) : (
              <CountrySelector
                selectedCountryName={selectedCountry?.name || ''}
                onSelect={setSelectedCountry}
                activeCountryNames={activeCountryNames}
              />
            )}
          </div>

          <div className="mb-4">
            <ActionSearchBar onSearch={handleSearch} isLoading={isLoading} placeholder="Pesquisar normas por código, título ou categoria..." />
          </div>

          <div className="max-w-5xl mx-auto mb-8 px-6">
            <div className="flex items-center justify-center gap-3 bg-white rounded-full px-4 py-2 border border-zinc-200 shadow-sm">
              <span className={`text-sm font-medium ${!isAiSearchEnabled ? 'text-zinc-900' : 'text-zinc-400'}`}>
                Busca Normal
              </span>
              <button
                onClick={() => {
                  if (!isAiSearchEnabled && hasExceededLimit) {
                    toast.error(user ? 'Limite de buscas diárias atingido. Tente novamente amanhã para usar a IA.' : 'Limite de buscas diárias atingido. Por favor, crie uma conta ou tente novamente amanhã para usar a IA.', { duration: 4000 });
                    return;
                  }
                  setIsAiSearchEnabled(!isAiSearchEnabled);
                }}
                className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${isAiSearchEnabled ? 'bg-emerald-500' : 'bg-zinc-300'
                  }`}
                aria-label={isAiSearchEnabled ? 'Desativar busca IA' : 'Ativar busca IA'}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${isAiSearchEnabled ? 'translate-x-6' : 'translate-x-0'
                    }`}
                />
              </button>
              <span className={`text-sm font-medium ${isAiSearchEnabled ? 'text-emerald-600' : 'text-zinc-400'}`}>
                Busca Inteligente (IA)
              </span>
            </div>
          </div>

          <div className="max-w-5xl mx-auto px-6 mb-12">
            <div className="flex overflow-x-auto flex-nowrap lg:flex-wrap gap-2 px-4 pb-2 lg:justify-center scrollbar-hide [-ms-overflow-style:none] [scrollbar-width:none]">
              {CATEGORIES.map((cat: string) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all border ${selectedCategory === cat
                    ? 'bg-[#1e293b] text-white border-[#1e293b]'
                    : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300'
                    }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {searchQuery.trim() !== '' && isAiSearchEnabled ? (
            <ErrorBoundary>
              <SemanticNormDisplay
                results={semanticResults}
                isLoading={isLoading}
                error={error}
                countryName={selectedCountry?.name || ''}
                countryCode={selectedCountry?.code || ''}
                hasSearchQuery={searchQuery.trim() !== ''}
                isAdmin={isAdmin}
                currentStep={loadingStep}
              />
            </ErrorBoundary>
          ) : (
            <Suspense fallback={<div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-zinc-200 border-t-zinc-900 rounded-full animate-spin"></div></div>}>
              <NormDisplay
                norms={norms}
                isLoading={isLoading}
                error={error}
                countryName={selectedCountry?.name || ''}
                countryCode={selectedCountry?.code || ''}
                onDelete={handleDeleteNorm}
                onUpdate={handleUpdateNorm}
                hasSearchQuery={searchQuery.trim() !== ''}
                isAdmin={isAdmin}
                currentStep={loadingStep}
              />
            </Suspense>
          )}
          {norms && norms.length > 0 && totalNormsCount > pageSize && (
            <div className="flex justify-center mt-8">
              <div className="flex items-center gap-2 text-gray-500">
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="mr-4 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="mt-1.5" width="9" height="13" viewBox="0 0 9 13" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 1 2 6.667 8 12" stroke="#111820" strokeOpacity=".5" strokeWidth="2" strokeLinecap="round" /></svg>
                  <span>prev</span>
                </button>

                <div className="flex gap-2 text-sm md:text-base">
                  {Array.from({ length: Math.min(5, Math.ceil(totalNormsCount / pageSize)) }, (_, i) => {
                    const totalPages = Math.ceil(totalNormsCount / pageSize);
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`flex items-center justify-center w-9 md:w-12 h-9 md:h-12 aspect-square rounded-md transition-all ${currentPage === pageNum
                          ? 'border border-indigo-500 text-indigo-500'
                          : 'hover:bg-slate-100/80'
                          }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalNormsCount / pageSize), p + 1))}
                  disabled={currentPage >= Math.ceil(totalNormsCount / pageSize)}
                  className="ml-4 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>next</span>
                  <svg className="mt-1.5" width="9" height="13" viewBox="0 0 9 13" fill="none" xmlns="http://www.w3.org/2000/svg" transform="scale(-1 1)"><path d="M8 1 2 6.667 8 12" stroke="#111820" strokeOpacity=".5" strokeWidth="2" strokeLinecap="round" /></svg>
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <RateLimitModal
        isOpen={isRateLimitModalOpen}
        onClose={() => setIsRateLimitModalOpen(false)}
        onSignUp={() => {
          setIsRateLimitModalOpen(false);
          setAuthModalOpen(true);
        }}
      />
    </main>
  );
}
