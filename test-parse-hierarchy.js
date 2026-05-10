function parseHierarchyFromText(text) {
  const res = { chapter: null, article: null, paragraph: null };
  if (!text) return res;
  const t = text.replace(/\n+/g, ' ');
  const chapMatch = t.match(/(?:CAP[IÍ]TULO|Capítulo|CAPITULO)\s+([IVXLCDM]+|\d+|[A-Z0-9]+)\b/i);
  if (chapMatch) res.chapter = chapMatch[0].trim();
  const artMatch = t.match(/\b(?:Art\.|Artigo|Art)\s*\d{1,4}(?:º|ª)?\b/i);
  if (artMatch) res.article = artMatch[0].trim();
  const paraMatch = t.match(/§\s*\d+|Par[aá]grafo\s+\w+/i);
  if (paraMatch) res.paragraph = paraMatch[0].trim();
  return res;
}

const samples = [
  "CAPÍTULO II - ALTURAS. Art. 10. A altura máxima permitida...",
  "Art. 5º Conteúdo importante sobre segurança.",
  "§1º Nos casos..., Parágrafo único.",
  "Sem referências aqui, apenas texto comum.",
  "Capítulo III Seção 2 Artigo 20 - Disposições.",
];

for (const s of samples) {
  console.log('Text:', s);
  console.log('Parsed:', parseHierarchyFromText(s));
  console.log('---');
}
