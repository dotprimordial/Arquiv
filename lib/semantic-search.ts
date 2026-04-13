import { OpenRouterClient, OpenRouterMessage } from './openrouter';

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
          model: 'openai/text-embedding-3-small',
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
      'anthropic/claude-3-haiku',
      0.1,
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
  maxChunkSize: number = 2000
): NormSection[] {
  const chunks: NormSection[] = [];

  for (const section of sections) {
    if (section.content.length <= maxChunkSize) {
      chunks.push(section);
      continue;
    }

    const contentParts = splitContent(section.content, maxChunkSize);
    
    contentParts.forEach((part, index) => {
      chunks.push({
        ...section,
        content: part,
        sectionNumber: index === 0 
          ? section.sectionNumber 
          : `${section.sectionNumber}-${index + 1}`,
        orderIndex: section.orderIndex + index * 0.1,
      });
    });
  }

  return chunks.sort((a, b) => a.orderIndex - b.orderIndex);
}

function splitContent(content: string, maxSize: number): string[] {
  const parts: string[] = [];
  const sentences = content.split(/(?<=[.!?])\s+/);
  
  let currentPart = '';
  
  for (const sentence of sentences) {
    if ((currentPart + sentence).length > maxSize && currentPart.length > 0) {
      parts.push(currentPart.trim());
      currentPart = sentence;
    } else {
      currentPart += ' ' + sentence;
    }
  }
  
  if (currentPart.trim()) {
    parts.push(currentPart.trim());
  }
  
  return parts.length > 0 ? parts : [content.substring(0, maxSize)];
}

// Generate embeddings for sections
export async function generateSectionEmbeddings(
  sections: NormSection[],
  apiKey: string
): Promise<(NormSection & { embedding: number[] })[]> {
  const embeddingClient = new EmbeddingClient(apiKey);
  const results: (NormSection & { embedding: number[] })[] = [];

  const batchSize = 10;
  for (let i = 0; i < sections.length; i += batchSize) {
    const batch = sections.slice(i, i + batchSize);
    
    const batchPromises = batch.map(async (section) => {
      try {
        const textForEmbedding = `${section.sectionType} ${section.sectionNumber || ''}: ${section.sectionTitle || ''}\n${section.content}`;
        const embedding = await embeddingClient.generateEmbedding(textForEmbedding);
        
        return {
          ...section,
          embedding,
        };
      } catch (error) {
        console.error(`Erro ao gerar embedding para ${section.sectionNumber}:`, error);
        return null;
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults.filter((r): r is (NormSection & { embedding: number[] }) => r !== null));
    
    if (i + batchSize < sections.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return results;
}
