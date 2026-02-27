// guard.js
async function requireAuth() {
    const WORKER = "https://api.agtechscript.in";

    try {
        // Session check
        const res = await fetch(`${WORKER}/api/auth/status`, {
            credentials: "include"
        });

        const data = await res.json();

        if (!data.authenticated) {
            return showUnauthorized();
        }

        // Subdomain + role check worker already करता है
        // बस error repeat ना हो इसलिए double check
        const host = window.location.host.split(".")[0];
        const allowed = data.redirect.replace("https://", "").split(".")[0];

        if (host !== allowed) {
            return showUnauthorized();
        }

        // Auth OK → save globally
        window.currentUser = data;
        return true;

    } catch (err) {
        return showUnauthorized();
    }
}

function showUnauthorized() {
    document.body.innerHTML = `
    <div style="
        background:#000;
        color:#fff;
        height:100vh;
        display:flex;
        flex-direction:column;
        align-items:center;
        justify-content:center;
        font-family:Segoe UI;
    ">
        <h1>Unauthorized Access 🚫</h1>
        <p>You are not logged in or session expired.</p>
        <button onclick="window.location.href='https://agtechscript.in?action=openAuth'"
            style="padding:12px 25px; border-radius:8px; border:none; background:#0ff; cursor:pointer;">
            Go to Login
        </button>
    </div>`;

    return false;
}

// Auto-run
requireAuth();