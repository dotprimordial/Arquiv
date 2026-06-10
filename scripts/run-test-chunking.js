const path = require('path');
const semantic = require('../.tmp/semantic-search');

(async () => {
  // Build a sample document with multiple articles
  const text = `Art. 1º. Este é um artigo de exemplo com conteúdo.\n\nArt. 2º. Este é o segundo artigo. Contém várias frases. Ainda mais texto para forçar chunking se necessário. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.`;

  // crude split into articles using regex
  const articleRegex = /(Art(?:igo)?\.\s*\d+[º°]?)/gi;
  const parts = text.split(/\n{2,}/g).map(s => s.trim()).filter(Boolean);

  const sections = parts.map((p, i) => ({
    sectionType: 'artigo',
    sectionNumber: String(i + 1),
    sectionTitle: undefined,
    content: p,
    orderIndex: i,
  }));

  const chunks = semantic.chunkDocument(sections, 5000, 300, 200);

  console.log('Sample text length:', text.length);
  console.log('Articles found:', sections.length);
  console.log('Chunks created:', chunks.length);
  chunks.forEach((c, idx) => {
    console.log(`-- Chunk ${idx}: len=${String(c.content.length).padStart(4,' ')} section=${c.sectionNumber}`);
  });
})();
