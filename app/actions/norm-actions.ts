'use server';

import { getAuthenticatedSupabaseClient, getAdminSupabaseClient } from '@/lib/supabase-server';
import { submitNormForIndexing } from './seo-actions';
import { getCachedSearch, setCachedSearch, generateSearchCacheKey } from '@/lib/cache';
import { analyzeDocumentStructure, chunkDocument, generateSectionEmbeddings } from '@/lib/semantic-search';

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

  // Server-side validation: verify user is admin (case-insensitive, trimmed)
  if (formData.userEmail?.trim().toLowerCase() !== adminEmail.toLowerCase()) {
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

    // Step 2: Resolve category name to ID (auto-create if missing)
    console.log(`[processAndUploadNorm] Resolvendo categoria: "${formData.category}"`);
    const categoryName = formData.category.trim();
    const { data: categoryData, error: categoryError } = await supabase
      .from('categories')
      .select('id')
      .eq('name', categoryName);

    if (categoryError) {
      console.error('[processAndUploadNorm] Erro ao buscar categoria:', categoryError);
      throw new Error(`Erro ao buscar categoria: ${categoryError.message}`);
    }

    let categoryId: string;
    
    if (!categoryData || categoryData.length === 0) {
      console.log(`[processAndUploadNorm] Categoria não encontrada, criando: "${categoryName}"`);
      // Auto-create the missing category
      const { data: newCategory, error: createError } = await supabaseWrite
        .from('categories')
        .insert({
          name: categoryName,
          description: `Categoria: ${categoryName}`,
        })
        .select('id')
        .single();

      if (createError || !newCategory) {
        console.error('[processAndUploadNorm] Erro ao criar categoria:', createError);
        throw new Error(`Erro ao criar categoria "${categoryName}": ${createError?.message || 'Desconhecido'}`);
      }

      categoryId = (newCategory as { id?: string }).id || '';
      console.log(`[processAndUploadNorm] ✓ Categoria criada: ${categoryId}`);
    } else {
      categoryId = categoryData[0].id;
      console.log(`[processAndUploadNorm] ✓ Categoria encontrada: ${categoryId}`);
    }

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

    // Step 4: Process sections and embeddings (semantic chunking)
    let sectionsCreated = 0;
    let embeddingsGenerated = 0;
    
    const contentToProcess = formData.content || '';
    if (contentToProcess && contentToProcess.length > 100 && apiKey && apiKey.length > 10) {
      try {
        console.log(`[processAndUploadNorm] Starting semantic chunking...`);
        
        // Analyze document structure with AI
        const sections = await analyzeDocumentStructure(contentToProcess, apiKey);
        console.log(`[processAndUploadNorm] AI identified ${sections.length} sections`);
        
        // Chunk large sections
        const chunks = chunkDocument(sections, 2000);
        console.log(`[processAndUploadNorm] Created ${chunks.length} chunks`);
        
        // Generate embeddings for chunks
        const chunksWithEmbeddings = await generateSectionEmbeddings(chunks, apiKey);
        embeddingsGenerated = chunksWithEmbeddings.length;
        console.log(`[processAndUploadNorm] Generated ${embeddingsGenerated} embeddings`);
        
        // Insert sections into database
        for (let i = 0; i < chunksWithEmbeddings.length; i++) {
          const chunk = chunksWithEmbeddings[i];
          const { error: sectionError } = await supabaseWrite
            .from('norm_sections')
            .insert({
              norm_id: normId,
              section_type: chunk.sectionType,
              section_number: chunk.sectionNumber,
              section_title: chunk.sectionTitle,
              content: chunk.content,
              embedding: chunk.embedding,
              order_index: i,
            });
          
          if (sectionError) {
            console.error(`[processAndUploadNorm] Failed to insert section ${i}:`, sectionError);
          } else {
            sectionsCreated++;
          }
        }
        
        // Update norm with section count
        await supabaseWrite
          .from('norms')
          .update({ total_sections: sectionsCreated })
          .eq('id', normId);
        
        console.log(`[processAndUploadNorm] ✓ Saved ${sectionsCreated} sections to database`);
      } catch (chunkError) {
        console.error('[processAndUploadNorm] Chunking failed (non-critical):', chunkError);
        // Continue even if chunking fails - norm is already saved
      }
    } else {
      console.log('[processAndUploadNorm] Skipping chunking: no content or no API key');
    }

    // Submit norm for search engine indexing (non-blocking)
    console.log(`[processAndUploadNorm] Submitting for SEO indexing...`);
    submitNormForIndexing(normId, formData.code).catch((err: Error) => {
      console.warn('[processAndUploadNorm] SEO indexing failed (non-critical):', err.message);
    });

    console.log(`[processAndUploadNorm] === SUCESSO ===`);

    return {
      normId,
      sectionsCreated,
      embeddingsGenerated,
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
  decree?: string;
  regulationNumber?: string;
  excerpt?: string;
  // Estrutura hierárquica do trecho
  chapter?: string;
  article?: string;
  paragraph?: string;
  section?: string;
}

export interface GroupedSearchResult {
  normId: string;
  normCode: string;
  normTitle: string;
  normCountry: string;
  sections: SearchResult[];
}

// Function to clean HTML formatting from text
function cleanHtmlFormatting(text: string): string {
  return text
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
    .replace(/&amp;/g, '&') // Replace &amp; with &
    .replace(/&lt;/g, '<') // Replace &lt; with <
    .replace(/&gt;/g, '>') // Replace &gt; with >
    .replace(/&quot;/g, '"') // Replace &quot; with "
    .replace(/&#39;/g, "'") // Replace &#39; with '
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim();
}

  // Extract a concise snippet around the query terms from a larger content string
  function extractBestSnippet(content: string, query: string, maxLen: number = 400): string {
    const clean = cleanHtmlFormatting(content || '');
    if (!clean) return '';

    const q = query.trim().toLowerCase();
    const terms = q.split(/\s+/).filter(Boolean);

    // If no terms, return start of document up to maxLen
    if (terms.length === 0) {
      return clean.length > maxLen ? clean.substring(0, maxLen).trim() + '...' : clean;
    }

    // Find earliest occurrence of any term
    let idx = -1;
    for (const term of terms) {
      const i = clean.toLowerCase().indexOf(term);
      if (i !== -1 && (idx === -1 || i < idx)) idx = i;
    }

    // If not found, return start of document
    if (idx === -1) {
      // If query terms are not found, return empty to signal "no match"
      return '';
    }

    // Center snippet around found index
    const half = Math.floor(maxLen / 2);
    let start = Math.max(0, idx - half);
    // Try to align to word boundary
    if (start > 0) {
      const spaceIdx = clean.lastIndexOf(' ', start);
      if (spaceIdx !== -1) start = spaceIdx + 1;
    }
    let end = Math.min(clean.length, start + maxLen);
    // Extend end to end of word
    if (end < clean.length) {
      const spaceIdx = clean.indexOf(' ', end);
      if (spaceIdx !== -1) end = spaceIdx;
    }

    let snippet = clean.substring(start, end).trim();
    if (start > 0) snippet = '...' + snippet;
    if (end < clean.length) snippet = snippet + '...';
    return snippet;
  }

export async function searchNormsSemantic(
  query: string,
  country?: string,
  limit: number = 10
): Promise<SearchResult[]> {
  console.log('[searchNormsSemantic] Iniciando busca com IA:', { query, country, limit });

  // Check cache first
  const cacheKey = generateSearchCacheKey('semantic', query, country, undefined, limit);
  const cached = getCachedSearch<SearchResult[]>(cacheKey);
  if (cached) {
    console.log('[Cache] Hit for semantic search:', cacheKey);
    return cached;
  }

  if (!apiKey || apiKey === '' || apiKey === 'MY_OPENROUTER_API_KEY') {
    console.warn('[searchNormsSemantic] API Key não configurada - busca semântica desativada');
    return [];
  }

  let norms: Array<Record<string, unknown>> = [];
  
  try {
    const { supabase } = await import('@/lib/supabase');
    console.log('[searchNormsSemantic] Buscando todas as normas para análise...');
    
    // Fetch all norms with country name via join
    const queryBuilder = supabase
      .from('norms')
      .select(`
        id,
        code,
        title,
        description,
        content,
        keywords,
        countries(name)
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

    const { data: normsData, error: normsError } = await queryBuilder;

    if (normsError) {
      console.error('[searchNormsSemantic] Erro ao buscar normas:', normsError);
      throw new Error(`Erro ao buscar normas: ${normsError.message}`);
    }

    norms = (normsData || []) as Array<Record<string, unknown>>;
    console.log('[searchNormsSemantic] Normas encontradas:', norms.length);

    if (norms.length === 0) {
      return [];
    }

    // Prepare data for AI analysis - limit content to force excerpt extraction
    const normsForAI = norms.map((norm) => ({
      id: norm.id,
      code: cleanHtmlFormatting(String(norm.code || "")),
      title: cleanHtmlFormatting(String(norm.title || "")),
      description: cleanHtmlFormatting(String(norm.description || "")).substring(0, 300),
      // Limitar conteúdo para forçar a IA a extrair trechos específicos
      content: cleanHtmlFormatting(String(norm.content || "")).substring(0, 4000), 
      keywords: (norm.keywords as string[]) || [],
    }));

    // Clean query as well
    const cleanedQuery = cleanHtmlFormatting(query);

    // Call AI to analyze relevance
    const messages: Array<{ role: string; content: string }> = [
      {
        role: "user",
        content: `Você é um especialista em normas arquitetônicas.

Consulta: "${cleanedQuery}" | País: ${country || 'Todos'}

Normas disponíveis (${normsForAI.length}):
${JSON.stringify(normsForAI, null, 2)}

INSTRUÇÕES CRÍTICAS:
1. Leia a CONSULTA do usuário: "${cleanedQuery}"
2. Encontre APENAS trechos que respondem DIRETAMENTE a esta consulta específica
3. NUNCA retorne o documento completo - extraia SOMENTE a parte relevante
4. O campo "excerpt" deve conter:
   - APENAS o trecho específico que responde à pergunta do usuário
   - 300-500 caracteres no máximo
   - Palavras-chave da consulta DEVEM aparecer no trecho
5. Como encontrar o trecho correto:
   - Procure palavras-chave da consulta no texto (ex: se pesquisar "altura máxima", procure este termo)
   - Identifique o artigo/parágrafo que contém a resposta
   - Extraia APENAS esse artigo/parágrafo, não todo o documento
6. Se o texto estiver mal formatado, identifique:
   - Números seguidos de texto (ex: "1. Altura máxima...", "Art. 5º Altura...")
   - Palavras em maiúsculas (ex: "CAPÍTULO I", "SEÇÃO 2")
   - Palavras-chave como "Artigo", "Parágrafo", "Inciso", "Alínea"
7. Extraia a estrutura hierárquica:
   - chapter: capítulo/seção maior
   - article: artigo/disposição específica
   - paragraph: parágrafo/inciso específico
8. O trecho deve ser CONCISO e relacionado à consulta - se não encontrar trecho relevante, não retorne a norma
9. Retorne APENAS JSON válido:
[{
  "id": "uuid da norma",
  "reasoning": "por que este trecho responde à consulta",
  "relevanceScore": 0.95,
  "decree": "identificação da norma",
  "chapter": "Capítulo/Seção identificada ou null",
  "article": "Artigo/Disposição específica ou null",
  "paragraph": "Parágrafo/Inciso específico ou null",
  "excerpt": "TRECHO ESPECÍFICO E CONCISO (300-500 caracteres) que responde diretamente à consulta"
}]`,
      },
    ];

    console.log('[searchNormsSemantic] Enviando para IA...');
    const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://arquiv.org',
      },
      body: JSON.stringify({
        model: 'google/gemma-4-31b-it:free',
        messages,
        temperature: 0.1,
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[searchNormsSemantic] Erro na API IA:', aiResponse.status, errorText);
      
      // Fallback to textual search on rate limit or error
      if (aiResponse.status === 429) {
        console.warn('[searchNormsSemantic] Rate limit, usando fallback textual...');
        return fallbackTextualSearch(norms, query, limit);
      }
      
      throw new Error(`Erro na API IA: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const rawText = aiData.choices?.[0]?.message?.content || "[]";
    
    // Extract JSON from response
    const cleanedText = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    let aiResults: Array<{ 
      id: string; 
      reasoning: string; 
      relevanceScore: number;
      decree?: string;
      regulationNumber?: string;
      excerpt?: string;
      chapter?: string;
      article?: string;
      paragraph?: string;
      section?: string;
    }>;
    try {
      const parsed = JSON.parse(cleanedText);
      aiResults = Array.isArray(parsed) ? parsed : parsed.results || [];
    } catch {
      console.error('[searchNormsSemantic] Erro ao parsear JSON IA:', cleanedText.substring(0, 200));
      aiResults = [];
    }

    console.log('[searchNormsSemantic] Resultados IA:', aiResults.length);

    // If AI returns no results, fallback to textual search
    if (aiResults.length === 0) {
      console.warn('[searchNormsSemantic] IA não retornou resultados, usando fallback textual...');
      return fallbackTextualSearch(norms, query, limit, cacheKey);
    }

    // Map AI results to SearchResult format
    // Filter out results without valid excerpt OR with excerpts that are document-length
    const MAX_EXCERPT_LENGTH = 2000; // Máximo de caracteres para um trecho válido (aumentado)
    const MIN_EXCERPT_LENGTH = 100; // Mínimo de caracteres
    
    const validAiResults = aiResults.filter((r) => {
      if (!r.excerpt || r.excerpt.trim().length < MIN_EXCERPT_LENGTH) return false;
      // If excerpt is excessively long, replace with a best-effort snippet centered on query
      if (r.excerpt.trim().length > MAX_EXCERPT_LENGTH) {
        console.warn(`[searchNormsSemantic] Excerpt muito longo (${r.excerpt.trim().length} chars), extracting best snippet...`);
        // Try to extract a better snippet from the original norm content if available
        const norm = norms.find((n) => n.id === r.id);
        if (norm && norm.content) {
          r.excerpt = extractBestSnippet(String(norm.content), cleanedQuery, MAX_EXCERPT_LENGTH);
        } else {
          r.excerpt = r.excerpt.trim().substring(0, MAX_EXCERPT_LENGTH) + '...';
        }
      }

      // Ensure the excerpt actually contains one of the query terms; if not, reject
      const excerptLower = (r.excerpt || '').toLowerCase();
      const terms = cleanedQuery.split(/\s+/).filter(Boolean);
      const containsTerm = terms.some(t => t && excerptLower.includes(t));
      return containsTerm;
    });
    
    console.log('[searchNormsSemantic] Resultados válidos com excerpt:', validAiResults.length);
    
    // If no valid excerpts, use fallback
    if (validAiResults.length === 0) {
      console.warn('[searchNormsSemantic] IA retornou resultados sem excerpts válidos, usando fallback...');
      return fallbackTextualSearch(norms, query, limit, cacheKey);
    }
    
    // Use index to create unique sectionId for multiple excerpts from same norm
    const results = validAiResults
      .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
      .slice(0, limit)
      .map((aiResult, index) => {
        const norm = norms.find((n) => n.id === aiResult.id);
        if (!norm) return null;
        
        // Extract country name from joined countries data (Supabase returns {countries: {name: "..."}})
        const countryData = norm.countries as { name?: string } | undefined;
        const countryName = countryData?.name || '';
        
        // Create unique sectionId using index to handle multiple excerpts from same norm
        const uniqueSectionId = `${String(norm.id)}-${index}`;
        
        // Use excerpt as content, never fall back to full document
        let excerpt = aiResult.excerpt?.trim() || '';
        // Ensure excerpt is concise and centered on the query
        if (excerpt.length > 500) {
          // Prefer AI excerpt truncated, but if it's likely the full document use original content to extract snippet
          const normFull = String(norm.content || '');
          excerpt = extractBestSnippet(normFull, cleanedQuery, 500);
        }
        
        return {
          sectionId: uniqueSectionId,
          normId: String(norm.id),
          normCode: (norm.code as string) || '',
          normTitle: (norm.title as string) || '',
          normCountry: countryName,
          sectionType: aiResult.article ? 'artigo' : (aiResult.chapter ? 'capitulo' : 'norma'),
          sectionNumber: aiResult.article || aiResult.paragraph || null,
          sectionTitle: aiResult.chapter || null,
          content: excerpt, // Sempre usar apenas o excerpt da IA
          similarity: aiResult.relevanceScore || 0.5,
          decree: aiResult.decree,
          regulationNumber: aiResult.regulationNumber,
          excerpt: excerpt,
          chapter: aiResult.chapter,
          article: aiResult.article,
          paragraph: aiResult.paragraph,
          section: aiResult.section,
        };
      })
      .filter((r) => r !== null);

    // Cache the results
    setCachedSearch(cacheKey, results as SearchResult[]);
    console.log('[Cache] Set semantic search results:', cacheKey);

    return results as SearchResult[];
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[searchNormsSemantic] Erro completo:', error);
    
    // Fallback to textual search on any error
    console.warn('[searchNormsSemantic] Erro na IA, usando fallback textual...');
    return fallbackTextualSearch(norms, query, limit, cacheKey);
  }
}

// Fallback textual search function
function fallbackTextualSearch(norms: Array<Record<string, unknown>>, query: string, limit: number, cacheKey?: string): SearchResult[] {
  const queryLower = cleanHtmlFormatting(query).toLowerCase();
  
  const scored = norms.map((norm) => {
    let score = 0;
    const code = cleanHtmlFormatting(String(norm.code || '')).toLowerCase();
    const title = cleanHtmlFormatting(String(norm.title || '')).toLowerCase();
    const description = cleanHtmlFormatting(String(norm.description || '')).toLowerCase();
    const content = cleanHtmlFormatting(String(norm.content || '')).toLowerCase();
    const keywords = ((norm.keywords as string[]) || []).map(k => k.toLowerCase());
    
    if (code.includes(queryLower)) score += 10;
    if (title.includes(queryLower)) score += 8;
    if (description.includes(queryLower)) score += 4;
    if (content.includes(queryLower)) score += 3;
    if (keywords.some(k => k.includes(queryLower))) score += 5;
    
    return { norm, score };
  }).filter(item => item.score > 0);
  
  const results: SearchResult[] = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => {
      // Extract country name from joined countries data
      const countryData = item.norm.countries as { name?: string } | undefined;
      const countryName = countryData?.name || '';
      // Criar excerpt do conteúdo: localizar a query no texto e extrair snippet ao redor
      const rawContent = ((item.norm.content as string) || '') + ' ' + ((item.norm.description as string) || '');
      const fullContent = cleanHtmlFormatting(rawContent);
      const excerpt = extractBestSnippet(fullContent, query, 500);
      // If no excerpt found (term not present), skip this result by returning null
      if (!excerpt || excerpt.trim() === '') return null;
      
      return {
        sectionId: String(item.norm.id),
        normId: String(item.norm.id),
        normCode: (item.norm.code as string) || '',
        normTitle: (item.norm.title as string) || '',
        normCountry: countryName,
        sectionType: 'norma',
        sectionNumber: null,
        sectionTitle: null,
        content: excerpt, // Usar excerpt em vez de conteúdo completo
        similarity: item.score / 10,
        decree: undefined,
        regulationNumber: undefined,
        excerpt: excerpt,
      };
    })
    .filter((r) => r !== null) as SearchResult[];
  
  // Cache the fallback results if cache key provided
  if (cacheKey) {
    setCachedSearch(cacheKey, results);
    console.log('[Cache] Set fallback search results:', cacheKey);
  }
  
  return results;
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
