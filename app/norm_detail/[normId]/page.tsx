'use client';
export const runtime = 'edge';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getFullNormContentById, getNormMetadataById } from '@/lib/gemini';
import NormDetailView from '@/components/NormDetailView';

export default function NormDetailPage() {
  const params = useParams();
  const normId = decodeURIComponent(params.normId as string);

  const [content, setContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAIGenerated, setIsAIGenerated] = useState(false);
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
          setIsPdf(true);
          setPdfUrl(normContent.substring(4));
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
        if (data) setNormData(data);
      } catch { /* silencioso */ }
    };

    if (normId) {
      fetchContent().then(() => checkIfOfficial());
    }
  }, [normId]);

  return (
    <NormDetailView
      code={normData?.code || normId}
      country={normData?.country || 'Detalhes'}
      title={normData?.title || ''}
      content={content}
      isLoading={isLoading}
      error={error}
      isAIGenerated={isAIGenerated}
      isPdf={isPdf}
      pdfUrl={pdfUrl}
    />
  );
}
