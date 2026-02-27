// assets/js/dashboard.js - REPLACE ENTIRE FILE
document.addEventListener("DOMContentLoaded", async () => {
    
    // Wait for guard.js to set window.currentUser (max 3 seconds)
    let waitTime = 0;
    const maxWait = 3000; // 3 seconds
    const interval = 100;
    
    while (!window.currentUser && waitTime < maxWait) {
        await new Promise(r => setTimeout(r, interval));
        waitTime += interval;
    }

    if (!window.currentUser) {
        console.error("User not loaded - auth failed");
        return;
    }

    console.log("User Loaded:", window.currentUser);

    // Render navbar first
    renderNavbar("home");

    // Show dashboard
    document.getElementById("dashboardContent").style.display = "block";
    document.getElementById("username").innerText = window.currentUser.user_id || window.currentUser.user_id;

    // Load notifications
    await loadNotifications();
});

// assets/js/dashboard.js - ADD DETAILED LOGGING
async function loadNotifications() {
    const box = document.getElementById("notifications");
    
    console.log("📊 Loading notifications...");
    console.log("window.currentUser:", window.currentUser);
    
    // Check if user is authenticated
    if (!window.currentUser) {
        console.error("❌ No user found!");
        box.innerHTML = "<div class='note-card error'>Please login again</div>";
        return;
    }
    
    console.log("👤 User ID:", window.currentUser.user_id);
    
    try {
        const result = await getNotifications();
        
        console.log("📨 Notifications result:", result);
        
        // Check for different response structures
        if (!result) {
            console.error("❌ No response data");
            box.innerHTML = "<div class='note-card error'>No response from server</div>";
            return;
        }
        
        if (result.error) {
            console.error("❌ API Error:", result.error);
            box.innerHTML = `<div class='note-card error'>Error: ${result.error}</div>`;
            return;
        }
        
        // Check both possible response formats
        const notifications = result.notifications || result.data || [];
        
        if (!result.success || notifications.length === 0) {
            console.log("ℹ️ No notifications found");
            box.innerHTML = "<div class='note-card'>No notifications found.</div>";
            return;
        }

        console.log(`✅ Found ${notifications.length} notifications`);
        
        box.innerHTML = notifications.map((n, index) => {
            console.log(`Notification ${index}:`, n);
            return `
            <div class="note-card">
                <b>${n.activity || n.title || 'Activity'}</b>
                <p>${n.details || n.message || n.description || 'No details'}</p>
                <span class="note-time">${n.timestamp || n.date || n.created_at || new Date().toLocaleString()}</span>
            </div>
        `}).join("");
        
    } catch (error) {
        console.error("❌ Error in loadNotifications:", error);
        box.innerHTML = "<div class='note-card error'>Failed to load notifications</div>";
    }
}