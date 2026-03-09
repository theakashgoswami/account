document.addEventListener("DOMContentLoaded", initDashboard);

async function initDashboard() {

    try {

        // Wait until guard.js loads user (max 2s)
        const user = await waitForUser();

        if (!user) {
            console.error("User not loaded - auth failed");
            return;
        }

        // Load header instantly (no await needed)
        loadHeader();

        // Parallel loading (FAST)
        const [profileResult, notificationsResult] = await Promise.all([
            loadFullUserProfile(),
            loadNotifications()
        ]);

        // Show dashboard
        document.getElementById("dashboardContent").style.display = "block";
        document.getElementById("username").innerText =
            window.currentUser?.name || window.currentUser?.user_id;

    } catch (err) {
        console.error("Dashboard init error:", err);
    }
}

async function waitForUser() {

    let tries = 0;

    while (!window.currentUser && tries < 20) {
        await new Promise(r => setTimeout(r,100));
        tries++;
    }

    return window.currentUser || null;
}

/* ===============================
   LOAD PROFILE
================================ */
async function loadFullUserProfile() {

    try {

        const res = await fetch(
            `${CONFIG.WORKER_URL}/api/user/profile?user_id=${window.currentUser.user_id}`,
            {
                credentials: "include",
                headers: { "X-Client-Host": window.location.host }
            }
        );

        const data = await res.json();

        if (data.success) {

            window.currentUser = data;

            document.getElementById("username").innerText =
                data.name || data.user_id;

        }

        return data;

    } catch (err) {
        console.error("Profile load error:", err);
        return null;
    }
}
async function loadDashboardStats(){

const res = await fetch(
`${CONFIG.WORKER_URL}/api/user/dashboard-stats`,
{
credentials:"include",
headers:{ "X-Client-Host":window.location.host }
});

const data = await res.json();

if(!data.success) return;

document.getElementById("quizPlayed").innerText = data.quizPlayed;
document.getElementById("quizScore").innerText = data.quizScore;
document.getElementById("purchaseCount").innerText = data.purchases;
document.getElementById("referralCount").innerText = data.referrals;

}
await loadDashboardStats();
/* ===============================
   LOAD NOTIFICATIONS
================================ */
async function loadNotifications() {

    const box = document.getElementById("notifications");

    try {

        const result = await getNotifications();

        if (!result || !result.success) {
            box.innerHTML = "<div class='note-card'>No notifications</div>";
            return;
        }

        const notifications = result.notifications || [];

        if (!notifications.length) {
            box.innerHTML = "<div class='note-card'>No notifications found.</div>";
            return;
        }

        // single DOM update (FAST)
        const html = notifications.map(n => `
            <div class="note-card">
                <b>${n.title || 'Notification'}</b>
<p>${n.message || ''}</p>
<span class="note-time">${formatDate(n.created_at)}</span>
            </div>
        `).join("");

        box.innerHTML = html;

    } catch (error) {

        console.error("Error loading notifications:", error);

        box.innerHTML =
            "<div class='note-card error'>Failed to load notifications</div>";

    }
}

/* ===============================
   DATE FORMATTER
================================ */
function formatDate(timestamp) {
    if (!timestamp) return new Date().toLocaleString();
    return new Date(timestamp).toLocaleString();
}