"use server";

import OpenRouterClient, { OpenRouterMessage } from "@/lib/openrouter";
import { searchNormsSemantic } from "./norm-actions";
import { getAuthenticatedSupabaseClient } from "@/lib/supabase-server";
import { isValidTextInput, processSearchQuery, generateVariants, removeAccents } from "@/lib/search-utils";

const apiKey = process.env.OPENROUTER_API_KEY || "";

const countryContinent: Record<string, string> = {
  BR: "América do Sul", PT: "Europa", US: "América do Norte",
  GB: "Europa", DE: "Europa", FR: "Europa", ES: "Europa",
  AO: "África", MZ: "África",
};

function cleanHtml(text: string): string {
  return text
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/&[a-z]+;|&#\d+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function removeHiddenText(text: string): string {
  if (!text) return "";
  return text.replace(/-\*-[^]*?-\*-/g, "");
}

async function fallbackDirectSearch(
  query: string,
  country?: string
): Promise<string> {
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
      normsQuery = normsQuery.eq(
        "country_id",
        (countryData as { id?: string }).id
      );
    }
  }

  const { data: norms } = await normsQuery.limit(30);
  if (!norms || norms.length === 0) return "";

  const searchTokens = processSearchQuery(query);
  const tokenVariants = new Map<string, string[]>();
  for (const token of searchTokens) {
    tokenVariants.set(token, generateVariants(removeAccents(token)));
  }

  const scored = norms.map((norm: Record<string, unknown>) => {
    const content = removeHiddenText(
      cleanHtml(String(norm.content || "") + " " + String(norm.description || ""))
    );
    const normalizedContent = removeAccents(content);
    const title = removeAccents(String(norm.title || ""));
    const code = removeAccents(String(norm.code || ""));
    let score = 0;

    for (const [, variants] of tokenVariants) {
      for (const v of variants) {
        if (title.includes(v)) score += 8;
        else if (code.includes(v)) score += 6;
        else if (normalizedContent.includes(v)) score += 2;
      }
    }
    if (removeAccents(query).length > 3 && normalizedContent.includes(removeAccents(query))) {
      score += 10;
    }

    return { id: String(norm.id), code: String(norm.code), title: String(norm.title), content, score };
  }).filter((n) => n.score > 0).sort((a, b) => b.score - a.score).slice(0, 5);

  if (scored.length === 0) return "";

  return scored
    .map((n, i) => {
      const snippet = n.content.substring(0, 2500);
      return `Resultado ${i + 1}:\n- Norma: ${n.code} - ${n.title}\n- Conteúdo: ${snippet}\n`;
    })
    .join("\n");
}

export async function chatWithNormAssistant(
  userMessage: string,
  country?: string
) {
  if (!isValidTextInput(userMessage)) {
    console.warn("[chatWithNormAssistant] Input rejeitado: não é texto válido");
    return { success: false, error: "Mensagem inválida." };
  }

  try {
    let relevantContext = "";

    // Step 1: Try semantic search
    try {
      const searchResults = await searchNormsSemantic(userMessage, country || "Brasil", 8);
      if (searchResults && searchResults.length > 0) {
        relevantContext = searchResults
          .map((result, index) => {
            const raw = result.fullArticleContent || result.content || "";
            const content = cleanHtml(raw).substring(0, 2000);
            const artigo = result.sectionNumber ? `Art. ${result.sectionNumber}` : "";
            return `Resultado ${index + 1}:\n- Norma: ${result.normCode} - ${result.normTitle}\n- Artigo: ${artigo}\n- Conteúdo: ${content}\n`;
          })
          .join("\n");
      }
    } catch {
      console.warn("[chatWithNormAssistant] Semantic search failed, trying direct search...");
    }

    // Step 2: Fallback to direct search if semantic returned nothing
    if (!relevantContext) {
      relevantContext = await fallbackDirectSearch(userMessage, country);
    }

    // Step 3: Derive continent
    const countryCode = Object.entries(countryContinent).find(
      ([, v]) => v === country
    )?.[0];
    const continent = countryCode ? countryContinent[countryCode] : undefined;

    // Step 4: Build strict RAG prompt
    const contextBlock = relevantContext
      ? `CONTEXTO DAS NORMAS (responda APENAS com base nisto):\n${relevantContext}`
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
      ? `País do usuário: ${country}${continent ? ` (${continent})` : ""}\n\nPergunta: ${userMessage}`
      : `Pergunta: ${userMessage}`;

    const messages: OpenRouterMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ];

    // Step 5: Call AI
    const openRouter = new OpenRouterClient(apiKey);
    const response = await openRouter.chatCompletion(
      messages,
      "google/gemma-4-31b-it:free",
      0.2,
      undefined,
      2048
    );

    const aiResponse = response.choices?.[0]?.message?.content || "";

    return { success: true, response: aiResponse };
  } catch (error) {
    console.error("[chatWithNormAssistant] Error:", error);
    return {
      success: false,
      error: "Desculpe, não consegui processar sua pergunta agora.",
    };
  }
}
