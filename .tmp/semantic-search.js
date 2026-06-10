"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmbeddingClient = void 0;
exports.analyzeDocumentStructure = analyzeDocumentStructure;
exports.chunkDocument = chunkDocument;
exports.generateSectionEmbeddings = generateSectionEmbeddings;
exports.generateArticleInterpretation = generateArticleInterpretation;
const openrouter_1 = require("./openrouter");
// Embedding API using OpenRouter (OpenAI compatible)
class EmbeddingClient {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseURL = 'https://openrouter.ai/api/v1';
    }
    async generateEmbedding(text) {
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
        }
        catch (error) {
            console.error('Error generating embedding:', error);
            throw error;
        }
    }
}
exports.EmbeddingClient = EmbeddingClient;
// AI-powered document analyzer
async function analyzeDocumentStructure(documentText, apiKey) {
    var _a, _b;
    const openRouter = new openrouter_1.OpenRouterClient(apiKey);
    const messages = [
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
        const response = await openRouter.chatCompletion(messages, 'anthropic/claude-3.5-haiku', 0.3, { type: 'json_object' });
        const responseText = ((_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) || '[]';
        let sections;
        try {
            sections = JSON.parse(responseText);
        }
        catch (parseError) {
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
    }
    catch (error) {
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
function chunkDocument(sections, maxChunkSize = 5000, minChunkSize = 300, overlapChars = 200) {
    const chunks = [];
    for (const section of sections) {
        const text = String(section.content || '').trim();
        if (text.length === 0)
            continue;
        // If the whole article fits, use it as a single chunk
        if (text.length <= maxChunkSize) {
            chunks.push({ ...section, content: text });
            continue;
        }
        // Prefer paragraph splitting
        const paragraphs = splitByParagraph(text);
        let current = '';
        const sectionChunks = [];
        for (let i = 0; i < paragraphs.length; i++) {
            const p = paragraphs[i].trim();
            if (!p)
                continue;
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
            }
            else {
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
        const mergedSectionChunks = [];
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
            }
            else {
                mergedSectionChunks.push(c);
            }
        }
        chunks.push(...mergedSectionChunks);
    }
    return chunks.sort((a, b) => a.orderIndex - b.orderIndex);
}
function splitByParagraph(text) {
    return text.split(/\n{2,}/g).map(s => s.trim()).filter(Boolean);
}
function splitContent(content, maxSize, overlap = 200) {
    const sentences = content.split(/(?<=[.!?])\s+/);
    const parts = [];
    let current = '';
    for (const s of sentences) {
        if ((current + ' ' + s).trim().length <= maxSize) {
            current = (current + ' ' + s).trim();
        }
        else {
            if (current)
                parts.push(current);
            current = s.trim();
        }
    }
    if (current)
        parts.push(current);
    // apply overlap
    if (parts.length > 1 && overlap > 0) {
        const withOverlap = [];
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
// Generate embeddings for sections
async function generateSectionEmbeddings(sections, apiKey) {
    const embeddingClient = new EmbeddingClient(apiKey);
    const results = [];
    const failures = [];
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
                    };
                }
                catch (err) {
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
        results.push(...batchResults.filter((r) => r !== null));
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
async function generateArticleInterpretation(section, apiKey) {
    var _a, _b, _c;
    if (!apiKey || apiKey.length < 10) {
        console.warn('[generateArticleInterpretation] API Key não configurada, retornando texto vazio');
        return '';
    }
    const openRouter = new openrouter_1.OpenRouterClient(apiKey);
    const prompt = `Você é um especialista em normas arquitetônicas e de construção. Sua tarefa é fornecer uma interpretação concisa e clara do seguinte trecho de uma norma. A interpretação deve focar no significado prático e nas implicações do texto, como se estivesse explicando para um profissional da área.\n\nTrecho da Norma (Tipo: ${section.sectionType}, Número: ${section.sectionNumber || 'N/A'}, Título: ${section.sectionTitle || 'N/A'}):\n"""\n${section.content}\n"""\n\nINSTRUÇÕES:\n1.  **Interpretação Concisa**: Resuma o trecho em 1-3 frases, focando no ponto principal.\n2.  **Linguagem Clara**: Use linguagem direta e evite jargões excessivos, a menos que sejam essenciais.\n3.  **Implicações Práticas**: Se aplicável, mencione brevemente o que o trecho significa na prática para um projeto ou construção.\n4.  **Formato**: Retorne APENAS a interpretação em texto puro, sem introduções como "A interpretação é:", "Este artigo significa que:", etc.`;
    const messages = [{ role: "user", content: prompt }];
    try {
        const response = await openRouter.chatCompletion(messages, 'anthropic/claude-3.5-haiku', 0.3);
        return ((_c = (_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.trim()) || '';
    }
    catch (error) {
        console.error(`[generateArticleInterpretation] Erro ao gerar interpretação para seção ${section.sectionNumber}:`, error);
        return '';
    }
}
