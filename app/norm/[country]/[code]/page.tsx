'use client';
export const runtime = 'edge';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getFullNormContent, checkIfOfficialAction } from '@/lib/gemini';
import NormDetailView from '@/components/NormDetailView';

export default function NormDetailPage() {
  const params = useParams();
  const country = decodeURIComponent(params.country as string);
  const code = decodeURIComponent(params.code as string);

  const [content, setContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAIGenerated, setIsAIGenerated] = useState(false);
  const [isPdf, setIsPdf] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchContent = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const normContent = await getFullNormContent(country, code);
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
        const isOfficial = await checkIfOfficialAction(country, code);
        setIsAIGenerated(!isOfficial);
      } catch { /* silencioso */ }
    };

    if (country && code) {
      fetchContent().then(() => checkIfOfficial());
    }
  }, [country, code]);

  return (
    <NormDetailView
      code={code}
      country={country}
      title=""
      content={content}
      isLoading={isLoading}
      error={error}
      isAIGenerated={isAIGenerated}
      isPdf={isPdf}
      pdfUrl={pdfUrl}
    />
  );
}
