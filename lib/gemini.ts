import OpenRouterClient, { OpenRouterMessage } from "./openrouter";
import { supabase } from "./supabase";

const apiKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || "";

const isInvalidKey = (key: string) => !key || key === "" || key === "dummy-key" || key === "MY_OPENROUTER_API_KEY";

export interface Norm {
  id: string;
  code: string;
  title: string;
  category: string;
  description?: string;
  keywords?: string[];
  reasoning?: string;
  excerpt?: string;
  file_url?: string;
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
  console.log(`[getArchitecturalNorms] Iniciando busca: ${country}, categoria: ${category}, query: "${queryText}"`);

  const startTime = Date.now();

  try {
    const isSearchMode = queryText && queryText.trim() !== "";

    // FIX #2: Nunca carregar content/structured_content na listagem simples
    // Na busca, carregar apenas description + keywords (não content completo)
    const selectFields = isSearchMode
      ? "id, code, title, description, category, country, keywords, total_sections"
      : "id, code, title, description, category, country, keywords, total_sections";

    console.log(`[getArchitecturalNorms] Modo: ${isSearchMode ? "PESQUISA" : "LISTA SIMPLES"}`);
    console.log(`[getArchitecturalNorms] DEBUG - Country: "${country}" | Category: "${category}" | Query: "${queryText || 'none'}"`);

    let data: Norm[] | null = null;
    let error: Error | null = null;

    try {
      let query = supabase
        .from("norms")
        .select(selectFields)
        .eq("country", country); // FIX #3: Filtro de país sempre aplicado

      if (category !== "Todas") {
        query = query.eq("category", category);
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
      return data.map((n) => ({
        ...n,
        reasoning: n.description || `Norma ${n.code} - ${n.title}`,
      }));
    }

    // FIX #4: Se useAi=true e tiver API key, tentar busca com IA primeiro
    if (useAi && !isInvalidKey(apiKey)) {
      try {
        const openRouter = new OpenRouterClient(apiKey);
        
        const normsForAI = data.slice(0, 15).map((norm) => ({
          id: norm.id,
          code: norm.code,
          title: norm.title,
          description: (norm.description || "").substring(0, 300),
          keywords: norm.keywords || [],
          category: norm.category,
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
          "qwen/qwen3-next-80b-a3b-instruct:free",
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
          return aiResults
            .sort((a, b) => b.relevanceScore - a.relevanceScore)
            .map((res) => {
              const norm = data!.find((n) => n.id === res.id);
              if (norm) return { ...norm, reasoning: res.reasoning } as Norm;
              return null;
            })
            .filter((n): n is Norm => n !== null);
        }
      } catch (err) {
        console.error("[getArchitecturalNorms] IA falhou, usando busca textual:", err);
        // Continuar para busca textual como fallback
      }
    }

    // FIX #5: Busca textual direta no banco (fallback ou quando useAi=false)
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
      return data.slice(0, 10).map((n) => ({ 
        ...n, 
        reasoning: n.description || `Norma ${n.code} — ${n.title}` 
      }));
    }
    
    return scoredResults;
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

    const response = await openRouter.chatCompletion(messages, "anthropic/claude-3-haiku", 0.1, {
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
    const { data, error } = await supabase
      .from("norms")
      .select("content, title")
      .eq("country", country)
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
    const { data, error } = await supabase
      .from("norms")
      .select("content, structured_content, file_url, file_type, code, title, country")
      .eq("id", normId)
      .maybeSingle();

    if (!error && data) {
      if (data.file_url) {
        console.log(`[getFullNormContentById] PDF encontrado: ${data.file_url}`);
        return `PDF:${data.file_url}`;
      } else if (data.content || data.structured_content) {
        console.log(`[getFullNormContentById] Conteúdo encontrado no Supabase`);
        return data.content || data.structured_content;
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
  try {
    // FIX #8: Selecionar apenas o campo country (não todos os campos)
    const { data, error } = await supabase.from("norms").select("country");
    if (error) {
      console.error("Error fetching active countries:", error);
      return ["Portugal", "Brasil", "Moçambique", "Angola"];
    }
    const countries = data.map((item) => item.country);
    return Array.from(new Set(countries));
  } catch (err) {
    console.error("Connection error fetching countries:", err);
    return ["Portugal", "Brasil", "Moçambique", "Angola"];
  }
};
