// lib/supabase.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CONFIG } from '../config';

let supabaseInstance: SupabaseClient | null = null;

export const getSupabaseClient = () => {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  supabaseInstance = createClient(
    CONFIG.SUPABASE_URL,
    CONFIG.SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: true,
        storageKey: 'sb-auth-token',
        storage: localStorage,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }
  );

  return supabaseInstance;
};