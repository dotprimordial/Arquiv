/**
 * Search Utilities for Natural Language Processing
 * Extracts keywords, expands terms, and normalizes text for better search matching
 */

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
  'grande', 'pequeno', 'alto', 'baixo', 'longo', 'curto',
  'este', 'esta', 'isto', 'esse', 'essa', 'isso', 'aquele', 'aquela', 'aquilo',
  'meu', 'minha', 'meus', 'minhas', 'teu', 'tua', 'teus', 'tuas',
  'nosso', 'nossa', 'nossos', 'nossas', 'seu', 'sua', 'seus', 'suas',
  'todo', 'toda', 'todos', 'todas', 'algum', 'alguma', 'alguns', 'algumas',
  'nenhum', 'nenhuma', 'nenhuns', 'nenhumas', 'cada', 'outro', 'outros',
]);

// Domain-specific synonym mappings for architectural/urban planning terms
const SYNONYM_MAPPINGS: Record<string, string[]> = {
  // Solo/território
  'solo': ['solo', 'terreno', 'territorio', 'terreno', 'chao', 'solo', 'lote', 'parcela'],
  'ocupação': ['ocupacao', 'uso', 'utilizacao', 'emprego', 'aproveitamento', 'ocupacao'],
  'uso': ['uso', 'utilizacao', 'emprego', 'aproveitamento', 'ocupacao', 'destinacao'],
  'zoneamento': ['zoneamento', 'zonas', 'zonificacao', 'classificacao', 'categorias', 'zonas'],
  'urbanismo': ['urbanismo', 'urbanizacao', 'cidade', 'urbano', 'municipal', 'planejamento'],
  'território': ['territorio', 'area', 'espaco', 'regiao', 'local', 'lote'],
  'lote': ['lote', 'parcela', 'terreno', 'solo', 'gleba'],

  // Construção/edificação
  'construção': ['construcao', 'edificacao', 'obra', 'edificio', 'estrutura', 'empreendimento'],
  'edificação': ['edificacao', 'construcao', 'obra', 'edificio', 'predio', 'empreendimento'],
  'obra': ['obra', 'construcao', 'edificacao', 'trabalho', 'projeto', 'empreendimento'],
  'edifício': ['edificio', 'predio', 'construcao', 'edificacao', 'bloco', 'torre'],
  'prédio': ['predio', 'edificio', 'bloco', 'construcao', 'estrutura'],
  'estrutura': ['estrutura', 'armacao', 'esqueleto', 'construcao', 'fundacao'],
  'fundação': ['fundacao', 'alicerce', 'estrutura', 'base', 'estaqueamento'],

  // Segurança
  'segurança': ['seguranca', 'protecao', 'defesa', 'risco', 'perigo', 'prevencao'],
  'incêndio': ['incendio', 'fogo', 'combustao', 'queimadura', 'safety', 'prevencao'],
  'risco': ['risco', 'perigo', 'ameaca', 'vulnerabilidade', 'seguranca'],
  'proteção': ['protecao', 'seguranca', 'defesa', 'prevencao', 'resistencia'],
  'evacuação': ['evacuacao', 'fuga', 'saida', 'rota', 'passagem'],

  // Altura/dimensões
  'altura': ['altura', 'elevacao', 'comprimento', 'nivel', 'piso', 'pavimento'],
  'largura': ['largura', 'extensao', 'dimensao', 'tamanho', 'amplitude'],
  'profundidade': ['profundidade', 'dimensao', 'espessura', 'tamanho'],
  'área': ['area', 'espaco', 'superficie', 'metragem', 'tamanho', 'extensao'],
  'coeficiente': ['coeficiente', 'indice', 'taxa', 'proporcao', 'relacao'],
  'recuo': ['recuo', 'afastamento', 'distancia', 'margem', 'espaco'],
  'gabarito': ['gabarito', 'altura', 'limite', 'restricao', 'padrao'],

  // Estacionamento
  'estacionamento': ['estacionamento', 'parqueamento', 'vagas', 'garagem', 'parking', 'parada'],
  'vaga': ['vaga', 'lugar', 'espaco', 'garagem', 'parada'],
  'garagem': ['garagem', 'estacionamento', 'parqueamento', 'vaga'],

  // Acessibilidade
  'acessibilidade': ['acessibilidade', 'acesso', 'inclusao', 'adaptacao', 'mobilidade'],
  'acesso': ['acesso', 'entrada', 'saida', 'portao', 'porta', 'passagem'],
  'rota': ['rota', 'caminho', 'percurso', 'trajetoria', 'passagem'],
  'elevador': ['elevador', 'ascensor', 'plataforma', 'acessibilidade'],
  'rampa': ['rampa', 'declividade', 'inclinacao', 'acesso', 'acessibilidade'],

  // Energia/instalações
  'energia': ['energia', 'eletricidade', 'potencia', 'consumo', 'fornecimento'],
  'água': ['agua', 'hidraulica', 'abastecimento', 'esgoto', 'fornecimento'],
  'esgoto': ['esgoto', 'agua', 'drenagem', 'sanitario', 'coleta'],
  'drenagem': ['drenagem', 'esgoto', 'escoamento', 'agua', 'infiltracao'],
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
  'mínimo': ['minimo', 'limite', 'inferior', 'base', 'requisito'],
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
