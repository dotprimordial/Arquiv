'use server';

import { supabase } from '@/lib/supabase';
import { analyzeDocumentStructure, generateSectionEmbeddings, chunkDocument } from '@/lib/semantic-search';

const apiKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || '';

// Simple hash function for browser compatibility (replaces crypto.createHash)
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

export interface UploadResult {
  normId: string;
  sectionsCreated: number;
  embeddingsGenerated: number;
}

export async function processAndUploadNorm(
  formData: {
    code: string;
    title: string;
    country: string;
    category: string;
    fileType: 'pdf' | 'text';
    fileUrl?: string | null;
    content?: string | null;
    uploadedBy: string;
  }
): Promise<UploadResult> {
  console.log('[processAndUploadNorm] === INÍCIO ===');
  console.log('[processAndUploadNorm] Dados recebidos:', {
    title: formData.title,
    code: formData.code,
    country: formData.country,
    category: formData.category,
    fileType: formData.fileType,
    hasFileUrl: !!formData.fileUrl,
    hasContent: !!formData.content,
    contentLength: formData.content?.length || 0,
    uploadedBy: formData.uploadedBy
  });

  try {
    console.log('[processAndUploadNorm] Etapa 1: Inserindo norma no Supabase...');

    const insertData = {
      code: formData.code,
      title: formData.title,
      country: formData.country,
      category: formData.category,
      file_type: formData.fileType,
      file_url: formData.fileUrl,
      content: formData.content,
      uploaded_by: formData.uploadedBy,
    };

    const { data: normData, error: normError } = await supabase
      .from('norms')
      .insert(insertData)
      .select()
      .single();

    if (normError) {
      console.error('[processAndUploadNorm] ERRO no insert:', normError);
      throw new Error(`Falha ao criar norma: ${normError.message}`);
    }

    if (!normData) {
      throw new Error('Falha ao criar norma: nenhum dado retornado');
    }

    const normId = normData.id;
    console.log('[processAndUploadNorm] ✓ Norma criada com ID:', normId);

    let documentText = '';

    if (formData.fileType === 'text' && formData.content) {
      documentText = formData.content;
    } else if (formData.fileType === 'pdf' && formData.fileUrl) {
      documentText = `${formData.title}\n${formData.code}\nConteúdo do PDF - extração necessária`;
    }

    if (!documentText || documentText.length < 50) {
      console.warn('[processAndUploadNorm] Documento sem conteúdo suficiente para análise');
      return { normId, sectionsCreated: 0, embeddingsGenerated: 0 };
    }

    const sections = await analyzeDocumentStructure(documentText, apiKey);
    console.log(`[processAndUploadNorm] ✓ Estrutura analisada: ${sections.length} seções`);

    const chunkedSections = chunkDocument(sections, 2000);
    console.log(`[processAndUploadNorm] ✓ Após chunking: ${chunkedSections.length} seções`);

    const sectionsWithEmbeddings = await generateSectionEmbeddings(chunkedSections, apiKey);
    console.log(`[processAndUploadNorm] ✓ Embeddings gerados: ${sectionsWithEmbeddings.length}`);

    let sectionsInserted = 0;
    let sectionsErrorCount = 0;

    for (let i = 0; i < sectionsWithEmbeddings.length; i++) {
      const section = sectionsWithEmbeddings[i];

      const { error: sectionError } = await supabase
        .from('norm_sections')
        .insert({
          norm_id: normId,
          section_type: section.sectionType,
          section_number: section.sectionNumber,
          section_title: section.sectionTitle,
          content: section.content,
          content_raw: section.content,
          embedding: section.embedding,
          order_index: section.orderIndex,
        });

      if (sectionError) {
        console.error(`[processAndUploadNorm] Erro ao inserir seção ${i + 1}:`, sectionError);
        sectionsErrorCount++;
      } else {
        sectionsInserted++;
      }
    }

    console.log(`[processAndUploadNorm] Seções: ${sectionsInserted} inseridas, ${sectionsErrorCount} erros`);

    await supabase
      .from('norms')
      .update({ total_sections: sectionsInserted })
      .eq('id', normId);

    return {
      normId,
      sectionsCreated: sectionsInserted,
      embeddingsGenerated: sectionsWithEmbeddings.length,
    };
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[processAndUploadNorm] ERRO:', err?.message);
    throw error;
  }
}

export interface SearchResult {
  sectionId: string;
  normId: string;
  normCode: string;
  normTitle: string;
  normCountry: string;
  sectionType: string;
  sectionNumber: string | null;
  sectionTitle: string | null;
  content: string;
  similarity: number;
}

export interface GroupedSearchResult {
  normId: string;
  normCode: string;
  normTitle: string;
  normCountry: string;
  sections: SearchResult[];
}

// FIX #9: Cache de embeddings em memória para evitar chamadas repetidas
const embeddingCache = new Map<string, number[]>();

async function getQueryEmbedding(query: string): Promise<number[]> {
  const cacheKey = simpleHash(query.toLowerCase().trim());

  if (embeddingCache.has(cacheKey)) {
    console.log('[getQueryEmbedding] Cache hit para:', query.substring(0, 50));
    return embeddingCache.get(cacheKey)!;
  }

  const embeddingResponse = await fetch('https://openrouter.ai/api/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://arquiv.org',
    },
    body: JSON.stringify({
      model: 'openai/text-embedding-3-small',
      input: query,
    }),
  });

  if (!embeddingResponse.ok) {
    const errorText = await embeddingResponse.text();
    throw new Error(`Falha ao gerar embedding: ${embeddingResponse.status} - ${errorText.substring(0, 200)}`);
  }

  const embeddingData = await embeddingResponse.json();
  const embedding = embeddingData.data?.[0]?.embedding;

  if (!embedding) {
    throw new Error('Embedding não retornado pela API');
  }

  // Limitar cache a 100 entradas para evitar uso excessivo de memória
  if (embeddingCache.size >= 100) {
    const firstKey = embeddingCache.keys().next().value;
    if (firstKey) embeddingCache.delete(firstKey);
  }

  embeddingCache.set(cacheKey, embedding);
  return embedding;
}

export async function searchNormsSemantic(
  query: string,
  country?: string,
  limit: number = 10
): Promise<SearchResult[]> {
  console.log('[searchNormsSemantic] Iniciando busca:', { query, country, limit });

  if (!apiKey || apiKey === '' || apiKey === 'MY_OPENROUTER_API_KEY') {
    console.warn('[searchNormsSemantic] API Key não configurada - busca semântica desativada');
    return [];
  }

  try {
    console.log('[searchNormsSemantic] Gerando/recuperando embedding...');
    // FIX #9: Usar cache de embeddings
    const queryEmbedding = await getQueryEmbedding(query);

    console.log('[searchNormsSemantic] Chamando RPC search_norm_sections...');
    const { data, error } = await supabase
      .rpc('search_norm_sections', {
        query_embedding: queryEmbedding,
        match_threshold: 0.4, // FIX #10: Reduzir threshold para mais resultados
        match_count: limit,
        p_country: country || null,
      });

    if (error) {
      console.error('[searchNormsSemantic] Erro na busca RPC:', error);
      throw new Error(`Erro na busca: ${error.message}`);
    }

    const results = data || [];
    console.log('[searchNormsSemantic] Resultados encontrados:', results.length);
    
    // DEBUG: Verificar se o filtro de país está funcionando
    if (results.length > 0) {
      const countriesInResults = results.map((r: { norm_country?: string }) => r.norm_country);
      console.log('[searchNormsSemantic] DEBUG - Países nos resultados:', countriesInResults);
      console.log('[searchNormsSemantic] DEBUG - País esperado:', country);
      
      // Verificar se há resultados de países errados
      const wrongCountries = countriesInResults.filter(c => c !== country);
      if (wrongCountries.length > 0) {
        console.error('[searchNormsSemantic] ERRO - Resultados de países errados:', wrongCountries);
      }
    }

    // FIX #11: Se semântica não retornar resultados, tentar busca textual como fallback
    if (results.length === 0 && country) {
      console.log('[searchNormsSemantic] Sem resultados semânticos, tentando fallback textual...');
      const { data: fallbackData } = await supabase
        .from('norm_sections')
        .select(`
          id,
          norm_id,
          section_type,
          section_number,
          section_title,
          content,
          norms!inner(code, title, country)
        `)
        .eq('norms.country', country)
        .ilike('content', `%${query}%`)
        .limit(limit);

      if (fallbackData && fallbackData.length > 0) {
        return fallbackData.map((item: Record<string, unknown>) => {
          const norms = item.norms as Record<string, unknown>;
          return {
            sectionId: item.id as string,
            normId: item.norm_id as string,
            normCode: norms?.code as string || '',
            normTitle: norms?.title as string || '',
            normCountry: norms?.country as string || '',
            sectionType: item.section_type as string,
            sectionNumber: item.section_number as string | null,
            sectionTitle: item.section_title as string | null,
            content: item.content as string,
            similarity: 0.3,
          };
        });
      }
    }

    return results.map((item: Record<string, unknown>) => ({
      sectionId: item.section_id as string,
      normId: item.norm_id as string,
      normCode: item.norm_code as string,
      normTitle: item.norm_title as string,
      normCountry: item.norm_country as string,
      sectionType: item.section_type as string,
      sectionNumber: item.section_number as string | null,
      sectionTitle: item.section_title as string | null,
      content: item.content as string,
      similarity: item.similarity as number,
    }));
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[searchNormsSemantic] Erro completo:', error);
    throw new Error(error.message || 'Erro interno na busca semântica');
  }
}

// FIX #7: deleteNormServer — Server Action para contornar RLS do cliente
export async function deleteNormServer(id: string): Promise<void> {
  if (!id) throw new Error('ID da norma é obrigatório');

  // FIX #12: Deletar seções primeiro (em cascata) para evitar foreign key errors
  const { error: sectionsError } = await supabase
    .from('norm_sections')
    .delete()
    .eq('norm_id', id);

  if (sectionsError) {
    console.error('[deleteNormServer] Erro ao deletar seções:', sectionsError);
    // Não lançar erro aqui — a cascade constraint deve cuidar disso
    // mas logamos para diagnóstico
  }

  const { error } = await supabase
    .from('norms')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[deleteNormServer] Erro ao deletar norma:', error);
    throw new Error(`Falha ao excluir norma: ${error.message} (código: ${error.code})`);
  }

  console.log('[deleteNormServer] ✓ Norma deletada:', id);
}
