// supabase-client.js
(function () {
  if (window._supabaseReady) return;

  async function initSupabaseClient() {
    try {
      if (typeof window.supabase?.createClient !== "function") {
        console.warn("⚠️ Supabase CDN not loaded");
        window._supabaseReady = false;
        return;
      }

      // ✅ Create client (ANON MODE ONLY)
      window.supabaseClient = window.supabase.createClient(
        window.CONFIG.SUPABASE_URL,
        window.CONFIG.SUPABASE_ANON_KEY
      );

      // ✅ Wait for user (optional, no session injection)
      const user = await window.waitForUser(5000);

      if (user) {
        console.log("✅ Supabase ready (user:", user.user_id, ")");
      } else {
        console.log("ℹ️ Supabase ready (anon)");
      }

      window._supabaseReady = true;
    } catch (err) {
      console.warn("Supabase init error:", err.message);
      window._supabaseReady = false;
    }
  }

  // 🔥 Clean query helper (no weird select bug)
  window.sbQuery = async function (table, query = {}) {
    if (!window._supabaseReady || !window.supabaseClient) return null;

    try {
      let q = window.supabaseClient.from(table).select(query.select || "*");

      // apply filters
      if (query.eq) {
        for (const [key, value] of Object.entries(query.eq)) {
          q = q.eq(key, value);
        }
      }

      if (query.limit) q = q.limit(query.limit);

      const { data, error } = await q;
      if (error) throw error;

      return data;
    } catch (err) {
      console.warn(`sbQuery(${table}) error:`, err.message);
      return null;
    }
  };

  initSupabaseClient();
})();