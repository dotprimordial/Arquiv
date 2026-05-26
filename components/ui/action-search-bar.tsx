'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Clock, X } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from 'framer-motion';

interface ActionSearchBarProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  maxRecentSearches?: number;
}

export function ActionSearchBar({
  onSearch,
  isLoading = false,
  placeholder = "Pesquisar normas por código, título ou categoria...",
  maxRecentSearches = 5,
}: ActionSearchBarProps) {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
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

  const handleClearRecent = (e: React.MouseEvent, q: string) => {
    e.stopPropagation();
    const filtered = recentSearches.filter((s) => s !== q);
    setRecentSearches(filtered);
    localStorage.setItem('normRecentSearches', JSON.stringify(filtered));
  };

  const handleClickOutside = (e: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
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
    <div ref={containerRef} className="w-full max-w-5xl mx-auto px-6 relative">
      <form onSubmit={handleSubmit} className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          className="w-full pl-6 pr-14 py-4 bg-white border border-zinc-200 rounded-2xl shadow-sm focus:ring-4 focus:ring-zinc-100 focus:border-zinc-300 outline-none transition-all text-zinc-900 placeholder:text-zinc-400 text-lg"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
        />
        <Button
          type="submit"
          disabled={isLoading}
          variant="ghost"
          size="icon"
          className="absolute right-3"
        >
          <Search className="size-4" />
        </Button>
      </form>

      {/* Dropdown: Recent Searches */}
      <AnimatePresence>
        {isFocused && recentSearches.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-6 right-6 mt-2 bg-white border border-zinc-200 rounded-2xl shadow-lg z-50 overflow-hidden max-h-96 overflow-y-auto"
          >
            <div className="p-3">
              <div className="mb-2">
                <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-3 py-2 flex items-center gap-2">
                  <Clock className="w-3 h-3" />
                  Pesquisas Recentes
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
                      <span className="text-sm text-zinc-700 truncate">{recentQuery}</span>
                      <div
                        onClick={(e) => handleClearRecent(e, recentQuery)}
                        className="p-1 opacity-0 group-hover/item:opacity-100 transition-opacity hover:bg-zinc-200 rounded cursor-pointer"
                        role="button"
                      >
                        <X className="w-3 h-3 text-zinc-400" />
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
