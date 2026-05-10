'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Clock, Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Recommendation {
  code: string;
  title: string;
}

interface ActionSearchBarProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  maxRecentSearches?: number;
  aiRecommendations?: Recommendation[];
}

export function ActionSearchBar({
  onSearch,
  isLoading = false,
  placeholder = "Pesquisar normas por código, título ou categoria...",
  maxRecentSearches = 5,
  aiRecommendations = [],
}: ActionSearchBarProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoadingRecs, setIsLoadingRecs] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('normRecentSearches');
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored));
      } catch {
        console.error('Failed to parse recent searches');
      }
    }
  }, []);

  // Fetch AI recommendations when focused
  useEffect(() => {
    if (isFocused && recommendations.length === 0 && !isLoadingRecs) {
      fetchRecommendations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocused]);

  const fetchRecommendations = async () => {
    setIsLoadingRecs(true);
    try {
      // If recommendations passed as prop, use them
      if (aiRecommendations.length > 0) {
        setRecommendations(aiRecommendations);
        return;
      }

      // Otherwise, fetch trending norms from server
      const response = await fetch('/api/norms/trending?limit=5');
      if (response.ok) {
        const data = await response.json();
        
        // Ensure data is an array
        if (!Array.isArray(data)) {
          console.error('API returned non-array response:', data);
          setRecommendations([]);
          return;
        }
        
        const formatted = data.map((norm: Record<string, unknown>) => ({
          code: (norm.code as string) || '',
          title: (norm.title as string) || '',
        }));
        setRecommendations(formatted);
      } else {
        console.error('Failed to fetch trending norms:', response.status);
        setRecommendations([]);
      }
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
      setRecommendations([]);
    } finally {
      setIsLoadingRecs(false);
    }
  };

  // Save recent searches to localStorage
  const addRecentSearch = (searchQuery: string) => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;

    const updated = [
      trimmed,
      ...recentSearches.filter((s) => s !== trimmed),
    ].slice(0, maxRecentSearches);

    setRecentSearches(updated);
    localStorage.setItem('normRecentSearches', JSON.stringify(updated));
  };

  const handleSubmit = (e: React.FormEvent, searchText?: string) => {
    e.preventDefault();
    const finalQuery = searchText ?? query;
    if (finalQuery.trim()) {
      addRecentSearch(finalQuery);
      onSearch(finalQuery);
      setIsFocused(false);
    }
  };

  const handleRecentClick = (recentQuery: string) => {
    setQuery(recentQuery);
    addRecentSearch(recentQuery);
    onSearch(recentQuery);
    setIsFocused(false);
  };

  const handleRecommendationClick = (rec: Recommendation) => {
    const searchText = `${rec.code}`;
    setQuery(searchText);
    addRecentSearch(searchText);
    onSearch(searchText);
    setIsFocused(false);
  };

  const handleClearRecent = (e: React.MouseEvent, query: string) => {
    e.stopPropagation();
    setRecentSearches(recentSearches.filter((s) => s !== query));
    localStorage.setItem(
      'normRecentSearches',
      JSON.stringify(recentSearches.filter((s) => s !== query))
    );
  };

  const handleClickOutside = (e: MouseEvent) => {
    if (
      containerRef.current &&
      !containerRef.current.contains(e.target as Node)
    ) {
      setIsFocused(false);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full max-w-5xl mx-auto px-6 relative"
    >
      <form onSubmit={handleSubmit} className="relative group">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-zinc-600 transition-colors z-10" />
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          className="w-full pl-14 pr-6 py-5 bg-white border border-zinc-200 rounded-2xl shadow-sm focus:ring-4 focus:ring-zinc-100 focus:border-zinc-300 outline-none transition-all text-zinc-900 placeholder:text-zinc-400 text-lg"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
        />
        {isLoading && (
          <div className="absolute right-6 top-1/2 -translate-y-1/2 z-10">
            <div className="w-5 h-5 border-2 border-zinc-200 border-t-zinc-900 rounded-full animate-spin" />
          </div>
        )}
      </form>

      {/* Dropdown: Recent Searches + AI Recommendations */}
      <AnimatePresence>
        {isFocused && (recentSearches.length > 0 || (recommendations.length > 0 && !query)) && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-6 right-6 mt-2 bg-white border border-zinc-200 rounded-2xl shadow-lg z-50 overflow-hidden max-h-96 overflow-y-auto"
          >
            <div className="p-3">
              {/* Recent Searches Section */}
              {recentSearches.length > 0 && (
                <div className="mb-2">
                  <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      Pesquisas Recentes
                    </div>
                  </div>
                  <div className="space-y-1">
                    {recentSearches.map((recentQuery, idx) => (
                      <motion.button
                        key={`recent-${idx}`}
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -4 }}
                        transition={{ delay: idx * 0.03 }}
                        onClick={(e) => {
                          e.preventDefault();
                          handleRecentClick(recentQuery);
                        }}
                        className="w-full group/item flex items-center justify-between px-3 py-2 hover:bg-zinc-50 rounded-lg transition-colors text-left"
                      >
                        <span className="text-sm text-zinc-700 truncate">
                          {recentQuery}
                        </span>
                        <button
                          onClick={(e) => handleClearRecent(e, recentQuery)}
                          className="p-1 opacity-0 group-hover/item:opacity-100 transition-opacity hover:bg-zinc-200 rounded"
                        >
                          <X className="w-3 h-3 text-zinc-400" />
                        </button>
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Recommendations Section */}
              {(recommendations.length > 0 || isLoadingRecs) && (
                <div>
                  {recentSearches.length > 0 && (
                    <div className="border-t border-zinc-100 my-2" />
                  )}
                  <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3 h-3 text-purple-500" />
                      Recomendações
                    </div>
                  </div>
                  <div className="space-y-1">
                    {isLoadingRecs ? (
                      <div className="px-3 py-2 flex items-center gap-2 text-sm text-zinc-500">
                        <div className="w-4 h-4 border-2 border-zinc-200 border-t-purple-500 rounded-full animate-spin" />
                        Carregando...
                      </div>
                    ) : (
                      recommendations.map((rec, idx) => (
                        <motion.button
                          key={`rec-${idx}`}
                          initial={{ opacity: 0, x: -4 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -4 }}
                          transition={{ delay: idx * 0.03 }}
                          onClick={(e) => {
                            e.preventDefault();
                            handleRecommendationClick(rec);
                          }}
                          className="w-full flex items-start justify-between px-3 py-2 hover:bg-purple-50 rounded-lg transition-colors text-left group/rec"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-zinc-900 truncate">
                              {rec.code}
                            </div>
                            <div className="text-xs text-zinc-500 truncate">
                              {rec.title}
                            </div>
                          </div>
                          <Sparkles className="w-3 h-3 text-purple-400 ml-2 flex-shrink-0 opacity-0 group-hover/rec:opacity-100 transition-opacity" />
                        </motion.button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
