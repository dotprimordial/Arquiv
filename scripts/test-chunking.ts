import fs from 'fs';
import path from 'path';
import { chunkDocument, splitContentIntoArticles } from '../lib/semantic-search.ts';

// Minimal types to match NormSection interface
interface NormSection {
  sectionType: string;
  sectionNumber?: string;
  sectionTitle?: string;
  content: string;
  orderIndex: number;
}

async function run() {
  const samplePath = path.join(process.cwd(), 'scripts', 'sample_norm.txt');
  let text = '';
  if (fs.existsSync(samplePath)) {
    text = fs.readFileSync(samplePath, 'utf-8');
  } else {
    text = `Art. 1º. Este é um artigo de exemplo.\n\nArt. 2º. Este é o segundo artigo. Contém várias frases. Ainda mais texto para forçar chunking se necessário.\n\nArt. 3º. Texto adicional...`;
  }

  // crude split into articles using the project's helper if available
  // fallback: split by regex
  const articleRegex = /(Art(?:igo)?\.?\s*\d+[º°]?)/gi;
  const matches: Array<{ index: number; text: string }> = [];
  const parts = text.split(/\n{2,}/g).map(s => s.trim()).filter(Boolean);

  // Build NormSection-like
  const sections: NormSection[] = parts.map((p, i) => ({
    sectionType: 'artigo',
    sectionNumber: String(i + 1),
    sectionTitle: undefined,
    content: p,
    orderIndex: i,
  }));

  const chunks = chunkDocument(sections as any, 5000, 300, 200);

  console.log('Sample text length:', text.length);
  console.log('Articles found:', sections.length);
  console.log('Chunks created:', chunks.length);
  chunks.forEach((c: any, idx: number) => {
    console.log(`-- Chunk ${idx}: len=${String(c.content.length).padStart(4,' ')} section=${c.sectionNumber}`);
  });
}

run().catch((err) => { console.error(err); process.exit(1); });
