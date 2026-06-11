const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

async function extractToMarkdown(pdfPath, mdPath) {
  const data = fs.readFileSync(pdfPath);
  const parsed = await pdf(data);
  // Simple cleanup: trim and ensure newlines
  const text = parsed.text.trim();
  fs.writeFileSync(mdPath, text, 'utf8');
  console.log(`✅ ${path.basename(pdfPath)} → ${path.basename(mdPath)}`);
}

(async () => {
  try {
    const srcDir = path.resolve(__dirname, '..', 'Politicas'); // original PDFs location
    const destDir = path.resolve(__dirname, '..', 'public', 'Politicas');
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

    const files = fs.readdirSync(srcDir).filter(f => f.toLowerCase().endsWith('.pdf'));
    for (const file of files) {
      const pdfPath = path.join(srcDir, file);
      const mdName = path.parse(file).name + '.md';
      const mdPath = path.join(destDir, mdName);
      await extractToMarkdown(pdfPath, mdPath);
    }
  } catch (err) {
    console.error('Extraction failed:', err);
    process.exit(1);
  }
})();
