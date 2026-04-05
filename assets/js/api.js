// api.js - Unified API with Supabase direct reads

// ============================================================
// READ OPERATIONS (Direct Supabase - FAST)
// ============================================================

async function getNotifications() {
    try {
        // Try Supabase direct first
        if (window.supabase) {
            const { data, error } = await window.supabase
                .from('notifications')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(20);
            
            if (!error && data) {
                return { success: true, notifications: data };
            }
        }
        
        // Fallback to worker
        const res = await fetch(`${CONFIG.WORKER_URL}/api/user/notifications`, {
            credentials: "include",
            headers: { "X-Client-Host": window.location.host }
        });
        return await res.json();
    } catch (error) {
        console.error("getNotifications failed:", error);
        return { success: false, notifications: [] };
    }
}

async function getUserProfile() {
    if (!window.currentUser?.user_id) return null;
    
    try {
        // Try Supabase direct first
        if (window.supabase) {
            const { data, error } = await window.supabase
                .from('user_profiles')
                .select('*')
                .eq('user_id', window.currentUser.user_id)
                .single();
            
            if (!error && data) {
                return { success: true, ...data };
            }
        }
        
        // Fallback to worker
        const res = await fetch(`${CONFIG.WORKER_URL}/api/user/profile?user_id=${window.currentUser.user_id}`, {
            credentials: "include",
            headers: { "X-Client-Host": window.location.host }
        });
        return await res.json();
    } catch (error) {
        console.error("getUserProfile failed:", error);
        return null;
    }
}

async function getUserStats() {
    try {
        // Try Supabase direct first
        if (window.supabase && window.currentUser?.user_id) {
            const { data, error } = await window.supabase
                .from('user_profiles')
                .select('points, stamps')
                .eq('user_id', window.currentUser.user_id)
                .single();
            
            if (!error && data) {
                return { success: true, points: data.points, stamps: data.stamps };
            }
        }
        
        // Fallback to worker
        const res = await fetch(`${CONFIG.WORKER_URL}/api/user/stats`, {
            credentials: "include",
            headers: { "X-Client-Host": window.location.host }
        });
        return await res.json();
    } catch (error) {
        console.error("getUserStats failed:", error);
        return { success: false, points: 0, stamps: 0 };
    }
}