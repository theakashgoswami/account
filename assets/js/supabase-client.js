// supabase-client.js - Direct Supabase Access
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

// IMPORTANT: Sync session from worker cookie to Supabase
async function initSupabaseSession() {
    try {
        // Get current session from worker via status endpoint
        const res = await fetch(`${window.CONFIG.WORKER_URL}/api/auth/status`, {
            credentials: 'include',
            headers: { 'X-Client-Host': window.location.host }
        });
        const data = await res.json();
        
        if (data.authenticated && data.supabase_token) {
            // Set Supabase session
            await window.supabase.auth.setSession({
                access_token: data.supabase_token,
                refresh_token: data.refresh_token
            });
        } else if (data.authenticated && data.user_id) {
            // Try to get session from cookie
            const { data: { session } } = await window.supabase.auth.getSession();
            if (!session) {
                console.warn("No Supabase session found, some features may not work");
            }
        }
    } catch (err) {
        console.error("Failed to init Supabase session:", err);
    }
}

// Initialize session when script loads
initSupabaseSession();

// Helper function to get current user profile
window.getCurrentUserProfile = async function() {
    const { data: { user } } = await window.supabase.auth.getUser();
    if (!user) return null;
    
    const { data, error } = await window.supabase
        .from('user_profiles')
        .select('*')
        .eq('supabase_uid', user.id)
        .single();
    
    if (error) throw error;
    return data;
};
// Initialize Supabase client
window.supabase = createClient(
    window.CONFIG.SUPABASE_URL,
    window.CONFIG.SUPABASE_ANON_KEY,
    {
        auth: {
            persistSession: true,
            detectSessionInUrl: true,
            storage: localStorage,
            autoRefreshToken: true
        }
    }
);

// ============================================================
// READ OPERATIONS - Direct Supabase (No Worker)
// ============================================================

// Get current user profile
window.getCurrentUserProfile = async function() {
    const { data: { user } } = await window.supabase.auth.getUser();
    if (!user) return null;
    
    const { data, error } = await window.supabase
        .from('user_profiles')
        .select('*')
        .eq('supabase_uid', user.id)
        .single();
    
    if (error) throw error;
    return data;
};

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