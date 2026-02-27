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

async function loadNotifications() {
    const box = document.getElementById("notifications");
    
    try {
        const result = await getNotifications();

        if (!result.success || !result.notifications || result.notifications.length === 0) {
            box.innerHTML = "<div class='note-card'>No notifications found.</div>";
            return;
        }

        box.innerHTML = result.notifications.map(n => `
            <div class="note-card">
                <b>${n.activity || 'Activity'}</b>
                <p>${n.details || 'No details'}</p>
                <span class="note-time">${n.timestamp || new Date().toLocaleString()}</span>
            </div>
        `).join("");
    } catch (error) {
        box.innerHTML = "<div class='note-card error'>Failed to load notifications</div>";
    }
}