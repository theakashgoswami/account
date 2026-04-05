// assets/js/guard.js - FINAL VERSION (Simplified)
// assets/js/guard.js - FIXED VERSION
async function requireAuth() {
    try {
        // Current page URL
        const currentPath = window.location.pathname;
        const isDashboard = currentPath.includes('/index') || currentPath.includes('index.html');
        
        const res = await fetch(`${CONFIG.WORKER_URL}/api/auth/status`, {
            credentials: "include",
            headers: { 'X-Client-Host': window.location.host }
        });

        const data = await res.json();

        // Agar authenticated hai aur dashboard page pe hai → dashboard dikhao
        if (data.authenticated) {
            window.currentUser = data;
            
            // Dashboard page pe hai toh redirect mat karo
            if (isDashboard) {
                console.log("✅ User authenticated, showing dashboard");
                return true;
            }
            
            // Agar dashboard pe nahi hai toh dashboard pe bhejo
            if (!isDashboard && !currentPath.includes('#login') && !currentPath.includes('/#login')) {
                window.location.href = "https://account.agtechscript.in/";
                return false;
            }
            
            return true;
        }
        
        // Agar authenticated nahi hai aur dashboard page pe hai → login pe bhejo
        if (!data.authenticated && isDashboard) {
            console.log("❌ Not authenticated, redirecting to login");
            window.location.href = "https://agtechscript.in#login";
            return false;
        }
        
        return false;
        
    } catch (error) {
        console.error("Auth check failed:", error);
        return false;
    }
}

// Auto-run guard
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', requireAuth);
} else {
    requireAuth();
}
