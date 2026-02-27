async function requireAuth() {
    const WORKER = "https://api.agtechscript.in";
    const host = window.location.host;

    console.log("CLIENT HOST =>", host);

    try {
        const res = await fetch(`${CONFIG.WORKER_URL}/api/auth/status`, {
            credentials: "include",
            headers: {
                "X-Client-Host": host
            }
        });

        const data = await res.json();
window.currentUser = data;
        console.log("AUTH RESULT =>", data);

        // ❌ Not logged in
        if (!data.authenticated) {
            return showUnauthorized();
        }

        // 🔥 Save user globally
        window.currentUser = {
            user_id: data.user_id,
            role: data.role,
            profile_image: data.profile_image,
            redirect: data.redirect
        };

        return true;

    } catch (err) {
        console.error("AUTH ERROR =>", err);
        return showUnauthorized();
    }
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

// 🔥 Run immediately
requireAuth();