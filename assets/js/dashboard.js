// dashboard.js
document.addEventListener("DOMContentLoaded", async () => {
    // 1. Wait for Auth Guard to finish
    const isAuthenticated = await requireAuth(); 
    
    // 2. Agar auth fail hua (false aaya), toh aage mat badho
    if (!isAuthenticated) return; 

    // 3. Ab data safely use karo
    console.log("User Verified:", window.currentUser);
    
    document.getElementById("dashboardContent").style.display = "block";
    const name = window.currentUser.user_id || "User";
    document.getElementById("username").innerText = name;

    // Load Data
    renderNavbar("home");
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