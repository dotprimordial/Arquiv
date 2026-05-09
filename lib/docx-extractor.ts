import mammoth from 'mammoth';

/**
 * Extrai texto de um arquivo DOCX
 * @param file Arquivo DOCX
 * @returns Texto extraído do documento
 */
export async function extractTextFromDOCX(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    // Extrair texto usando mammoth
    const result = await mammoth.extractRawText({ arrayBuffer });
    
    let text = result.value;
    
    // Limpar o texto
    text = text
      .replace(/\n\s*\n\s*\n/g, '\n\n')  // Normalizar múltiplas quebras
      .replace(/^\s+|\s+$/g, '')         // Trim
      .trim();
    
    console.log(`[DOCX Extractor] Texto extraído: ${text.length} caracteres`);
    
    if (result.messages.length > 0) {
      console.log('[DOCX Extractor] Mensagens:', result.messages);
    }
    
    return text;
  } catch (error) {
    console.error('[DOCX Extractor] Erro ao extrair texto:', error);
    throw new Error('Falha ao extrair texto do DOCX. Verifique se o arquivo não está corrompido.');
  }
}

/**
 * Extrai texto de DOCX com formatação HTML preservada
 * @param file Arquivo DOCX
 * @returns HTML do documento
 */
export async function extractHTMLFromDOCX(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    
    // Extrair como HTML para preservar formatação
    const result = await mammoth.convertToHtml({ arrayBuffer }, {
      styleMap: [
        "p[style-name='Heading 1'] => h1",
        "p[style-name='Heading 2'] => h2",
        "p[style-name='Heading 3'] => h3",
        "p[style-name='Heading 4'] => h4",
        "p[style-name='Heading 5'] => h5",
        "p[style-name='Heading 6'] => h6",
        "p[style-name='Quote'] => blockquote",
      ]
    });
    
    let html = result.value;
    
    // Limpar HTML
    html = html
      .replace(/<p><\/p>/g, '')           // Remover parágrafos vazios
      .replace(/\n\s*\n/g, '\n')          // Normalizar quebras
      .trim();
    
    console.log(`[DOCX Extractor] HTML extraído: ${html.length} caracteres`);
    
    return html;
  } catch (error) {
    console.error('[DOCX Extractor] Erro ao extrair HTML:', error);
    throw new Error('Falha ao extrair HTML do DOCX.');
  }
}

/**
 * Extrai texto de DOCX com limite de caracteres
 * @param file Arquivo DOCX
 * @param maxLength Limite máximo de caracteres
 * @param preserveFormatting Se true, retorna HTML; se false, retorna texto puro
 * @returns Texto ou HTML extraído
 */
export async function extractTextFromDOCXLimited(
  file: File, 
  maxLength: number = 50000,
  preserveFormatting: boolean = true
): Promise<string> {
  const text = preserveFormatting 
    ? await extractHTMLFromDOCX(file)
    : await extractTextFromDOCX(file);
  
  if (text.length > maxLength) {
    console.log(`[DOCX Extractor] Texto truncado de ${text.length} para ${maxLength} caracteres`);
    const truncated = text.substring(0, maxLength);
    return preserveFormatting 
      ? truncated + '<p><em>[... conteúdo truncado ...]</em></p>'
      : truncated + '\n\n[... conteúdo truncado ...]';
  }
  
  return text;
}
