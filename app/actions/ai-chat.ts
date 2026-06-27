"use server";

import OpenRouterClient, { OpenRouterMessage } from "@/lib/openrouter";
import { searchNormsSemantic, fallbackTextualSearch } from "./norm-actions";
import { getAuthenticatedSupabaseClient } from "@/lib/supabase-server";
import { isValidTextInput, processSearchQuery } from "@/lib/search-utils";

const apiKey = process.env.OPENROUTER_API_KEY || "";

function isInvalidKey(key: string) {
  return !key || key.length < 10 || key === "dummy-key" || key === "MY_OPENROUTER_API_KEY";
}

interface ChatSource {
  code: string;
  title: string;
  artigo?: string;
}

interface ChatSearchResult {
  results: { code: string; title: string; artigo?: string; content: string }[];
  context: string;
  sources: ChatSource[];
}

function cleanHtml(text: string): string {
  return text
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/&[a-z]+;|&#\d+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function chatSearch(query: string, country?: string): Promise<ChatSearchResult> {
  // Tier 1: Semantic search (with answer extraction filter)
  try {
    const results = await searchNormsSemantic(query, country || "Brasil", 8);
    if (results && results.length > 0) {
      const items = results.map((r) => ({
        code: r.normCode,
        title: r.normTitle,
        artigo: r.sectionNumber || undefined,
        content: cleanHtml(r.fullArticleContent || r.content || "").substring(0, 2000),
      }));
      return {
        results: items,
        context: items
          .map((item, i) => `Resultado ${i + 1}:\n- Norma: ${item.code} - ${item.title}\n${item.artigo ? `- Artigo: ${item.artigo}\n` : ""}- Conteúdo: ${item.content}\n`)
          .join("\n"),
        sources: items.map(({ code, title, artigo }) => ({ code, title, artigo })),
      };
    }
  } catch (e) {
    console.warn("[chatSearch] Semantic search failed:", e);
  }

  // Tier 2: Fetch norms from DB and use fallbackTextualSearch
  try {
    const supabase = await getAuthenticatedSupabaseClient();
    let normsQuery = supabase
      .from("norms")
      .select(`id, code, title, content, description, keywords, countries(name)`);

    if (country) {
      const { data: countryData } = await supabase
        .from("countries")
        .select("id")
        .eq("name", country)
        .single();
      if (countryData) {
        normsQuery = normsQuery.eq("country_id", (countryData as { id?: string }).id);
      }
    }

    const { data: normsData } = await normsQuery.limit(30);
    if (normsData && normsData.length > 0) {
      const ftResults = await fallbackTextualSearch(normsData, query, 8);
      if (ftResults && ftResults.length > 0) {
        const items = ftResults.map((r) => ({
          code: r.normCode,
          title: r.normTitle,
          artigo: r.sectionNumber || undefined,
          content: cleanHtml(r.content || "").substring(0, 2000),
        }));
        return {
          results: items,
          context: items
            .map((item, i) => `Resultado ${i + 1}:\n- Norma: ${item.code} - ${item.title}\n${item.artigo ? `- Artigo: ${item.artigo}\n` : ""}- Conteúdo: ${item.content}\n`)
            .join("\n"),
          sources: items.map(({ code, title, artigo }) => ({ code, title, artigo })),
        };
      }
    }
  } catch (e) {
    console.warn("[chatSearch] Textual search failed:", e);
  }

  // Tier 3: Direct keyword search (last resort)
  try {
    const supabase = await getAuthenticatedSupabaseClient();
    let normsQuery = supabase
      .from("norms")
      .select("id, code, title, content, description, keywords");

    if (country) {
      const { data: countryData } = await supabase
        .from("countries")
        .select("id")
        .eq("name", country)
        .single();
      if (countryData) {
        normsQuery = normsQuery.eq("country_id", (countryData as { id?: string }).id);
      }
    }

    const { data: norms } = await normsQuery.limit(30);
    if (!norms || norms.length === 0) return { results: [], context: "", sources: [] };

    const searchTokens = processSearchQuery(query);
    const queryLower = query.toLowerCase();

    const scored = norms.map((norm: Record<string, unknown>) => {
      const content = cleanHtml(String(norm.content || "") + " " + String(norm.description || "")).toLowerCase();
      const title = String(norm.title || "").toLowerCase();
      const code = String(norm.code || "").toLowerCase();
      let score = 0;
      for (const token of searchTokens) {
        const t = token.toLowerCase();
        if (title.includes(t)) score += 8;
        else if (code.includes(t)) score += 6;
        else if (content.includes(t)) score += 2;
      }
      if (queryLower.length > 3 && content.includes(queryLower)) score += 10;
      return { norm, score, title: String(norm.title || ""), code: String(norm.code || ""), content: cleanHtml(String(norm.content || "")).substring(0, 2500) };
    }).filter((n) => n.score > 0).sort((a, b) => b.score - a.score).slice(0, 5);

    if (scored.length > 0) {
      const items = scored.map((n) => ({ code: n.code, title: n.title, artigo: undefined as string | undefined, content: n.content }));
      return {
        results: items,
        context: items
          .map((item, i) => `Resultado ${i + 1}:\n- Norma: ${item.code} - ${item.title}\n- Conteúdo: ${item.content}\n`)
          .join("\n"),
        sources: items.map(({ code, title }) => ({ code, title })),
      };
    }
  } catch (e) {
    console.warn("[chatSearch] Direct search failed:", e);
  }

  return { results: [], context: "", sources: [] };
}

export async function chatWithNormAssistant(
  userMessage: string,
  country?: string
) {
  if (!isValidTextInput(userMessage)) {
    console.warn("[chatWithNormAssistant] Input rejeitado: não é texto válido");
    return { success: false, error: "Mensagem inválida." };
  }

  if (isInvalidKey(apiKey)) {
    console.error("[chatWithNormAssistant] API key inválida ou não configurada");
    return { success: false, error: "Assistente temporariamente indisponível (API key)." };
  }

  try {
    const searchResult = await chatSearch(userMessage, country);
    const { context, sources } = searchResult;

    const contextBlock = context
      ? `CONTEXTO DAS NORMAS (responda APENAS com base nisto):\n${context}`
      : "Nenhuma norma relevante encontrada na base de dados para esta pergunta.";

    const systemPrompt = `Você é um assistente especializado em normas arquitetônicas e de construção.

REGRAS:
1. Responda APENAS com base no contexto das normas fornecido abaixo.
2. NUNCA use seu conhecimento interno — apenas o que está no contexto.
3. Se o contexto não tiver a informação para responder, diga: "Não encontrei informação sobre isso na base de dados de normas."
4. Cite o código da norma e o número do artigo sempre que possível.
5. Seja claro, objetivo e mencione valores exatos (percentagens, metros, coeficientes, etc.).
6. Se o usuário perguntar algo fora de normas arquitetônicas, informe educadamente que só pode ajudar com normas.

${contextBlock}`;

    const userPrompt = country
      ? `País do usuário: ${country}\n\nPergunta: ${userMessage}`
      : `Pergunta: ${userMessage}`;

    const messages: OpenRouterMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    const openRouter = new OpenRouterClient(apiKey);
    const response = await openRouter.chatCompletion(
      messages,
      "google/gemini-2.5-flash-lite",
      0.2,
      undefined,
      2048
    );

    const aiResponse = response.choices?.[0]?.message?.content || "";

    return { success: true, response: aiResponse, sources };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("[chatWithNormAssistant] Error:", errMsg);
    return {
      success: false,
      error: "Desculpe, não consegui processar sua pergunta agora.",
      debug: errMsg,
    };
  }
}
