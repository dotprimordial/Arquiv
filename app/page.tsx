'use client';

import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import { LogIn, LogOut, Upload as UploadIcon, User, ShieldCheck } from 'lucide-react';
import CountrySelector, { Country } from '@/components/CountrySelector';
import NormSearch from '@/components/NormSearch';
import NormDisplay from '@/components/NormDisplay';
import { getArchitecturalNorms, Norm, updateNorm, getActiveCountries } from '@/lib/gemini';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { searchNormsSemantic, SearchResult, deleteNormServer } from '@/app/actions/norm-actions';

// Lazy load heavy components
const SemanticNormDisplay = lazy(() => import('@/components/SemanticNormDisplay'));
const AuthModal = lazy(() => import('@/components/AuthModal'));

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
  const [selectedCountry, setSelectedCountry] = useState<Country>({ code: 'PT', name: 'Portugal' });
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAiSearchEnabled, setIsAiSearchEnabled] = useState(false); // Toggle busca IA
  const [norms, setNorms] = useState<Norm[] | null>(null);
  const [semanticResults, setSemanticResults] = useState<SearchResult[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCountryNames, setActiveCountryNames] = useState<string[]>([]);

  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
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
    setActiveCountryNames(activeNames);
  }, []); // sem dependências — não causa loops

  useEffect(() => {
    fetchActiveCountries();
  }, [fetchActiveCountries]);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setUser(session.user);
          setIsAdmin(session.user.email === 'seantomasytbr@gmail.com');
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUser(session.user);
        setIsAdmin(session.user.email === 'seantomasytbr@gmail.com');
        setIsAuthModalOpen(false);
      } else {
        setUser(null);
        setIsAdmin(false);
      }
      setIsSessionLoading(false);
      clearTimeout(safetyTimeout);
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(safetyTimeout);
    };
  }, []);

  const fetchNorms = useCallback(async (country: string, category: string, query: string, useAi: boolean = false) => {
    // FIX #15: Guard contra fetches paralelos e duplicados
    const requestKey = `${country}-${category}-${query}-${useAi}`;
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
            setSemanticResults(results);
            setNorms(null);
          } catch (semanticErr) {
            console.error('Busca semântica falhou, usando busca tradicional:', semanticErr);
            // Fallback automático para busca tradicional se semântica falhar
            const data = await getArchitecturalNorms(country, category, query, false);
            setNorms(data);
            setSemanticResults(null);
          }
        } else {
          console.log('Usando busca textual normal (sem IA) para:', query);
          const data = await getArchitecturalNorms(country, category, query, false);
          setNorms(data);
          setSemanticResults(null);
        }
      } else {
        console.log('Usando busca tradicional (listagem)');
        const data = await getArchitecturalNorms(country, category, query, false);
        setNorms(data);
        setSemanticResults(null);
      }
    } catch (err: unknown) {
      console.error('Erro na busca:', err);
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg.includes('API') ? 'Erro de conexão com o serviço de busca. Tente novamente.' : msg);
      setNorms(null);
      setSemanticResults(null);
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  // FIX #17: Separar useEffect por responsabilidade — país/categoria vs query
  useEffect(() => {
    fetchNorms(selectedCountry.name, selectedCategory, searchQuery, isAiSearchEnabled);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCountry.name, selectedCategory, isAiSearchEnabled]); // Incluir isAiSearchEnabled

  const handleSearch = useCallback((query: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setSearchQuery(query);

    // FIX #18: Debounce aumentado para 500ms para evitar chamadas excessivas
    debounceTimerRef.current = setTimeout(() => {
      fetchNorms(selectedCountry.name, selectedCategory, query, isAiSearchEnabled);
    }, 500);
  }, [selectedCountry.name, selectedCategory, fetchNorms, isAiSearchEnabled]);

  // FIX #7: Usar Server Action deleteNormServer em vez de cliente direto
  const handleDeleteNorm = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta norma?')) return;
    try {
      await deleteNormServer(id);
      setNorms(prev => prev ? prev.filter(n => n.id !== id) : null);
      // FIX #14: Atualizar países sem criar loop
      fetchActiveCountries();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert('Erro ao excluir norma: ' + msg);
    }
  };

  const handleUpdateNorm = async (id: string, updates: Partial<Norm>) => {
    try {
      const updated = await updateNorm(id, updates);
      setNorms(prev => prev ? prev.map(n => n.id === id ? { ...n, ...updated } : n) : null);
    } catch (err: unknown) {
      alert('Erro ao atualizar norma: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
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
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center">
            <div className="cursor-pointer" onClick={() => router.push('/')}>
              <h1 className="font-[family-name:var(--font-equinox)] font-black text-xl leading-none uppercase tracking-wider hover:text-zinc-600 transition-colors">ARQUIV</h1>
              <p className="text-zinc-400 text-xs mt-1">Normas para Projetos Arquitetónicos</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
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
                      <img
                        src={user.user_metadata.avatar_url}
                        alt="Avatar"
                        className="w-8 h-8 rounded-full object-cover"
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
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="flex items-center gap-2 px-4 xs:px-6 py-2 bg-zinc-900 text-white rounded-full text-xs xs:text-sm font-bold hover:bg-zinc-800 transition-all shadow-sm"
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden xs:inline">Entrar / Registar</span>
                <span className="inline xs:hidden">Entrar</span>
              </button>
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
          selectedCountryName={selectedCountry.name}
          onSelect={setSelectedCountry}
          activeCountryNames={activeCountryNames}
        />
      </div>

      {/* Search Bar */}
      <div className="mb-4">
        <NormSearch onSearch={handleSearch} isLoading={isLoading} />
      </div>

      {/* AI Search Toggle */}
      <div className="max-w-5xl mx-auto mb-8 px-6">
        <div className="flex items-center justify-center gap-3 bg-white rounded-full px-4 py-2 border border-zinc-200 shadow-sm">
          <span className={`text-sm font-medium ${!isAiSearchEnabled ? 'text-zinc-900' : 'text-zinc-400'}`}>
            Busca Normal
          </span>
          <button
            onClick={() => setIsAiSearchEnabled(!isAiSearchEnabled)}
            className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
              isAiSearchEnabled ? 'bg-emerald-500' : 'bg-zinc-300'
            }`}
            aria-label={isAiSearchEnabled ? 'Desativar busca IA' : 'Ativar busca IA'}
          >
            <span
              className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
                isAiSearchEnabled ? 'translate-x-6' : 'translate-x-0'
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
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                selectedCategory === cat
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
      {searchQuery.trim() !== '' ? (
        <Suspense fallback={<div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-zinc-200 border-t-zinc-900 rounded-full animate-spin"></div></div>}>
          <SemanticNormDisplay
            results={semanticResults}
            isLoading={isLoading}
            error={error}
            countryName={selectedCountry.name}
            countryCode={selectedCountry.code}
            hasSearchQuery={searchQuery.trim() !== ''}
          />
        </Suspense>
      ) : (
        <Suspense fallback={<div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-zinc-200 border-t-zinc-900 rounded-full animate-spin"></div></div>}>
          <NormDisplay
            norms={norms}
            isLoading={isLoading}
            error={error}
            countryName={selectedCountry.name}
            countryCode={selectedCountry.code}
            onDelete={handleDeleteNorm}
            onUpdate={handleUpdateNorm}
            hasSearchQuery={searchQuery.trim() !== ''}
            isAdmin={isAdmin}
          />
        </Suspense>
      )}

      {/* Auth Modal */}
      <Suspense fallback={null}>
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
        />
      </Suspense>
    </main>
  );
}
