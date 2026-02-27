document.addEventListener("DOMContentLoaded", async () => {

    // 1) Render navbar
    renderNavbar("home");

    // 2) guard.js ne already user auth check kar diya hota hai
    if (!window.currentUser) return;

    // 3) Show dashboard content
    document.getElementById("dashboardContent").style.display = "block";
    document.getElementById("username").innerText = window.currentUser.user_id;

    // 4) Load Notifications
    const result = await getNotifications();

    const box = document.getElementById("notifications");

    if (!result.success || result.notifications.length === 0) {
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