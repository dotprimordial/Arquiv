'use client';

import React, { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { LogIn, LogOut, Upload as UploadIcon, User, ShieldCheck } from 'lucide-react';
import Image from 'next/image';
import CountrySelector, { Country, countries } from '@/components/CountrySelector';
import { ActionSearchBar } from '@/components/ui/action-search-bar';
import NormDisplay from '@/components/NormDisplay';
import SearchRateLimitDisplay from '@/components/SearchRateLimitDisplay';
import { RateLimitModal } from '@/components/RateLimitModal';
import { getArchitecturalNorms, Norm, updateNorm, getActiveCountries } from '@/lib/gemini';
import { getSessionAction, logoutAction } from '@/app/actions/auth-actions';
import { useRouter } from 'next/navigation';
import { searchNormsSemantic, SearchResult, deleteNormServer } from '@/app/actions/norm-actions';
import { toast } from 'sonner';

// Lazy load heavy components
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
const AuthModal = dynamic(() => import('@/components/AuthModal'), { ssr: false, loading: () => null });

// Categories array - defined outside component to prevent re-creation
const CATEGORIES = [
  "Todas", "Urbanismo", "Estruturas", "Segurança contra Incêndio",
  "Acessibilidade", "Instalações Elétricas", "Instalações Hidráulicas",
  "Térmica e Acústica", "Materiais", "Sustentabilidade", "Apresentação/Desenho"
] as const;

interface SupabaseUser {
  id: string;
  email?: string;
  user_metadata: {
    full_name?: string;
    avatar_url?: string;
    [key: string]: unknown;
  };
}

export default function Home() {
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAiSearchEnabled, setIsAiSearchEnabled] = useState(true); // Toggle busca IA
  const [hasExceededLimit, setHasExceededLimit] = useState(false);
  const [norms, setNorms] = useState<Norm[] | null>(null);
  const [semanticResults, setSemanticResults] = useState<SearchResult[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCountryNames, setActiveCountryNames] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalNormsCount, setTotalNormsCount] = useState(0);
  const pageSize = 10;
  const [user, setUser] = useState<SupabaseUser | null>(null);

  useEffect(() => {
    // Log visitor IP address on first page load
    fetch('/api/log-ip', { method: 'POST' }).catch((err) => console.error('IP log error:', err));
  }, []);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isRateLimitModalOpen, setIsRateLimitModalOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const router = useRouter();

  // FIX #13: Refs para controle de debounce e cancelamento de requests
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastRequestKeyRef = useRef<string>('');
  const isFetchingRef = useRef(false);

  // FIX #14: fetchActiveCountries sem dependência circular
  const fetchActiveCountries = useCallback(async () => {
    const activeNames = await getActiveCountries();
    console.log('[Home] fetchActiveCountries retornou:', activeNames);
    setActiveCountryNames(activeNames);
  }, []); // sem dependências — não causa loops

  useEffect(() => {
    console.log('[Home] Inicial: buscando países ativos...');
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
  }, [activeCountryNames, selectedCountry]);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await getSessionAction();
        if (res.success && res.session) {
          setUser(res.user as unknown as SupabaseUser);
          setIsAdmin(res.isAdmin);
        }
      } catch (err) {
        console.error('Session check error:', err);
      } finally {
        setIsSessionLoading(false);
      }
    };

    const safetyTimeout = setTimeout(() => {
      setIsSessionLoading(false);
    }, 2000);

    checkSession();

    return () => {
      clearTimeout(safetyTimeout);
    };
  }, []);

  const handleLimitExceeded = useCallback(() => {
    setHasExceededLimit(true);
    setIsAiSearchEnabled(prev => {
      if (prev) {
        toast.error('Limite diário atingido. Mudando para busca normal.', { duration: 5000 });
        return false;
      }
      return prev;
    });
  }, []);

  const fetchNorms = useCallback(async (country: string, category: string, query: string, useAi: boolean = false, page: number = 1) => {
    if (!country || country.trim() === '') {
      console.warn('[fetchNorms] País inválido ou não selecionado, cancelando busca.');
      setNorms(null);
      setSemanticResults(null);
      return;
    }

    // FIX #15: Guard contra fetches paralelos e duplicados
    const requestKey = `${country}-${category}-${query}-${useAi}-${page}`;
    if (lastRequestKeyRef.current === requestKey && isFetchingRef.current) {
      console.log('[fetchNorms] Requisição duplicada ignorada:', requestKey);
      return;
    }

    lastRequestKeyRef.current = requestKey;
    isFetchingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      if (query && query.trim() !== '') {
        // FIX #19: Usar IA apenas quando toggle estiver ativado
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

            // Check if it was a rate limit error
            const errMsg = semanticErr instanceof Error ? semanticErr.message : String(semanticErr);
            if (errMsg.includes('Limite')) {
              setHasExceededLimit(true);
              if (!user) {
                // Optionally open modal or just let the toast do the job
                // setIsRateLimitModalOpen(true);
              }
            }

            // Fallback automático para busca tradicional se semântica falhar
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

      // Check if error is rate limit related
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
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [user, pageSize]);

  // FIX #17: Separar useEffect por responsabilidade — país/categoria vs query
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

    // FIX #18: Debounce aumentado para 500ms para evitar chamadas excessivas
    debounceTimerRef.current = setTimeout(() => {
      if (!selectedCountry?.name) return;
      fetchNorms(selectedCountry.name, selectedCategory, query, isAiSearchEnabled, 1);
    }, 500);
  }, [selectedCountry?.name, selectedCategory, fetchNorms, isAiSearchEnabled]);

  // FIX #7: Usar Server Action deleteNormServer em vez de cliente direto
  const handleDeleteNorm = async (id: string) => {
    toast('Tem certeza que deseja excluir esta norma?', {
      action: {
        label: 'Confirmar',
        onClick: async () => {
          try {
            await deleteNormServer(id);
            setNorms(prev => prev ? prev.filter(n => n.id !== id) : null);
            // FIX #14: Atualizar países sem criar loop
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

  const handleLogout = async () => {
    try {
      await logoutAction();
      setUser(null);
      setIsAdmin(false);
      window.location.reload();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  if (isSessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9F9F8]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-zinc-200 border-t-zinc-900 rounded-full animate-spin" />
          <p className="text-zinc-500 font-medium">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#F9F9F8] text-zinc-900 selection:bg-zinc-900 selection:text-white">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white sticky top-0 z-40">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center">
            <div className="cursor-pointer" onClick={() => router.push('/')}>
              <h1 className="font-[family-name:var(--font-equinox)] font-black text-xl leading-none uppercase tracking-wider hover:text-zinc-600 transition-colors">ARQUIV</h1>
              <p className="text-zinc-400 text-xs mt-1">Normas para Projetos Arquitetónicos</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:block">
                  <SearchRateLimitDisplay compact={true} onLimitExceeded={handleLimitExceeded} />
                </div>
                {isAdmin && (
                  <button
                    onClick={() => router.push('/upload')}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-full text-sm font-bold hover:bg-emerald-700 transition-all shadow-sm"
                  >
                    <UploadIcon className="w-4 h-4" />
                    <span className="hidden xs:inline">Carregar Norma</span>
                    <span className="inline xs:hidden">Carregar</span>
                  </button>
                )}
                <div className="flex items-center gap-3 p-2 bg-zinc-50 rounded-full">
                  <div className="w-8 h-8 bg-zinc-900 rounded-full flex items-center justify-center">
                    {user.user_metadata?.avatar_url ? (
                      <Image
                        src={user.user_metadata.avatar_url}
                        alt="Avatar"
                        width={32}
                        height={32}
                        className="w-8 h-8 rounded-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <User className="w-4 h-4 text-zinc-500" />
                    )}
                  </div>
                  <span className="text-xs font-bold text-zinc-600 hidden xs:inline sm:inline">
                    {isAdmin ? 'Admin' : (user.user_metadata?.full_name || user.email?.split('@')[0])}
                  </span>
                  {isAdmin && <ShieldCheck className="w-3 h-3 text-emerald-500 hidden xs:inline sm:inline" />}
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-zinc-400 hover:text-red-600 transition-colors"
                  title="Sair"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="hidden sm:block">
                  <SearchRateLimitDisplay compact={true} onLimitExceeded={handleLimitExceeded} />
                </div>
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="flex items-center gap-2 px-4 xs:px-6 py-2 bg-zinc-900 text-white rounded-full text-xs xs:text-sm font-bold hover:bg-zinc-800 transition-all shadow-sm"
                >
                  <LogIn className="w-4 h-4" />
                  <span className="hidden xs:inline">Entrar / Registar</span>
                  <span className="inline xs:hidden">Entrar</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

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

      {/* Country Selection */}
      <div className="mb-12">
        <CountrySelector
          selectedCountryName={selectedCountry?.name || ''}
          onSelect={setSelectedCountry}
          activeCountryNames={activeCountryNames}
        />
      </div>

      {/* Search Bar */}
      <div className="mb-4">
        <ActionSearchBar onSearch={handleSearch} isLoading={isLoading} placeholder="Pesquisar normas por código, título ou categoria..." />
      </div>

      {/* AI Search Toggle */}
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

      {/* Category Filters */}
      <div className="max-w-5xl mx-auto px-6 mb-12">
        <div className="flex flex-wrap justify-center gap-2 px-4">
          {CATEGORIES.map((cat: string) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${selectedCategory === cat
                ? 'bg-[#1e293b] text-white border-[#1e293b]'
                : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300'
                }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
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
          />
        </Suspense>
      )}

      {/* Pagination */}
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

      {/* Auth Modal */}
      <ErrorBoundary>
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
        />
      </ErrorBoundary>

      {/* Rate Limit Modal for Anonymous Users */}
      <RateLimitModal
        isOpen={isRateLimitModalOpen}
        onClose={() => setIsRateLimitModalOpen(false)}
        onSignUp={() => {
          setIsRateLimitModalOpen(false);
          setIsAuthModalOpen(true);
        }}
      />
    </main>
  );
}
