
document.addEventListener("DOMContentLoaded", async () => {
    
    // Wait for guard.js to set window.currentUser
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

    // Load header
    await loadHeader();
    
    // Show dashboard
    document.getElementById("dashboardContent").style.display = "block";
    document.getElementById("username").innerText = window.currentUser.name;

    // Load notifications
    await loadNotifications();
});


async function loadNotifications() {
    const box = document.getElementById("notifications");

    if (!window.currentUser) {
        box.innerHTML = "<div class='note-card error'>Please login again</div>";
        return;
    }

    box.innerHTML = "<div class='note-card'>Loading...</div>";

    try {
        const result = await getNotifications();

        if (!result?.success) {
            box.innerHTML = `<div class='note-card error'>Error: ${result?.error || 'Unknown error'}</div>`;
            return;
        }

        const notifications = result.notifications || [];

        if (!Array.isArray(notifications) || notifications.length === 0) {
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

function formatDate(timestamp) {
    const d = new Date(timestamp);
    return isNaN(d) ? "-" : d.toLocaleString();
}
// Optional: Add date formatter
function formatDate(timestamp) {
    if (!timestamp) return new Date().toLocaleString();
    return new Date(timestamp).toLocaleString();
}