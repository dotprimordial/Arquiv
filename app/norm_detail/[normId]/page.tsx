'use client';

export const runtime = 'edge';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, BookOpen, Loader2, AlertCircle, Share2, X } from 'lucide-react';
import Markdown from 'react-markdown';
import { getFullNormContentById, getNormMetadataById } from '@/lib/gemini';

export default function NormDetailPage() {
  const params = useParams();
  const router = useRouter();
  const normId = decodeURIComponent(params.normId as string);
  
  const [content, setContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAIGenerated, setIsAIGenerated] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isPdf, setIsPdf] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [normData, setNormData] = useState<{ code: string; title: string; country: string } | null>(null);

  useEffect(() => {
    const fetchContent = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const normContent = await getFullNormContentById(normId);
        
        if (normContent.startsWith('PDF:')) {
          const url = normContent.substring(4);
          setIsPdf(true);
          setPdfUrl(url);
          setContent(null);
        } else {
          setIsPdf(false);
          setPdfUrl(null);
          setContent(normContent);
        }
        
        setIsAIGenerated(false);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsLoading(false);
      }
    };

    const checkIfOfficial = async () => {
      try {
        const data = await getNormMetadataById(normId);
        setIsAIGenerated(!data);
        if (data) {
          setNormData(data);
        }
      } catch {
        // silencioso
      }
    };

    if (normId) {
      fetchContent().then(() => checkIfOfficial());
    }
  }, [normId]);

  const displayCode = normData?.code || normId;
  const displayCountry = normData?.country || 'Detalhes';
  const displayTitle = normData?.title || '';

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareTitle = `${displayCode} - Normas de ${displayCountry}`;
  const shareText = `Consulte a norma ${displayCode} de ${displayCountry} no Arquiv - Guia de Regulamentos Arquitetónicos`;

  const shareOptions = [
    {
      name: 'WhatsApp',
      icon: '💬',
      url: `https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`,
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      name: 'Facebook',
      icon: '📘',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      color: 'bg-blue-600 hover:bg-blue-700'
    },
    {
      name: 'Mensagens',
      icon: '💬',
      url: `sms:?body=${encodeURIComponent(`${shareText} ${shareUrl}`)}`,
      color: 'bg-gray-500 hover:bg-gray-600'
    },
    {
      name: 'Email',
      icon: '📧',
      url: `mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(`${shareText} ${shareUrl}`)}`,
      color: 'bg-purple-500 hover:bg-purple-600'
    }
  ];

  const handleShare = (platform: string, url: string) => {
    window.open(url, '_blank', 'width=600,height=400');
    setIsShareModalOpen(false);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setIsShareModalOpen(false);
  };

  return (
    <main className="min-h-screen bg-[#F9F9F8] text-zinc-900">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
          <button 
            onClick={() => router.back()}
            className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Voltar</span>
          </button>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsShareModalOpen(true)}
              className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>
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
                  <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">{displayCountry}</span>
                  <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold font-serif tracking-tight">{displayCode}</h1>
                    {isAIGenerated ? (
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-600 text-[10px] font-bold uppercase tracking-wider rounded-md border border-amber-100">
                        IA Gerado
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase tracking-wider rounded-md border border-emerald-100">
                        Documento Oficial
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-zinc-500 text-lg leading-relaxed">
                {displayTitle || 'Detalhes técnicos e requisitos regulamentares completos.'}
              </p>
            </div>
            
            <div className="p-8 md:p-12 prose prose-zinc max-w-none prose-headings:font-serif prose-headings:tracking-tight prose-a:text-zinc-900">
              <div className="norm-content">
                {isPdf && pdfUrl ? (
                  <div className="w-full">
                    <div className="mb-4 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                      <p className="text-sm text-blue-800 font-medium">
                        📄 Visualizando documento PDF
                      </p>
                    </div>
                    <iframe
                      src={pdfUrl}
                      className="w-full h-[800px] border border-zinc-200 rounded-xl"
                      title={`PDF da norma ${displayCode}`}
                    />
                    <div className="mt-4 text-center">
                      <a
                        href={pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Abrir PDF em nova aba
                      </a>
                    </div>
                  </div>
                ) : content?.trim().startsWith('<') ? (
                  <div dangerouslySetInnerHTML={{ __html: content }} />
                ) : (
                  <Markdown>{content}</Markdown>
                )}
              </div>
            </div>
          </motion.article>
        )}
      </div>

      {/* Share Modal */}
      <AnimatePresence>
        {isShareModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-zinc-900">Partilhar Norma</h3>
                  <button
                    onClick={() => setIsShareModalOpen(false)}
                    className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-zinc-500 text-sm mt-2">
                  {displayCode} - {displayCountry}
                </p>
              </div>

              <div className="p-4 xs:p-6 space-y-3">
                {shareOptions.map((option) => (
                  <button
                    key={option.name}
                    onClick={() => handleShare(option.name, option.url)}
                    className={`w-full flex items-center gap-3 px-3 xs:px-4 py-2 xs:py-3 text-white rounded-xl transition-all text-sm xs:text-base ${option.color}`}
                  >
                    <span className="text-lg xs:text-xl">{option.icon}</span>
                    <span className="font-medium">{option.name}</span>
                  </button>
                ))}

                <div className="border-t border-zinc-100 pt-3">
                  <button
                    onClick={handleCopyLink}
                    className="w-full flex items-center gap-3 px-3 xs:px-4 py-2 xs:py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 rounded-xl transition-all text-sm xs:text-base"
                  >
                    <span className="text-lg xs:text-xl">🔗</span>
                    <span className="font-medium">Copiar Link</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
