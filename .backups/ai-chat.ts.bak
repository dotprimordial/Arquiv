"use server";

import OpenRouterClient, { OpenRouterMessage } from "@/lib/openrouter";
import { searchNormsSemantic } from "./norm-actions";
import { isValidTextInput } from "@/lib/search-utils";

const apiKey = process.env.OPENROUTER_API_KEY || "";

export async function chatWithNormAssistant(
  userMessage: string,
  country?: string
) {
  if (!isValidTextInput(userMessage)) {
    console.warn('[chatWithNormAssistant] Input rejeitado: não é texto válido');
    return { success: false, error: "Mensagem inválida." };
  }

  try {
    // Step 1: Search for relevant norms using existing semantic search
    let relevantContext = "";
    try {
      // Reduzindo para 3 resultados em vez de 5
      const searchResults = await searchNormsSemantic(
        userMessage,
        country || "Brasil",
        3
      );

      if (searchResults && searchResults.length > 0) {
        relevantContext = searchResults
          .map(
            (result, index) => `
Resultado ${index + 1}:
- Norma: ${result.normCode} - ${result.normTitle}
- Conteúdo: ${(result.fullArticleContent || result.content).substring(0, 1000)}
`
          )
          .join("\n");
      }
    } catch (searchErr) {
      console.warn("[chatWithNormAssistant] Search failed:", searchErr);
    }

    // Step 2: Build the AI prompt with context
    const systemPrompt = `Você é um assistente especializado em normas arquitetônicas e de construção.

REGRAS:
1. Responda apenas sobre normas arquitetônicas e regulamentações de construção
2. Se o usuário perguntar sobre algo não relacionado, informe educadamente que só pode ajudar com normas
3. Use o contexto fornecido para dar respostas precisas
4. Cite as normas e artigos relevantes quando possível
5. Se não encontrar informações relevantes no contexto, diga que não tem informações suficientes
6. Seja claro e objetivo

CONTEXTO DAS NORMAS:
${relevantContext || "Nenhum contexto de normas encontrado."}
`;

    const messages: OpenRouterMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ];

    // Step 3: Call AI to generate response
    const openRouter = new OpenRouterClient(apiKey);
    const response = await openRouter.chatCompletion(
      messages,
      "google/gemma-4-31b-it:free",
      0.3,
      undefined,
      1024
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
