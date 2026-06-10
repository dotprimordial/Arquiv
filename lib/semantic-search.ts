import { OpenRouterClient } from './openrouter.ts';
import type { OpenRouterMessage } from './openrouter.ts';

// Embedding API using OpenRouter (OpenAI compatible)
export class EmbeddingClient {
  private apiKey: string;
  private baseURL: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.baseURL = 'https://openrouter.ai/api/v1';
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await fetch(`${this.baseURL}/embeddings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://arquiv.org',
          'X-Title': 'Arquiv - Semantic Search',
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: text.substring(0, 8000),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Embedding API Error:', {
          status: response.status,
          body: errorText.substring(0, 500),
        });
        throw new Error(`Embedding API error: ${response.status}`);
      }

      const data = await response.json();
      return data.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }
}

// Interface for structured norm sections
export interface NormSection {
  sectionType: 'capitulo' | 'artigo' | 'secao' | 'subsecao' | 'item' | 'alinea' | 'paragrafo';
  sectionNumber?: string;
  sectionTitle?: string;
  content: string;
  orderIndex: number;
  parentNumber?: string;
  pageNumber?: number;
  aiInterpretation?: string; // New field for AI interpretation
}

// AI-powered document analyzer
export async function analyzeDocumentStructure(
  documentText: string,
  apiKey: string
): Promise<NormSection[]> {
  const openRouter = new OpenRouterClient(apiKey);

  const messages: OpenRouterMessage[] = [
    {
      role: 'user',
      content: `Analise este documento de norma técnica e estruture-o hierarquicamente.

INSTRUÇÕES:
1. Identifique e separe: Capítulos, Artigos, Seções, Subseções, Parágrafos, Alíneas
2. Para cada elemento, forneça:
   - tipo: "capitulo", "artigo", "secao", "subsecao", "paragrafo", "alinea", "item"
   - numero: número ou identificador (ex: "1", "1.1", "Art. 5º")
   - titulo: título do elemento (se houver)
   - conteudo: texto completo do elemento
   - ordem: índice sequencial (0, 1, 2...)

3. Preserve a hierarquia - mantenha a ordem natural do documento

DOCUMENTO:
${documentText.substring(0, 15000)}

Responda APENAS em JSON válido no formato:
[
  {
    "sectionType": "capitulo",
    "sectionNumber": "1",
    "sectionTitle": "Disposições Gerais",
    "content": "texto completo...",
    "orderIndex": 0
  }
]`,
    },
  ];

  try {
    const response = await openRouter.chatCompletion(
      messages,
      'anthropic/claude-3.5-haiku',
      0.3,
      { type: 'json_object' }
    );

    const responseText = response.choices[0]?.message?.content || '[]';
    
    let sections: NormSection[];
    try {
      sections = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Erro ao parsear estrutura do documento:', parseError);
      sections = [{
        sectionType: 'artigo',
        sectionNumber: '1',
        sectionTitle: 'Conteúdo do Documento',
        content: documentText.substring(0, 5000),
        orderIndex: 0,
      }];
    }

    return sections.map((s, i) => ({
      ...s,
      orderIndex: i,
    }));
  } catch (error) {
    console.error('Erro na análise do documento:', error);
    return [{
      sectionType: 'artigo',
      sectionNumber: '1',
      sectionTitle: 'Conteúdo do Documento',
      content: documentText.substring(0, 5000),
      orderIndex: 0,
    }];
  }
}

// Smart chunking for large documents
export function chunkDocument(
  sections: NormSection[],
  maxChunkSize: number = 5000,
  minChunkSize: number = 300,
  overlapChars: number = 200
): NormSection[] {
  const chunks: NormSection[] = [];

  for (const section of sections) {
    const text = String(section.content || '').trim();
    if (text.length === 0) continue;

    // If the whole article fits, use it as a single chunk
    if (text.length <= maxChunkSize) {
      chunks.push({ ...section, content: text });
      continue;
    }

    // Prefer paragraph splitting
    const paragraphs = splitByParagraph(text);
    let current = '';
    const sectionChunks: NormSection[] = [];

    for (let i = 0; i < paragraphs.length; i++) {
      const p = paragraphs[i].trim();
      if (!p) continue;

      // accumulate paragraph while below max size
      if ((current + '\n\n' + p).trim().length <= maxChunkSize) {
        current = (current + '\n\n' + p).trim();
        continue;
      }

      // if current is too small, try to join with paragraph
      if (current.length > 0 && current.length < minChunkSize) {
        current = (current + '\n\n' + p).trim();
        continue;
      }

      // push current as chunk
      if (current.length > 0) {
        sectionChunks.push({
          ...section,
          content: current,
          sectionNumber: section.sectionNumber,
          orderIndex: section.orderIndex,
        });
      }

      // start new current with paragraph or split paragraph if it's huge
      if (p.length <= maxChunkSize) {
        current = p;
      } else {
        const parts = splitContent(p, maxChunkSize, overlapChars);
        for (let j = 0; j < parts.length; j++) {
          sectionChunks.push({
            ...section,
            content: parts[j],
            sectionNumber: `${section.sectionNumber || ''}-${j + 1}`,
            orderIndex: section.orderIndex + (j + 1) * 0.001,
          });
        }
        current = '';
      }
    }

    if (current && current.length > 0) {
      sectionChunks.push({
        ...section,
        content: current,
        sectionNumber: section.sectionNumber,
        orderIndex: section.orderIndex,
      });
    }

    // Merge very small chunks only within the same section
    const mergedSectionChunks: NormSection[] = [];
    for (let i = 0; i < sectionChunks.length; i++) {
      const c = sectionChunks[i];
      if (c.content.length < minChunkSize && i + 1 < sectionChunks.length) {
        const next = sectionChunks[i + 1];
        mergedSectionChunks.push({
          ...next,
          content: (c.content + '\n\n' + next.content).trim(),
          sectionNumber: next.sectionNumber,
          orderIndex: c.orderIndex,
        });
        i++; // skip next because merged
      } else {
        mergedSectionChunks.push(c);
      }
    }

    chunks.push(...mergedSectionChunks);
  }

  return chunks.sort((a, b) => a.orderIndex - b.orderIndex);
}

function splitByParagraph(text: string): string[] {
  return text.split(/\n{2,}/g).map(s => s.trim()).filter(Boolean);
}

function splitContent(content: string, maxSize: number, overlap: number = 200): string[] {
  const sentences = content.split(/(?<=[.!?])\s+/);
  const parts: string[] = [];
  let current = '';

  for (const s of sentences) {
    if ((current + ' ' + s).trim().length <= maxSize) {
      current = (current + ' ' + s).trim();
    } else {
      if (current) parts.push(current);
      current = s.trim();
    }
  }
  if (current) parts.push(current);

  // apply overlap
  if (parts.length > 1 && overlap > 0) {
    const withOverlap: string[] = [];
    for (let i = 0; i < parts.length; i++) {
      let chunk = parts[i];
      if (i > 0) {
        const prev = withOverlap[withOverlap.length - 1] || parts[i - 1];
        const tail = prev.slice(-overlap);
        chunk = (tail + '\n\n' + chunk).trim();
      }
      withOverlap.push(chunk);
    }
    return withOverlap;
  }

  return parts;
}

export function splitContentIntoArticles(content: string): Array<{ index: number; text: string }> {
  const normalized = content.replace(/\r\n/g, '\n').trim();
  // Regex mais robusta para Artigo, Art., e variantes, sem depender de quebras de linha.
  // Muitos conteúdos chegam como HTML e podem ter "Art." precedido por tags como "<p>".
  const articleRegex = /(?:Art(?:igo)?\.?\s*\d+[º°]?(?:\s*-\s*[A-Za-z\u00C0-\u00FF])?|§\s*\d+[º°]?)/gi;
  const matches: Array<{ index: number; header: string }> = [];
  let match: RegExpExecArray | null;
  
  while ((match = articleRegex.exec(normalized)) !== null) {
    matches.push({ index: match.index, header: match[0].trim() });
  }
  
  if (matches.length === 0) {
    return [{ index: 0, text: normalized }];
  }
  
  const result: Array<{ index: number; text: string }> = [];
  
  // Captura o texto antes do primeiro artigo (geralmente preâmbulo ou definições)
  if (matches[0].index > 0) {
    result.push({ index: 0, text: normalized.substring(0, matches[0].index).trim() });
  }
  
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i + 1 < matches.length ? matches[i + 1].index : normalized.length;
    result.push({ index: i + 1, text: normalized.substring(start, end).trim() });
  }
  
  return result;
}

// Generate embeddings for sections
export async function generateSectionEmbeddings(
  sections: NormSection[],
  apiKey: string
): Promise<(NormSection & { embedding: number[] })[]> {
  const embeddingClient = new EmbeddingClient(apiKey);
  const results: (NormSection & { embedding: number[] })[] = [];
  const failures: { section: NormSection; error: unknown }[] = [];

  const batchSize = 10;
  const maxRetries = 3;

  for (let i = 0; i < sections.length; i += batchSize) {
    const batch = sections.slice(i, i + batchSize);

    const batchPromises = batch.map(async (section) => {
      const textForEmbedding = `${section.sectionType} ${section.sectionNumber || ''}: ${section.sectionTitle || ''}\n${section.content}`;
      let attempt = 0;
      while (attempt < maxRetries) {
        try {
          const embedding = await embeddingClient.generateEmbedding(textForEmbedding);
          return {
            ...section,
            embedding,
          } as NormSection & { embedding: number[] };
        } catch (err) {
          attempt++;
          const backoff = 500 * Math.pow(2, attempt); // 1st ~1000ms, then ~2000ms, etc.
          console.warn(`[generateSectionEmbeddings] Embedding attempt ${attempt} failed for section ${section.sectionNumber || 'n/a'}. Retrying in ${backoff}ms`, err);
          if (attempt >= maxRetries) {
            failures.push({ section, error: err });
            console.error(`[generateSectionEmbeddings] Failed to generate embedding for section ${section.sectionNumber || 'n/a'} after ${attempt} attempts`, err);
            return null;
          }
          await new Promise((r) => setTimeout(r, backoff));
        }
      }
      return null;
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults.filter((r): r is (NormSection & { embedding: number[] }) => r !== null));

    if (i + batchSize < sections.length) {
      // small throttle to avoid aggressive rate limits
      await new Promise((r) => setTimeout(r, 250));
    }
  }

  if (failures.length > 0) {
    console.warn('[generateSectionEmbeddings] Some embeddings failed to generate:', failures.length);
  }

  return results;
}

export async function generateArticleInterpretation(section: NormSection, apiKey: string): Promise<string> {
  if (!apiKey || apiKey.length < 10) {
    console.warn('[generateArticleInterpretation] API Key não configurada, retornando texto vazio');
    return '';
  }

  const openRouter = new OpenRouterClient(apiKey);

  const prompt = `Você é um especialista em normas arquitetônicas e de construção. Sua tarefa é fornecer uma interpretação concisa e clara do seguinte trecho de uma norma.

INSTRUÇÕES:
1.  **Precisão Técnica**: Identifique e destaque valores exatos (ex: 70%, 3 metros, coeficientes). Nunca omita limites numéricos.
2.  **Interpretação Concisa**: Resuma o trecho em 1-3 frases, focando no ponto principal.
3.  **Linguagem Clara**: Use linguagem direta e evite jargões excessivos, a menos que sejam essenciais.
4.  **Implicações Práticas**: Mencione o que o trecho significa na prática para um projeto (ex: "O edifício não pode ocupar mais de 70% do lote").
5.  **Formato**: Retorne APENAS a interpretação em texto puro, sem introduções.

Trecho da Norma (Tipo: ${section.sectionType}, Número: ${section.sectionNumber || 'N/A'}, Título: ${section.sectionTitle || 'N/A'}):
"""
${section.content}
"""`;

  const messages: OpenRouterMessage[] = [{ role: "user", content: prompt }];

  try {
    const response = await openRouter.chatCompletion(
      messages,
      'anthropic/claude-3.5-haiku',
      0.3
    );

    return response.choices[0]?.message?.content?.trim() || '';
  } catch (error) {
    console.error(`[generateArticleInterpretation] Erro ao gerar interpretação para seção ${section.sectionNumber}:`, error);
    return '';
  }
}
