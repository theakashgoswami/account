// assets/js/dashboard.js - FINAL FIXED VERSION
document.addEventListener("DOMContentLoaded", async () => {
    
    // Wait for guard.js to set window.currentUser (max 3 seconds)
    let waitTime = 0;
    const maxWait = 3000;
    const interval = 100;
    
    while (!window.currentUser && waitTime < maxWait) {
        await new Promise(r => setTimeout(r, interval));
        waitTime += interval;
    }

    if (!window.currentUser) {
        console.error("User not loaded - auth failed");
        return;
    }

    // 🔥 FIX: Load header FIRST
    await loadHeader();
    
    // Then show dashboard
    document.getElementById("dashboardContent").style.display = "block";
    document.getElementById("username").innerText = window.currentUser.user_id;

    // Load notifications
    await loadNotifications();
});

// 🔥 NEW: Separate function for header loading
async function loadHeader() {
    try {
        const response = await fetch("/partials/header.html");
        const html = await response.text();
        
        // Insert header HTML
        document.getElementById("header-container").innerHTML = html;
        
        // Wait a tiny bit for DOM to update
        await new Promise(r => setTimeout(r, 50));
        
        // Initialize header
        if (typeof initHeader === 'function') {
            initHeader();
            console.log("✅ Header initialized");
        } else {
            console.warn("⚠️ initHeader function not found");
        }
        
        // Load user profile icon
        if (window.currentUser?.user_id && typeof loadUserProfileIcon === 'function') {
            await loadUserProfileIcon(window.currentUser.user_id);
            console.log("✅ User icon loaded");
        }
        
    } catch (error) {
        console.error("❌ Header load failed:", error);
    }
}

async function loadNotifications() {
    const box = document.getElementById("notifications");
    
    if (!window.currentUser) {
        box.innerHTML = "<div class='note-card error'>Please login again</div>";
        return;
    }
    
    try {
        const result = await getNotifications();
        
        if (!result || result.error) {
            box.innerHTML = `<div class='note-card error'>Error: ${result?.error || 'Unknown error'}</div>`;
            return;
        }
        
        const notifications = result.notifications || [];
        
        if (!result.success || notifications.length === 0) {
            box.innerHTML = "<div class='note-card'>No notifications found.</div>";
            return;
        }
        
        box.innerHTML = notifications.map(n => `
            <div class="note-card">
                <b>${n.activity || 'Activity'}</b>
                <p>${n.details || 'No details'}</p>
                <span class="note-time">${formatDate(n.timestamp)}</span>
            </div>
        `).join("");
        
    } catch (error) {
        console.error("Error loading notifications:", error);
        box.innerHTML = "<div class='note-card error'>Failed to load notifications</div>";
    }
}

// Optional: Add date formatter
function formatDate(timestamp) {
    if (!timestamp) return new Date().toLocaleString();
    return new Date(timestamp).toLocaleString();
}