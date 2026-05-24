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
  'solo': ['solo', 'terreno', 'territorio', 'terreno', 'chao', 'solo'],
  'ocupação': ['ocupacao', 'uso', 'utilizacao', 'emprego', 'aproveitamento'],
  'uso': ['uso', 'utilizacao', 'emprego', 'aproveitamento', 'ocupacao'],
  'zoneamento': ['zoneamento', 'zonas', 'zonificacao', 'classificacao', 'categorias'],
  'urbanismo': ['urbanismo', 'urbanizacao', 'cidade', 'urbano', 'municipal'],
  'território': ['territorio', 'area', 'espaco', 'regiao', 'local'],
  
  // Construção/edificação
  'construção': ['construcao', 'edificacao', 'obra', 'edificio', 'estrutura'],
  'edificação': ['edificacao', 'construcao', 'obra', 'edificio', 'predio'],
  'obra': ['obra', 'construcao', 'edificacao', 'trabalho', 'projeto'],
  'edifício': ['edificio', 'predio', 'construcao', 'edificacao', 'bloco'],
  'prédio': ['predio', 'edificio', 'bloco', 'construcao'],
  
  // Segurança
  'segurança': ['seguranca', 'protecao', 'defesa', 'risco', 'perigo'],
  'incêndio': ['incendio', 'fogo', 'combustao', 'queimadura', 'safety'],
  'risco': ['risco', 'perigo', 'ameaca', 'vulnerabilidade'],
  
  // Altura/dimensões
  'altura': ['altura', 'elevacao', 'comprimento', 'nivel', 'piso'],
  'largura': ['largura', 'extensao', 'dimensao', 'tamanho'],
  'área': ['area', 'espaco', 'superficie', 'metragem', 'tamanho'],
  
  // Estacionamento
  'estacionamento': ['estacionamento', 'parqueamento', 'vagas', 'garagem', 'parking'],
  'vaga': ['vaga', 'lugar', 'espaco', 'garagem'],
  
  // Acessibilidade
  'acessibilidade': ['acessibilidade', 'acesso', 'inclusao', 'adaptacao'],
  'acesso': ['acesso', 'entrada', 'saida', 'portao', 'porta'],
  
  // Energia/instalações
  'energia': ['energia', 'eletricidade', 'potencia', 'consumo'],
  'água': ['agua', 'hidraulica', 'abastecimento', 'esgoto'],
  'gás': ['gas', 'gasoduto', 'combustivel'],
  
  // Documentação
  'projeto': ['projeto', 'plano', 'desenho', 'planta', 'especificacao'],
  'licença': ['licenca', 'autorizacao', 'alvara', 'permissao'],
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
 * Process a natural language query for search
 * Returns expanded tokens ready for matching
 */
export function processSearchQuery(query: string): string[] {
  const keywords = extractKeywords(query);
  const expanded = expandTerms(keywords);
  return expanded;
}
