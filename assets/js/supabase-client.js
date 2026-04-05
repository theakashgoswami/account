// supabase-client.js - Complete working version
(function() {
    // Prevent multiple initializations
    if (window._supabaseInitialized) {
        console.log("✅ Supabase already initialized");
        return;
    }
    
    console.log("🚀 Initializing Supabase client...");

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

    // Main function to sync session from worker
    async function syncSupabaseSession() {
        try {
            console.log("🔄 Syncing Supabase session...");
            
            // First check if already have session
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
            console.log("📡 Auth status response:", data.authenticated ? "Authenticated" : "Not authenticated");
            
            if (data.authenticated && data.supabase_token) {
                // Set session in Supabase
                const { data: sessionData, error } = await window.supabase.auth.setSession({
                    access_token: data.supabase_token,
                    refresh_token: data.refresh_token || ''
                });
                
                if (error) {
                    console.warn("⚠️ Failed to set Supabase session:", error.message);
                    window._supabaseSessionReady = false;
                    return false;
                }
                
                console.log("✅ Supabase session synced successfully!");
                window._supabaseSessionReady = true;
                return true;
            } else if (data.authenticated) {
                console.log("ℹ️ User authenticated but no Supabase token available");
                window._supabaseSessionReady = false;
                return false;
            } else {
                console.log("ℹ️ User not authenticated");
                window._supabaseSessionReady = false;
                return false;
            }
            
        } catch (err) {
            console.warn("⚠️ Failed to sync Supabase session:", err.message);
            window._supabaseSessionReady = false;
            return false;
        }
    }

    // Helper to check if Supabase is ready
    window.isSupabaseReady = () => window._supabaseSessionReady === true;
    
    // Helper to wait for Supabase ready
    window.waitForSupabase = async (timeout = 5000) => {
        const start = Date.now();
        while (!window._supabaseSessionReady && (Date.now() - start) < timeout) {
            await new Promise(r => setTimeout(r, 100));
        }
        return window._supabaseSessionReady;
    };

    // Helper to get current user profile from Supabase
    window.getCurrentUserProfile = async function() {
        if (!window._supabaseSessionReady) {
            console.log("Supabase not ready, use worker instead");
            return null;
        }
        
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
            console.error("Profile fetch error:", err);
            return null;
        }
    };

    // Auto-sync on load
    syncSupabaseSession();
    
    // Also sync when page becomes visible again
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && !window._supabaseSessionReady) {
            syncSupabaseSession();
        }
    });
})();