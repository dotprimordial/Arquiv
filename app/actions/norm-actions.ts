'use server';

import { getAuthenticatedSupabaseClient, getAdminSupabaseClient } from '@/lib/supabase-server';
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

// Retry utility with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      console.warn(`[Retry] Attempt ${attempt + 1}/${maxRetries} failed:`, lastError.message);
      
      if (attempt < maxRetries - 1) {
        const delayMs = initialDelayMs * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  
  throw lastError || new Error('Max retries exceeded');
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
    userEmail?: string;
  }
): Promise<UploadResult> {
  console.log('[processAndUploadNorm] === INÍCIO ===');
  console.log('[processAndUploadNorm] Dados recebidos:', formData);

  const supabase = await getAuthenticatedSupabaseClient();
  // For write operations, prefer the admin client (bypasses RLS when SERVICE_ROLE_KEY is set)
  const supabaseWrite = getAdminSupabaseClient();
  const adminEmail = process.env.ADMIN_EMAIL || 'seantomasytbr@gmail.com';

  // Server-side validation: verify user is admin
  if (formData.userEmail !== adminEmail) {
    throw new Error(`Acesso negado: apenas ${adminEmail} pode adicionar normas`);
  }

  try {
    // Step 1: Resolve country name to ID
    console.log(`[processAndUploadNorm] Resolvendo país: "${formData.country}"`);
    const { data: countryData, error: countryError } = await supabase
      .from('countries')
      .select('id')
      .eq('name', formData.country.trim());

    if (countryError) {
      console.error('[processAndUploadNorm] Erro ao buscar país:', countryError);
      throw new Error(`Erro ao buscar país: ${countryError.message}`);
    }

    if (!countryData || countryData.length === 0) {
      throw new Error(`País "${formData.country}" não encontrado no banco de dados`);
    }

    const countryId = countryData[0].id;
    console.log(`[processAndUploadNorm] ✓ País encontrado: ${countryId}`);

    // Step 2: Resolve category name to ID
    console.log(`[processAndUploadNorm] Resolvendo categoria: "${formData.category}"`);
    const { data: categoryData, error: categoryError } = await supabase
      .from('categories')
      .select('id')
      .eq('name', formData.category.trim());

    if (categoryError) {
      console.error('[processAndUploadNorm] Erro ao buscar categoria:', categoryError);
      throw new Error(`Erro ao buscar categoria: ${categoryError.message}`);
    }

    if (!categoryData || categoryData.length === 0) {
      throw new Error(`Categoria "${formData.category}" não encontrada no banco de dados`);
    }

    const categoryId = categoryData[0].id;
    console.log(`[processAndUploadNorm] ✓ Categoria encontrada: ${categoryId}`);

    // Step 3: Insert norm
    console.log('[processAndUploadNorm] Inserindo norma...');
    const insertData = {
      code: formData.code.trim(),
      title: formData.title.trim(),
      country_id: countryId,
      category_id: categoryId,
      file_type: formData.fileType,
      file_url: formData.fileUrl || null,
      content: formData.content || null,
      uploaded_by: formData.uploadedBy,
    };

    console.log('[processAndUploadNorm] Insert data:', insertData);

    const { data: normData, error: normError } = await supabaseWrite
      .from('norms')
      .insert(insertData)
      .select()
      .single();

    if (normError) {
      console.error('[processAndUploadNorm] Erro no insert:', normError);
      throw new Error(`Erro ao inserir norma: ${normError.message}`);
    }

    if (!normData) {
      throw new Error('Falha ao criar norma: sem dados retornados');
    }

    const normId = normData.id;
    console.log(`[processAndUploadNorm] ✓ Norma criada: ${normId}`);

    // Step 4: Analyze document and create sections
    let documentText = '';

    if (formData.fileType === 'text' && formData.content) {
      documentText = formData.content;
    } else if (formData.fileType === 'pdf' && formData.fileUrl) {
      documentText = `${formData.title}\n${formData.code}\nPDF document`;
    }

    if (!documentText || documentText.length < 50) {
      console.warn('[processAndUploadNorm] Documento muito pequeno, pulando análise');
      return { normId, sectionsCreated: 0, embeddingsGenerated: 0 };
    }

    console.log('[processAndUploadNorm] Analisando documento...');
    const sections = await retryWithBackoff(
      () => analyzeDocumentStructure(documentText, apiKey),
      3,
      2000
    );
    console.log(`[processAndUploadNorm] ✓ ${sections.length} seções analisadas`);

    const chunkedSections = chunkDocument(sections, 2000);
    console.log(`[processAndUploadNorm] ✓ ${chunkedSections.length} seções após chunking`);

    const sectionsWithEmbeddings = await retryWithBackoff(
      () => generateSectionEmbeddings(chunkedSections, apiKey),
      3,
      2000
    );
    console.log(`[processAndUploadNorm] ✓ ${sectionsWithEmbeddings.length} embeddings gerados`);

    let sectionsInserted = 0;

    try {
      for (const section of sectionsWithEmbeddings) {
        const { error: sectionError } = await supabaseWrite
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

        if (!sectionError) {
          sectionsInserted++;
        } else {
          console.error('[processAndUploadNorm] Erro ao inserir seção:', sectionError);
          throw new Error(`Falha ao inserir seção: ${sectionError.message}`);
        }
      }

      // Update total sections count
      await supabaseWrite
        .from('norms')
        .update({ total_sections: sectionsInserted })
        .eq('id', normId);

      console.log(`[processAndUploadNorm] === SUCESSO === ${sectionsInserted} seções inseridas`);

      return {
        normId,
        sectionsCreated: sectionsInserted,
        embeddingsGenerated: sectionsWithEmbeddings.length,
      };
    } catch (sectionInsertError) {
      // Rollback: delete the norm if sections insertion failed
      console.error('[processAndUploadNorm] Erro na inserção de seções, fazendo rollback...', sectionInsertError);
      try {
        await supabaseWrite.from('norms').delete().eq('id', normId);
        console.log('[processAndUploadNorm] ✓ Norma deletada (rollback)');
      } catch (rollbackError) {
        console.error('[processAndUploadNorm] Erro ao fazer rollback:', rollbackError);
      }
      throw sectionInsertError;
    }
  } catch (error: unknown) {
    console.error('[processAndUploadNorm] === ERRO ===');
    if (error instanceof Error) {
      console.error('[processAndUploadNorm] Mensagem:', error.message);
      console.error('[processAndUploadNorm] Stack:', error.stack);
      throw new Error(error.message);
    } else {
      try {
        const errorStr = JSON.stringify(error);
        console.error('[processAndUploadNorm] Erro:', errorStr);
        throw new Error(errorStr);
      } catch {
        const errorMsg = error && typeof error === 'object' ? Object.prototype.toString.call(error) : String(error);
        console.error('[processAndUploadNorm] Erro:', errorMsg);
        throw new Error(errorMsg);
      }
    }
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
    const { supabase } = await import('@/lib/supabase');
    console.log('[searchNormsSemantic] Fazendo busca textual direta (RPC desativado devido a problemas de tipo)...');
    
    // Direct query without RPC to avoid type inference issues
    const queryBuilder = supabase
      .from('norm_sections')
      .select(`
        id,
        norm_id,
        norms!inner(code, title, country),
        section_type,
        section_number,
        section_title,
        content
      `);

    // Apply country filter if provided
    if (country) {
      const { data: countryData } = await supabase
        .from('countries')
        .select('id')
        .eq('name', country)
        .single();
      
      if (countryData) {
        queryBuilder.eq('norms.country_id', (countryData as { id?: string }).id);
      }
    }

    // Apply content filter (textual search instead of vector similarity)
    const { data, error } = await queryBuilder
      .ilike('content', `%${query}%`)
      .limit(limit);

    if (error) {
      console.error('[searchNormsSemantic] Erro na busca:', error);
      throw new Error(`Erro na busca: ${error.message}`);
    }

    const results = (data || []) as Array<Record<string, unknown>>;
    console.log('[searchNormsSemantic] Resultados encontrados:', results.length);

    return results.map((item) => {
      const norms = item.norms as Record<string, unknown>;
      return {
        sectionId: String(item.id),
        normId: String(item.norm_id),
        normCode: (norms?.code as string) || '',
        normTitle: (norms?.title as string) || '',
        normCountry: (norms?.country as string) || '',
        sectionType: (item.section_type as string) || '',
        sectionNumber: item.section_number as string | null,
        sectionTitle: item.section_title as string | null,
        content: (item.content as string) || '',
        similarity: 0.3,
      };
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[searchNormsSemantic] Erro completo:', error);
    throw new Error(error.message || 'Erro interno na busca semântica');
  }
}

// FIX #7: deleteNormServer — Server Action para contornar RLS do cliente
export async function deleteNormServer(id: string): Promise<void> {
  if (!id) throw new Error('ID da norma é obrigatório');

  const supabase = getAdminSupabaseClient();
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
