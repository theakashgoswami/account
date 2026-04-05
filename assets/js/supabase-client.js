// supabase-client.js
// Requires: config.js loaded first, Supabase CDN loaded (supabase.createClient available)
// Requires: guard.js loaded first (waitForUser)

(function () {
  if (window._supabaseReady) return;

  // The CDN exposes window.supabase = { createClient, ... }
  // We create our initialized client as window.supabaseClient
  async function initSupabaseClient() {
    try {
      if (typeof window.supabase?.createClient !== "function") {
        console.warn("⚠️ Supabase CDN not loaded");
        window._supabaseReady = false;
        return;
      }

      // Create client — will use its own session for OAuth flows
      window.supabaseClient = window.supabase.createClient(
        window.CONFIG.SUPABASE_URL,
        window.CONFIG.SUPABASE_ANON_KEY,
        {
          auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true, // needed for PKCE callback
          },
        }
      );

      // Try to inject session from worker auth (so RLS queries work)
      const user = await window.waitForUser(5000);
      if (user?.supabase_token) {
        // Set session — Supabase JS will use this access_token for REST calls
        const { error } = await window.supabaseClient.auth.setSession({
          access_token: user.supabase_token,
          refresh_token: "", // no refresh token from our worker JWT
        });

        if (error) {
          console.warn("Could not inject Supabase session:", error.message);
          window._supabaseReady = false;
        } else {
          console.log("✅ Supabase client ready with user session");
          window._supabaseReady = true;
        }
      } else {
        // Anonymous mode — can still read public/RLS-open tables
        console.log("ℹ️ Supabase client ready (anon mode)");
        window._supabaseReady = !!window.supabaseClient;
      }
    } catch (err) {
      console.warn("Supabase init error:", err.message);
      window._supabaseReady = false;
    }
  }

  // ─── Convenience: query with automatic fallback to worker ──
  // Usage: const rows = await sbQuery("user_profiles", "select=*&user_id=eq.AG0001");
  window.sbQuery = async function (table, qs = "") {
    if (!window._supabaseReady || !window.supabaseClient) return null;
    try {
      const { data, error } = await window.supabaseClient
        .from(table)
        .select(qs || "*");
      if (error) throw error;
      return data;
    } catch (err) {
      console.warn(`sbQuery(${table}) error:`, err.message);
      return null;
    }
  };

  initSupabaseClient();
})();