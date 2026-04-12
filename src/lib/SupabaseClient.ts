import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CONFIG } from '../config';

let supabaseInstance: SupabaseClient | null = null;

/**
 * Singleton Supabase client — uses native session (persisted in localStorage).
 * Primary use: OAuth login, native session management.
 */
export const getSupabaseClient = (): SupabaseClient => {
  if (supabaseInstance) return supabaseInstance;

  supabaseInstance = createClient(
    CONFIG.SUPABASE_URL,
    CONFIG.SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: true,
        storageKey: 'agtech-auth',
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    }
  );

  return supabaseInstance;
};

/**
 * One-shot authenticated Supabase client using a specific token.
 * Used for direct DB reads when user has a worker-issued Supabase JWT.
 * No session persistence, no auto-refresh (token refreshed via auth/status check).
 */
export const getAuthedSupabaseClient = (token: string): SupabaseClient => {
  return createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
    global: {
      headers: { Authorization: `Bearer ${token}` },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};
