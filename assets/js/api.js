async function getNotifications() {
    console.log("🔍 Fetching notifications...");
    console.log("Current user:", window.currentUser);
    
    try {
        const res = await fetch(`${CONFIG.WORKER_URL}/api/user/notifications`, {
            credentials: "include",
            headers: { 
                "X-Client-Host": window.location.host,
                "Content-Type": "application/json"
            }
        });
        
        console.log("📡 Response status:", res.status);
        console.log("📡 Response headers:", [...res.headers.entries()]);
        
        const data = await res.json();
        console.log("📦 Response data:", data);
        
        return data;
    } catch (error) {
        console.error("❌ Fetch failed:", error);
        return { success: false, error: error.message };
    }
}

// Add other API functions here
async function getUserProfile() {
    if (!window.currentUser?.user_id) return null;
    
    try {
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