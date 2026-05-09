import OpenRouterClient, { OpenRouterMessage } from "./openrouter";
import { supabase } from "./supabase";

const apiKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || "";

const isInvalidKey = (key: string) => !key || key === "" || key === "dummy-key" || key === "MY_OPENROUTER_API_KEY";

/**
 * Simple client-side cache for data fetching
 * TTL: 5 minutes for search results, 10 minutes for static data
 */
const clientCache = new Map<string, { value: unknown; expiry: number }>();

function getClientCache<T>(key: string): T | undefined {
  const entry = clientCache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiry) {
    clientCache.delete(key);
    return undefined;
  }
  return entry.value as T;
}

function setClientCache<T>(key: string, value: T, ttlMinutes = 5): void {
  clientCache.set(key, { value, expiry: Date.now() + ttlMinutes * 60 * 1000 });
}

export interface Norm {
  id: string;
  code: string;
  title: string;
  category_id: number;
  country_id: number;
  description?: string;
  keywords?: string[];
  reasoning?: string;
  excerpt?: string;
  file_url?: string;
  category?: string;
  country?: string;
  [key: string]: unknown;
}

// FIX #1: Limpa JSON de modelos que retornam <think>...</think> antes do JSON
function extractJSON(text: string): string {
  // Remove blocos de thinking (ex: qwen, deepseek)
  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  // Encontra o primeiro '[' ou '{' e extrai a partir daí
  const start = cleaned.search(/[\[{]/);
  if (start === -1) return "[]";
  const end = Math.max(cleaned.lastIndexOf("]"), cleaned.lastIndexOf("}"));
  if (end === -1) return "[]";
  return cleaned.substring(start, end + 1);
}

export const getArchitecturalNorms = async (
  country: string,
  category: string = "Todas",
  queryText?: string,
  useAi: boolean = false
): Promise<Norm[]> => {
  const cacheKey = `norms:${country}:${category}:${queryText || 'all'}:${useAi}`;
  
  // Check cache first (5 minutes TTL for search results)
  const cached = getClientCache<Norm[]>(cacheKey);
  if (cached) {
    console.log(`[Cache] Hit for norms: ${country}/${category}/${queryText || 'all'}`);
    return cached;
  }
  
  console.log(`[getArchitecturalNorms] Iniciando busca: ${country}, categoria: ${category}, query: "${queryText}"`);

  if (!country || country.trim() === '') {
    console.warn('[getArchitecturalNorms] País inválido ou não informado, retornando lista vazia.');
    return [];
  }

  let results: Norm[] = [];

  try {
    const isSearchMode = queryText && queryText.trim() !== "";

    // FIX #21: Use NORMALIZED schema - select fields from norms with FK ids
    const selectFields = "id, code, title, description, category_id, country_id, keywords, total_sections";

    console.log(`[getArchitecturalNorms] Modo: ${isSearchMode ? "PESQUISA" : "LISTA SIMPLES"}`);
    console.log(`[getArchitecturalNorms] DEBUG - Country: "${country}" | Category: "${category}" | Query: "${queryText || 'none'}"`);

    let data: Norm[] | null = null;
    let error: Error | null = null;

    try {
      // Get country ID from country name
      const { data: countryData, error: countryError } = await supabase
        .from("countries")
        .select("id")
        .eq("name", country)
        .single();

      if (countryError || !countryData) {
        console.error("[getArchitecturalNorms] País não encontrado:", country);
        return [];
      }

      let query = supabase
        .from("norms")
        .select(selectFields)
        .eq("country_id", (countryData as { id?: string }).id);

      if (category !== "Todas") {
        const { data: catData, error: catError } = await supabase
          .from("categories")
          .select("id")
          .eq("name", category)
          .single();

        if (!catError && catData) {
          query = query.eq("category_id", (catData as { id?: string }).id);
        }
      }

      const result = await query.limit(50);
      data = result.data as Norm[] | null;
      error = result.error as Error | null;

      console.log(`[getArchitecturalNorms] DEBUG - Loaded ${data?.length || 0} norms from Supabase`);
      if (data && data.length > 0) {
        console.log(`[getArchitecturalNorms] DEBUG - Sample norms:`, data.slice(0, 3).map(n => ({ code: n.code, title: n.title.substring(0, 40) })));
      }
    } catch (queryError) {
      console.error("[getArchitecturalNorms] Exception durante query:", queryError);
      return [];
    }

    if (error) {
      console.error("[getArchitecturalNorms] Erro Supabase:", error);
      return [];
    }

    if (!data || data.length === 0) {
      console.log(`[getArchitecturalNorms] DEBUG - No norms found for country: ${country}`);
      return [];
    }

    // Sem pesquisa: retornar lista leve imediatamente
    if (!isSearchMode) {
      results = data.map((n) => ({
        ...n,
        reasoning: n.description || `Norma ${n.code} - ${n.title}`,
      }));
      // Cache and return
      setClientCache(cacheKey, results, 5);
      return results;
    }

    // FIX #22: If useAi=true and tener API key, try search with AI first
    if (useAi && !isInvalidKey(apiKey)) {
      try {
        const openRouter = new OpenRouterClient(apiKey);

        const normsForAI = data.slice(0, 15).map((norm) => ({
          id: norm.id,
          code: norm.code,
          title: norm.title,
          description: (norm.description || "").substring(0, 300),
          keywords: norm.keywords || [],
          category_id: norm.category_id,
        }));

        const messages: OpenRouterMessage[] = [
          {
            role: "user",
            content: `Você é um especialista em normas arquitetônicas.

Consulta: "${queryText}" | País: ${country}

Normas disponíveis (${normsForAI.length}):
${JSON.stringify(normsForAI)}

INSTRUÇÕES:
1. Analise a consulta e determine quais normas são relevantes
2. Use APENAS os dados fornecidos
3. NUNCA invente informações
4. Retorne APENAS JSON válido: [{"id": "uuid", "reasoning": "explicação", "relevanceScore": 0.95}]`,
          },
        ];

        console.log("[getArchitecturalNorms] Usando IA para busca...");
        const response = await openRouter.chatCompletion(
          messages,
          "google/gemma-4-31b-it:free",
          0.1,
          { type: "json_object" }
        );

        const rawText = response.choices[0]?.message?.content || "[]";
        const cleanedText = extractJSON(rawText);

        let aiResults: { id: string; reasoning: string; relevanceScore: number }[];
        try {
          const parsed = JSON.parse(cleanedText);
          aiResults = Array.isArray(parsed) ? parsed : parsed.results || [];
        } catch {
          aiResults = [];
        }

        if (aiResults.length > 0) {
          console.log(`[getArchitecturalNorms] IA retornou ${aiResults.length} resultados`);
          results = aiResults
            .sort((a, b) => b.relevanceScore - a.relevanceScore)
          .map((res) => {
            const norm = data!.find((n) => n.id === res.id);
              if (norm) return { ...norm, reasoning: res.reasoning } as Norm;
              return null;
            })
            .filter((n): n is Norm => n !== null);
          // Cache and return
          setClientCache(cacheKey, results, 5);
          return results;
        }
      } catch (err) {
        console.error("[getArchitecturalNorms] IA falhou, usando busca textual:", err);
        // Continuar para busca textual como fallback
      }
    }

    // FIX #23: Busca textual direta using normalized data
    const lowerQuery = queryText.toLowerCase().trim();

    console.log(`[getArchitecturalNorms] DEBUG - Query: "${lowerQuery}"`);
    console.log(`[getArchitecturalNorms] DEBUG - Total norms loaded: ${data.length}`);
    console.log(`[getArchitecturalNorms] DEBUG - First 3 norms:`, data.slice(0, 3).map(n => ({ code: n.code, title: n.title.substring(0, 30) })));

    const scoredResults = data
      .map((n: Norm) => {
        let score = 0;
        const title = n.title.toLowerCase();
        const code = n.code.toLowerCase();
        const desc = (n.description || "").toLowerCase();
        const keywords = (n.keywords || []).map(k => k.toLowerCase());

        // Buscar em code, title, description e keywords
        if (title.includes(lowerQuery)) score += 10;
        if (code.includes(lowerQuery)) score += 8;
        if (keywords.some(k => k.includes(lowerQuery))) score += 6;
        if (desc.includes(lowerQuery)) score += 4;

        // DEBUG: Log when we find a match
        if (score > 0) {
          console.log(`[getArchitecturalNorms] DEBUG - Match found: code="${n.code}" title="${n.title.substring(0, 40)}" score=${score}`);
        }

        return { norm: n, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(item => ({
        ...item.norm,
        reasoning: item.norm.description || `Norma ${item.norm.code} — ${item.norm.title}`
      }));

    console.log(`[getArchitecturalNorms] Busca textual: ${scoredResults.length} resultados`);

    if (scoredResults.length === 0) {
      // Se não encontrou, retornar todas as normas do país
      console.log(`[getArchitecturalNorms] DEBUG - No matches, returning all ${data.length} norms`);
      results = data.slice(0, 10).map((n) => ({
        ...n,
        reasoning: n.description || `Norma ${n.code} — ${n.title}`
      }));
    } else {
      results = scoredResults;
    }

    // Cache and return results
    setClientCache(cacheKey, results, 5);
    return results;
  } catch (outerError) {
    console.error("[getArchitecturalNorms] Erro geral:", outerError);
    return [];
  }
};

// Função para extrair e categorizar estrutura de documentos
export const extractDocumentStructure = async (
  content: string,
  title: string
): Promise<{
  structuredContent: string;
  categories: string[];
  keywords: string[];
  sections: Array<{
    type: string;
    number: string;
    title: string;
    content: string;
  }>;
}> => {
  if (isInvalidKey(apiKey)) {
    throw new Error("OpenRouter API Key não configurada para análise de documento.");
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

    const response = await openRouter.chatCompletion(messages, "google/gemma-4-31b-it:free", 0.1, {
      type: "json_object",
    });

    const rawText = response.choices[0]?.message?.content || "{}";
    const result = JSON.parse(extractJSON(rawText));

    if (!result.structuredContent || !Array.isArray(result.sections)) {
      throw new Error("Estrutura do documento não pôde ser extraída corretamente.");
    }

    return result;
  } catch (error) {
    console.error("Erro ao extrair estrutura do documento:", error);
    throw new Error("Falha ao analisar e categorizar o documento.");
  }
};

export const getFullNormContent = async (country: string, code: string): Promise<string> => {
  console.log(`Buscando conteúdo para norma ${code} do país ${country}`);

  try {
    // Get country ID
    const { data: countryData, error: countryError } = await supabase
      .from("countries")
      .select("id")
      .eq("name", country)
      .single();

    if (countryError || !countryData) {
      throw new Error(`País "${country}" não encontrado`);
    }

    const { data, error } = await supabase
      .from("norms")
      .select("content, title")
      .eq("country_id", (countryData as { id?: string }).id)
      .eq("code", code)
      .maybeSingle();

    if (!error && data?.content) {
      console.log("✅ Conteúdo encontrado no Supabase para", code);
      return data.content;
    }

    if (error) {
      console.error("❌ Erro do Supabase:", JSON.stringify(error, null, 2));
    }
  } catch (err) {
    console.error("❌ Erro ao buscar conteúdo no Supabase:", err);
  }

  throw new Error(
    `Norma "${code}" não encontrada no banco de dados ou com conteúdo incompleto. Por favor, verifique se o upload foi realizado corretamente.`
  );
};

export const getFullNormContentById = async (normId: string): Promise<string> => {
  console.log(`[getFullNormContentById] Buscando norma pelo ID: ${normId}`);

  try {
    // FIX #26: Use normalized schema with JOIN to countries table for country name
    const { data, error } = await supabase
      .from("norms")
      .select("content, structured_content, file_url, file_type, code, title, country_id, countries(name)")
      .eq("id", normId)
      .maybeSingle();

    const normData = data as { file_url?: string; content?: string; structured_content?: string } | null;
    if (!error && normData) {
      if (normData.file_url) {
        console.log(`[getFullNormContentById] PDF encontrado: ${normData.file_url}`);
        return `PDF:${normData.file_url}`;
      } else if (normData.content || normData.structured_content) {
        console.log(`[getFullNormContentById] Conteúdo encontrado no Supabase`);
        return normData.content || normData.structured_content || '';
      }
    } else if (error) {
      console.error("❌ Erro do Supabase:", JSON.stringify(error, null, 2));
    }
  } catch (err) {
    console.error("❌ Erro ao buscar conteúdo no Supabase:", err);
  }

  throw new Error(`Norma com ID "${normId}" não encontrada no banco de dados.`);
};

// FIX #7: deleteNorm movida para server action (ver norm-actions.ts)
// Esta versão client-side é mantida apenas como fallback e pode falhar com RLS
export const deleteNorm = async (id: string) => {
  const { error } = await supabase.from("norms").delete().eq("id", id);
  if (error) {
    console.error("[deleteNorm] Erro ao deletar:", error);
    throw new Error(`Falha ao excluir norma: ${error.message}. Verifique as permissões RLS.`);
  }
  return true;
};

export const updateNorm = async (id: string, updates: Partial<Norm>) => {
  const { data, error } = await supabase
    .from("norms")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Norm;
};

export const getActiveCountries = async (): Promise<string[]> => {
  const cacheKey = 'activeCountries';
  
  // Check cache first
  const cached = getClientCache<string[]>(cacheKey);
  if (cached) {
    console.log('[Cache] Hit for activeCountries');
    return cached;
  }
  
  try {
    // Get unique countries that have norms
    const { data, error } = await supabase
      .from("norms")
      .select("country_id, countries(name)")
      .not('country_id', 'is', null);

    if (error) {
      console.error("Error fetching active countries:", error);
      return [];
    }

    // Extract unique country names from joined data
    // Note: Supabase returns joined FK data as {countries: {name: "..."}}, not an array
    const countries = new Set<string>();
    (data || []).forEach((item) => {
      const countryData = item as { countries?: { name?: string } };
      if (countryData.countries?.name) {
        countries.add(countryData.countries.name);
      }
    });

    const result = Array.from(countries);
    
    // Cache for 10 minutes
    setClientCache(cacheKey, result, 10);
    console.log("[getActiveCountries] Países encontrados (cached):", result);
    return result;
  } catch (err) {
    console.error("Connection error fetching countries:", err);
    return [];
  }
};
