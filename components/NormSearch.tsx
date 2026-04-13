'use client';

import React from 'react';
import { Search } from 'lucide-react';

interface NormSearchProps {
  onSearch: (query: string) => void;
  isLoading: boolean;
}

export default function NormSearch({ onSearch, isLoading }: NormSearchProps) {
  const [query, setQuery] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-5xl mx-auto px-6">
      <div className="relative group">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-zinc-600 transition-colors" />
        <input
          type="text"
          placeholder="Pesquisar normas por código, título ou categoria..."
          className="w-full pl-14 pr-6 py-5 bg-white border border-zinc-200 rounded-2xl shadow-sm focus:ring-4 focus:ring-zinc-100 focus:border-zinc-300 outline-none transition-all text-zinc-900 placeholder:text-zinc-400 text-lg"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {isLoading && (
          <div className="absolute right-6 top-1/2 -translate-y-1/2">
            <div className="w-5 h-5 border-2 border-zinc-200 border-t-zinc-900 rounded-full animate-spin" />
          </div>
        )}
      </div>
    </form>
  );
}
