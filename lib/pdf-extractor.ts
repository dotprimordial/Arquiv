// PDF.js precisa ser importado dinamicamente para evitar SSR issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pdfjsLib: any = null;

async function initPdfJs() {
  if (typeof window === 'undefined') {
    throw new Error('PDF extraction only works in browser environment');
  }
  
  if (!pdfjsLib) {
    pdfjsLib = await import('pdfjs-dist');
    // Configurar o worker do PDF.js
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  }
  
  return pdfjsLib;
}

/**
 * Extrai texto de um arquivo PDF
 * @param file Arquivo PDF
 * @returns Texto extraído do PDF
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    const pdfjs = await initPdfJs();
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    
    // Extrair texto de cada página
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pageText = (textContent.items as any[])
        .map((item) => item.str as string)
        .join(' ');
      fullText += pageText + '\n\n';
    }
    
    // Limpar o texto
    fullText = fullText
      .replace(/\s+/g, ' ')  // Normalizar espaços
      .replace(/\n\s*\n/g, '\n\n')  // Normalizar quebras de linha
      .trim();
    
    console.log(`[PDF Extractor] Texto extraído: ${fullText.length} caracteres de ${pdf.numPages} páginas`);
    
    return fullText;
  } catch (error) {
    console.error('[PDF Extractor] Erro ao extrair texto:', error);
    throw new Error('Falha ao extrair texto do PDF. Verifique se o arquivo não está corrompido.');
  }
}

/**
 * Extrai texto de um PDF e limita ao tamanho máximo
 * @param file Arquivo PDF
 * @param maxLength Tamanho máximo do texto (padrão: 50000)
 * @returns Texto extraído limitado
 */
export async function extractTextFromPDFLimited(file: File, maxLength: number = 50000): Promise<string> {
  const text = await extractTextFromPDF(file);
  
  if (text.length > maxLength) {
    console.log(`[PDF Extractor] Texto truncado de ${text.length} para ${maxLength} caracteres`);
    return text.substring(0, maxLength) + '\n\n[... conteúdo truncado devido ao tamanho ...]';
  }
  
  return text;
}
