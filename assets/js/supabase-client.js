// supabase-client.js - Fixed version
(function() {
    // Prevent multiple initializations
    if (window._supabaseInitialized) {
        console.log("✅ Supabase already initialized");
        return;
    }
    
    console.log("🚀 Initializing Supabase client...");

    // 🔥 FIX: Check if createClient exists, if not load it
    if (typeof createClient === 'undefined') {
        console.log("📦 Loading Supabase library...");
        // This will be loaded via script tag in HTML
        setTimeout(() => {
            if (typeof createClient !== 'undefined') {
                initSupabase();
            } else {
                console.warn("⚠️ Supabase library not loaded, using worker-only mode");
                window._supabaseSessionReady = false;
            }
        }, 500);
        return;
    }
    
    initSupabase();
    
    function initSupabase() {
        // Create Supabase client
        window.supabase = createClient(
            window.CONFIG.SUPABASE_URL,
            window.CONFIG.SUPABASE_ANON_KEY,
            {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                    detectSessionInUrl: false,
                    storage: localStorage,
                    storageKey: 'ag-supabase-auth'
                }
            }
        );

        window._supabaseInitialized = true;
        window._supabaseSessionReady = false;

        // Sync session from worker
        async function syncSupabaseSession() {
            try {
                console.log("🔄 Syncing Supabase session...");
                
                // Check existing session
                const { data: { session: existingSession } } = await window.supabase.auth.getSession();
                if (existingSession) {
                    console.log("✅ Supabase session already exists");
                    window._supabaseSessionReady = true;
                    return true;
                }
                
                // Get session from worker
                const res = await fetch(`${window.CONFIG.WORKER_URL}/api/auth/status`, {
                    credentials: 'include',
                    headers: { 'X-Client-Host': window.location.host }
                });
                
                const data = await res.json();
                
                if (data.authenticated && data.supabase_token) {
                    const { error } = await window.supabase.auth.setSession({
                        access_token: data.supabase_token,
                        refresh_token: data.refresh_token || ''
                    });
                    
                    if (!error) {
                        console.log("✅ Supabase session synced!");
                        window._supabaseSessionReady = true;
                        return true;
                    }
                }
                
                window._supabaseSessionReady = false;
                return false;
                
            } catch (err) {
                console.warn("⚠️ Session sync error:", err.message);
                window._supabaseSessionReady = false;
                return false;
            }
        }

        window.isSupabaseReady = () => window._supabaseSessionReady === true;
        window.waitForSupabase = async (timeout = 5000) => {
            const start = Date.now();
            while (!window._supabaseSessionReady && (Date.now() - start) < timeout) {
                await new Promise(r => setTimeout(r, 100));
            }
            return window._supabaseSessionReady;
        };

        window.getCurrentUserProfile = async function() {
            if (!window._supabaseSessionReady) return null;
            try {
                const { data: { user } } = await window.supabase.auth.getUser();
                if (!user) return null;
                const { data, error } = await window.supabase
                    .from('user_profiles')
                    .select('*')
                    .eq('supabase_uid', user.id)
                    .maybeSingle();
                if (error) throw error;
                return data;
            } catch (err) {
                return null;
            }
        };

        syncSupabaseSession();
    }
})();