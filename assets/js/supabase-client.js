// supabase-client.js - Direct Supabase Access
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// supabase-client.js - Single instance, no duplicate warnings
(function() {
    // Check if already initialized
    if (window.supabase && window._supabaseInitialized) {
        console.log("✅ Supabase already initialized, skipping");
        return;
    }

    console.log("🚀 Initializing Supabase client...");

    // Create single Supabase client instance
    window.supabase = window.supabase || createClient(
        window.CONFIG.SUPABASE_URL,
        window.CONFIG.SUPABASE_ANON_KEY,
        {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: false,  // Changed to false to avoid multiple instances
                storage: localStorage,
                storageKey: 'ag-supabase-auth'  // Custom key to avoid conflicts
            }
        }
    );

    window._supabaseInitialized = true;

    // Initialize session from worker
    async function initSupabaseSession() {
        try {
            // Wait a bit for page to settle
            await new Promise(r => setTimeout(r, 500));
            
            // Check if already has session
            const { data: { session } } = await window.supabase.auth.getSession();
            if (session) {
                console.log("✅ Supabase session already exists");
                window._supabaseSessionReady = true;
                return;
            }
            
            // Try to get session from worker
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
                    console.log("✅ Supabase session initialized from worker");
                    window._supabaseSessionReady = true;
                }
            } else {
                console.log("ℹ️ No Supabase session available, using worker-only mode");
                window._supabaseSessionReady = false;
            }
        } catch (err) {
            console.warn("⚠️ Failed to init Supabase session:", err.message);
            window._supabaseSessionReady = false;
        }
    }

    // Helper to check if session is ready
    window.isSupabaseReady = () => window._supabaseSessionReady === true;

    // Helper to get current user profile
    window.getCurrentUserProfile = async function() {
        if (!window._supabaseSessionReady) {
            console.log("Supabase not ready, using worker fallback");
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

    // Initialize session after a short delay
    setTimeout(initSupabaseSession, 100);
})();
window.supabase = createClient(
    window.CONFIG.SUPABASE_URL,
    window.CONFIG.SUPABASE_ANON_KEY,
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            storage: localStorage
        }
    }
);


// Get notifications (direct from Supabase)
window.getNotifications = async function(limit = 20) {
    const { data, error } = await window.supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
    
    if (error) throw error;
    return { success: true, notifications: data };
};

// Get leaderboard (direct from Supabase)
window.getLeaderboard = async function(limit = 10) {
    const { data, error } = await window.supabase
        .from('leaderboard')
        .select('user_id, score, user_profiles(name, profile_image)')
        .order('score', { ascending: false })
        .limit(limit);
    
    if (error) throw error;
    return { success: true, leaderboard: data };
};

// Get user stats (points, stamps)
window.getUserStats = async function() {
    const user = await window.getCurrentUserProfile();
    if (!user) return { success: false, points: 0, stamps: 0 };
    
    return { 
        success: true, 
        points: user.points || 0, 
        stamps: user.stamps || 0 
    };
};

// Get points history
window.getPointsHistory = async function(limit = 100) {
    const user = await window.getCurrentUserProfile();
    if (!user) return { success: false, points: [] };
    
    const { data, error } = await window.supabase
        .from('points_log')
        .select('*')
        .eq('user_id', user.user_id)
        .order('created_at', { ascending: false })
        .limit(limit);
    
    if (error) throw error;
    return { success: true, points: data };
};