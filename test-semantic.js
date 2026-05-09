// Test script for extractBestSnippet logic
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

function extractBestSnippet(content, query, maxLen = 400) {
  const clean = cleanHtmlFormatting(content || '');
  if (!clean) return '';

  const q = query.trim().toLowerCase();
  const terms = q.split(/\s+/).filter(Boolean);

  if (terms.length === 0) {
    return clean.length > maxLen ? clean.substring(0, maxLen).trim() + '...' : clean;
  }

  let idx = -1;
  for (const term of terms) {
    const i = clean.toLowerCase().indexOf(term);
    if (i !== -1 && (idx === -1 || i < idx)) idx = i;
  }

  if (idx === -1) {
    // Return empty to indicate no match found
    return '';
  }

  const half = Math.floor(maxLen / 2);
  let start = Math.max(0, idx - half);
  if (start > 0) {
    const spaceIdx = clean.lastIndexOf(' ', start);
    if (spaceIdx !== -1) start = spaceIdx + 1;
  }
  let end = Math.min(clean.length, start + maxLen);
  if (end < clean.length) {
    const spaceIdx = clean.indexOf(' ', end);
    if (spaceIdx !== -1) end = spaceIdx;
  }

  let snippet = clean.substring(start, end).trim();
  if (start > 0) snippet = '...' + snippet;
  if (end < clean.length) snippet = snippet + '...';
  return snippet;
}

// Sample long document with the target phrase
const sample = `CAPÍTULO I - DISPOSIÇÕES GERAIS\n\nArt. 1º Esta norma estabelece as regras gerais para construções.\n\nArt. 2º As definições aplicáveis são as seguintes...\n\nCAPÍTULO II - ALTURAS\n\nArt. 10. A altura máxima permitida para edificações residenciais é de 10 metros, exceto quando regulamentação local determinar outro valor.\n\n§1º Nos casos de terrenos inclinados, a altura máxima deverá ser calculada a partir do ponto mais baixo da cota do terreno adjacente.\n\nArt. 11. Em zonas históricas, a altura máxima será reduzida para preservar o perfil urbano.\n\nCAPÍTULO III - SEGURANÇA\n\nArt. 20. Instalações elétricas devem seguir as normas técnicas vigentes.\n\nObservação: Para perguntas sobre "altura máxima" consulte o Art. 10 que descreve especificamente o limite de 10 metros.
\n`;

const query = 'altura máxima';
const snippet = extractBestSnippet(sample, query, 300);
console.log('Query:', query);
console.log('Snippet:\n', snippet);

// Also test when term not present
const snippet2 = extractBestSnippet(sample, 'ventilação', 200);
console.log('\nQuery: ventilação');
console.log('Snippet:\n', snippet2);
