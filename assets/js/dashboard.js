document.addEventListener("DOMContentLoaded", async () => {

    renderNavbar("home");

    // Wait for guard.js to fill window.currentUser
    if (!window.currentUser) return;

    document.getElementById("dashboardContent").style.display = "block";

    const name = window.currentUser.name || window.currentUser.user_id;
    document.getElementById("username").innerText = name;

    // Load user notifications
    const result = await getNotifications();

    const box = document.getElementById("notifications");

    if (!result.success || !result.notifications?.length) {
        box.innerHTML = "<div class='note-card'>No notifications found.</div>";
        return;
    }

    box.innerHTML = result.notifications.map(n => `
        <div class="note-card">
            <b>${n.activity}</b>
            <p>${n.details}</p>
            <span class="note-time">${n.timestamp}</span>
        </div>
    `).join("");
});