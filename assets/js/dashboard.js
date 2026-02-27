document.addEventListener("DOMContentLoaded", async () => {

    // 1) Navbar render
    renderNavbar("home");

    // 2) Guard.js sets window.currentUser
    if (!window.currentUser) {
        console.warn("User not loaded");
        return;
    }

    document.getElementById("dashboardContent").style.display = "block";
    document.getElementById("username").innerText = window.currentUser.user_id;

    // 3) Fetch notifications
    const result = await getNotifications();

    console.log("NOTIFICATION API RESULT =>", result);

    const box = document.getElementById("notifications");

    if (!result || !result.success) {
        box.innerHTML = `<div class='note-card red'>Error loading notifications.</div>`;
        return;
    }

    if (!result.notifications || result.notifications.length === 0) {
        box.innerHTML = `<div class='note-card'>No notifications found.</div>`;
        return;
    }

    // 4) Render notifications
    box.innerHTML = result.notifications
        .map(n => `
            <div class="note-card">
                <b>${n.activity}</b>
                <p>${n.details}</p>
                <span class="note-time">${new Date(n.timestamp).toLocaleString()}</span>
            </div>
        `)
        .join("");

});