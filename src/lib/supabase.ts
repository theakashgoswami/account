import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CONFIG } from '../config';

// Global variable to hold the instance
let supabaseInstance: SupabaseClient | null = null;

export const getSupabase = () => {
  // Agar instance pehle se bana hai, toh wahi return karo
  if (supabaseInstance) {
    return supabaseInstance;
  }

  // Agar nahi bana, toh naya banao
  supabaseInstance = createClient(
    CONFIG.SUPABASE_URL,
    CONFIG.SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      }
    }
  );

  return supabaseInstance;
};