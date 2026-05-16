'use server';

import { getAuthenticatedSupabaseClient, getAdminSupabaseClient } from '@/lib/supabase-server';
import { submitNormForIndexing } from './seo-actions';
import { getCachedSearch, setCachedSearch, generateSearchCacheKey } from '@/lib/cache';
import { analyzeDocumentStructure, chunkDocument, generateSectionEmbeddings } from '@/lib/semantic-search';
import { checkRateLimit, recordSearch } from '@/lib/rate-limit';
import { headers } from 'next/headers';
import OpenRouterClient, { OpenRouterMessage } from '@/lib/openrouter';

const apiKey = process.env.OPENROUTER_API_KEY || process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || '';

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

    const response = await openRouter.chatCompletion(messages, "anthropic/claude-3.5-haiku", 0.3, {
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
    let summaryGenerated = false;
    const contentToSummarize = formData.content || '';
    // Clean HTML before checking length
    const cleanedContent = cleanHtmlFormatting(contentToSummarize);
    console.log(`[processAndUploadNorm] Summary check: originalLength=${contentToSummarize.length}, cleanedLength=${cleanedContent.length}, apiKeyConfigured=${!!apiKey && apiKey.length > 10}`);
    console.log(`[processAndUploadNorm] API Key value: ${apiKey ? apiKey.substring(0, 10) + '...' : 'NOT SET'}`);

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
            model: 'anthropic/claude-3.5-haiku',
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
              summaryGenerated = true;
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

    if (isAdmin) {
      console.log('[processAndUploadNorm] Admin check passed');
    }

    console.log(`[processAndUploadNorm] === SUCESSO ===`);

    return {
      normId,
      sectionsCreated,
      embeddingsGenerated,
    };
  } catch (error: unknown) {
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

// Helper to find chapter/article in the text BEFORE a specific excerpt
function findHierarchyBeforeExcerpt(excerpt: string, fullText: string, contextSize: number = 5000): { chapter?: string; article?: string; paragraph?: string } {
  const out: { chapter?: string; article?: string; paragraph?: string } = {};

  if (!fullText || !excerpt) return out;

  // Try to find the excerpt in the full text
  let excerptStart = fullText.indexOf(excerpt);
  
  // If exact match not found, try with normalized whitespace
  if (excerptStart === -1) {
    const normalizedExcerpt = excerpt.replace(/\s+/g, ' ').trim();
    const normalizedFullText = fullText.replace(/\s+/g, ' ');
    excerptStart = normalizedFullText.indexOf(normalizedExcerpt);
    
    // If still not found, try to find first few words of excerpt
    if (excerptStart === -1) {
      const firstWords = normalizedExcerpt.split(' ').slice(0, 5).join(' ');
      excerptStart = normalizedFullText.indexOf(firstWords);
    }
  }
  
  // If we still can't find it, try to find a long enough substring
  if (excerptStart === -1) {
    const middlePart = excerpt.substring(Math.floor(excerpt.length / 4), Math.floor(excerpt.length * 3 / 4)).trim();
    if (middlePart.length > 20) {
      excerptStart = fullText.indexOf(middlePart);
    }
  }

  if (excerptStart === -1) {
    return out;
  }
  
  // Get context BEFORE the excerpt
  const contextStart = Math.max(0, excerptStart - contextSize);
  const contextBefore = fullText.substring(contextStart, excerptStart);
  
  // Find LAST chapter in context before excerpt
  const allChapterMatches = Array.from(
    contextBefore.matchAll(
      /(?:CAPÍTULO|Capítulo|CAP\.?|SEÇÃO|Seçã?o|SE[CÇ][ÃA]O|Seção|SEÇÃO|Chapter|CHAPTER)\s+(?:[IVXLCivxlc]+|\d+(?:º)?|\d+)/gi
    )
  );
  if (allChapterMatches.length > 0) {
    out.chapter = allChapterMatches[allChapterMatches.length - 1][0].trim();
  }
  
  // Find LAST article in context before excerpt
  const allArticleMatches = Array.from(
    contextBefore.matchAll(/(?:Art\.?|Artigo|ART|Article|ARTICLE)\s+(?:nº|n°)?\s*\d+(?:º|ª)?(?:\s*[-–—]\s*[A-Za-z])?/gi)
  );
  if (allArticleMatches.length > 0) {
    out.article = allArticleMatches[allArticleMatches.length - 1][0].trim();
  }
  
  // Find LAST paragraph in context before excerpt
  const allParagraphMatches = Array.from(
    contextBefore.matchAll(
      /(?:§|Parágrafo|Párrafo|Par\.?|Paragraph|PARAGRAPH)\s+(?:nº|n°)?\s*(?:único|única|\d+(?:º)?)|(?:Inciso|INCISO|Alínea|ALINEA)\s+[A-Za-z0-9]+/gi
    )
  );
  if (allParagraphMatches.length > 0) {
    out.paragraph = allParagraphMatches[allParagraphMatches.length - 1][0].trim();
  }
  
  return out;
}

// Helper to extract context before a specific text position in full document
function findContextBeforeExcerpt(excerpt: string, fullText: string, contextChars: number = 2000): string {
  const excerptStart = fullText.indexOf(excerpt);
  if (excerptStart === -1) return excerpt; // Excerpt not found in full text, return excerpt only
  
  const contextStart = Math.max(0, excerptStart - contextChars);
  return fullText.substring(contextStart, excerptStart + excerpt.length);
}

// Top-level helper to infer chapter/article/paragraph from a text snippet or full document
function parseHierarchyFromText(excerpt: string, fullText?: string) {
  const out: { chapter?: string; article?: string; paragraph?: string } = {};

  console.log('[parseHierarchyFromText] Starting:', {
    excerptLength: excerpt?.length,
    fullTextLength: fullText?.length,
    hasFullText: !!fullText,
  });

  // If we have full text, use the context-aware search
  if (fullText && fullText.length > 0) {
    const hierarchyFromContext = findHierarchyBeforeExcerpt(excerpt, fullText, 5000);
    console.log('[parseHierarchyFromText] Result from context search:', hierarchyFromContext);
    
    if (hierarchyFromContext.chapter || hierarchyFromContext.article || hierarchyFromContext.paragraph) {
      console.log('[parseHierarchyFromText] Returning context-based hierarchy');
      return hierarchyFromContext;
    }
    
    // If context search failed, don't use full document fallback as it's often wrong
    // Instead, fall through to search within the excerpt itself
    console.log('[parseHierarchyFromText] Context search empty, falling through to excerpt search...');
  }

  // Helper to extract value safely
  const extractValue = (regex: RegExp, text: string): string | undefined => {
    const match = text.match(regex);
    return match ? match[0].trim() : undefined;
  };

  // Fallback: Search within the excerpt itself
  console.log('[parseHierarchyFromText] Fallback to excerpt-only search');
  
  // CHAPTER patterns: "CAPÍTULO I", "Cap. 2", "SEÇÃO II", "Seção 3", etc.
  let chapter = extractValue(
    /(?:CAPÍTULO|Capítulo|CAP\.?|SEÇÃO|Seçã?o|SE[CÇ][ÃA]O|Seção|SEÇÃO|Chapter|CHAPTER)\s+(?:[IVXLCivxlc]+|\d+(?:º)?|\d+)/i,
    excerpt
  );
  if (chapter) out.chapter = chapter;

  // ARTICLE patterns: "Art. 5", "Art. 5º", "Artigo 5", "Artigo 10º", "Article 5", etc.
  let article = extractValue(
    /(?:Art\.?|Artigo|ART|Article|ARTICLE)\s+(?:nº|n°)?\s*\d+(?:º|ª)?(?:\s*[-–—]\s*[A-Za-z])?/i,
    excerpt
  );
  if (article) out.article = article;

  // PARAGRAPH patterns: "§ 1º", "Parágrafo único", "Parágrafo 2º", "Inciso I", "Alínea a", etc.
  let paragraph = extractValue(
    /(?:§|Parágrafo|Párrafo|Par\.?|Paragraph|PARAGRAPH)\s+(?:nº|n°)?\s*(?:único|única|\d+(?:º)?)|(?:Inciso|INCISO|Alínea|ALINEA)\s+[A-Za-z0-9]+/i,
    excerpt
  );
  if (paragraph) out.paragraph = paragraph;

  console.log('[parseHierarchyFromText] Final result:', out);
  return out;
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

  // Get IP from headers
  const getIp = async (): Promise<string> => {
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] || 
               headersList.get('x-real-ip') || 
               'unknown';
    return ip.trim();
  };

  const clientIp = await getIp();

  // Get authenticated user ID if available
  let userId: string | undefined;
  try {
    const supabaseAuth = await getAuthenticatedSupabaseClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();
    userId = user?.id;
  } catch (err) {
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

    // Prepare summaries for AI (only id, code, title, description - no content)
    const summariesForAI = norms.map((norm) => ({
      id: norm.id,
      code: cleanHtmlFormatting(String(norm.code || "")),
      title: cleanHtmlFormatting(String(norm.title || "")),
      description: cleanHtmlFormatting(String(norm.description || "")),
    }));

    // Call AI to identify relevant norms based on summaries
    const summaryPrompt = `Você é um especialista em normas arquitetônicas.

Consulta: "${cleanedQuery}" | País: ${country || 'Todos'}

Resumos das normas disponíveis (${summariesForAI.length}):
${JSON.stringify(summariesForAI, null, 2)}

INSTRUÇÕES:
1. Leia a CONSULTA do usuário: "${cleanedQuery}"
2. Analise os RESUMOS das normas
3. Identifique quais normas são RELEVANTES para a consulta
4. Uma norma é relevante se o resumo mencionar tópicos relacionados à consulta
5. Retorne APENAS os IDs das normas relevantes em formato JSON array
6. Se nenhuma norma for relevante, retorne array vazio []
7. NÃO inclua explicações, apenas os IDs

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
    console.log('[searchNormsSemantic] === ETAPA 2: Extração de trechos ===');

    // Prepare full content for AI (no character limit)
    const normsForAI = normsToProcess.map((norm) => ({
      id: norm.id,
      code: cleanHtmlFormatting(String(norm.code || "")),
      title: cleanHtmlFormatting(String(norm.title || "")),
      content: cleanHtmlFormatting(String(norm.content || "")),
      keywords: (norm.keywords as string[]) || [],
    }));

    // Call AI to extract specific excerpts from full content
    const messages: Array<{ role: string; content: string }> = [
      {
        role: "user",
        content: `Você é um especialista em normas arquitetônicas.

Consulta: "${cleanedQuery}" | País: ${country || 'Todos'}

Normas para análise (${normsForAI.length}):
${JSON.stringify(normsForAI, null, 2)}

INSTRUÇÕES CRÍTICAS:
1. Leia a CONSULTA do usuário: "${cleanedQuery}"
2. Leia o CONTEÚDO COMPLETO de cada norma
3. Encontre TODOS os trechos que respondem DIRETAMENTE à consulta
4. Extraia trechos específicos com localização exata (artigo, capítulo, parágrafo)
5. O campo "excerpt" DEVE conter o trecho específico:
   - 300-500 caracteres no máximo
   - Inclua identificadores quando possível (Ex: "Art. 5º - Altura máxima: ...")
6. Como encontrar o trecho correto:
   - Procure palavras-chave da consulta no texto
   - Identifique qual seção/artigo contém a resposta
   - Extraia apenas a parte relevante
7. Retorne APENAS JSON válido (array):
[{
  "id": "uuid da norma",
  "reasoning": "por que este trecho responde à consulta",
  "relevanceScore": 0.95,
  "excerpt": "Trecho específico (300-500 caracteres) que responde diretamente à consulta"
}]`,
      },
    ];

    console.log('[searchNormsSemantic] Enviando conteúdo completo para IA (Etapa 2)...');
    const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://arquiv.org',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-haiku',
        messages,
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[searchNormsSemantic] Erro na API IA (Etapa 2):', aiResponse.status, errorText);

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
      excerpt?: string;
    }>;
    try {
      const parsed = JSON.parse(cleanedText);
      aiResults = Array.isArray(parsed) ? parsed : parsed.results || [];
    } catch {
      console.error('[searchNormsSemantic] Erro ao parsear JSON IA (Etapa 2):', cleanedText.substring(0, 200));
      aiResults = [];
    }

    console.log('[searchNormsSemantic] Etapa 2: Resultados IA:', aiResults.length);

    // If AI returns no results, return empty array
    if (aiResults.length === 0) {
      console.warn('[searchNormsSemantic] Nenhum resultado encontrado na etapa 2');
      return [];
    }

    // Map AI results to SearchResult format
    // Filter out results without valid excerpt OR with excerpts that are document-length
    const MAX_EXCERPT_LENGTH = 2000; // Máximo de caracteres para um trecho válido (aumentado)
    const MIN_EXCERPT_LENGTH = 50; // Mínimo de caracteres (reduzido temporariamente)

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

      // TEMPORARILY DISABLED: Ensure the excerpt actually contains one of the query terms
      // const excerptLower = (r.excerpt || '').toLowerCase();
      // const terms = cleanedQuery.split(/\s+/).filter(Boolean);
      // const containsTerm = terms.some(t => t && excerptLower.includes(t));
      // return containsTerm;
      return true;
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
        
        // NEVER trust AI values for hierarchy - ALWAYS parse from actual text
        // The AI often returns fake values, so we always extract from the real excerpt/content
        const contentText = String(norm.content || '');
        const hierarchy = parseHierarchyFromText(excerpt, contentText);
        
        console.log('[searchNormsSemantic] Hierarchy extraction:', {
          normId: String(norm.id).substring(0, 8),
          hasChapter: !!hierarchy.chapter,
          hasArticle: !!hierarchy.article,
          hasParagraph: !!hierarchy.paragraph,
          chapter: hierarchy.chapter?.substring(0, 30),
          article: hierarchy.article?.substring(0, 30),
          paragraph: hierarchy.paragraph?.substring(0, 30),
          excerptLength: excerpt.length,
          contentLength: contentText.length,
        });
        
        return {
          sectionId: uniqueSectionId,
          normId: String(norm.id),
          normCode: (norm.code as string) || '',
          normTitle: (norm.title as string) || '',
          normCountry: countryName,
          sectionType: hierarchy.article ? 'artigo' : (hierarchy.chapter ? 'capitulo' : 'norma'),
          sectionNumber: hierarchy.article || hierarchy.paragraph || null,
          sectionTitle: hierarchy.chapter || null,
          content: excerpt, // Sempre usar apenas o excerpt da IA
          similarity: aiResult.relevanceScore || 0.5,
          decree: undefined,
          regulationNumber: undefined,
          excerpt: excerpt,
          chapter: hierarchy.chapter || undefined,
          article: hierarchy.article || undefined,
          paragraph: hierarchy.paragraph || undefined,
        };
      })
      .filter((r) => r !== null);

    // Cache the results
    setCachedSearch(cacheKey, results as SearchResult[]);
    console.log('[Cache] Set semantic search results:', cacheKey);

    // Record search for rate limiting (by IP)
    try {
      const supabase = await getAuthenticatedSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      await recordSearch(clientIp, 'semantic', query, country, user?.id);
    } catch (err) {
      console.warn('[searchNormsSemantic] Erro ao registrar busca:', err);
    }

    return results as SearchResult[];
  } catch (err: unknown) {
    console.error('[searchNormsSemantic] Ocorreu um erro interno na IA');
    
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
        // Infer hierarchy from excerpt/full content when not provided by AI
        ...parseHierarchyFromText(excerpt, fullContent),
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
