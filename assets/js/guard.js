// guard.js
async function requireAuth() {
    const WORKER = "https://api.agtechscript.in";

    try {
        // Session check (X-Client-Host added)
        const res = await fetch(`${WORKER}/api/auth/status`, {
            credentials: "include",
            headers: {
                "X-Client-Host": window.location.host
            }
        });

        const data = await res.json();

        if (!data.authenticated) {
            return showUnauthorized();
        }

        // Subdomain check (Optional, because worker already does)
        const host = window.location.host.split(".")[0];
        const allowed = data.redirect.replace("https://", "").split(".")[0];

        if (host !== allowed) {
            return showUnauthorized();
        }

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