// guard.js
async function requireAuth() {
    try {
        const clientHost = window.location.host || "";
        console.log("CLIENT HOST =>", clientHost);

        const res = await fetch(`${CONFIG.WORKER_URL}/api/auth/status`, {
            credentials: "include",
            headers: {
                "X-Client-Host": clientHost  // 🔥 FINAL FIX
            }
        });

        const data = await res.json();

        if (!data.authenticated) return showUnauthorized();

        const hostSub = clientHost.split(".")[0];
        const allowedSub = data.redirect.replace("https://", "").split(".")[0];

        if (hostSub !== allowedSub) return showUnauthorized();

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
        height:50vw;
        display:flex;
        flex-direction:column;
        align-items:center;
        justify-content:center;
        font-family:Segoe UI;
    ">
        <h1>Unauthorized Access 🚫</h1>
        <p>You are not logged in or session expired.</p>
        <button onclick="window.location.href='https://agtechscript.in?action=openAuthOverlay()'"
            style="padding:12px 25px; border-radius:8px; border:none; background:#0ff; cursor:pointer;">
            Go to Login
        </button>
    </div>`;

    return false;
}

// Auto-run
requireAuth();