'use server';

import { getAuthenticatedSupabaseClient, getAdminSupabaseClient } from '@/lib/supabase-server';
import { submitNormForIndexing } from './seo-actions';
import { getCachedSearch, setCachedSearch, generateSearchCacheKey } from '@/lib/cache-edge';
import { chunkDocument, generateSectionEmbeddings, EmbeddingClient, splitContentIntoArticles } from '@/lib/semantic-search';
import { checkRateLimit, recordSearch } from '@/lib/rate-limit';
import { headers } from 'next/headers';
import OpenRouterClient, { OpenRouterMessage } from '@/lib/openrouter';
import { processSearchQuery, interpretUserQuery, removeAccents } from '@/lib/search-utils';

const apiKey = process.env.OPENROUTER_API_KEY || '';

const isInvalidKey = (key: string) => !key || key.length < 10 || key === "dummy-key" || key === "MY_OPENROUTER_API_KEY";

// Generate valid UUID
function generateShortId(): string {
  return crypto.randomUUID();
}

function extractJSON(text: string): string {
  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  const start = cleaned.search(/[\[{]/);
  if (start === -1) return "[]";
  const end = Math.max(cleaned.lastIndexOf("]"), cleaned.lastIndexOf("}"));
  if (end === -1) return "[]";
  return cleaned.substring(start, end + 1);
}

export interface DocumentStructureResult {
  structuredContent: string;
  categories: string[];
  keywords: string[];
  sections: Array<{
    type: string;
    number: string;
    title: string;
    content: string;
  }>;
}

export async function analyzeDocumentStructureServer(
  content: string,
  title: string
): Promise<DocumentStructureResult> {
  if (isInvalidKey(apiKey)) {
    console.warn('[analyzeDocumentStructureServer] API Key não configurada, retornando resultado vazio');
    return {
      structuredContent: content,
      categories: [],
      keywords: [],
      sections: []
    };
  }

  try {
    const openRouter = new OpenRouterClient(apiKey);

    const prompt = `Você é um especialista em análise de documentos normativos. Analise o documento "${title}" e extraia sua estrutura completa.

REGRAS:
1. NUNCA invente seções, artigos ou conteúdo que não exista no documento
2. Seja fiel ao conteúdo e estrutura original
3. Extraia TODAS as seções principais
4. Categorize em áreas temáticas (ex: "construções", "segurança", "licenciamento")
5. Extraia palavras-chave para busca semântica

Responda APENAS com JSON válido, sem markdown:
{
  "structuredContent": "conteúdo reformatado",
  "categories": ["categoria1", "categoria2"],
  "keywords": ["palavra1", "palavra2"],
  "sections": [
    {
      "type": "Capítulo|Título|Artigo|Secção|Parte",
      "number": "I|1|2º|A",
      "title": "título da seção",
      "content": "conteúdo completo"
    }
  ]
}`;

    const messages: OpenRouterMessage[] = [{ role: "user", content: prompt + "\n\nDOCUMENTO:\n" + content.substring(0, 12000) }];

    const response = await openRouter.chatCompletion(messages, "google/gemma-4-31b-it:free", 0.3, {
      type: "json_object",
    });

    const rawText = response.choices[0]?.message?.content || "{}";
    const result = JSON.parse(extractJSON(rawText));

    if (!result.structuredContent || !Array.isArray(result.sections)) {
      throw new Error("Estrutura do documento não pôde ser extraída corretamente.");
    }

    return {
      structuredContent: result.structuredContent || content,
      categories: Array.isArray(result.categories) ? result.categories : [],
      keywords: Array.isArray(result.keywords) ? result.keywords : [],
      sections: Array.isArray(result.sections) ? result.sections : [],
    };
  } catch (error) {
    console.error('[analyzeDocumentStructureServer] Erro ao analisar documento:', error);
    return {
      structuredContent: content,
      categories: [],
      keywords: [],
      sections: []
    };
  }
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
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!adminEmail) {
    throw new Error('Configuração do servidor incompleta: ADMIN_EMAIL não definido');
  }

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
      throw new Error('Não foi possível encontrar o país selecionado. Por favor, tente novamente.');
    }

    if (!countryData || countryData.length === 0) {
      throw new Error('País não encontrado. Por favor, selecione um país válido.');
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
      throw new Error('Não foi possível encontrar a categoria. Por favor, tente novamente.');
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
        throw new Error('Não foi possível criar a categoria. Por favor, tente novamente.');
      }

      categoryId = (newCategory as { id?: string }).id || '';
      console.log(`[processAndUploadNorm] ✓ Categoria criada: ${categoryId}`);
    } else {
      categoryId = categoryData[0].id;
      console.log(`[processAndUploadNorm] ✓ Categoria encontrada: ${categoryId}`);
    }

    // Step 3: Insert norm
    console.log('[processAndUploadNorm] Inserindo norma...');
    const normId = generateShortId();
    const insertData = {
      id: normId,
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
      // Check for duplicate key constraint violation
      if (normError.message.includes('unique_norm_code_country') || normError.code === '23505') {
        throw new Error('Já existe uma norma com este código neste país. Por favor, verifique se a norma já foi cadastrada.');
      }
      throw new Error(`Erro ao inserir norma: ${normError.message}`);
    }

    if (!normData) {
      throw new Error('Não foi possível criar a norma. Por favor, tente novamente.');
    }

    console.log(`[processAndUploadNorm] ✓ Norma criada: ${normId}`);

    // Step 4: Generate AI summary of the norm
    console.log(`[processAndUploadNorm] === INÍCIO GERAÇÃO RESUMO ===`);
    const contentToSummarize = formData.content || '';
    // Clean HTML before checking length
    const cleanedContent = cleanHtmlFormatting(contentToSummarize);
    console.log(`[processAndUploadNorm] Summary check: originalLength=${contentToSummarize.length}, cleanedLength=${cleanedContent.length}, apiKeyConfigured=${!!apiKey && apiKey.length > 10}`);
    if (process.env.NODE_ENV === 'development') {
      console.log(`[processAndUploadNorm] API Key: ${apiKey ? '✓' : 'NOT SET'}`);
    }

    if (cleanedContent && cleanedContent.length > 100 && apiKey && apiKey.length > 10) {
      try {
        console.log(`[processAndUploadNorm] Generating AI summary...`);

        const summaryPrompt = `Você é um especialista em normas arquitetônicas.

Leia o seguinte documento completo e crie um resumo detalhado descrevendo o que cada artigo/capítulo fala.

Código da Norma: ${formData.code}
Título: ${formData.title}

Conteúdo:
${cleanedContent.substring(0, 15000)}

INSTRUÇÕES:
1. Leia todo o documento
2. Identifique a estrutura (capítulos, artigos, parágrafos)
3. Para cada artigo/capítulo, descreva brevemente o que ele trata
4. Formate o resumo de forma clara e organizada
5. Retorne APENAS o resumo, sem introduções ou conclusões extras`;

        const summaryResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://arquiv.org',
          },
          body: JSON.stringify({
            model: 'google/gemma-4-31b-it:free',
            messages: [{ role: 'user', content: summaryPrompt }],
            temperature: 0.3,
          }),
        });

        console.log(`[processAndUploadNorm] Summary API response status: ${summaryResponse.status}`);

        if (summaryResponse.ok) {
          const summaryData = await summaryResponse.json();
          const summaryText = summaryData.choices?.[0]?.message?.content || '';

          console.log(`[processAndUploadNorm] Summary text length: ${summaryText.length}`);

          if (summaryText) {
            // Insert summary into summaries table
            const { error: insertError } = await supabaseWrite
              .from('summaries')
              .upsert({
                norm_id: normId,
                summary: summaryText.trim(),
              }, {
                onConflict: 'norm_id',
              });

            if (!insertError) {
              console.log(`[processAndUploadNorm] ✓ Summary generated and saved to summaries table`);
            } else {
              console.error(`[processAndUploadNorm] Failed to save summary:`, insertError);
            }
          } else {
            console.warn(`[processAndUploadNorm] Summary API returned empty text`);
          }
        } else {
          const errorText = await summaryResponse.text();
          console.warn(`[processAndUploadNorm] Summary API failed: ${summaryResponse.status}`, errorText);
        }
      } catch (summaryError) {
        console.warn('[processAndUploadNorm] Summary generation failed (non-critical):', summaryError);
        // Continue even if summary fails
      }
    } else {
      console.warn(`[processAndUploadNorm] Summary generation skipped: contentLength=${cleanedContent.length}, apiKeyValid=${apiKey && apiKey.length > 10}`);
    }

    // Step 5: Process sections and embeddings (semantic chunking)
    let sectionsCreated = 0;
    let embeddingsGenerated = 0;

    const contentToProcess = formData.content || '';

    // Require chunking: abort if insufficient content or API key missing
    if (!contentToProcess || contentToProcess.length <= 100 || !apiKey || apiKey.length <= 10) {
      try {
        await supabaseWrite.from('norms').delete().eq('id', normId);
        console.warn('[processAndUploadNorm] Chunking skipped - norm removed:', normId);
      } catch (delErr) {
        console.error('[processAndUploadNorm] Falha ao remover norma após chunking skip:', delErr);
      }
      throw new Error('Chunking não executado: conteúdo insuficiente ou chave de IA não configurada. Upload cancelado.');
    }

    try {
      console.log(`[processAndUploadNorm] Starting semantic chunking using article extraction...`);

      // Extract all articles from the full document
      const articles = splitContentIntoArticles(contentToProcess);
      console.log(`[processAndUploadNorm] splitContentIntoArticles returned ${articles.length} articles`);

      // Map articles to NormSection-like objects so chunkDocument treats each article as a primary unit
      const sectionsForChunking = articles.map((a, idx) => ({
        sectionType: 'artigo' as const,
        sectionNumber: String(a.index || idx + 1),
        sectionTitle: undefined,
        content: a.text,
        orderIndex: idx,
        pageNumber: undefined,
      }));

      // Insert parent article rows to preserve parent_section_id mapping
      const parentInserts = sectionsForChunking.map((s) => ({
        norm_id: normId,
        section_type: s.sectionType,
        section_number: s.sectionNumber,
        section_title: s.sectionTitle,
        content: s.content,
        content_raw: s.content,
        parent_section_id: null,
        embedding: null,
        order_index: s.orderIndex,
      }));

      const { data: parentRows, error: parentError } = await supabaseWrite
        .from('norm_sections')
        .insert(parentInserts)
        .select('id');

      if (parentError || !parentRows) {
        console.error('[processAndUploadNorm] Failed to insert parent article rows:', parentError);
        await supabaseWrite.from('norms').delete().eq('id', normId);
        throw new Error('Falha ao salvar artigos-pai no banco. Upload cancelado.');
      }

      const parentIds = parentRows.map((r: { id: string | number }) => r.id);

      // Chunk articles (each article becomes at least one chunk)
      const chunks = chunkDocument(sectionsForChunking, 5000);
      console.log(`[processAndUploadNorm] Created ${chunks.length} chunks from ${sectionsForChunking.length} articles`);

      // Generate embeddings for chunks
      const chunksWithEmbeddings = await generateSectionEmbeddings(chunks, apiKey);
      embeddingsGenerated = chunksWithEmbeddings.length;
      console.log(`[processAndUploadNorm] Generated ${embeddingsGenerated} embeddings`);

      // Insert each chunk into norm_sections and link to parent article
      for (let i = 0; i < chunksWithEmbeddings.length; i++) {
        const chunk = chunksWithEmbeddings[i];
        // Determine parent by sectionNumber prefix (e.g., "5-2" -> 5)
        const secNumRoot = String(chunk.sectionNumber || '').split('-')[0] || '';
        const parentIndex = secNumRoot ? Math.max(0, Number(secNumRoot) - 1) : null;
        const parentId = parentIndex !== null && parentIds[parentIndex] ? parentIds[parentIndex] : null;

        const { error: sectionError } = await supabaseWrite
          .from('norm_sections')
          .insert({
            norm_id: normId,
            section_type: chunk.sectionType,
            section_number: chunk.sectionNumber,
            section_title: chunk.sectionTitle,
            content: chunk.content,
            content_raw: chunk.content,
            parent_section_id: parentId,
            embedding: chunk.embedding,
            order_index: i,
          });

        if (sectionError) {
          console.error(`[processAndUploadNorm] Failed to insert chunk ${i}:`, sectionError);
          // Cleanup and abort
          await supabaseWrite.from('norms').delete().eq('id', normId);
          throw new Error('Falha ao salvar sections no banco. Upload cancelado.');
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
      console.error('[processAndUploadNorm] Chunking failed (critical):', chunkError);
      // Cleanup norm record on failure
      try {
        await supabaseWrite.from('norms').delete().eq('id', normId);
      } catch (cleanupErr) {
        console.error('[processAndUploadNorm] Erro ao tentar limpar norma após falha de chunking:', cleanupErr);
      }
      throw new Error(`Chunking failed: ${chunkError instanceof Error ? chunkError.message : String(chunkError)}. Upload cancelado.`);
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
  } catch {
    console.error('[processAndUploadNorm] Ocorreu um erro interno ao processar a norma');
    throw new Error('Erro interno ao processar a norma');
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
  fullArticleContent?: string;
  extractedAnswer?: string | null;
  // Estrutura hierárquica do artigo
  titulo?: string;
  capitulo?: string;
  seccao?: string;
  subseccao?: string;
  artigo?: string;
  paragrafo?: string;
  inciso?: string;
  alinea?: string;
  item?: string;
}

export interface GroupedSearchResult {
  normId: string;
  normCode: string;
  normTitle: string;
  normCountry: string;
  sections: SearchResult[];
}

// Server action to update all norm descriptions with example text
export async function updateAllNormDescriptions() {
  try {
    const supabaseWrite = getAdminSupabaseClient();

    console.log('Fetching all norms...');
    const { data: norms, error } = await supabaseWrite
      .from('norms')
      .select('id, code, title');

    if (error) {
      console.error('Error fetching norms:', error);
      return { success: false, error: error.message };
    }

    console.log(`Found ${norms?.length || 0} norms`);

    if (!norms || norms.length === 0) {
      return { success: true, message: 'No norms found in database' };
    }

    let updated = 0;
    let failed = 0;

    for (const norm of norms) {
      const exampleDescription = `Esta norma ${norm.code} - ${norm.title} estabelece os requisitos técnicos e procedimentos necessários para sua implementação. O documento contém disposições sobre os principais aspectos da norma, incluindo definições, requisitos de conformidade, e diretrizes para aplicação. Para informações detalhadas sobre cada artigo e capítulo, consulte o documento completo.`;

      const { error: updateError } = await supabaseWrite
        .from('norms')
        .update({ description: exampleDescription })
        .eq('id', norm.id);

      if (updateError) {
        console.error(`Failed to update norm ${norm.id}:`, updateError);
        failed++;
      } else {
        console.log(`✓ Updated norm ${norm.id} (${norm.code})`);
        updated++;
      }
    }

    console.log(`Summary: ${updated} updated, ${failed} failed`);
    return { success: true, updated, failed };
  } catch (error) {
    console.error('Error:', error);
    return { success: false, error: String(error) };
  }
}

function cleanHtmlFormatting(text: string): string {
  if (!text) return '';
  return text
    .replace(/-\*-[^]*?-\*-/g, '') // Ignore custom hidden text marked with -*-
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>|<\/div>|<\/li>|<\/h[1-6]>/gi, '\n')
    .replace(/<[^>]*>/g, '') // Remove remaining HTML tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ') // Replace multiple spaces/tabs with single space, preserve \n
    .replace(/\n\s*\n+/g, '\n\n') // Collapse multiple newlines into max 2
    .trim();
}

/**
 * Snippets from extractBestSnippet are often wrapped with "..." at the start/end;
 * those ellipsis markers are not in the source document, so indexOf would fail
 * and chapter/article inference would break.
 */
function stripSnippetEllipsis(text: string): string {
  return text
    .replace(/^\s*\.{2,}\s*/u, '')
    .replace(/\s*\.{2,}\s*$/u, '')
    .trim();
}

type HierarchyFields = {
  titulo?: string;
  capitulo?: string;
  seccao?: string;
  subseccao?: string;
  artigo?: string;
  paragrafo?: string;
  inciso?: string;
  alinea?: string;
  item?: string;
};

function hasHierarchyFields(h: HierarchyFields): boolean {
  return !!(
    h.titulo ||
    h.capitulo ||
    h.seccao ||
    h.subseccao ||
    h.artigo ||
    h.paragrafo ||
    h.inciso ||
    h.alinea ||
    h.item
  );
}

/** When the excerpt itself contains headings (common in AI quotes), take the last match — heading usually precedes the quoted body. */
function extractHierarchyFromExcerptMarkers(text: string): HierarchyFields {
  const out: HierarchyFields = {};
  if (!text) return out;

  const findLast = (regex: RegExp) => {
    const matches = Array.from(text.matchAll(regex));
    return matches.length > 0 ? matches[matches.length - 1][0].trim() : undefined;
  };

  out.titulo = findLast(/(?:T[ÍI]TULO|Título|Titulo)\s+(?:[IVXLCivxlc]+|\d+(?:º|ª)?)/gi);
  out.capitulo = findLast(
    /(?:CAP[ÍI]TULO|CAPITULO|Cap[íi]tulo|Capitulo|CAP\.?)\s+(?:[IVXLCivxlc]+|\d+(?:º|ª)?)/gi
  );
  out.seccao = findLast(/(?:SEC[ÇC][ÃA]O|Sec[çc][ãa]o|SEÇÃO|Seção|SEC\.?)\s+(?:[IVXLCivxlc]+|\d+(?:º|ª)?)/gi);
  out.subseccao = findLast(/(?:SUBSEC[ÇC][ÃA]O|Subsec[çc][ãa]o|SUBSEÇÃO|Subseção)\s+(?:[IVXLCivxlc]+|\d+(?:º|ª)?)/gi);
  out.artigo = findLast(/(?:Art\.?\s*º?\s*|Artigo|ART\.?)\s*(?:nº|n°)?\s*\d+(?:º|ª)?/gi);
  out.paragrafo = findLast(/(?:§|Par[áa]grafo|Paragraph)\s+(?:\d+(?:º|ª)?|único|única)/gi);
  out.inciso = findLast(/(?:Inciso|INCISO)\s+(?:[IVXLCivxlc]+|\d+)/gi);
  out.alinea = findLast(/(?:Al[íi]nea|AL[ÍI]NEA|ALINEA)\s+[a-z](?:\)|$|\s)/gi);
  out.item = findLast(/(?:Item|ITEM)\s+\d+/gi);

  return out;
}

function adjustSnippetBoundaries(clean: string, start: number, end: number, maxExpansion: number = 200) {
  let newStart = start;
  let newEnd = end;

  if (start > 0) {
    const searchLimit = Math.max(0, start - maxExpansion);
    const textBefore = clean.substring(searchLimit, start);
    const sentenceRegex = /[.?!;]\s+|\n+/g;
    let match;
    let lastMatchIdx = -1;
    let lastMatchLen = 0;
    while ((match = sentenceRegex.exec(textBefore)) !== null) {
      lastMatchIdx = match.index;
      lastMatchLen = match[0].length;
    }
    if (lastMatchIdx !== -1) {
      newStart = searchLimit + lastMatchIdx + lastMatchLen;
    } else {
      const spaceIdx = clean.lastIndexOf(' ', start);
      if (spaceIdx !== -1) newStart = spaceIdx + 1;
    }
  }

  if (end < clean.length) {
    const searchLimit = Math.min(clean.length, end + maxExpansion);
    const textAfter = clean.substring(end, searchLimit);
    const match = /[.?!;](\s+|$)|\n+/.exec(textAfter);
    if (match) {
      newEnd = end + match.index + 1; // include punctuation
    } else {
      const spaceIdx = clean.indexOf(' ', end);
      if (spaceIdx !== -1) newEnd = spaceIdx;
    }
  }

  return { start: newStart, end: newEnd };
}

// Extract a concise snippet around the query terms from a larger content string
function extractBestSnippet(content: string, query: string, maxLen: number = 600): string {
    const clean = cleanHtmlFormatting(content || '');
    if (!clean) return '';

    const qTerms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);

    // If no terms, return empty (no meaningful search)
    if (qTerms.length === 0) {
      return '';
    }

    // Use expanded tokens with synonyms for better matching
    const expandedTerms = processSearchQuery(query);
    
    // Portuguese stop words to filter out
    const STOP_WORDS = new Set([
      'a', 'o', 'as', 'os', 'um', 'uma', 'uns', 'umas',
      'de', 'do', 'da', 'dos', 'das', 'em', 'no', 'na', 'nos', 'nas',
      'para', 'por', 'com', 'sem', 'sobre', 'entre', 'até',
      'que', 'quem', 'qual', 'quais', 'cujo', 'cuja', 'cujos', 'cujas',
      'é', 'são', 'foi', 'foram', 'ser', 'estar', 'ter', 'haver',
      'fale', 'falar', 'diga', 'dizer', 'quero', 'preciso', 'gostaria',
      'norma', 'normas', 'lei', 'leis', 'decreto', 'decretos',
      'como', 'onde', 'quando', 'porque', 'porquê',
      'muito', 'muita', 'muitos', 'muitas', 'pouco', 'pouca', 'poucos', 'poucas',
      'também', 'ainda', 'já', 'agora', 'hoje', 'antes', 'depois',
      'mais', 'menos', 'melhor', 'pior', 'bom', 'boa', 'bons', 'boas',
      'grande', 'pequeno', 'alto', 'baixo', 'longo', 'curto',
      'este', 'esta', 'isto', 'esse', 'essa', 'isso', 'aquele', 'aquela', 'aquilo',
      'meu', 'minha', 'meus', 'minhas', 'teu', 'tua', 'teus', 'tuas',
      'nosso', 'nossa', 'nossos', 'nossas', 'seu', 'sua', 'seus', 'suas',
      'todo', 'toda', 'todos', 'todas', 'algum', 'alguma', 'alguns', 'algumas',
      'nenhum', 'nenhuma', 'nenhuns', 'nenhumas', 'cada', 'outro', 'outros',
      'deve', 'ser',
    ]);
    
    // Filter out stop words and very short terms, normalize all (remove accents)
    const allTerms = [...qTerms, ...expandedTerms]
      .map(t => removeAccents(t))
      .filter(t => t.length >= 3)
      .filter(t => !STOP_WORDS.has(t));

    console.log('[extractBestSnippet] Search terms (filtered, normalized, no stop words):', allTerms.slice(0, 10));

    // Normalize content for matching
    const normalizedClean = removeAccents(clean);

    // Find ALL term occurrences and select the window with the most matches (best coverage)
    const matchPositions: number[] = [];
    for (const term of allTerms) {
      let searchFrom = 0;
      while (searchFrom < normalizedClean.length) {
        const i = normalizedClean.indexOf(term, searchFrom);
        if (i === -1) break;
        matchPositions.push(i);
        searchFrom = i + term.length;
      }
    }

    // If not found, return empty
    if (matchPositions.length === 0) {
      console.log('[extractBestSnippet] No match found for terms:', allTerms.slice(0, 5));
      return '';
    }

    // Find the best window (max matches in a maxLen range)
    let bestStart = 0;
    let bestEnd = Math.min(clean.length, maxLen);
    let maxMatches = 0;

    for (let i = 0; i < matchPositions.length; i++) {
      const pos = matchPositions[i];
      const windowStart = Math.max(0, pos - Math.floor(maxLen / 2));
      const windowEnd = Math.min(clean.length, windowStart + maxLen);

      // Count matches in this window
      let matches = 0;
      for (let j = i; j < matchPositions.length; j++) {
        if (matchPositions[j] < windowEnd) matches++;
        else break;
      }

      if (matches > maxMatches) {
        maxMatches = matches;
        bestStart = windowStart;
        bestEnd = windowEnd;
      }
    }

    // Adjust to sentence boundaries
    const bounds = adjustSnippetBoundaries(clean, bestStart, bestEnd, 300);
    bestStart = bounds.start;
    bestEnd = bounds.end;

    let snippet = clean.substring(bestStart, bestEnd).trim();
    if (bestStart > 0) snippet = '...' + snippet;
    if (bestEnd < clean.length) snippet = snippet + '...';
    return snippet;
  }

// Extract ALL non-overlapping snippets matching query terms from a content string
function extractAllSnippets(content: string, query: string, maxLen: number = 400, maxSnippets: number = 5): string[] {
  const clean = cleanHtmlFormatting(content || '');
  if (!clean) return [];

  const qTerms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (qTerms.length === 0) return [];

  const expandedTerms = processSearchQuery(query);

  const STOP_WORDS = new Set([
    'a', 'o', 'as', 'os', 'um', 'uma', 'uns', 'umas',
    'de', 'do', 'da', 'dos', 'das', 'em', 'no', 'na', 'nos', 'nas',
    'para', 'por', 'com', 'sem', 'sobre', 'entre', 'até',
    'que', 'quem', 'qual', 'quais', 'cujo', 'cuja', 'cujos', 'cujas',
    'é', 'são', 'foi', 'foram', 'ser', 'estar', 'ter', 'haver',
    'fale', 'falar', 'diga', 'dizer', 'quero', 'preciso', 'gostaria',
    'norma', 'normas', 'lei', 'leis', 'decreto', 'decretos',
    'como', 'onde', 'quando', 'porque', 'porquê',
    'muito', 'muita', 'muitos', 'muitas', 'pouco', 'pouca', 'poucos', 'poucas',
    'também', 'ainda', 'já', 'agora', 'hoje', 'antes', 'depois',
    'mais', 'menos', 'melhor', 'pior', 'bom', 'boa', 'bons', 'boas',
    'grande', 'pequeno', 'alto', 'baixo', 'longo', 'curto',
    'este', 'esta', 'isto', 'esse', 'essa', 'isso', 'aquele', 'aquela', 'aquilo',
    'meu', 'minha', 'meus', 'minhas', 'teu', 'tua', 'teus', 'tuas',
    'nosso', 'nossa', 'nossos', 'nossas', 'seu', 'sua', 'seus', 'suas',
    'todo', 'toda', 'todos', 'todas', 'algum', 'alguma', 'alguns', 'algumas',
    'nenhum', 'nenhuma', 'nenhuns', 'nenhumas', 'cada', 'outro', 'outros',
    'deve', 'ser',
  ]);

  const allTerms = [...qTerms, ...expandedTerms]
    .map(t => removeAccents(t))
    .filter(t => t.length >= 3)
    .filter(t => !STOP_WORDS.has(t));

  if (allTerms.length === 0) return [];

  const normalizedClean = removeAccents(clean);
  const half = Math.floor(maxLen / 2);

  // Collect all match positions for every term
  const matchPositions: number[] = [];
  for (const term of allTerms) {
    let searchFrom = 0;
    while (searchFrom < normalizedClean.length) {
      const idx = normalizedClean.indexOf(term, searchFrom);
      if (idx === -1) break;
      matchPositions.push(idx);
      searchFrom = idx + term.length;
    }
  }

  if (matchPositions.length === 0) return [];

  matchPositions.sort((a, b) => a - b);

  // Greedily extract non-overlapping windows
  const snippets: string[] = [];
  let lastEnd = -1;

  for (const pos of matchPositions) {
    if (snippets.length >= maxSnippets) break;
    // Skip positions already covered by the previous snippet window
    if (pos < lastEnd) continue;

    let start = Math.max(0, pos - half);
    let end = Math.min(clean.length, start + maxLen);

    const bounds = adjustSnippetBoundaries(clean, start, end, 200);
    start = bounds.start;
    end = bounds.end;

    lastEnd = end;
    let snippet = clean.substring(start, end).trim();
    if (start > 0) snippet = '...' + snippet;
    if (end < clean.length) snippet = snippet + '...';
    snippets.push(snippet);
  }

  return snippets;
}

// Helper to find chapter/article in the text BEFORE a specific excerpt
function findHierarchyBeforeExcerpt(excerpt: string, fullText: string, contextSize: number = 5000): { 
  titulo?: string;
  capitulo?: string;
  seccao?: string;
  subseccao?: string;
  artigo?: string;
  paragrafo?: string;
  inciso?: string;
  alinea?: string;
  item?: string;
} {
  const out: { 
    titulo?: string;
    capitulo?: string;
    seccao?: string;
    subseccao?: string;
    artigo?: string;
    paragrafo?: string;
    inciso?: string;
    alinea?: string;
    item?: string;
  } = {};

  const ex = stripSnippetEllipsis(cleanHtmlFormatting(excerpt || ''));
  let doc = cleanHtmlFormatting(fullText || '');
  if (!doc || !ex) return out;

  /**
   * Resolve excerpt position and the document string to slice for "context before".
   * Critical: if we match on whitespace-normalized text, we must slice that same string —
   * using normalized indices against the non-normalized fullText was breaking hierarchy detection.
   */
  let excerptStart = doc.indexOf(ex);
  if (excerptStart === -1) {
    excerptStart = doc.toLowerCase().indexOf(ex.toLowerCase());
  }

  const normEx = ex.replace(/\s+/g, ' ').trim();
  const normDoc = doc.replace(/\s+/g, ' ');
  if (excerptStart === -1 && normEx.length > 0) {
    const idx = normDoc.indexOf(normEx);
    if (idx !== -1) {
      doc = normDoc;
      excerptStart = idx;
    }
  }

  if (excerptStart === -1 && normEx.length > 0) {
    const firstWords = normEx.split(' ').slice(0, 12).join(' ');
    if (firstWords.length >= 8) {
      const idx = normDoc.indexOf(firstWords);
      if (idx !== -1) {
        doc = normDoc;
        excerptStart = idx;
      }
    }
  }

  // Prefix fuzzy match: AI/snippets often differ slightly from DB text; ellipsis was already stripped.
  if (excerptStart === -1 && normEx.length >= 16) {
    const lengths = [Math.min(220, normEx.length), 180, 140, 100, 72, 48];
    for (const len of lengths) {
      const sub = normEx.slice(0, len);
      if (sub.length < 10) continue;
      let idx = normDoc.indexOf(sub);
      if (idx === -1) idx = normDoc.toLowerCase().indexOf(sub.toLowerCase());
      if (idx !== -1) {
        doc = normDoc;
        excerptStart = idx;
        console.log(`[findHierarchyBeforeExcerpt] Fuzzy prefix match (len=${len})`);
        break;
      }
    }
  }

  if (excerptStart === -1) {
    const articleMatch = ex.match(/(?:Art\.?|Artigo|ART\.?)\s*(?:nº|n°)?\s*(\d+)/i);
    if (articleMatch?.[1]) {
      const artNum = articleMatch[1];
      const artRegex = new RegExp(`(?:Art\\.?|Artigo|ART\\.?)\\s*(?:nº|n°)?\\s*${artNum}(?:º|ª)?`, 'i');
      for (const d of [doc, normDoc]) {
        const artMatch = d.match(artRegex);
        if (artMatch && artMatch.index !== undefined) {
          doc = d;
          excerptStart = artMatch.index;
          console.log(`[findHierarchyBeforeExcerpt] Found article ${artNum} by number fallback at index ${excerptStart}`);
          break;
        }
      }
    }
  }

  if (excerptStart === -1) {
    return out;
  }

  const contextBefore = doc.substring(0, excerptStart);

  const findLastMatch = (regex: RegExp) => {
    const matches = Array.from(contextBefore.matchAll(regex));
    return matches.length > 0 ? matches[matches.length - 1][0].trim() : undefined;
  };

  out.titulo = findLastMatch(/(?:T[ÍI]TULO|Título|Titulo)\s+(?:[IVXLCivxlc]+|\d+(?:º|ª)?)/gi);
  out.capitulo = findLastMatch(
    /(?:CAP[ÍI]TULO|CAPITULO|Cap[íi]tulo|Capitulo|CAP\.?)\s+(?:[IVXLCivxlc]+|\d+(?:º|ª)?)/gi
  );
  out.seccao = findLastMatch(/(?:SEC[ÇC][ÃA]O|Sec[çc][ãa]o|SEÇÃO|Seção|SEC\.?)\s+(?:[IVXLCivxlc]+|\d+(?:º|ª)?)/gi);
  out.subseccao = findLastMatch(/(?:SUBSEC[ÇC][ÃA]O|Subsec[çc][ãa]o|SUBSEÇÃO|Subseção)\s+(?:[IVXLCivxlc]+|\d+(?:º|ª)?)/gi);
  out.artigo = findLastMatch(/(?:Art\.?|Artigo|ART\.?)\s*(?:nº|n°)?\s*\d+(?:º|ª)?/gi);
  out.paragrafo = findLastMatch(/(?:§|Par[áa]grafo|Paragraph)\s+(?:\d+(?:º|ª)?|único|única)/gi);
  out.inciso = findLastMatch(/(?:Inciso|INCISO)\s+(?:[IVXLCivxlc]+|\d+)/gi);
  out.alinea = findLastMatch(/(?:Al[íi]nea|AL[ÍI]NEA|ALINEA)\s+[a-z](?:\)|$|\s)/gi);
  out.item = findLastMatch(/(?:Item|ITEM)\s+\d+/gi);

  // If the excerpt itself starts with an article/paragraph header, use that instead of the one found in contextBefore
  const excerptArticleMatch = ex.match(/^\s*(?:Art(?:igo)?\.?\s*(?:nº|n°)?\s*\d+(?:º|ª)?(?:\s*-\s*[A-Za-z\u00C0-\u00FF])?)/i);
  if (excerptArticleMatch) {
    out.artigo = excerptArticleMatch[0].trim();
  }
  const excerptParaMatch = ex.match(/^\s*(§\s*(?:\d+(?:º|ª)?|úni[cç]o[as]?))/i);
  if (excerptParaMatch) {
    out.paragrafo = excerptParaMatch[0].trim();
  }

  void contextSize;
  return out;
}

// Top-level helper to infer chapter/article/paragraph from a text snippet or full document
function parseHierarchyFromText(excerpt: string, fullText?: string): HierarchyFields {
  const cleanExcerpt = stripSnippetEllipsis(cleanHtmlFormatting(excerpt || ''));
  const cleanFull = fullText ? cleanHtmlFormatting(fullText) : '';

  console.log('[parseHierarchyFromText] Starting:', {
    excerptLength: cleanExcerpt?.length,
    fullTextLength: cleanFull?.length,
    hasFullText: !!cleanFull,
  });

  if (cleanFull.length > 0) {
    const hierarchyFromContext = findHierarchyBeforeExcerpt(cleanExcerpt, cleanFull, 5000);
    console.log('[parseHierarchyFromText] Result from context search:', hierarchyFromContext);

    if (hasHierarchyFields(hierarchyFromContext)) {
      console.log('[parseHierarchyFromText] Returning context-based hierarchy');
      return hierarchyFromContext;
    }

    console.log('[parseHierarchyFromText] Context search empty, trying excerpt markers...');
  }

  const fromMarkers = extractHierarchyFromExcerptMarkers(cleanExcerpt);
  if (hasHierarchyFields(fromMarkers)) {
    console.log('[parseHierarchyFromText] Using excerpt-embedded markers');
    return fromMarkers;
  }

  console.log('[parseHierarchyFromText] No hierarchy fields found');
  return fromMarkers;
}

export async function searchNormsSemantic(
  query: string,
  country?: string,
  limit: number = 10
): Promise<SearchResult[]> {
  console.log('[searchNormsSemantic] Iniciando busca com IA:', { query, country, limit });

  // Analyze query intent to improve semantic understanding
  const queryInterpretation = await interpretUserQuery(query, apiKey);
  console.log('[searchNormsSemantic] Query interpretation:', {
    intent: queryInterpretation.intent,
    keywords: queryInterpretation.keywords.slice(0, 5),
    constraints: queryInterpretation.constraints,
    expandedTerms: queryInterpretation.expandedTerms.slice(0, 10),
    aiAnalysis: queryInterpretation.aiAnalysis,
  });

  // Check cache first
  const cacheKey = generateSearchCacheKey('semantic', query, country, undefined, limit);
  const cached = getCachedSearch<SearchResult[]>(cacheKey);
  if (cached) {
    console.log('[Cache] Hit for semantic search:', cacheKey);
    // Still record so rate limit tracks cache hits — otherwise users bypass the limit by repeating the same query
    try {
      const headersList = await headers();
      const cachedIp = (headersList.get('x-forwarded-for')?.split(',')[0] || headersList.get('x-real-ip') || 'unknown').trim();
      let cachedUserId: string | undefined;
      try {
        const supabaseAuth = await getAuthenticatedSupabaseClient();
        const { data: { user } } = await supabaseAuth.auth.getUser();
        cachedUserId = user?.id;
      } catch { /* unauthenticated */ }
      await recordSearch(cachedIp, 'semantic', query, country, cachedUserId);
    } catch (err) {
      console.warn('[searchNormsSemantic] Erro ao registrar busca (cache hit):', err);
    }
    return cached;
  }

  // Get IP from headers
  const getIp = async (): Promise<string> => {
    try {
      const headersList = await headers();
      const ip = headersList.get('cf-connecting-ip') || 
                 headersList.get('x-forwarded-for')?.split(',')[0] || 
                 headersList.get('x-real-ip') || 
                 'unknown';
      return ip.trim();
    } catch {
      // headers() might throw an error if called outside of a Next.js request scope (e.g. CLI tests)
      return 'unknown';
    }
  };

  const clientIp = await getIp();

  // Get authenticated user ID if available
  let userId: string | undefined;
  try {
    const supabaseAuth = await getAuthenticatedSupabaseClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    userId = user?.id;
  } catch {
    // User not authenticated, continue with IP-based rate limiting
    console.log('[searchNormsSemantic] User not authenticated, using IP-based rate limiting');
  }

  // Check rate limit by IP or userId (hybrid)
  try {
    const rateLimitResult = await checkRateLimit(clientIp, 'semantic', undefined, userId);

    if (!rateLimitResult.allowed) {
      console.warn('[searchNormsSemantic] Rate limit excedido:', rateLimitResult);
      throw new Error(rateLimitResult.reason || 'Limite de buscas por dia excedido. Tente novamente amanhã.');
    }

    console.log('[searchNormsSemantic] Rate limit OK. Remaining:', rateLimitResult.remaining);
  } catch (rateLimitError: unknown) {
    const err = rateLimitError as Error;
    // Only throw rate limit errors
    if (err.message && err.message.includes('Limite')) {
      throw err;
    }
    console.log('[searchNormsSemantic] Iniciando busca com IA:', { query, country, limit });
  }

  if (!apiKey || apiKey === '' || apiKey === 'MY_OPENROUTER_API_KEY') {
    console.warn('[searchNormsSemantic] API Key não configurada - busca semântica desativada');
    return [];
  }

  // === VECTOR SEARCH (primary method) ===
  try {
    const supabase = await getAuthenticatedSupabaseClient();
    const cleaned = cleanHtmlFormatting(query);

    // Generate query embedding with interpretation context for better semantic understanding
      const embeddingClient = new EmbeddingClient(apiKey);
      let queryTextForEmbedding = cleaned;
      if (queryInterpretation.aiAnalysis && queryInterpretation.concepts?.length > 0) {
        queryTextForEmbedding = `Pesquisa: ${cleaned}\nConceitos: ${queryInterpretation.concepts.join(', ')}\nAnálise: ${queryInterpretation.aiAnalysis}`;
      }
      const queryEmbedding = await embeddingClient.generateEmbedding(queryTextForEmbedding);

    // Fetch sections with embeddings from the database
    let allowedNormIds: string[] | null = null;
    if (country) {
      const { data: countryData } = await supabase
        .from('countries')
        .select('id')
        .eq('name', country)
        .single();
      const countryId = (countryData as { id?: string } | null)?.id;
      if (countryId) {
        const { data: normRows } = await supabase
          .from('norms')
          .select('id')
          .eq('country_id', countryId)
          .limit(500);
        allowedNormIds = (normRows || []).map((r) => String((r as { id?: string }).id)).filter(Boolean);
      }
    }

    let sectionsQuery = supabase
      .from('norm_sections')
      .select('id, norm_id, section_type, section_number, section_title, content, embedding, parent_section_id')
      .not('embedding', 'is', null)
      .limit(200);
    if (allowedNormIds && allowedNormIds.length > 0) {
      sectionsQuery = sectionsQuery.in('norm_id', allowedNormIds);
    }

    const { data: sections, error: sectionsError } = await sectionsQuery;
    if (!sectionsError && sections && sections.length > 0) {
      type VectorSectionRow = {
        id: string;
        norm_id: string;
        section_type: string | null;
        section_number: string | null;
        section_title: string | null;
        content: string | null;
        embedding: unknown;
        parent_section_id: string | null;
      };
      const vectorSections = sections as VectorSectionRow[];

      // Fetch related norm metadata
      const normIds = [...new Set(vectorSections.map(s => s.norm_id))];
      const { data: normsMeta } = await supabase
        .from('norms')
        .select('id, code, title, country, countries(name)')
        .in('id', normIds)
        .limit(normIds.length);

      const normsMetaMap = new Map<string, Record<string, unknown>>((normsMeta || []).map(n => [n.id as string, n as Record<string, unknown>]));

      // Helper: decode embedding field (Supabase returns it as JSON string)
      const parseEmbedding = (raw: unknown): number[] | null => {
        if (Array.isArray(raw)) return raw as number[];
        if (typeof raw === 'string') { try { return JSON.parse(raw); } catch { return null; } }
        return null;
      };

      // Cosine similarity
      const cosineSim = (a: number[], b: number[]): number => {
        let dot = 0, ma = 0, mb = 0;
        for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; ma += a[i] * a[i]; mb += b[i] * b[i]; }
        return dot / (Math.sqrt(ma) * Math.sqrt(mb));
      };

      // Score and rank sections
      // Use both processSearchQuery AND queryInterpretation for expanded terms
      const processedTokens = processSearchQuery(cleaned);
      const allSearchTerms = [
        ...processedTokens,
        ...(queryInterpretation.expandedTerms || []),
        ...(queryInterpretation.concepts || []),
        ...(queryInterpretation.suggestedSynonyms || [])
      ];
      // Normalize all terms (remove accents, lowercase, filter short)
      const normalizedSearchTokens = new Set(
        allSearchTerms
          .map(t => removeAccents(t))
          .filter(t => t.length >= 3)
      );

      const scored = vectorSections
        .map((s) => {
          const emb = parseEmbedding(s.embedding);
          if (!emb) return null;

          // Calculate semantic similarity
          const similarity = cosineSim(emb, queryEmbedding);

          // Calculate keyword matching score for hybrid ranking
          const sectionText = cleanHtmlFormatting(String(s.content || '') + ' ' + String(s.section_title || ''));
          const normalizedSectionText = removeAccents(sectionText);
          let keywordMatches = 0;
          const foundKeywords = new Set<string>();

          for (const term of normalizedSearchTokens) {
            if (normalizedSectionText.includes(term) && !foundKeywords.has(term)) {
              foundKeywords.add(term);
              // Weight longer keywords more heavily
              keywordMatches += term.length >= 6 ? 0.15 : 0.08;
            }
          }

          // Combine scores: semantic (70% weight) + keyword (30% weight)
          const finalScore = (similarity * 0.7) + (Math.min(keywordMatches, 0.4) * 0.3);

          return { section: s, similarity: finalScore, rawSimilarity: similarity, keywordScore: keywordMatches };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null && r.rawSimilarity >= 0.4)
        .filter(({ section }) => {
          const sectionText = cleanHtmlFormatting(String(section.content || '') + ' ' + String(section.section_title || ''));
          const normalizedSectionText = removeAccents(sectionText);
          if (!normalizedSectionText) return false;
          for (const t of normalizedSearchTokens) {
            if (normalizedSectionText.includes(t)) return true;
          }
          return false;
        })
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

      if (scored.length > 0) {
        console.log('[searchNormsSemantic] Vector search returned', scored.length, 'results');

        // Fetch parent sections (full articles) in batch
        const parentSectionIds = scored
          .map(({ section }) => section.parent_section_id)
          .filter((id): id is string => Boolean(id));

        const parentContentMap = new Map<string, string>();
        if (parentSectionIds.length > 0) {
          const { data: parentSections } = await supabase
            .from('norm_sections')
            .select('id, content')
            .in('id', parentSectionIds);
          if (parentSections) {
            for (const p of parentSections) {
              parentContentMap.set(String(p.id), p.content || '');
            }
          }
        }

        const results: SearchResult[] = scored.map(({ section: s, similarity }, idx) => {
          const norm = normsMetaMap.get(s.norm_id as string);
          const countryData = (norm?.countries as Array<{ name?: string }> | undefined)?.[0];
          const cleanContent = cleanHtmlFormatting(String(s.content || ''));
          const parentId = s.parent_section_id;
          const fullArticleContent = parentId ? (parentContentMap.get(String(parentId)) || cleanContent) : cleanContent;

          return {
            sectionId: `${String(s.norm_id)}-vs-${idx}`,
            normId: String(s.norm_id),
            normCode: (norm?.code as string) || '',
            normTitle: (norm?.title as string) || '',
            normCountry: countryData?.name || (norm?.country as string) || '',
            sectionType: (s.section_type as string) || 'artigo',
            sectionNumber: (s.section_number as string) || null,
            sectionTitle: (s.section_title as string) || null,
            content: cleanContent,
            similarity: similarity,
            decree: undefined,
            regulationNumber: undefined,
            excerpt: cleanContent,
            fullArticleContent
          };
        });

        // Post-process to extract answers and re-rank
        const processedResults = await postProcessSearchResults(results, query, queryInterpretation.intent);

        // Cache and return
        setCachedSearch(cacheKey, processedResults);
        console.log('[Cache] Set vector search results:', cacheKey);
        try { await recordSearch(clientIp, 'semantic', query, country, userId); } catch {}
        return processedResults;
      }
      console.log('[searchNormsSemantic] Vector search found no results above threshold, falling back...');
    } else {
      console.log('[searchNormsSemantic] No norm_sections with embeddings found, falling back...');
    }
  } catch (vectorErr) {
    console.warn('[searchNormsSemantic] Vector search failed, falling back to AI pipeline:', vectorErr);
  }

  let norms: Array<Record<string, unknown>> = [];
  
  try {
    const supabase = await getAuthenticatedSupabaseClient();
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
        countries(name),
        summaries!left(summary)
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

    const { data: normsData, error: normsError } = await queryBuilder.limit(50);

    if (normsError) {
      console.error('[searchNormsSemantic] Erro ao buscar normas:', normsError);
      throw new Error(`Erro ao buscar normas: ${normsError.message}`);
    }

    norms = (normsData || []) as Array<Record<string, unknown>>;
    console.log('[searchNormsSemantic] Normas encontradas (limited to 50):', norms.length);

    if (norms.length === 0) {
      return [];
    }

    // Clean query
    const cleanedQuery = cleanHtmlFormatting(query);

    // === STAGE 1: Analyze summaries to identify relevant norms ===
    console.log('[searchNormsSemantic] === ETAPA 1: Análise de resumos ===');

    // Prepare summaries for AI (id, code, title, description, keywords, summary - no full content)
    const summariesForAI = norms.map((norm) => {
      // Handle the array of summaries from the left join
      const summaries = norm.summaries as Array<{ summary?: string }> | undefined;
      const firstSummary = summaries?.[0]?.summary || "";
      
      return {
        id: norm.id,
        code: cleanHtmlFormatting(String(norm.code || "")),
        title: cleanHtmlFormatting(String(norm.title || "")),
        description: cleanHtmlFormatting(String(norm.description || "")),
        keywords: (norm.keywords as string[]) || [],
        summary: cleanHtmlFormatting(firstSummary).substring(0, 500)
      };
    });

    // Call AI to identify relevant norms based on summaries
    const summaryPrompt = `Você é um especialista em normas arquitetônicas com profundo conhecimento em:
- Planejamento urbano e zoneamento
- Legislação de construção e edificação
- Acessibilidade e segurança
- Uso do solo e ocupação
- Classificação de usos (residencial, comercial, industrial, etc.)
- Coeficientes e índices de ocupação, densidade, aproveitamento

ANÁLISE CONTEXTUAL DA CONSULTA:
Consulta original: "${cleanedQuery}"
País: ${country || 'Todos'}
Intenção detectada: ${queryInterpretation.intent}
Restrições mencionadas: ${queryInterpretation.constraints.join(', ') || 'nenhuma'}
Palavras-chave principais: ${queryInterpretation.keywords.join(', ')}
Sinônimos e termos relacionados: ${queryInterpretation.suggestedSynonyms.join(', ')}

TERMOS A BUSCAR SEMANTICAMENTE:
O usuário está buscando sobre: "${cleanedQuery}"
Procure especificamente por:
- Termos exatos: ${queryInterpretation.keywords.join(', ')}
- Variações técnicas: ${queryInterpretation.suggestedSynonyms.slice(0, 10).join(', ')}
- Se for sobre ocupação/área: busque por "coeficiente de ocupação", "índice de ocupação", "taxa de ocupação", "densidade", "aproveitamento"
- Se for sobre altura: busque por "gabarito", "altura máxima", "número de pavimentos"
- Se for sobre recuos: busque por "afastamento", "recuo de fachada", "margem"

ETAPA 1 - IDENTIFIQUE A INTENÇÃO:
1. Qual é o CONCEITO PRINCIPAL da pergunta? (ex: dimensões, segurança, ocupação, coeficiente, etc.)
2. Quais RESTRIÇÕES ou LIMITES são mencionados? (máximo, mínimo, proibição, etc.)
3. Qual CATEGORIA DE USO é relevante? (residencial, comercial, industrial, etc.)
4. Qual é o CONTEXTO TÉCNICO? (estrutura, instalações, materiais, ocupação, etc.)

ETAPA 2 - MAPEIE PARA CONCEITOS TÉCNICOS:
- Sinônimos: ocupação → uso, aproveitamento, destinação, coeficiente, índice, taxa
- Termos relacionados: área → dimensão, metragem, tamanho, superfície, lote
- Variações: altura → elevação, andares, pavimentos, gabarito, limite
- Conceitos derivados: segurança → proteção, prevenção, risco

ETAPA 3 - CLASSIFIQUE RELEVÂNCIA (ALTA/MÉDIA/BAIXA):
- ALTA: Trata diretamente do conceito principal (usa os termos específicos ou sinônimos claros)
- MÉDIA: Trata de conceitos relacionados ou dependentes (tangencialmente relacionado)
- BAIXA: Tangencial ou remoto (pouco relevante)

NORMAS DISPONÍVEIS (${summariesForAI.length}):
${JSON.stringify(summariesForAI, null, 2)}

INSTRUÇÕES FINAIS:
1. Identifique normas com relevância ALTA e MÉDIA
2. Exclua normas com relevância BAIXA
3. Retorne APENAS os IDs das normas relevantes
4. Se nenhuma for relevante, retorne array vazio []
5. Ordene por relevância (ALTA primeiro)
6. Se a consulta é sobre "área de ocupação", "coeficiente" ou termos similares, procure por normas que tratem de zoneamento, uso do solo, ocupação ou planejamento urbano

Retorne neste formato:
{
  "relevantNorms": ["id1", "id2", "id3"]
}`;

    console.log('[searchNormsSemantic] Enviando resumos para IA (Etapa 1)...');
    const summaryResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://arquiv.org',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-haiku',
        messages: [{ role: 'user', content: summaryPrompt }],
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    });

    let relevantNormIds: string[] = [];

    if (summaryResponse.ok) {
      const summaryData = await summaryResponse.json();
      const summaryText = summaryData.choices?.[0]?.message?.content || "{}";
      const cleanedSummaryText = summaryText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      try {
        const parsedSummary = JSON.parse(cleanedSummaryText);
        relevantNormIds = parsedSummary.relevantNorms || [];
        console.log('[searchNormsSemantic] Etapa 1: Normas relevantes identificadas:', relevantNormIds.length);
      } catch {
        console.error('[searchNormsSemantic] Erro ao parsear JSON da etapa 1:', cleanedSummaryText.substring(0, 200));
      }
    } else {
      console.warn('[searchNormsSemantic] Etapa 1 falhou, usando todas as normas como fallback');
    }

    // If no relevant norms found, use all norms
    let normsToProcess = norms;
    if (relevantNormIds.length > 0) {
      normsToProcess = norms.filter((norm) => relevantNormIds.includes(String(norm.id)));
      console.log('[searchNormsSemantic] Usando', normsToProcess.length, 'normas relevantes');
    } else {
      console.log('[searchNormsSemantic] Nenhuma norma relevante, usando todas as', norms.length, 'normas');
    }

    // === STAGE 2: Read full content of relevant norms and extract excerpts ===
    console.log('[searchNormsSemantic] === ETAPA 2: Extração de artigos ===');

    const articlesByNormId = new Map<string, Array<{ index: number; text: string }>>();
    normsToProcess.forEach((norm) => {
      const fullContent = cleanHtmlFormatting(String(norm.content || ""));
      articlesByNormId.set(String(norm.id), splitContentIntoArticles(fullContent));
    });

    console.log('[searchNormsSemantic] Etapa 2: seleção determinística de artigos (sem alucinação)...');

    const normalizedQueryLower = cleanHtmlFormatting(cleanedQuery).toLowerCase();
    const wantsMaximum = /\bmaxim/.test(normalizedQueryLower) || queryInterpretation.constraints.some((c) => /maxim/i.test(c));
    const wantsMinimum = /\bminim/.test(normalizedQueryLower) || queryInterpretation.constraints.some((c) => /minim/i.test(c));
    const isLimitIntent = queryInterpretation.intent === 'limit' || wantsMaximum || wantsMinimum || /\bquanto\b/.test(normalizedQueryLower);

    const expandedTerms = new Set<string>([
      ...processSearchQuery(cleanedQuery),
      ...(queryInterpretation.expandedTerms || []),
      ...(queryInterpretation.concepts || []),
      ...(queryInterpretation.suggestedSynonyms || []),
    ]
      .map((t) => removeAccents(cleanHtmlFormatting(String(t || ''))))
      .filter((t) => t.length >= 3)
      .slice(0, 80));

    const adminNoiseRegex = /(escala\s*\d+\/\d+|papel|dobrad|alçad|cortes?\s|plantas?\s|projecto|projeto|peças?\s+desenhadas|assinatura|requerimento|licen[cç]a|alvar[aã]|memorial|fossa|colector|coletor)/i;
    const normativeRegex = /(não poderá|nao podera|não podera|não exceder|nao exceder|máxim|maxim|minim|limite|proibid|interdit|dever[áa]|deve\b|obrigat)/i;

    const heightTerms = /(altura|cércea|cercea|gabarito|pé-direito|pe[-\s]?direito|pavimentos?|andares?|n[uú]mero\s+de\s+pisos)/i;
    const isHeightQuery = heightTerms.test(normalizedQueryLower) || Array.from(expandedTerms).some((t) => /(altura|cercea|cércea|gabarito|pe-direito|pé-direito|pavimento|andar|piso)/i.test(t));

    function isArticleAcceptable(text: string): boolean {
      const cleanText = cleanHtmlFormatting(text);
      const normalized = removeAccents(cleanText);
      if (!normalized || normalized.trim().length < 80) return false;

      const hasAnyExpandedTerm = Array.from(expandedTerms).some((t) => normalized.includes(t));
      const hasNormativeSignal = normativeRegex.test(cleanText);
      const hasAdminNoise = adminNoiseRegex.test(cleanText);
      const hasNumber = /\d/.test(normalized);
      const hasMaxMinLimit = /(m[aá]xima|maxim|m[ií]nima|minim|limite|não exceder|nao exceder|n[aã]o poder[aá] exceder)/i.test(cleanText);

      if (isHeightQuery && !heightTerms.test(cleanText)) return false;

      if (hasAdminNoise && !hasNormativeSignal) return false;

      if (isLimitIntent) {
        if (!hasNormativeSignal && !hasMaxMinLimit) return false;
        if (wantsMaximum && !/(m[aá]xima|maxim|não exceder|nao exceder|n[aã]o poder[aá] exceder|\d|%)/i.test(cleanText)) return false;
        if (wantsMinimum && !/(m[ií]nima|minim|\d|%)/i.test(cleanText)) return false;
        if (!hasNumber && !hasMaxMinLimit) return false;
      }

      return hasAnyExpandedTerm || (isHeightQuery && heightTerms.test(cleanText)) || hasNormativeSignal;
    }

    function scoreArticle(text: string): { score: number; hits: string[] } {
      const cleanText = cleanHtmlFormatting(text);
      const normalized = removeAccents(cleanText);
      const hits: string[] = [];

      let score = 0;

      for (const term of expandedTerms) {
        if (normalized.includes(term)) {
          score += 4;
          if (hits.length < 8) hits.push(term);
        }
      }

      if (normativeRegex.test(cleanText)) score += 8;
      if (adminNoiseRegex.test(cleanText)) score -= 18;

      if (isHeightQuery) {
        if (heightTerms.test(cleanText)) score += 10;
        if (/(altura\s+m[aá]xima|cércea|cercea|gabarito)/i.test(cleanText)) score += 10;
        if (/(altura\s+m[ií]nima|pé[-\s]?direito\s+m[ií]nimo)/i.test(cleanText)) score += 5;
      }

      if (wantsMaximum) {
        if (/(m[aá]xima|maxim|não exceder|nao exceder|n[aã]o poder[aá] exceder)/i.test(cleanText)) score += 12;
        if (/(m[ií]nima|minim)/i.test(cleanText) && !/(m[aá]xima|maxim)/i.test(cleanText)) score -= 10;
      }
      if (wantsMinimum) {
        if (/(m[ií]nima|minim)/i.test(cleanText)) score += 12;
        if (/(m[aá]xima|maxim)/i.test(cleanText) && !/(m[ií]nima|minim)/i.test(cleanText)) score -= 10;
      }

      if (isLimitIntent) {
        if (/\d/.test(normalized)) score += 6;
        if (/%/.test(normalized)) score += 3;
        if (!/\d/.test(normalized) && !/(m[aá]xima|maxim|m[ií]nima|minim|limite|não exceder|nao exceder|n[aã]o poder[aá] exceder)/i.test(cleanText)) {
          score -= 12;
        }
      }

      return { score, hits };
    }

    type DeterministicCandidate = { id: string; articleIndex: number; score: number; reasoning: string };
    const candidates: DeterministicCandidate[] = [];

    normsToProcess.forEach((norm) => {
      const articles = articlesByNormId.get(String(norm.id));
      if (!articles || articles.length <= 1) return;

      for (let articleIndex = 1; articleIndex < articles.length; articleIndex++) {
        const articleText = articles[articleIndex]?.text || '';
        if (!isArticleAcceptable(articleText)) continue;

        const { score, hits } = scoreArticle(articleText);
        if (score < 12) continue;

        candidates.push({
          id: String(norm.id),
          articleIndex,
          score,
          reasoning: hits.slice(0, 6).join(', '),
        });
      }
    });

    if (candidates.length === 0) {
      console.warn('[searchNormsSemantic] Nenhum artigo relevante encontrado na etapa 2 determinística, usando fallback textual...');
      const fallbackResults = await fallbackTextualSearch(norms, query, limit);
      const processedResults = await postProcessSearchResults(fallbackResults, query, queryInterpretation.intent);
      if (cacheKey) {
        setCachedSearch(cacheKey, processedResults);
      }
      return processedResults;
    }

    const perNormTop = new Map<string, DeterministicCandidate[]>();
    for (const c of candidates.sort((a, b) => b.score - a.score)) {
      const list = perNormTop.get(c.id) || [];
      if (list.length >= 3) continue;
      list.push(c);
      perNormTop.set(c.id, list);
    }

    const flattened = Array.from(perNormTop.values())
      .flatMap((list) => {
        if (list.length <= 1) return list;
        const best = list[0].score;
        const cutoff = Math.max(12, Math.floor(best * 0.65));
        return list.filter((c) => c.score >= cutoff);
      })
      .sort((a, b) => b.score - a.score);
    const maxScore = Math.max(...flattened.map((c) => c.score), 1);

    const aiResults: Array<{
      id: string;
      reasoning: string;
      relevanceScore: number;
      excerpt?: string;
      artigo?: string;
      capitulo?: string;
      titulo?: string;
      articleIndex?: number;
    }> = flattened.slice(0, Math.max(1, limit)).map((c) => {
      const normalized = Math.min(0.99, 0.6 + 0.39 * (c.score / maxScore));
      return {
        id: c.id,
        reasoning: c.reasoning || 'Seleção determinística por termos e padrão normativo.',
        relevanceScore: normalized,
        articleIndex: c.articleIndex,
      };
    });

    console.log('[searchNormsSemantic] Etapa 2: artigos selecionados:', aiResults.length);

    // If AI returns no results, fallback to textual search
    if (aiResults.length === 0) {
      console.warn('[searchNormsSemantic] Nenhum resultado encontrado na etapa 2, usando fallback textual...');
      const fallbackResults = await fallbackTextualSearch(norms, query, limit);
      const processedResults = await postProcessSearchResults(fallbackResults, query, queryInterpretation.intent);
      if (cacheKey) {
        setCachedSearch(cacheKey, processedResults);
      }
      return processedResults;
    }

    // Normalize articleIndex to number
    aiResults.forEach((r) => {
      r.articleIndex = r.articleIndex !== undefined ? Number(r.articleIndex) : undefined;
    });

    // Map AI results to SearchResult format
    // Build excerpt from pre-split articles whenever articleIndex is available
    const MIN_EXCERPT_LENGTH = 50;

    function excerptMatchesQuery(excerpt: string, query: string, relevanceScore: number): boolean {
      const cleanExcerpt = cleanHtmlFormatting(excerpt).toLowerCase();
      if (!cleanExcerpt) return false;

      // If AI is extremely confident, trust it more
      if (relevanceScore >= 0.9) return true;

      const searchTerms = new Set<string>([
        ...processSearchQuery(query).filter((t) => t.length >= 3),
        ...(query.toLowerCase().match(/\b[\p{L}0-9]{3,}\b/gu) || []),
      ]);

      // Also match numbers specifically
      const queryNumbers: string[] = query.match(/\d+/g) ?? [];
      const excerptNumbers: string[] = cleanExcerpt.match(/\d+/g) ?? [];
      
      for (const num of queryNumbers) {
        if (excerptNumbers.includes(num)) return true;
      }

      for (const term of searchTerms) {
        if (cleanExcerpt.includes(term)) return true;
      }
      return false;
    }

    const validAiResults = aiResults.filter((r) => {
      if (typeof r.relevanceScore !== 'number' || Number.isNaN(r.relevanceScore) || r.relevanceScore < 0.6) {
        return false;
      }

      const articles = articlesByNormId.get(String(r.id));
      const articleIndex = Number.isInteger(r.articleIndex) ? Number(r.articleIndex) : undefined;
      const hasValidArticleIndex = articleIndex !== undefined && articleIndex > 0 && articles && !!articles[articleIndex];
      if (hasValidArticleIndex) {
        r.excerpt = articles[articleIndex].text;
        if (!r.excerpt || r.excerpt.trim().length < MIN_EXCERPT_LENGTH) return false;
        return excerptMatchesQuery(r.excerpt, cleanedQuery, r.relevanceScore);
      }

      // If there is no valid articleIndex, reject the result to avoid invented mappings
      return false;
    });
    
    console.log('[searchNormsSemantic] Resultados válidos com excerpt:', validAiResults.length);
    
    // If no valid excerpts, use fallback
    if (validAiResults.length === 0) {
      console.warn('[searchNormsSemantic] IA retornou resultados sem excerpts válidos, usando fallback...');
      const fallbackResults = await fallbackTextualSearch(norms, query, limit);
      const processedResults = await postProcessSearchResults(fallbackResults, query, queryInterpretation.intent);
      if (cacheKey) {
        setCachedSearch(cacheKey, processedResults);
      }
      return processedResults;
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

        // If articleIndex is valid, excerpt is already the full literal article text from pre-split data
        let excerpt = aiResult.excerpt?.trim() || '';
        const hasArticleIndex = aiResult.articleIndex !== undefined && aiResult.articleIndex > 0;
        if (!hasArticleIndex && excerpt.length > 500) {
          const normFull = String(norm.content || '');
          excerpt = extractBestSnippet(normFull, cleanedQuery, 500);
        }
        
        const contentText = cleanHtmlFormatting(String(norm.content || ''));
        // Try parsing from AI returned fields first, fallback to regex
        const hierarchy = {
          titulo: aiResult.titulo || undefined,
          capitulo: aiResult.capitulo || undefined,
          artigo: aiResult.artigo || undefined,
          ...parseHierarchyFromText(excerpt, contentText)
        };
        // Prefer AI explicitly returned fields if available to avoid overriding with undefined
        if (aiResult.titulo) hierarchy.titulo = aiResult.titulo;
        if (aiResult.capitulo) hierarchy.capitulo = aiResult.capitulo;
        if (aiResult.artigo) hierarchy.artigo = aiResult.artigo;
        
        console.log('[searchNormsSemantic] Hierarchy extraction:', {
          normId: String(norm.id).substring(0, 8),
          hasCapitulo: !!hierarchy.capitulo,
          hasArtigo: !!hierarchy.artigo,
          capitulo: hierarchy.capitulo?.substring(0, 30),
          artigo: hierarchy.artigo?.substring(0, 30),
        });
        
        return {
          sectionId: uniqueSectionId,
          normId: String(norm.id),
          normCode: (norm.code as string) || '',
          normTitle: (norm.title as string) || '',
          normCountry: countryName,
          sectionType: hierarchy.artigo ? 'artigo' : (hierarchy.capitulo ? 'capitulo' : 'norma'),
          sectionNumber: hierarchy.artigo || hierarchy.paragrafo || null,
          sectionTitle: hierarchy.capitulo || null,
          content: excerpt, 
          similarity: aiResult.relevanceScore || 0.5,
          decree: undefined,
          regulationNumber: undefined,
          excerpt: excerpt,
          fullArticleContent: excerpt,
          // Spreading all hierarchy fields (titulo, capitulo, artigo, etc.)
          ...hierarchy
        };
      })
      .filter((r) => r !== null) as SearchResult[];

    const processedResults = await postProcessSearchResults(results, query, queryInterpretation.intent);

    // Cache the results
    setCachedSearch(cacheKey, processedResults);
    console.log('[Cache] Set semantic search results:', cacheKey);

    // Record search for rate limiting (by IP)
    try {
      const supabase = await getAuthenticatedSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      await recordSearch(clientIp, 'semantic', query, country, user?.id);
    } catch (err) {
      console.warn('[searchNormsSemantic] Erro ao registrar busca:', err);
    }

    return processedResults;
  } catch {
    console.error('[searchNormsSemantic] Ocorreu um erro interno na IA');
    
    // Fallback to textual search on any error
    console.warn('[searchNormsSemantic] Erro na IA, usando fallback textual...');
    // Record the search even on fallback so rate limit is enforced
    try {
      await recordSearch(clientIp, 'semantic', query, country, userId);
    } catch (fallbackErr) {
      console.warn('[searchNormsSemantic] Erro ao registrar busca (fallback):', fallbackErr);
    }
    const fallbackResults = await fallbackTextualSearch(norms, query, limit);
    const processedResults = await postProcessSearchResults(fallbackResults, query, queryInterpretation.intent);
    if (cacheKey) {
      setCachedSearch(cacheKey, processedResults);
    }
    return processedResults;
  }
}


function findBestMatchingArticle(
  excerpt: string,
  hierarchyArtigo: string | undefined,
  articles: Array<{ id: string; section_number: string; content: string }>
): string | null {
  if (!articles || articles.length === 0) return null;

  // 1. Try match by article number
  if (hierarchyArtigo) {
    const numMatch = hierarchyArtigo.match(/\d+/);
    if (numMatch) {
      const artNum = numMatch[0];
      const found = articles.find(a => a.section_number === artNum);
      if (found) return found.content;
    }
  }

  // 2. Try match by excerpt containment
  const cleanExcerpt = excerpt.replace(/^\.\.\.|\.\.\.$/g, '').trim().toLowerCase();
  if (cleanExcerpt.length > 10) {
    const found = articles.find(a => a.content.toLowerCase().includes(cleanExcerpt));
    if (found) return found.content;

    // Fuzzy: check word overlap or substring
    const words = cleanExcerpt.split(/\s+/).filter(w => w.length > 4);
    if (words.length > 0) {
      let bestArt: typeof articles[0] | null = null;
      let maxMatches = 0;
      for (const art of articles) {
        const artContentLower = art.content.toLowerCase();
        let matches = 0;
        for (const w of words) {
          if (artContentLower.includes(w)) matches++;
        }
        if (matches > maxMatches) {
          maxMatches = matches;
          bestArt = art;
        }
      }
      if (bestArt && maxMatches >= words.length / 2) {
        return bestArt.content;
      }
    }
  }

  return null;
}

export async function extractAnswerFromArticle(
  query: string,
  articleContent: string,
  apiKey: string
): Promise<string | null> {
  if (!apiKey || apiKey.length < 10) return null;

  // Cache key based on query and hashed/shortened article content
  const articleKey = articleContent.substring(0, 200).replace(/[^a-zA-Z0-9]/g, '');
  const cacheKey = `answer:${query.toLowerCase().trim()}:${articleKey}`;
  const cached = getCachedSearch<string | null>(cacheKey);
  if (cached !== undefined) {
    console.log('[Cache] Hit for extractAnswerFromArticle:', cacheKey);
    return cached;
  }

  try {
    const openRouter = new OpenRouterClient(apiKey);
    const prompt = `Você é um especialista em normas técnicas arquitetônicas. Sua tarefa é responder à pergunta do usuário usando APENAS as informações presentes no artigo fornecido.

Pergunta: "${query}"

Artigo:
"""
${articleContent}
"""

INSTRUÇÕES:
1. Se o artigo contiver a resposta direta para a pergunta (especialmente limites, valores, dimensões, recuos, exigências), extraia a resposta de forma clara, direta e objetiva em português (ex: "A altura máxima permitida é de 25 metros").
2. Seja extremamente conciso. Responda em apenas uma frase direta, se possível.
3. Se o artigo NÃO contiver a resposta para a pergunta, responda apenas com "N/A".
4. NUNCA invente informações. Use apenas o que está escrito no artigo.`;

    const messages: OpenRouterMessage[] = [{ role: 'user', content: prompt }];
    const response = await openRouter.chatCompletion(
      messages,
      'anthropic/claude-3.5-haiku',
      0.3
    );

    const answer = response.choices[0]?.message?.content?.trim() || '';
    
    if (!answer || answer.toUpperCase().startsWith('N/A') || answer.toUpperCase().trim() === 'N/A' || NEGATIVE_ANSWER_PATTERNS.some(p => p.test(answer))) {
      setCachedSearch(cacheKey, null, 1800); // cache negative results for 30 minutes
      return null;
    }

    setCachedSearch(cacheKey, answer, 1800); // cache positive results for 30 minutes
    return answer;
  } catch (error) {
    console.error('[extractAnswerFromArticle] Erro ao extrair resposta:', error);
    return null;
  }
}

const NEGATIVE_ANSWER_PATTERNS = [
  /n[aã]o\s+especifica/i, /n[aã]o\s+define/i, /n[aã]o\s+menciona/i,
  /n[aã]o\s+indica/i, /n[aã]o\s+estabelece/i, /n[aã]o\s+cont[eé]m/i,
  /n[aã]o\s+fornece/i, /n[aã]o\s+apresenta/i, /n[aã]o\s+h[aá]/i,
  /n[aã]o\s+(cont[eé]m|traz|d[aá])/i, /n\s*\/\s*a/i, /n\.\s*a/i,
  /sem\s+(informa[cç][aã]o|men[cç][aã]o|especifica[cç][aã]o|indica[cç][aã]o|refer[aê]ncia)/i,
  /cabe\s+ao\s+(plano|regulamento|munic[ií]pio|concelho)/i,
  /compete\s+ao\s+(plano|regulamento|munic[ií]pio|concelho)/i,
  /ser[aá]\s+definido/i, /ser[aã]o\s+definidos/i,
  /a\s+definir/i, /a\s+estabelecer/i, /remete\s+para/i,
];

async function postProcessSearchResults(
  results: SearchResult[],
  query: string,
  intent: string
): Promise<SearchResult[]> {
  if (results.length === 0) return results;

  console.log(`[postProcessSearchResults] Extracting answers for query "${query}" (intent: ${intent})`);

  // Extract answers from top 10 results to ensure we don't miss any great matches
  const topResults = results.slice(0, 10);
  const remainingResults = results.slice(10);

  const processedTop = await Promise.all(
    topResults.map(async (res) => {
      const articleContent = res.fullArticleContent || res.content;
      const answer = await extractAnswerFromArticle(query, articleContent, apiKey);
      return {
        ...res,
        extractedAnswer: answer,
        fullArticleContent: articleContent
      };
    })
  );

  // Filter out results where the extracted answer says "não especifica", "N/A", etc.
  const filteredProcessedTop = processedTop.filter((res) => {
    if (!res.extractedAnswer) return true;
    const answerLower = res.extractedAnswer.toLowerCase();
    return !NEGATIVE_ANSWER_PATTERNS.some((p) => p.test(answerLower));
  });
  if (filteredProcessedTop.length < processedTop.length) {
    console.log(`[postProcessSearchResults] Filtered out ${processedTop.length - filteredProcessedTop.length} results with non-direct answers`);
  }

  const allProcessed = [...filteredProcessedTop, ...remainingResults.map(res => ({
    ...res,
    fullArticleContent: res.fullArticleContent || res.content
  }))];

  // Strong heuristic ranking prioritizing direct answers
  const rankedHeuristic = allProcessed
    .map((res) => {
      let score = res.similarity;
      
      // MAJOR boost for results that have a direct extracted answer!
      if (res.extractedAnswer) {
        score += 0.6; // Big boost!
        if (/\d+/.test(res.extractedAnswer)) { // Extra boost for numerical limits/values (super relevant for norms)
          score += 0.2;
        }
        // Check if answer mentions units (m, m², %, km/h etc.) which are typical for norm requirements
        if (/\b(m|m²|m³|%|km\/h|kg|ton|cm|mm)\b/.test(res.extractedAnswer)) {
          score += 0.1;
        }
      }
      
      return { res, score };
    })
    .sort((a, b) => b.score - a.score)
    .map(({ res }) => res);

  // Final AI Re-ranking, with an improved prompt focused on direct answers
  try {
    if (apiKey && apiKey.length > 10 && rankedHeuristic.length > 1) {
      console.log(`[postProcessSearchResults] Performing AI re-ranking for top ${Math.min(10, rankedHeuristic.length)} results...`);
      return await rankResultsWithAI(rankedHeuristic, query, apiKey);
    }
  } catch (err) {
    console.warn('[postProcessSearchResults] AI re-ranking failed, using heuristic order:', err);
  }

  return rankedHeuristic;
}

/**
 * Uses AI to re-rank the top search results based on semantic relevance to the user's query.
 */
async function rankResultsWithAI(
  results: SearchResult[],
  query: string,
  apiKey: string
): Promise<SearchResult[]> {
  if (results.length <= 1 || !apiKey) return results;

  // We only re-rank the top 10 results to keep it fast and focused
  const candidates = results.slice(0, 10);
  const remaining = results.slice(10);

  try {
    const openRouter = new OpenRouterClient(apiKey);
    
    const formattedCandidates = candidates.map((r, i) => ({
      index: i,
      id: r.sectionId,
      norm: `${r.normCode} - ${r.normTitle}`,
      content: r.content.substring(0, 500), // Give enough context for ranking
      hasExtractedAnswer: !!r.extractedAnswer,
      extractedAnswer: r.extractedAnswer // Include the extracted answer in the prompt!
    }));

    const prompt = `Você é um especialista jurídico e arquitetônico. Sua tarefa é reordenar os trechos de normas abaixo por ordem de relevância direta para a pesquisa do usuário.

PESQUISA DO USUÁRIO: "${query}"

TRECHOS CANDIDATOS:
${JSON.stringify(formattedCandidates, null, 2)}

INSTRUÇÕES CRÍTICAS:
1. COLOQUE EM PRIMEIRO LUGAR OS TRECHOS QUE TÊM RESPOSTA DIRETA (campo "extractedAnswer" não vazio)! Esses são os mais relevantes!
2. Dentro dos trechos com resposta direta, priorize respostas que incluem valores numéricos, limites, unidades de medida (m, m², %, cm, etc.).
3. Avalie quão bem cada trecho responde diretamente à pergunta ou necessidade do usuário.
4. Priorize trechos que contenham regras claras ou definições específicas solicitadas.
5. Ignore trechos puramente administrativos se a pergunta for técnica.
6. Retorne APENAS um array JSON com os IDs (sectionId) na ordem decrescente de relevância.

EXEMPLO DE RESPOSTA:
["id-5", "id-2", "id-8", ...]`;

    const messages: OpenRouterMessage[] = [{ role: 'user', content: prompt }];
    
    const response = await openRouter.chatCompletion(
      messages,
      'anthropic/claude-3.5-haiku',
      0.1, // Low temperature for deterministic ranking
      { type: 'json_object' }
    );

    const rawContent = response.choices[0]?.message?.content || '[]';
    const rankedIds = JSON.parse(extractJSON(rawContent));

    if (Array.isArray(rankedIds) && rankedIds.length > 0) {
      const rankedResults: SearchResult[] = [];
      const foundIds = new Set<string>();

      // Add ranked results in order
      for (const id of rankedIds) {
        const match = candidates.find(c => c.sectionId === id);
        if (match && !foundIds.has(id)) {
          rankedResults.push(match);
          foundIds.add(id);
        }
      }

      // Add any candidates that the AI might have missed
      for (const c of candidates) {
        if (!foundIds.has(c.sectionId)) {
          rankedResults.push(c);
        }
      }

      console.log(`[rankResultsWithAI] Successfully re-ranked ${rankedResults.length} candidates`);
      return [...rankedResults, ...remaining];
    }
  } catch (error) {
    console.error('[rankResultsWithAI] Error during AI re-ranking:', error);
  }

  return results;
}

// Fallback textual search function
async function fallbackTextualSearch(norms: Array<Record<string, unknown>>, query: string, limit: number): Promise<SearchResult[]> {
  const queryLower = cleanHtmlFormatting(query).toLowerCase();
  
  // Use processSearchQuery to expand terms with synonyms for better matching
  const searchTokens = processSearchQuery(query);
  
  const scored = norms.map((norm) => {
    let score = 0;
    const code = cleanHtmlFormatting(String(norm.code || '')).toLowerCase();
    const title = cleanHtmlFormatting(String(norm.title || '')).toLowerCase();
    const description = cleanHtmlFormatting(String(norm.description || '')).toLowerCase();
    const content = cleanHtmlFormatting(String(norm.content || '')).toLowerCase();
    const keywords = ((norm.keywords as string[]) || []).map(k => k.toLowerCase());
    
    // Original query matching (higher weight)
    if (code.includes(queryLower)) score += 10;
    if (title.includes(queryLower)) score += 8;
    if (description.includes(queryLower)) score += 4;
    if (content.includes(queryLower)) score += 3;
    if (keywords.some(k => k.includes(queryLower))) score += 5;
    
    // Expanded tokens matching (lower weight but helps with semantic matching)
    searchTokens.forEach((token: string) => {
      if (code.includes(token)) score += 5;
      if (title.includes(token)) score += 4;
      if (description.includes(token)) score += 2;
      if (content.includes(token)) score += 1.5;
      if (keywords.some(k => k.includes(token))) score += 3;
    });
    
    return { norm, score };
  }).filter(item => item.score > 0);
  
  const normIds = [...new Set(scored.map(item => String(item.norm.id)))];
  const supabase = await getAuthenticatedSupabaseClient();
  const { data: allArticles } = await supabase
    .from('norm_sections')
    .select('id, norm_id, section_number, content')
    .in('norm_id', normIds)
    .eq('section_type', 'artigo');

  const articlesByNorm = new Map<string, Array<{ id: string; section_number: string; content: string }>>();
  if (allArticles) {
    for (const art of allArticles) {
      const list = articlesByNorm.get(String(art.norm_id)) || [];
      list.push({ id: String(art.id), section_number: String(art.section_number || ''), content: art.content || '' });
      articlesByNorm.set(String(art.norm_id), list);
    }
  }

  // Flatten: each norm can produce multiple excerpts (one SearchResult per excerpt)
  const results: SearchResult[] = scored
    .sort((a, b) => b.score - a.score)
    .flatMap((item, normIndex) => {
      // Extract country name from joined countries data
      const countryData = item.norm.countries as { name?: string } | undefined;
      const countryName = countryData?.name || '';
      // Find ALL relevant excerpts from this norm's content
      const rawContent = ((item.norm.content as string) || '') + ' ' + ((item.norm.description as string) || '');
      const fullContent = cleanHtmlFormatting(rawContent);
      const excerpts = extractAllSnippets(fullContent, query, 500, 5);

      if (excerpts.length === 0) {
        console.log('[fallbackTextualSearch] No excerpts found for norm:', item.norm.code);
        return [];
      }

      console.log('[fallbackTextualSearch] Found', excerpts.length, 'excerpts for norm:', item.norm.code);

      const normArticles = articlesByNorm.get(String(item.norm.id)) || [];

      return excerpts.map((excerpt, excerptIndex) => {
        const parsedHierarchy = parseHierarchyFromText(excerpt, fullContent);
        const fullArticleContent = findBestMatchingArticle(excerpt, parsedHierarchy.artigo, normArticles) || excerpt;

        return {
          sectionId: `${String(item.norm.id)}-${normIndex}-${excerptIndex}`,
          normId: String(item.norm.id),
          normCode: (item.norm.code as string) || '',
          normTitle: (item.norm.title as string) || '',
          normCountry: countryName,
          sectionType: 'norma',
          sectionNumber: null,
          sectionTitle: null,
          content: excerpt,
          similarity: item.score / 10,
          decree: undefined,
          regulationNumber: undefined,
          excerpt: excerpt,
          fullArticleContent,
          ...parsedHierarchy,
        };
      });
    });
  
  return results.slice(0, Math.max(1, limit));
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
    console.error('[deleteNormServer] Ocorreu um erro interno ao excluir a norma');
    throw new Error('Falha ao excluir norma');
  }

  console.log('[deleteNormServer] ✓ Norma deletada:', id);
}

export async function generateNormSummaryServer(normId: string): Promise<string> {
  const supabase = getAdminSupabaseClient();
  const { data: norm, error: normError } = await supabase
    .from('norms')
    .select('id, code, title, content')
    .eq('id', normId)
    .single();

  if (normError || !norm) {
    throw new Error('Norma não encontrada');
  }

  let fullContent = norm.content || '';

  if (!fullContent || fullContent.length < 100) {
    const { data: sections } = await supabase
      .from('norm_sections')
      .select('content')
      .eq('norm_id', normId);
    if (sections) {
      fullContent = sections.map(s => s.content).join('\n\n');
    }
  }

  if (!fullContent || fullContent.length < 100) {
    throw new Error('A norma não possui conteúdo suficiente para gerar um resumo');
  }

  const cleanedContent = fullContent.replace(/<[^>]*>/g, '').substring(0, 15000);

  const summaryPrompt = `Você é um especialista em normas arquitetônicas.

Leia o seguinte documento completo e crie um resumo detalhado descrevendo o que cada artigo/capítulo fala.

Código da Norma: ${norm.code}
Título: ${norm.title}

Conteúdo:
${cleanedContent}

INSTRUÇÕES:
1. Leia todo o documento
2. Identifique a estrutura (capítulos, artigos, parágrafos)
3. Para cada artigo/capítulo, descreva brevemente o que ele trata
4. Formate o resumo de forma clara e organizada
5. Retorne APENAS o resumo, sem introduções ou conclusões extras`;

  if (!apiKey || apiKey.length < 10) {
     throw new Error('API Key não configurada no servidor');
  }

  const summaryResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://arquiv.org',
    },
    body: JSON.stringify({
      model: 'anthropic/claude-3.5-haiku',
      messages: [{ role: 'user', content: summaryPrompt }],
      temperature: 0.3,
      max_tokens: 2000,
    }),
  });

  if (!summaryResponse.ok) {
    const errorText = await summaryResponse.text();
    console.error('[generateNormSummaryServer] OpenRouter Error:', {
      status: summaryResponse.status,
      error: errorText
    });
    throw new Error(`Falha na API de IA (${summaryResponse.status}): ${errorText.substring(0, 100)}`);
  }

  const summaryData = await summaryResponse.json();
  const summaryText = summaryData.choices?.[0]?.message?.content || '';

  if (!summaryText) {
    throw new Error('A API retornou um resumo vazio');
  }

  const { error: insertError } = await supabase
    .from('summaries')
    .upsert({
      norm_id: normId,
      summary: summaryText.trim(),
    }, {
      onConflict: 'norm_id',
    });

  if (insertError) {
    throw new Error('Falha ao salvar o resumo no banco de dados');
  }

  return summaryText.trim();
}
