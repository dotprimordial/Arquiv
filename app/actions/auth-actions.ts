'use server';

import { getAuthenticatedSupabaseClient } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';
import { getAuthRedirectUrl } from '@/lib/auth-utils';

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'seantomasytbr@gmail.com';

export async function getGoogleOAuthUrlAction() {
  try {
    const supabase = await getAuthenticatedSupabaseClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: getAuthRedirectUrl(),
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
        skipBrowserRedirect: true
      },
    });

    if (error) {
      return { success: false, url: null, error: error.message };
    }

    return { success: true, url: data.url };
  } catch (err) {
    console.error('[getGoogleOAuthUrlAction] Error:', err);
    return { success: false, url: null, error: 'Erro inesperado ao gerar URL do Google OAuth.' };
  }
}

export async function loginAction(email: string, password: string) {
  try {
    const supabase = await getAuthenticatedSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/', 'layout');
    return { 
      success: true, 
      user: data.user, 
      session: data.session,
      isAdmin: data.user?.email === ADMIN_EMAIL 
    };
  } catch (err) {
    console.error('[loginAction] Error:', err);
    return { success: false, error: 'Erro inesperado ao efetuar login.' };
  }
}

export async function signUpAction(email: string, password: string, fullName?: string) {
  try {
    const supabase = await getAuthenticatedSupabaseClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        // We'll rely on the default redirect url or config
      }
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { 
      success: true, 
      user: data.user,
      session: data.session 
    };
  } catch (err) {
    console.error('[signUpAction] Error:', err);
    return { success: false, error: 'Erro inesperado ao efetuar registo.' };
  }
}

export async function logoutAction() {
  try {
    const supabase = await getAuthenticatedSupabaseClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (err) {
    console.error('[logoutAction] Error:', err);
    return { success: false, error: 'Erro inesperado ao efetuar logout.' };
  }
}

export async function getSessionAction() {
  try {
    const supabase = await getAuthenticatedSupabaseClient();
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
      return { success: false, session: null, user: null, isAdmin: false };
    }

    const { data: { user } } = await supabase.auth.getUser();

    return { 
      success: true, 
      session, 
      user,
      isAdmin: user?.email === ADMIN_EMAIL 
    };
  } catch (err) {
    console.error('[getSessionAction] Error:', err);
    return { success: false, session: null, user: null, isAdmin: false };
  }
}
