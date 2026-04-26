'use server';

import { submitUrlForIndexing } from '@/lib/google-search-console';
import { getAdminSupabaseClient } from '@/lib/supabase-server';

/**
 * Submit a norm URL to Google Search Console for indexing
 * Called automatically after a new norm is added
 */
export async function submitNormForIndexing(
  normId: string,
  normCode?: string
): Promise<{
  success: boolean;
  error?: string;
  alreadySubmitted?: boolean;
}> {
  try {
    const supabase = getAdminSupabaseClient();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://arquiv.org';
    const urlPath = `/norm_detail/${encodeURIComponent(normId)}`;
    const fullUrl = `${baseUrl}${urlPath}`;

    console.log('[SEO Actions] Submitting norm for indexing:', { normId, normCode, url: fullUrl });

    // Check if already submitted recently
    const { data: existingSubmission } = await supabase
      .from('seo_indexing_status')
      .select('*')
      .eq('norm_id', normId)
      .single();

    if (existingSubmission) {
      const hoursSinceSubmission = existingSubmission.submitted_at
        ? (Date.now() - new Date(existingSubmission.submitted_at).getTime()) / (1000 * 60 * 60)
        : Infinity;

      // If submitted less than 24 hours ago, don't submit again
      if (hoursSinceSubmission < 24) {
        console.log('[SEO Actions] Norm already submitted recently, skipping:', normId);
        return { success: true, alreadySubmitted: true };
      }

      // Increment attempt count for resubmission
      await supabase
        .from('seo_indexing_status')
        .update({
          submission_attempts: (existingSubmission.submission_attempts || 0) + 1,
          submitted_at: new Date().toISOString(),
          last_error: null,
        })
        .eq('norm_id', normId);
    } else {
      // Create new submission record
      const { error: insertError } = await supabase.from('seo_indexing_status').insert({
        norm_id: normId,
        url: fullUrl,
        submitted_at: new Date().toISOString(),
        submission_attempts: 1,
      });

      if (insertError) {
        console.error('[SEO Actions] Failed to create submission record:', insertError);
      }
    }

    // Submit to Google Search Console
    const result = await submitUrlForIndexing(urlPath);

    if (!result.success) {
      // Update error in database
      await supabase
        .from('seo_indexing_status')
        .update({
          last_error: result.error,
        })
        .eq('norm_id', normId);

      return { success: false, error: result.error };
    }

    console.log('[SEO Actions] Successfully submitted norm for indexing:', normId);
    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[SEO Actions] Unexpected error submitting norm:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Get indexing status for all norms
 * Useful for admin dashboard
 */
export async function getIndexingStatus(): Promise<
  Array<{
    normId: string;
    normCode: string;
    submitted: boolean;
    submittedAt?: string;
    indexed: boolean;
    indexedAt?: string;
    attempts: number;
    lastError?: string;
  }>
> {
  try {
    const supabase = getAdminSupabaseClient();

    const { data, error } = await supabase
      .from('seo_indexing_status')
      .select(`
        norm_id,
        submitted_at,
        indexed,
        indexed_at,
        submission_attempts,
        last_error,
        norms(code)
      `)
      .order('submitted_at', { ascending: false });

    if (error) {
      console.error('[SEO Actions] Error fetching indexing status:', error);
      return [];
    }

    return (data || []).map((item: Record<string, unknown>) => ({
      normId: item.norm_id as string,
      normCode: (item.norms as Record<string, unknown>)?.code as string || '',
      submitted: !!item.submitted_at,
      submittedAt: item.submitted_at as string,
      indexed: item.indexed as boolean,
      indexedAt: item.indexed_at as string,
      attempts: item.submission_attempts as number,
      lastError: item.last_error as string,
    }));
  } catch (error: unknown) {
    console.error('[SEO Actions] Error getting indexing status:', error);
    return [];
  }
}
