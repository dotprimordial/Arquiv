/**
 * Search Utilities for Natural Language Processing
 * Extracts keywords, expands terms, and normalizes text for better search matching
 */

import { OpenRouterClient, OpenRouterMessage } from './openrouter';

// Portuguese stop words to remove from queries
const PORTUGUESE_STOP_WORDS = new Set([
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
  'este', 'esta', 'isto', 'esse', 'essa', 'isso', 'aquele', 'aquela', 'aquilo',
  'meu', 'minha', 'meus', 'minhas', 'teu', 'tua', 'teus', 'tuas',
  'nosso', 'nossa', 'nossos', 'nossas', 'seu', 'sua', 'seus', 'suas',
  'todo', 'toda', 'todos', 'todas', 'algum', 'alguma', 'alguns', 'algumas',
  'nenhum', 'nenhuma', 'nenhuns', 'nenhumas', 'cada', 'outro', 'outros',
]);

// Domain-specific synonym mappings for architectural/urban planning terms
const SYNONYM_MAPPINGS: Record<string, string[]> = {
  // Solo/território
  'solo': ['solo', 'terreno', 'territorio', 'terreno', 'chao', 'solo', 'lote', 'parcela', 'gleba'],
  'ocupação': ['ocupacao', 'uso', 'utilizacao', 'emprego', 'aproveitamento', 'ocupacao', 'coeficiente', 'indice', 'taxa', 'densidade'],
  'uso': ['uso', 'utilizacao', 'emprego', 'aproveitamento', 'ocupacao', 'destinacao', 'coeficiente', 'densidade'],
  'zoneamento': ['zoneamento', 'zonas', 'zonificacao', 'classificacao', 'categorias', 'zonas', 'uso', 'ocupacao'],
  'urbanismo': ['urbanismo', 'urbanizacao', 'cidade', 'urbano', 'municipal', 'planejamento', 'ocupacao', 'zoneamento'],
  'território': ['territorio', 'area', 'espaco', 'regiao', 'local', 'lote', 'solo', 'ocupacao'],
  'lote': ['lote', 'parcela', 'terreno', 'solo', 'gleba', 'ocupacao'],

  // Construção/edificação
  'construção': ['construcao', 'edificacao', 'obra', 'edificio', 'estrutura', 'empreendimento'],
  'edificação': ['edificacao', 'construcao', 'obra', 'edificio', 'predio', 'empreendimento'],
  'obra': ['obra', 'construcao', 'edificacao', 'trabalho', 'projeto', 'empreendimento'],
  'edifício': ['edificio', 'predio', 'construcao', 'edificacao', 'bloco', 'torre'],
  'prédio': ['predio', 'edificio', 'bloco', 'construcao', 'estrutura'],
  'estrutura': ['estrutura', 'armacao', 'esqueleto', 'construcao', 'fundacao'],
  'fundação': ['fundacao', 'alicerce', 'estrutura', 'base', 'estaqueamento'],

  // Incêndio
  'incêndio': ['incendio', 'fogo', 'combustao', 'safety', 'prevencao', 'scie', 'extincao', 'compartimentacao', 'fumo'],
  'segurança': ['seguranca', 'protecao', 'defesa', 'risco', 'perigo', 'prevencao', 'estabilidade', 'resistencia'],
  'risco': ['risco', 'perigo', 'ameaca', 'vulnerabilidade', 'seguranca'],
  'proteção': ['protecao', 'seguranca', 'defesa', 'prevencao', 'resistencia'],
  'evacuação': ['evacuacao', 'fuga', 'saida', 'rota', 'passagem'],

  // Altura/dimensões
  'altura': ['altura', 'cercea', 'gabarito', 'pavimento', 'piso', 'andar', 'vertical', 'cota', 'nivel'],
  'cércea': ['cercea', 'altura', 'gabarito', 'pavimento', 'piso', 'andar', 'limite vertical'],
  'piso': ['piso', 'pavimento', 'andar', 'nivel', 'cota', 'altura'],
  'largura': ['largura', 'extensao', 'dimensao', 'tamanho', 'amplitude'],
  'profundidade': ['profundidade', 'dimensao', 'espessura', 'tamanho'],
  'área': ['area', 'espaco', 'superficie', 'metragem', 'tamanho', 'extensao', 'ati', 'area total de implantacao'],
  'ati': ['ati', 'area total de implantacao', 'implantacao', 'ocupacao', 'coeficiente', 'indice'],
  'coeficiente': ['coeficiente', 'indice', 'taxa', 'proporcao', 'relacao', 'ocupacao', 'densidade', 'ati'],
  'recuo': ['recuo', 'afastamento', 'distancia', 'margem', 'espaco'],
  'gabarito': ['gabarito', 'altura', 'limite', 'restricao', 'padrao', 'maximo'],

  // Estacionamento
  'estacionamento': ['estacionamento', 'parqueamento', 'vagas', 'garagem', 'parking', 'parada'],
  'vaga': ['vaga', 'lugar', 'espaco', 'garagem', 'parada'],
  'garagem': ['garagem', 'estacionamento', 'parqueamento', 'vaga'],

  // Acessibilidade
  'acessibilidade': ['acessibilidade', 'acesso', 'inclusao', 'adaptacao', 'mobilidade', 'universal', 'pne', 'deficientes'],
  'acesso': ['acesso', 'entrada', 'saida', 'portao', 'porta', 'passagem', 'circulacao'],
  'rota': ['rota', 'caminho', 'percurso', 'trajetoria', 'passagem', 'acessivel'],
  'elevador': ['elevador', 'ascensor', 'plataforma', 'acessibilidade', 'vertical'],
  'rampa': ['rampa', 'declividade', 'inclinacao', 'acesso', 'acessibilidade', 'pendente', 'patamar'],

  // Energia/instalações
  'energia': ['energia', 'eletricidade', 'potencia', 'consumo', 'fornecimento', 'iturs', 'telecomunicacoes'],
  'água': ['agua', 'hidraulica', 'abastecimento', 'esgoto', 'fornecimento', 'predial', 'pluvial'],
  'esgoto': ['esgoto', 'agua', 'drenagem', 'sanitario', 'coleta', 'residual'],
  'drenagem': ['drenagem', 'esgoto', 'escoamento', 'agua', 'infiltracao', 'vazao'],
  'gás': ['gas', 'gasoduto', 'combustivel', 'fornecimento'],
  'iluminação': ['iluminacao', 'luz', 'eletricidade', 'luminancia', 'intensidade'],
  'ventilação': ['ventilacao', 'ar', 'circulacao', 'fluxo', 'ambiente'],
  'clima': ['clima', 'ar', 'condicao', 'temperatura', 'umidade'],

  // Documentação/procedimentos
  'projeto': ['projeto', 'plano', 'desenho', 'planta', 'especificacao', 'proposta'],
  'licença': ['licenca', 'autorizacao', 'alvara', 'permissao', 'aprovacao'],
  'alvarã': ['alvara', 'licenca', 'autorizacao', 'permissao'],
  'aprovação': ['aprovacao', 'licenca', 'autorizacao', 'visto', 'aval'],
  'apresentação': ['apresentacao', 'desenho', 'planta', 'projeto', 'documento'],
  'planta': ['planta', 'desenho', 'projeto', 'esquema', 'layout'],

  // Classificação/categorias
  'residencial': ['residencial', 'habitacao', 'casa', 'apartamento', 'moradia'],
  'comercial': ['comercial', 'comercio', 'loja', 'negocio', 'varejo'],
  'industrial': ['industrial', 'industria', 'fabrica', 'producao'],
  'institucional': ['institucional', 'publica', 'governo', 'administracao'],
  'misto': ['misto', 'uso', 'multiplo', 'combinado'],

  // Materiais
  'concreto': ['concreto', 'hormigao', 'cimento', 'argamassa'],
  'aço': ['aco', 'metal', 'ferro', 'estrutura'],
  'tijolos': ['tijolos', 'blocos', 'alvenaria', 'cerâmica'],
  'vidro': ['vidro', 'cristal', 'transparencia', 'translucido'],
  'madeira': ['madeira', 'lenho', 'carpintaria', 'elementos'],

  // Conforto/qualidade
  'conforto': ['conforto', 'qualidade', 'bem-estar', 'ambiente', 'experiencia'],
  'acústica': ['acustica', 'som', 'ruido', 'isolamento', 'ambiente'],
  'térmica': ['termica', 'temperatura', 'isolamento', 'clima', 'conforto'],

  // Limites/restrições
  'limite': ['limite', 'maximo', 'restricao', 'proibicao', 'impedimento'],
  'máximo': ['maximo', 'limite', 'restricao', 'superior', 'topo'],
  'maximo': ['maximo', 'limite', 'restricao', 'superior', 'topo'],
  'mínimo': ['minimo', 'limite', 'inferior', 'base', 'requisito'],
  'minimo': ['minimo', 'limite', 'inferior', 'base', 'requisito'],
  'exigência': ['exigencia', 'requisito', 'obrigacao', 'necessidade', 'demanda'],
  'proibição': ['proibicao', 'veto', 'impedimento', 'restricao', 'limite'],
};

/**
 * Remove accents from Portuguese text
 * á → a, ç → c, ã → a, etc.
 */
export function removeAccents(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Extract meaningful keywords from a natural language query
 * Removes stop words and returns relevant terms
 */
export function extractKeywords(query: string): string[] {
  const normalized = removeAccents(query);
  const words = normalized.split(/\s+/);
  
  // Filter out stop words and short words (< 3 chars)
  const keywords = words
    .filter(word => word.length >= 3)
    .filter(word => !PORTUGUESE_STOP_WORDS.has(word));
  
  // Remove duplicates
  return [...new Set(keywords)];
}

/**
 * Expand terms with synonyms and related terms
 * Returns original terms plus their synonyms
 */
export function expandTerms(terms: string[]): string[] {
  const expanded = new Set(terms);
  
  terms.forEach(term => {
    const synonyms = SYNONYM_MAPPINGS[term];
    if (synonyms) {
      synonyms.forEach(synonym => {
        expanded.add(synonym);
      });
    }
  });
  
  // Add special compound term handling
  // If both "area" and "ocupacao" are present, add "coeficiente"
  const hasArea = terms.some(t => removeAccents(t).includes('area'));
  const hasOcupacao = terms.some(t => removeAccents(t).includes('ocupacao'));
  if (hasArea && hasOcupacao) {
    expanded.add('coeficiente');
    expanded.add('indice');
    expanded.add('taxa');
    expanded.add('densidade');
  }
  
  // If "maximo" with area/ocupacao, add height-related terms
  const hasMaximo = terms.some(t => removeAccents(t).includes('maximo'));
  if ((hasArea || hasOcupacao) && hasMaximo) {
    expanded.add('aproveitamento');
    expanded.add('limite');
  }
  
  return Array.from(expanded);
}

/**
 * Calculate search score based on token matching
 * Higher score for more matches and more important fields
 */
export function calculateSearchScore(
  queryTokens: string[],
  title: string,
  code: string,
  description: string,
  keywords: string[]
): number {
  let score = 0;
  
  const normalizedTitle = removeAccents(title);
  const normalizedCode = removeAccents(code);
  const normalizedDesc = removeAccents(description);
  const normalizedKeywords = keywords.map(k => removeAccents(k));
  
  queryTokens.forEach(token => {
    // Title match (highest weight)
    if (normalizedTitle.includes(token)) score += 10;
    
    // Code match
    if (normalizedCode.includes(token)) score += 8;
    
    // Keywords match
    if (normalizedKeywords.some(k => k.includes(token))) score += 6;
    
    // Description match
    if (normalizedDesc.includes(token)) score += 4;
  });
  
  // Bonus for multiple token matches
  const matchCount = queryTokens.filter(token => 
    normalizedTitle.includes(token) ||
    normalizedCode.includes(token) ||
    normalizedKeywords.some(k => k.includes(token)) ||
    normalizedDesc.includes(token)
  ).length;
  
  if (matchCount > 1) {
    score += matchCount * 2; // Bonus for multiple matches
  }
  
  return score;
}

/**
 * Analyze query intent and extract semantic context
 * Returns structured information about what the user is looking for
 */
export function analyzeQueryIntent(query: string): {
  intent: 'requirement' | 'limit' | 'method' | 'definition' | 'comparison' | 'procedure' | 'classification';
  keywords: string[];
  concepts: string[];
  constraints: string[];
  suggestedSynonyms: string[];
} {
  // Detect intent from question patterns
  let intent: 'requirement' | 'limit' | 'method' | 'definition' | 'comparison' | 'procedure' | 'classification' = 'definition';

  if (/^(qual|quantos?|quanto|o que|quais?)\s+(deve|é|são|eram|podem|precisa|exig|requer|necessita)/i.test(query)) {
    intent = 'requirement';
  } else if (/maximo|minimo|limite|máxima|mínima|acima|abaixo|superio|inferior|meno|mai/i.test(query)) {
    intent = 'limit';
  } else if (/como|de que forma|por que|onde|qual|a forma|procedimento|passo|processo/i.test(query)) {
    intent = 'method';
  } else if (/que é|o que é|significado|definição|conceito|significa/i.test(query)) {
    intent = 'definition';
  } else if (/comparacao|diferenca|comparar|mais|menos|maior|menor|diferente/i.test(query)) {
    intent = 'comparison';
  } else if (/como fazer|passos|etapas|procedimento|processo|sequência/i.test(query)) {
    intent = 'procedure';
  } else if (/tipos|categorias|classificacao|classes|grupos|tipos|espécies/i.test(query)) {
    intent = 'classification';
  }

  const keywords = extractKeywords(query);
  const expanded = expandTerms(keywords);

  // Extract constraints mentioned in query
  const constraints: string[] = [];
  if (/maximo/i.test(query)) constraints.push('maximum');
  if (/minimo/i.test(query)) constraints.push('minimum');
  if (/proibid/i.test(query)) constraints.push('prohibited');
  if (/obrigatorio|exigido|requerido/i.test(query)) constraints.push('required');
  if (/opcional|facultativo|voluntario/i.test(query)) constraints.push('optional');
  if (/transitorio|temporario|provisorio/i.test(query)) constraints.push('temporary');

  // Build suggested synonyms based on keywords
  const suggestedSynonyms = new Set<string>();
  keywords.forEach(kw => {
    const syns = SYNONYM_MAPPINGS[kw];
    if (syns) {
      syns.forEach(s => suggestedSynonyms.add(s));
    }
  });

  return {
    intent,
    keywords,
    concepts: expanded,
    constraints,
    suggestedSynonyms: Array.from(suggestedSynonyms),
  };
}

/**
 * Process a natural language query for search
 * Returns expanded tokens ready for matching
 */
export function processSearchQuery(query: string): string[] {
  const keywords = extractKeywords(query);
  const expanded = expandTerms(keywords);
  return expanded;
}

export interface SearchGuidance {
  intent: 'requirement' | 'limit' | 'method' | 'definition' | 'comparison' | 'procedure' | 'classification';
  keywords: string[];
  expandedTerms: string[];
  suggestedSynonyms: string[];
  constraints: string[];
  hintText: string;
}

export function buildSearchGuidance(query: string): SearchGuidance {
  const queryAnalysis = analyzeQueryIntent(query);
  const keywords = extractKeywords(query);
  const expandedTerms = expandTerms(keywords);
  const hintParts: string[] = [];

  if (queryAnalysis.intent === 'limit') {
    hintParts.push('A consulta busca um limite ou regra numérica; procure termos como máximo, mínimo, limite, coeficiente, índice, taxa.');
  }

  if (keywords.some((term) => ['area', 'superficie', 'terreno', 'lote'].includes(term))) {
    hintParts.push('Se a consulta envolve área ou terreno, procure também por uso do solo, ocupação, aproveitamento, coeficiente de ocupação e índice de ocupação.');
  }

  if (keywords.some((term) => ['ocupacao', 'uso', 'aproveitamento', 'densidade', 'coeficiente', 'taxa'].includes(term))) {
    hintParts.push('Termos de ocupação podem aparecer como coeficiente de ocupação, taxa de ocupação, densidade, aproveitamento e limite de uso do solo.');
  }

  if (keywords.some((term) => ['altura', 'gabarito', 'pavimento', 'andar', 'elevacao'].includes(term))) {
    hintParts.push('Termos de altura podem ser expressos como gabarito, elevação máxima, número de pavimentos ou limite de elevação.');
  }

  if (keywords.some((term) => ['acesso', 'acessibilidade', 'rampa', 'elevador', 'entrada', 'circulacao'].includes(term))) {
    hintParts.push('Termos de acesso podem aparecer como rota de circulação acessível, entrada universal, rampa ou elevador.');
  }

  if (keywords.some((term) => ['seguranca', 'incendio', 'evacuacao', 'rota', 'perigo'].includes(term))) {
    hintParts.push('Termos de segurança podem aparecer como rotas de fuga, prevenção de incêndio, proteção e evacuação.');
  }

  if (hintParts.length === 0) {
    hintParts.push('Procure não apenas as palavras exatas da consulta, mas também sinônimos técnicos e variações conceituais.');
  }

  return {
    intent: queryAnalysis.intent,
    keywords,
    expandedTerms,
    suggestedSynonyms: queryAnalysis.suggestedSynonyms,
    constraints: queryAnalysis.constraints,
    hintText: hintParts.join(' '),
  };
}

export interface InterpretUserQueryResult {
  intent: 'requirement' | 'limit' | 'method' | 'definition' | 'comparison' | 'procedure' | 'classification' | 'general';
  keywords: string[];
  concepts: string[];
  constraints: string[];
  suggestedSynonyms: string[];
  expandedTerms: string[];
  hintText: string;
  aiAnalysis: string;
}

export async function interpretUserQuery(query: string, apiKey: string): Promise<InterpretUserQueryResult> {
  if (!apiKey || apiKey.length < 10) {
    console.warn('[interpretUserQuery] API Key não configurada, retornando análise básica');
    const basicAnalysis = analyzeQueryIntent(query);
    const basicGuidance = buildSearchGuidance(query);
    return {
      ...basicAnalysis,
      expandedTerms: basicGuidance.expandedTerms,
      hintText: basicGuidance.hintText,
      aiAnalysis: "Análise básica devido à falta de API Key."
    };
  }

  const openRouter = new OpenRouterClient(apiKey);

  const prompt = `Você é um assistente de IA especializado em interpretar consultas de usuários sobre normas arquitetônicas e de construção. Sua tarefa é analisar a consulta do usuário e extrair informações semânticas detalhadas para otimizar uma busca em um banco de dados de normas.\n\nConsulta do Usuário: "${query}"\n\nSua análise deve ser estruturada no formato JSON e incluir os seguintes campos:\n\n1.  **intent**: A intenção principal da consulta. Escolha uma das seguintes categorias: 'requirement' (requisito/obrigação), 'limit' (limite/restrição numérica), 'method' (como fazer/procedimento), 'definition' (definição/significado), 'comparison' (comparação), 'procedure' (sequência de passos), 'classification' (tipos/categorias) ou 'general' (se a intenção não for clara ou for muito ampla).\n2.  **keywords**: Uma lista de palavras-chave principais extraídas da consulta, relevantes para a busca.\n3.  **concepts**: Uma lista de conceitos técnicos e termos relacionados que a IA deve procurar, expandindo as palavras-chave.\n4.  **constraints**: Quaisquer restrições ou condições mencionadas na consulta (ex: "máximo", "mínimo", "proibido", "obrigatório").\n5.  **suggestedSynonyms**: Sinônimos e termos alternativos que podem ser usados para refinar a busca.\n6.  **expandedTerms**: Termos expandidos que incluem sinônimos e termos relacionados para uma busca mais abrangente.\n7.  **hintText**: Um texto curto (1-2 frases) com dicas para a IA de busca sobre o que procurar especificamente com base na análise da consulta.\n8.  **aiAnalysis**: Uma breve análise em linguagem natural (1-3 frases) sobre o que a IA entendeu da consulta e como ela planeja abordá-la.\n\nExemplo de saída JSON:\n{\n  "intent": "limit",\n  "keywords": ["altura", "edificio"],\n  "concepts": ["altura máxima", "gabarito", "limite de elevação"],\n  "constraints": ["máximo"],\n  "suggestedSynonyms": ["gabarito", "elevação"],\n  "expandedTerms": ["altura", "edificio", "gabarito", "elevação máxima", "limite de elevação"],\n  "hintText": "A consulta busca um limite de altura para edifícios; procure por termos como gabarito, altura máxima, número de pavimentos.",\n  "aiAnalysis": "A IA interpretou a consulta como uma busca por limites de altura para edificações, focando em termos técnicos e sinônimos para garantir a abrangência da busca."
}\n\nCertifique-se de que a saída seja um JSON válido e completo.`;

  const messages: OpenRouterMessage[] = [{ role: "user", content: prompt }];

  try {
    const response = await openRouter.chatCompletion(
      messages,
      'google/gemma-4-31b-it:free',
      0.3,
      { type: 'json_object' }
    );

    const responseText = response.choices[0]?.message?.content || '{}';
    const parsedResponse = JSON.parse(responseText);

    return {
      intent: parsedResponse.intent || 'general',
      keywords: parsedResponse.keywords || [],
      concepts: parsedResponse.concepts || [],
      constraints: parsedResponse.constraints || [],
      suggestedSynonyms: parsedResponse.suggestedSynonyms || [],
      expandedTerms: parsedResponse.expandedTerms || [],
      hintText: parsedResponse.hintText || 'Procure não apenas as palavras exatas da consulta, mas também sinônimos técnicos e variações conceituais.',
      aiAnalysis: parsedResponse.aiAnalysis || 'A IA realizou uma análise da consulta do usuário.',
    };

  } catch (error) {
    console.error('[interpretUserQuery] Erro ao chamar a API da IA para interpretação da consulta:', error);
    const basicAnalysis = analyzeQueryIntent(query);
    const basicGuidance = buildSearchGuidance(query);
    return {
      ...basicAnalysis,
      expandedTerms: basicGuidance.expandedTerms,
      hintText: basicGuidance.hintText,
      aiAnalysis: `Falha na interpretação da IA: ${error instanceof Error ? error.message : String(error)}. Usando análise básica.`,
    };
  }
}
