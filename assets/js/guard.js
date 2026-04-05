// assets/js/guard.js - FINAL VERSION (Simplified)
async function requireAuth() {
    try {
        const res = await fetch(`${CONFIG.WORKER_URL}/api/auth/status`, {
            credentials: "include",
            headers: { "X-Client-Host": window.location.host }
        });

        const data = await res.json();

        if (data.authenticated) {
            window.currentUser = data;
            
            // Also set Supabase session if available
            if (window.supabase && data.supabase_token) {
                await window.supabase.auth.setSession(data.supabase_token);
            }
            
            return true;
        } else {
            window.location.href = "https://agtechscript.in";
            return false;
        }
    } catch (error) {
        console.error("Auth check failed:", error);
        window.location.href = "https://agtechscript.in";
        return false;
    }
}

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', requireAuth);
} else {
    requireAuth();
}