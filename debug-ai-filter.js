// Small debug script to emulate AI excerpt validation logic
// Runs in plain Node to show which excerpts pass the expanded-term check

function cleanHtmlFormatting(text) {
  return String(text)
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeText(s) {
  if (!s) return '';
  const t = cleanHtmlFormatting(s).toLowerCase();
  const noDiacritics = t.normalize('NFD').replace(/\p{M}/gu, '');
  const cleaned = noDiacritics.replace(/[^\p{L}\p{N}\s]/gu, ' ');
  return cleaned.replace(/\s+/g, ' ').trim();
}

function expandQuery(q) {
  const base = normalizeText(q || '');
  if (!base) return [];
  const terms = new Set();
  terms.add(base);
  const map = {
    'altura': ['altura', 'altura maxima', 'altura maxima permitida', 'limite de altura', 'altura permitida'],
    'edificacao': ['edificacao', 'edificacoes', 'edificio', 'predio', 'predios', 'construcao'],
    'edificacoes': ['edificacao', 'edificacoes', 'edificio', 'predio', 'predios'],
    'fachada': ['fachada', 'fachadas', 'alinhamento de fachadas', 'alinhamento'],
    'ventilacao': ['ventilacao', 'ventilacao natural', 'ventilacao mecanica', 'arejamento'],
    'altura de edificacoes': ['altura', 'altura maxima', 'limite de altura', 'altura de edificacoes'],
    'altura maxima': ['altura maxima', 'altura maxima permitida', 'limite de altura'],
  };
  if (map[base]) map[base].forEach(t => terms.add(normalizeText(t)));
  const tokens = base.split(/\s+/).filter(Boolean);
  for (const tk of tokens) {
    if (map[tk]) map[tk].forEach(t => terms.add(normalizeText(t)));
    if (tk.endsWith('s')) terms.add(normalizeText(tk.replace(/s$/, '')));
    else terms.add(normalizeText(tk + 's'));
  }
  tokens.forEach(t => terms.add(normalizeText(t)));
  return Array.from(terms).filter(Boolean);
}

// Emulate validation
function validateExcerpt(excerpt, query) {
  const MIN_EXCERPT_LENGTH = 30;
  if (!excerpt || excerpt.trim().length < MIN_EXCERPT_LENGTH) return false;
  const expanded = expandQuery(query);
  const normalizedExpanded = expanded.map(t => normalizeText(t));
  const excerptNorm = normalizeText(excerpt);
  const containsTerm = normalizedExpanded.some(t => t && excerptNorm.includes(t));
  return { pass: containsTerm, excerptNormSample: excerptNorm.substring(0,200), expanded };
}

const query = 'altura de edificações';

const aiResults = [
  { excerpt: 'A altura máxima permitida para edificações residenciais é de 10 metros.' },
  { excerpt: 'Limite de altura: 10m em zona residencial.' },
  { excerpt: 'As fachadas devem acompanhar o alinhamento dominante.' },
  { excerpt: 'Altura de edificação: não aplicável.' },
  { excerpt: 'Este texto não tem nada relevante.' },
  { excerpt: 'Altura máxima permitida para edificações residenciais é de 10 metros; §1º aplica-se.' },
  { excerpt: 'Altura máxima permitida para edificações residenciais é de 10 metros.' },
  { excerpt: 'ALTURA Máxima permitida para edificações residenciais é de 10 metros.' },
];

console.log('Expanded terms for query:', expandQuery(query).slice(0,20));
for (let i = 0; i < aiResults.length; i++) {
  const r = aiResults[i];
  const res = validateExcerpt(r.excerpt, query);
  console.log(`\n[${i}] pass=${res.pass} excerpt="${r.excerpt}"`);
  if (!res.pass) console.log('    excerptNormSample:', res.excerptNormSample);
}
