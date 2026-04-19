'use server';

import { getAuthenticatedSupabaseClient, getAdminSupabaseClient } from '@/lib/supabase-server';

const apiKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || '';

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

    console.log(`[processAndUploadNorm] === SUCESSO ===`);

    return {
      normId,
      sectionsCreated: 0,
      embeddingsGenerated: 0,
    };
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
    console.log('[searchNormsSemantic] Fazendo busca textual direta na tabela norms...');
    
    // Direct query on norms table
    const queryBuilder = supabase
      .from('norms')
      .select(`
        id,
        code,
        title,
        description,
        country,
        keywords
      `);

    // Apply country filter if provided
    if (country) {
      const { data: countryData } = await supabase
        .from('countries')
        .select('id')
        .eq('name', country)
        .single();
      
      if (countryData) {
        queryBuilder.eq('country_id', (countryData as { id?: string }).id);
      }
    }

    // Apply content filter (textual search)
    const { data, error } = await queryBuilder
      .or(`code.ilike.%${query}%,title.ilike.%${query}%,description.ilike.%${query}%`)
      .limit(limit);

    if (error) {
      console.error('[searchNormsSemantic] Erro na busca:', error);
      throw new Error(`Erro na busca: ${error.message}`);
    }

    const results = (data || []) as Array<Record<string, unknown>>;
    console.log('[searchNormsSemantic] Resultados encontrados:', results.length);

    return results.map((item) => ({
      sectionId: String(item.id),
      normId: String(item.id),
      normCode: (item.code as string) || '',
      normTitle: (item.title as string) || '',
      normCountry: (item.country as string) || '',
      sectionType: 'norma',
      sectionNumber: null,
      sectionTitle: null,
      content: ((item.description as string) || '') + ' ' + ((item.keywords as string[]) || []).join(' '),
      similarity: 0.3,
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

  const supabase = getAdminSupabaseClient();
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
