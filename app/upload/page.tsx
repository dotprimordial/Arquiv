'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { FileText, AlertCircle, Loader2, ArrowLeft, Upload, File } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { extractDocumentStructure } from '@/lib/gemini';
import { processAndUploadNorm } from '@/app/actions/norm-actions';
import Link from 'next/link';
import nextDynamic from 'next/dynamic';
import 'react-quill-new/dist/quill.snow.css';

// Import ReactQuill dynamically to avoid SSR issues
const ReactQuill = nextDynamic(() => import('react-quill-new'), { ssr: false });

// FIX: limite do texto guardado no Supabase (5 MB de texto)
const MAX_CONTENT_LENGTH = 5 * 1024 * 1024;

const ADMIN_EMAIL = 'seantomasytbr@gmail.com';
const PDF_BUCKET_NAME = 'arquiv-files'; // Bucket criado pelo usuário

// Função para gerar nome da pasta baseado no país
const getCountryFolder = (countryName: string): string => {
  const countryMap: { [key: string]: string } = {
    'Brasil': 'brasil',
    'Portugal': 'portugal',
    'Estados Unidos': 'estados-unidos',
    'Reino Unido': 'reino-unido',
    'Alemanha': 'alemanha',
    'França': 'franca',
    'Espanha': 'espanha',
    'Angola': 'angola',
    'Moçambique': 'mocambique'
  };
  
  return countryMap[countryName] || countryName.toLowerCase().replace(/\s+/g, '-');
};

export default function UploadPage() {
  const [normDecree, setNormDecree] = useState('');
  const [normName, setNormName] = useState('');
  const [country, setCountry] = useState('Portugal');
  const [category, setCategory] = useState('Urbanismo');
  const [normContent, setNormContent] = useState('');
  const [contentType, setContentType] = useState<'text' | 'pdf'>('text');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [autoCategories, setAutoCategories] = useState<string[]>([]);

  const router = useRouter();

  // Função para analisar e categorizar documento
  const analyzeDocument = async (content: string, title: string) => {
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const result = await extractDocumentStructure(content, title);
      setAutoCategories(result.categories);
      
      // Se a categoria atual não estiver nas categorias sugeridas, usar a primeira sugerida
      if (result.categories.length > 0 && !result.categories.includes(category)) {
        setCategory(result.categories[0]);
      }
      
      // Atualizar o conteúdo com a versão estruturada
      setNormContent(result.structuredContent);
      
    } catch (err) {
      console.error("Erro na análise:", err);
      setError("Falha ao analisar o documento. Você pode continuar sem a análise automática.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      if (session.user.email !== ADMIN_EMAIL) {
        router.push('/');
        return;
      }
      setIsCheckingAuth(false);
    };
    checkAuth();
  }, [router]);

  const categories = [
    "Urbanismo", "Estruturas", "Segurança contra Incêndio", 
    "Acessibilidade", "Instalações Elétricas", "Instalações Hidráulicas", 
    "Térmica e Acústica", "Materiais", "Sustentabilidade", "Apresentação/Desenho"
  ];

  const countries = [
    { code: 'BR', name: 'Brasil' },
    { code: 'PT', name: 'Portugal' },
    { code: 'US', name: 'Estados Unidos' },
    { code: 'GB', name: 'Reino Unido' },
    { code: 'DE', name: 'Alemanha' },
    { code: 'FR', name: 'França' },
    { code: 'ES', name: 'Espanha' },
    { code: 'AO', name: 'Angola' },
    { code: 'MZ', name: 'Moçambique' },
  ];

  const handlePdfUpload = async (file: File) => {
    if (file.type !== 'application/pdf') {
      setError('Por favor, selecione um arquivo PDF válido.');
      return;
    }

    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      setError('O arquivo PDF é muito grande. O limite é de 50MB.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const fileName = `${Date.now()}-${file.name}`;
      const countryFolder = getCountryFolder(country);
      const filePath = `${countryFolder}/${fileName}`;
      
      // Lista de buckets para tentar em ordem
      const bucketsToTry = [
        PDF_BUCKET_NAME, // 'arquiv-files' - seu bucket personalizado
        'arquiv-files',  // garantir que tenta o nome correto
        'Arquiv',        // tentar com maiúscula
        'arquiv',        // tentar com minúscula
        'documents',     // bucket comum para documentos
        'public',        // bucket público padrão
        'uploads'        // outro bucket comum
      ];
      
      let uploadSuccess = false;
      let finalPublicUrl = '';
      
      for (const bucketName of bucketsToTry) {
        try {
          console.log(`Tentando upload no bucket: ${bucketName}`);
          
          const { error: uploadError } = await supabase.storage
            .from(bucketName)
            .upload(filePath, file);

          if (!uploadError) {
            // Upload bem-sucedido
            const { data: { publicUrl } } = supabase.storage
              .from(bucketName)
              .getPublicUrl(filePath);
            
            finalPublicUrl = publicUrl;
            uploadSuccess = true;
            console.log(`Upload bem-sucedido no bucket: ${bucketName}`);
            break;
          } else {
            console.log(`Bucket ${bucketName} falhou:`, uploadError.message);
          }
        } catch (bucketError) {
          console.log(`Erro ao tentar bucket ${bucketName}:`, bucketError);
          continue;
        }
      }
      
      if (!uploadSuccess) {
        throw new Error('Nenhum bucket disponível para upload. Verifique se os buckets "arquiv-files", "Arquiv", "arquiv", "documents", "public" ou "uploads" existem no Supabase Storage.');
      }

      setPdfUrl(finalPublicUrl);
      setPdfFile(file);
    } catch (err: unknown) {
      setError('Erro ao fazer upload do PDF: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (contentType === 'text' && !normContent.trim()) {
      setError('Por favor, insira o conteúdo da norma.');
      return;
    }

    if (contentType === 'pdf' && !pdfUrl) {
      setError('Por favor, faça upload do arquivo PDF.');
      return;
    }

    if (contentType === 'text' && normContent.length > MAX_CONTENT_LENGTH) {
      setError(`O conteúdo é demasiado longo. O limite é de ${MAX_CONTENT_LENGTH / 1024 / 1024} MB de texto.`);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.email !== ADMIN_EMAIL) {
        throw new Error('Apenas administradores podem adicionar normas.');
      }

      // Usar categorias e palavras-chave automáticas se disponíveis
      const finalCategory = autoCategories.length > 0 ? autoCategories[0] : category;

      const result = await processAndUploadNorm({
        code: normDecree,
        title: normName,
        country,
        category: finalCategory,
        fileType: contentType,
        fileUrl: pdfUrl,
        content: normContent,
        uploadedBy: user.id,
      });

      console.log('Norma processada com sucesso:', result);
      toast.success('Norma processada com sucesso!', {
        description: `Seções: ${result.sectionsCreated} | Embeddings: ${result.embeddingsGenerated}`,
      });

      router.push('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar norma. Por favor tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const modules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      [{ 'align': [] }],
      [{ 'color': [] }, { 'background': [] }],
      ['clean']
    ],
  }), []);

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9F9F8]">
        <Loader2 className="w-12 h-12 animate-spin text-zinc-900" />
      </div>
    );
  }

  const isButtonDisabled = isLoading || 
    (contentType === 'text' && !normContent.replace(/<(.|\n)*?>/g, '').trim()) ||
    (contentType === 'pdf' && !pdfUrl);

  return (
    <div className="min-h-screen bg-[#F9F9F8] text-zinc-900 selection:bg-zinc-900 selection:text-white pb-20">
      <div className="max-w-4xl mx-auto px-6 pt-12">
        <Link 
          href="/"
          className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-900 transition-colors mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Voltar ao Início
        </Link>

        <div className="bg-white rounded-[32px] shadow-sm border border-zinc-100 overflow-hidden">
          <div className="p-8 md:p-12">
            <div className="mb-12">
              <h1 className="text-4xl font-bold font-serif tracking-tight text-zinc-900 mb-4">
                Adicionar Nova Norma
              </h1>
              <p className="text-zinc-500 text-lg">
                Preencha os detalhes e insira o conteúdo completo da norma abaixo.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-zinc-400 ml-1">Decreto / Código</label>
                  <input
                    type="text"
                    required
                    className="w-full px-5 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl focus:ring-4 focus:ring-zinc-100 focus:border-zinc-300 outline-none transition-all text-lg"
                    placeholder="Ex: RGEU, NBR 9050"
                    value={normDecree}
                    onChange={(e) => setNormDecree(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-zinc-400 ml-1">Nome da Norma</label>
                  <input
                    type="text"
                    required
                    className="w-full px-5 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl focus:ring-4 focus:ring-zinc-100 focus:border-zinc-300 outline-none transition-all text-lg"
                    placeholder="Ex: Regulamento Geral das Edificações..."
                    value={normName}
                    onChange={(e) => setNormName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-zinc-400 ml-1">País</label>
                  <select
                    className="w-full px-5 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl focus:ring-4 focus:ring-zinc-100 focus:border-zinc-300 outline-none transition-all appearance-none text-lg"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                  >
                    {countries.map(c => (
                      <option key={c.code} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-zinc-400 ml-1">Categoria</label>
                  <select
                    className="w-full px-5 py-4 bg-zinc-50 border border-zinc-100 rounded-2xl focus:ring-4 focus:ring-zinc-100 focus:border-zinc-300 outline-none transition-all appearance-none text-lg"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    {categories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-400 ml-1">Tipo de Conteúdo</label>
                <div className="flex gap-2 xs:gap-4">
                  <button
                    type="button"
                    onClick={() => setContentType('text')}
                    className={`flex-1 py-3 px-3 xs:px-4 rounded-xl border-2 transition-all font-medium text-xs xs:text-sm ${
                      contentType === 'text'
                        ? 'border-zinc-900 bg-zinc-900 text-white'
                        : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300'
                    }`}
                  >
                    <FileText className="w-4 h-4 inline mr-1 xs:mr-2" />
                    <span className="hidden xs:inline">Texto</span>
                    <span className="inline xs:hidden">TXT</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setContentType('pdf')}
                    className={`flex-1 py-3 px-3 xs:px-4 rounded-xl border-2 transition-all font-medium text-xs xs:text-sm ${
                      contentType === 'pdf'
                        ? 'border-zinc-900 bg-zinc-900 text-white'
                        : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300'
                    }`}
                  >
                    <File className="w-4 h-4 inline mr-1 xs:mr-2" />
                    <span className="hidden xs:inline">PDF</span>
                    <span className="inline xs:hidden">PDF</span>
                  </button>
                </div>
              </div>

              {contentType === 'text' ? (
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-zinc-400 ml-1">
                    Conteúdo da Norma
                  </label>
                  <div className="rich-text-editor">
                    <ReactQuill
                      theme="snow"
                      value={normContent}
                      onChange={setNormContent}
                      modules={modules}
                      placeholder="Cole ou digite aqui o texto completo da norma com formatação..."
                      className="bg-zinc-50 rounded-3xl overflow-hidden border border-zinc-100"
                    />
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <div className="text-xs text-zinc-400 font-medium">
                      {normContent.replace(/<(.|\n)*?>/g, '').length.toLocaleString()} caracteres (sem formatação)
                    </div>
                    {normContent.length > 100 && !isAnalyzing && (
                      <button
                        type="button"
                        onClick={() => analyzeDocument(normContent.replace(/<(.|\n)*?>/g, ''), normName)}
                        className="text-xs bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        🧠 Analisar Documento
                      </button>
                    )}
                    {isAnalyzing && (
                      <div className="text-xs text-blue-600 font-medium flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Analisando...
                      </div>
                    )}
                  </div>
                  
                  {autoCategories.length > 0 && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                      <p className="text-xs font-bold text-blue-900 mb-1">📋 Categorias Detectadas:</p>
                      <div className="flex flex-wrap gap-1">
                        {autoCategories.map((cat, idx) => (
                          <span key={idx} className="text-xs bg-blue-600 text-white px-2 py-1 rounded">
                            {cat}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-zinc-400 ml-1">
                    Arquivo PDF
                  </label>
                  <div className="border-2 border-dashed border-zinc-300 rounded-2xl p-8 text-center hover:border-zinc-400 transition-colors">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handlePdfUpload(file);
                      }}
                      className="hidden"
                      id="pdf-upload"
                    />
                    <label
                      htmlFor="pdf-upload"
                      className="cursor-pointer flex flex-col items-center gap-4"
                    >
                      {pdfFile ? (
                        <>
                          <File className="w-12 h-12 text-emerald-600" />
                          <div>
                            <p className="font-medium text-zinc-900">{pdfFile.name}</p>
                            <p className="text-sm text-zinc-500">
                              {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                          <p className="text-sm text-emerald-600 font-medium">
                            ✓ PDF carregado com sucesso
                          </p>
                        </>
                      ) : (
                        <>
                          <Upload className="w-12 h-12 text-zinc-400" />
                          <div>
                            <p className="font-medium text-zinc-900">
                              Clique para fazer upload do PDF
                            </p>
                            <p className="text-sm text-zinc-500">
                              Arraste e solte ou clique para selecionar
                            </p>
                          </div>
                          <p className="text-xs text-zinc-400">
                              Máximo 50MB
                            </p>
                        </>
                      )}
                    </label>
                  </div>
                </div>
              )}

              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-6 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-4 text-red-600"
                >
                  <AlertCircle className="w-6 h-6 shrink-0" />
                  <p className="font-medium">{error}</p>
                </motion.div>
              )}

              <button
                type="submit"
                disabled={isButtonDisabled}
                className="w-full py-4 xs:py-5 bg-zinc-900 text-white rounded-2xl font-bold text-base xs:text-lg flex items-center justify-center gap-3 hover:bg-zinc-800 transition-all disabled:opacity-50 shadow-xl shadow-zinc-200"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 xs:w-6 h-5 xs:h-6 animate-spin" />
                    <span className="hidden xs:inline">A Guardar Norma...</span>
                    <span className="inline xs:hidden">Guardando...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-5 xs:w-6 h-5 xs:h-6" />
                    <span className="hidden xs:inline">Publicar Norma</span>
                    <span className="inline xs:hidden">Publicar</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
