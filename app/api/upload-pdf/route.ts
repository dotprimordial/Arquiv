import { getAuthenticatedSupabaseClient } from '@/lib/supabase-server';
import { checkRateLimit, recordSearch } from '@/lib/rate-limit';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'seantomasytbr@gmail.com';
const PDF_BUCKET_NAME = 'arquiv-files';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: Request) {
  try {
    // 1. Authenticate user server-side
    const supabase = await getAuthenticatedSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json(
        { error: 'Apenas administradores autorizados podem carregar ficheiros.' },
        { status: 401 }
      );
    }

    // Rate limit: max 10 uploads per hour per admin
    const ip = request.headers.get('cf-connecting-ip') ||
               request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
               request.headers.get('x-real-ip') ||
               'unknown';

    const uploadConfig = {
      anonymousSearchesPerMinute: 0,
      anonymousSearchesPerHour: 0,
      anonymousSearchesPerDay: 0,
      authenticatedSearchesPerMinute: 1,
      authenticatedSearchesPerHour: 10,
      authenticatedSearchesPerDay: 20,
    };
    const rateLimitResult = await checkRateLimit(ip, 'browse', uploadConfig, user.id);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Limite de uploads excedido. Tente novamente mais tarde.' },
        { status: 429 }
      );
    }

    // 2. Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const country = formData.get('country') as string;
    
    if (!file || !country) {
      return NextResponse.json(
        { error: 'Parâmetros em falta: ficheiro e país são obrigatórios.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Ficheiro demasiado grande. Tamanho máximo: 50MB.` },
        { status: 400 }
      );
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    
    // Generate country folder name
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
    const countryFolder = countryMap[country] || country.toLowerCase().replace(/\s+/g, '-');
    const fileName = `${Date.now()}-${file.name}`;
    const filePath = `${countryFolder}/${fileName}`;

    // 3. Upload file via authenticated supabase client (RLS will verify admin)
    const bucketsToTry = [
      PDF_BUCKET_NAME,
      'arquiv-files',
      'documents',
      'public'
    ];
    
    let uploadSuccess = false;
    let publicUrl = '';
    let usedBucket = '';
    let lastErrorMsg = '';

    for (const bucketName of bucketsToTry) {
      try {
        console.log(`[API Upload] Tentando bucket: ${bucketName} com caminho: ${filePath}`);
        const { error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(filePath, fileBuffer, {
            contentType: file.type || 'application/pdf',
            duplex: 'half'
          });

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from(bucketName)
            .getPublicUrl(filePath);

          publicUrl = urlData.publicUrl;
          uploadSuccess = true;
          usedBucket = bucketName;
          console.log(`[API Upload] Upload efetuado com sucesso no bucket: ${bucketName}`);
          break;
        } else {
          lastErrorMsg = uploadError.message;
          console.warn(`[API Upload] Falha no bucket ${bucketName}:`, uploadError.message);
        }
      } catch (bucketErr) {
        console.error(`[API Upload] Exceção no bucket ${bucketName}:`, bucketErr);
      }
    }

    if (!uploadSuccess) {
      return NextResponse.json(
        { error: `Falha ao carregar arquivo nos buckets de storage. Erro: ${lastErrorMsg || 'Bucket inacessível'}` },
        { status: 500 }
      );
    }

    try {
      await recordSearch(ip, 'browse', undefined, country, user.id);
    } catch {
      // Non-critical: don't block response if recording fails
    }

    return NextResponse.json({
      success: true,
      publicUrl,
      bucket: usedBucket,
      filePath
    });
  } catch (err: unknown) {
    console.error('[API Upload] Erro inesperado:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro interno de servidor.' },
      { status: 500 }
    );
  }
}
