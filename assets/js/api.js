// assets/js/api.js - FINAL VERSION (remove all console.log)
async function getNotifications() {
    try {
        const res = await fetch(`${CONFIG.WORKER_URL}/api/user/notifications`, {
            credentials: "include",
            headers: { 
                "X-Client-Host": window.location.host,
                "Content-Type": "application/json"
            }
        });
        
        return await res.json();
    } catch (error) {
        console.error("getNotifications failed:", error); // Sirf error log rakho
        return { success: false, error: error.message };
    }
}

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