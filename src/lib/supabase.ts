import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CONFIG } from '../config';

// The supabase client starts anonymous.
// After /api/auth/status returns a supabase_token, call setSupabaseToken()
// to recreate the client with the authenticated JWT so RLS works.

let _client: SupabaseClient = createClient(
  CONFIG.SUPABASE_URL,
  CONFIG.SUPABASE_ANON_KEY,
  { auth: { persistSession: false } }
);

export function setSupabaseToken(token: string | null) {
  _client = createClient(
    CONFIG.SUPABASE_URL,
    CONFIG.SUPABASE_ANON_KEY,
    {
      global: {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
      auth: { persistSession: false },
    }
  );
}

// Always use this getter so you always get the current (possibly re-authed) instance
export function getSupabase(): SupabaseClient {
  return _client;
}

// Convenience alias for backwards-compat
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (_client as any)[prop];
  },
});
