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
} from 'lucide-react';
import { SearchResult } from '@/app/actions/norm-actions';

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
}

export default function SemanticNormDisplay({
  results,
  isLoading,
  error,
  countryName,
  countryCode,
  hasSearchQuery,
}: SemanticNormDisplayProps) {
  const [expandedNorms, setExpandedNorms] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

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

  const toggleSectionExpanded = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
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
    return (
      <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
        <Loader2 className="w-12 h-12 mb-4 animate-spin" />
        <p className="text-sm font-medium">Buscando normas relevantes...</p>
      </div>
    );
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
      {groupedResults.map((group, groupIndex) => (
        <motion.div
          key={group.normId}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: groupIndex * 0.1 }}
          className="bg-white border border-zinc-100 rounded-2xl overflow-hidden hover:shadow-lg transition-all"
        >
          {/* Norm Header */}
          <div 
            className="p-6 cursor-pointer bg-gradient-to-r from-zinc-50 to-white"
            onClick={() => toggleNormExpanded(group.normId)}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-orange-700 tracking-wide uppercase">
                    {group.normCode}
                  </span>
                  <span className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-semibold rounded-full">
                    {group.sections.length} trechos relevantes
                  </span>
                </div>
                <h3 className="text-xl font-bold text-zinc-900 leading-tight">
                  {group.normTitle}
                </h3>
              </div>
              <button className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                {expandedNorms.has(group.normId) ? (
                  <ChevronUp className="w-5 h-5 text-zinc-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-zinc-400" />
                )}
              </button>
            </div>
          </div>

          {/* Sections List */}
          <AnimatePresence>
            {expandedNorms.has(group.normId) && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="border-t border-zinc-100"
              >
                <div className="p-6 space-y-4">
                  {group.sections.map((section, sectionIndex) => (
                    <motion.div
                      key={section.sectionId}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: sectionIndex * 0.05 }}
                      className="bg-zinc-50 rounded-xl p-4 hover:bg-zinc-100 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          {/* Hierarquia da Norma */}
                          <div className="mb-3">
                            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                              Norma
                            </span>
                            <p className="text-sm font-bold text-zinc-900">
                              {group.normCode} - {group.normTitle}
                            </p>
                          </div>

                          {/* Estrutura da Seção */}
                          <div className="flex items-center gap-2 mb-3 flex-wrap">
                            <BookOpen className="w-4 h-4 text-orange-500" />
                            <span className="text-xs font-semibold text-orange-600 uppercase tracking-wide">
                              {section.sectionType}
                            </span>
                            {section.sectionNumber && (
                              <span className="text-xs font-bold text-zinc-700 bg-zinc-200 px-2 py-0.5 rounded">
                                {section.sectionNumber}
                              </span>
                            )}
                            {section.sectionTitle && (
                              <span className="text-xs font-medium text-zinc-600">
                                {section.sectionTitle}
                              </span>
                            )}
                          </div>

                          {/* Trecho Encontrado */}
                          <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded-r-lg">
                            <p className="text-xs font-semibold text-blue-700 mb-1">
                              Trecho encontrado:
                            </p>
                            <p className="text-sm text-zinc-700 leading-relaxed line-clamp-3">
                              {section.content}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => toggleSectionExpanded(section.sectionId)}
                          className="p-1 hover:bg-white rounded transition-colors"
                        >
                          {expandedSections.has(section.sectionId) ? (
                            <ChevronUp className="w-4 h-4 text-zinc-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-zinc-400" />
                          )}
                        </button>
                      </div>

                      {/* Expanded Section Content */}
                      <AnimatePresence>
                        {expandedSections.has(section.sectionId) && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="mt-3 pt-3 border-t border-zinc-200"
                          >
                            <p className="text-sm text-zinc-600 leading-relaxed">
                              {section.content}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ))}
    </div>
  );
}
