// assets/js/guard.js - REPLACE ENTIRE FILE
async function requireAuth() {
    const clientHost = window.location.host;

    try {
        const res = await fetch(`${CONFIG.WORKER_URL}/api/auth/status`, {
            credentials: "include",
            headers: { "X-Client-Host": clientHost }
        });

        const data = await res.json();

        console.log("AUTH RESULT =>", data);

        // ⭐⭐⭐ CHECK FOR SUBDOMAIN ERROR ⭐⭐⭐
        if (data.error === "Unauthorized Subdomain") {
            showSubdomainError(data.expected, data.current);
            return false;
        }

        if (data.authenticated) {
            window.currentUser = data;
            return true;
        } else {
            // Redirect to main site if not authenticated
            window.location.href = "https://agtechscript.in";
            return false;
        }
    } catch (error) {
        console.error("Auth check failed:", error);
        showUnauthorized();
        return false;
    }
}

function showSubdomainError(expected, current) {
    document.body.innerHTML = `
    <div style="padding:40px;color:white;text-align:center">
        <h1>⚠️ Wrong Subdomain</h1>
        <p>You are on <strong>${current}.agtechscript.in</strong></p>
        <p>This dashboard requires <strong>${expected}.agtechscript.in</strong></p>
        <a href="https://agtechscript.in" 
           style="padding:10px 20px;background:#00d1ff;color:black;border-radius:8px;">
           Go to Login
        </a>
    </div>`;
}

function showUnauthorized() {
    document.body.innerHTML = `
    <div style="padding:40px;color:white;text-align:center">
        <h1>❌ Unauthorized Access</h1>
        <p>Please login to continue.</p>
        <a href="https://agtechscript.in" 
           style="padding:10px 20px;background:#00d1ff;color:black;border-radius:8px;">
           Go to Login
        </a>
    </div>`;
}

// ⚡ Auto-run when script loads
requireAuth();