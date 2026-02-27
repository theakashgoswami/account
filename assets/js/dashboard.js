document.addEventListener("DOMContentLoaded", async () => {
    
    // Wait until guard.js sets window.currentUser
    let tries = 0;
    while (!window.currentUser && tries < 10) {
        await new Promise(r => setTimeout(r, 100));
        tries++;
    }

    if (!window.currentUser) {
        console.log("User not loaded (final)");
        return;
    }

    console.log("User Loaded:", window.currentUser);

    // Render navbar
    renderNavbar("home");

    document.getElementById("dashboardContent").style.display = "block";
    document.getElementById("username").innerText = window.currentUser.user_id;

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